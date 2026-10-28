-- Additive schema: leaves the previous vacation application's tables untouched.
create table if not exists a9_trips (
 id uuid primary key default gen_random_uuid(),
 access_hash text not null unique check (length(access_hash)=64),
 seed_key text not null unique,
 revision bigint not null default 0,
 created_at timestamptz not null default now()
);
create table if not exists a9_profiles (
 trip_id uuid references a9_trips(id) on delete cascade,
 participant_id text check(participant_id ~ '^p[1-9]$'),
 display_name text not null check(length(display_name) between 1 and 40),
 version bigint not null default 1,
 primary key(trip_id,participant_id)
);
create table if not exists a9_votes (
 trip_id uuid not null, participant_id text not null, destination_id text not null,
 score integer check(score between 1 and 5), version bigint not null default 1,
 primary key(trip_id,participant_id,destination_id),
 foreign key(trip_id,participant_id) references a9_profiles(trip_id,participant_id) on delete cascade
);
create table if not exists a9_preferences (
 trip_id uuid not null, participant_id text not null, theme_id text not null,
 score integer check(score between 0 and 3), version bigint not null default 1,
 primary key(trip_id,participant_id,theme_id),
 foreign key(trip_id,participant_id) references a9_profiles(trip_id,participant_id) on delete cascade
);
create table if not exists a9_sections (
 trip_id uuid references a9_trips(id) on delete cascade,
 section_name text check(section_name in ('settings','selected','notes')),
 value jsonb not null, version bigint not null default 1,
 primary key(trip_id,section_name)
);
create or replace function a9_snapshot(p_hash text) returns jsonb
language sql volatile security invoker set search_path=public as $$
 select jsonb_build_object('revision',t.revision,'fields',coalesce(f.fields,'{}'::jsonb),'versions',coalesce(f.versions,'{}'::jsonb))
 from a9_trips t cross join lateral (
  select jsonb_object_agg(x.key,x.value) fields,jsonb_object_agg(x.key,x.version) versions
  from (
   select 'profile:'||participant_id key,to_jsonb(display_name) value,version from a9_profiles where trip_id=t.id
   union all select 'vote:'||participant_id||':'||destination_id,to_jsonb(score),version from a9_votes where trip_id=t.id
   union all select 'theme:'||participant_id||':'||theme_id,to_jsonb(score),version from a9_preferences where trip_id=t.id
   union all select section_name,value,version from a9_sections where trip_id=t.id
  ) x
 ) f where t.access_hash=p_hash
$$;
create or replace function a9_apply(p_hash text,p_ops jsonb,p_revision bigint default null) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare t a9_trips; op jsonb; k text; person text; item text; actual bigint; v jsonb;
begin
 select * into t from a9_trips where access_hash=p_hash for update;
 if not found then return null; end if;
 if p_revision is not null and t.revision<>p_revision then raise exception 'conflict' using errcode='40001'; end if;
 if jsonb_typeof(p_ops)<>'array' or jsonb_array_length(p_ops)>1000 then raise exception 'invalid operations'; end if;
 -- Locking the trip serializes small transactions, while field versions allow
 -- unrelated simultaneous votes to succeed without overwriting each other.
 for op in select value from jsonb_array_elements(p_ops) loop
  k:=op->>'key'; person:=split_part(k,':',2); item:=split_part(k,':',3); actual:=null;
  if k like 'profile:%' then select version into actual from a9_profiles where trip_id=t.id and participant_id=person;
  elsif k like 'vote:%' then select version into actual from a9_votes where trip_id=t.id and participant_id=person and destination_id=item;
  elsif k like 'theme:%' then select version into actual from a9_preferences where trip_id=t.id and participant_id=person and theme_id=item;
  elsif k in ('settings','selected','notes') then select version into actual from a9_sections where trip_id=t.id and section_name=k;
  else raise exception 'invalid field'; end if;
  if coalesce(actual,0)<>(op->>'version')::bigint then raise exception 'conflict' using errcode='40001'; end if;
 end loop;
 -- Profiles first so initial import obeys foreign keys, regardless of JSON order.
 for op in select value from jsonb_array_elements(p_ops) order by case when value->>'key' like 'profile:%' then 0 else 1 end loop
  k:=op->>'key'; person:=split_part(k,':',2); item:=split_part(k,':',3);v:=op->'value';
  if k like 'profile:%' then
   insert into a9_profiles values(t.id,person,op->>'value',1) on conflict(trip_id,participant_id) do update set display_name=excluded.display_name,version=a9_profiles.version+1;
  elsif k like 'vote:%' then
   insert into a9_votes values(t.id,person,item,(op->>'value')::integer,1) on conflict(trip_id,participant_id,destination_id) do update set score=excluded.score,version=a9_votes.version+1;
  elsif k like 'theme:%' then
   insert into a9_preferences values(t.id,person,item,(op->>'value')::integer,1) on conflict(trip_id,participant_id,theme_id) do update set score=excluded.score,version=a9_preferences.version+1;
  else
   insert into a9_sections values(t.id,k,v,1) on conflict(trip_id,section_name) do update set value=excluded.value,version=a9_sections.version+1;
  end if;
 end loop;
 update a9_trips set revision=revision+1 where id=t.id;
 return a9_snapshot(p_hash);
end $$;
-- No public execution; grant only the existing server role below.
revoke all on function a9_snapshot(text) from public;
revoke all on function a9_apply(text,jsonb,bigint) from public;
-- The existing server connection uses this role. Grant access only to the new
-- travel tables; never grant schema creation or rights over the legacy tables.
grant select,insert,update,delete on a9_trips,a9_profiles,a9_votes,a9_preferences,a9_sections to authenticator;
grant execute on function a9_snapshot(text) to authenticator;
grant execute on function a9_apply(text,jsonb,bigint) to authenticator;
