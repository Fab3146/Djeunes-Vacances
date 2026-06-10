-- Voyage djeunes - Neon Postgres schema
-- Recommended order in Neon SQL Editor:
-- 1. Run this whole file on the target branch/database.
-- 2. Keep the generated demo trip slug: demo-les-djeuns-2026.
-- 3. Set DATABASE_URL locally, then open /db-test.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  edition_year int not null check (edition_year between 2024 and 2100),
  description text,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{15,120}$'),
  status text not null default 'brainstorming' check (
    status in (
      'brainstorming',
      'vote_dates',
      'vote_destinations',
      'vote_logements',
      'preparation_itineraire',
      'verrouille',
      'termine'
    )
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trips_set_updated_at
before update on trips
for each row execute function set_updated_at();

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  color text not null default '#126b64' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  avatar_emoji text,
  avatar_seed text,
  budget_preference text,
  style_preferences jsonb not null default '[]'::jsonb check (jsonb_typeof(style_preferences) = 'array'),
  can_drive boolean not null default false,
  likes_beach boolean not null default false,
  likes_food boolean not null default false,
  likes_hiking boolean not null default false,
  likes_roadtrip boolean not null default false,
  likes_party boolean not null default false,
  wants_comfort boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, trip_id)
);

create unique index if not exists participants_trip_name_unique
on participants (trip_id, lower(display_name));

create table if not exists availabilities (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null,
  participant_id uuid not null,
  date date not null,
  status text not null check (status in ('available', 'maybe', 'unavailable')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (trip_id) references trips(id) on delete cascade,
  foreign key (participant_id, trip_id) references participants(id, trip_id) on delete cascade,
  unique (participant_id, date)
);

create trigger availabilities_set_updated_at
before update on availabilities
for each row execute function set_updated_at();

create table if not exists destinations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 140),
  country text,
  region text,
  city text,
  description text,
  budget_estimate text,
  ideal_duration_days int check (ideal_duration_days is null or ideal_duration_days between 1 and 60),
  best_season text,
  vacation_styles jsonb not null default '[]'::jsonb check (jsonb_typeof(vacation_styles) = 'array'),
  cover_image_url text,
  gallery_urls jsonb not null default '[]'::jsonb check (jsonb_typeof(gallery_urls) = 'array'),
  why_this_destination text,
  highlights text,
  constraints text,
  notes text,
  created_by_member_id uuid,
  created_at timestamptz not null default now(),
  unique (id, trip_id),
  foreign key (created_by_member_id, trip_id) references participants(id, trip_id) on delete set null (created_by_member_id)
);

create table if not exists destination_votes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null,
  destination_id uuid not null,
  participant_id uuid not null,
  score int not null check (score between 1 and 5),
  recommendation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (trip_id) references trips(id) on delete cascade,
  foreign key (destination_id, trip_id) references destinations(id, trip_id) on delete cascade,
  foreign key (participant_id, trip_id) references participants(id, trip_id) on delete cascade,
  unique (destination_id, participant_id)
);

create trigger destination_votes_set_updated_at
before update on destination_votes
for each row execute function set_updated_at();

create table if not exists lodgings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  destination_id uuid,
  title text not null check (char_length(title) between 2 and 180),
  external_url text,
  total_price numeric(10,2) check (total_price is null or total_price >= 0),
  price_per_person numeric(10,2) check (price_per_person is null or price_per_person >= 0),
  sleeps_count int check (sleeps_count is null or sleeps_count >= 0),
  bedrooms_count int check (bedrooms_count is null or bedrooms_count >= 0),
  amenities jsonb not null default '[]'::jsonb check (jsonb_typeof(amenities) = 'array'),
  pros text,
  cons text,
  cover_image_url text,
  address_text text,
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),
  notes text,
  created_by_member_id uuid,
  created_at timestamptz not null default now(),
  unique (id, trip_id),
  foreign key (destination_id, trip_id) references destinations(id, trip_id) on delete set null (destination_id),
  foreign key (created_by_member_id, trip_id) references participants(id, trip_id) on delete set null (created_by_member_id)
);

create table if not exists lodging_votes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null,
  lodging_id uuid not null,
  participant_id uuid not null,
  score int not null check (score between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (trip_id) references trips(id) on delete cascade,
  foreign key (lodging_id, trip_id) references lodgings(id, trip_id) on delete cascade,
  foreign key (participant_id, trip_id) references participants(id, trip_id) on delete cascade,
  unique (lodging_id, participant_id)
);

create trigger lodging_votes_set_updated_at
before update on lodging_votes
for each row execute function set_updated_at();

create table if not exists itinerary_segments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 140),
  day_number int check (day_number is null or day_number > 0),
  segment_type text not null default 'day' check (segment_type in ('day', 'transfer', 'zone', 'custom')),
  start_location text,
  end_location text,
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (id, trip_id)
);

create table if not exists itinerary_points (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  segment_id uuid,
  title text not null check (char_length(title) between 2 and 180),
  category text not null check (char_length(category) between 1 and 80),
  subcategory text,
  address_text text,
  google_maps_url text,
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),
  description text,
  notes text,
  estimated_cost numeric(10,2) check (estimated_cost is null or estimated_cost >= 0),
  estimated_duration_minutes int check (estimated_duration_minutes is null or estimated_duration_minutes >= 0),
  day_number int check (day_number is null or day_number > 0),
  daytime_slot text check (daytime_slot is null or daytime_slot in ('morning', 'lunch', 'afternoon', 'sunset', 'evening', 'night')),
  priority text check (priority is null or priority in ('must', 'nice', 'bonus')),
  status text check (status is null or status in ('idea', 'shortlisted', 'booked', 'done', 'canceled')),
  tags jsonb not null default '[]'::jsonb check (jsonb_typeof(tags) = 'array'),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  foreign key (segment_id, trip_id) references itinerary_segments(id, trip_id) on delete set null (segment_id)
);

create index if not exists trips_slug_idx on trips (slug);
create index if not exists participants_trip_idx on participants (trip_id);
create index if not exists availabilities_trip_date_idx on availabilities (trip_id, date);
create index if not exists availabilities_participant_date_idx on availabilities (participant_id, date);
create index if not exists destinations_trip_created_idx on destinations (trip_id, created_at);
create unique index if not exists destinations_trip_name_unique on destinations (trip_id, lower(name));
create index if not exists destinations_styles_gin_idx on destinations using gin (vacation_styles);
create index if not exists destination_votes_trip_idx on destination_votes (trip_id);
create index if not exists destination_votes_destination_idx on destination_votes (destination_id);
create index if not exists lodgings_trip_idx on lodgings (trip_id);
create unique index if not exists lodgings_trip_title_unique on lodgings (trip_id, lower(title));
create index if not exists lodgings_destination_idx on lodgings (destination_id);
create index if not exists lodging_votes_trip_idx on lodging_votes (trip_id);
create index if not exists itinerary_segments_trip_sort_idx on itinerary_segments (trip_id, sort_order, day_number);
create unique index if not exists itinerary_segments_trip_title_unique on itinerary_segments (trip_id, lower(title));
create index if not exists itinerary_points_trip_day_idx on itinerary_points (trip_id, day_number, sort_order);
create index if not exists itinerary_points_segment_idx on itinerary_points (segment_id, sort_order);
create index if not exists itinerary_points_category_idx on itinerary_points (trip_id, category);
create index if not exists itinerary_points_status_idx on itinerary_points (trip_id, status);
create index if not exists itinerary_points_priority_idx on itinerary_points (trip_id, priority);
create index if not exists itinerary_points_tags_gin_idx on itinerary_points using gin (tags);
create index if not exists itinerary_points_title_trgm_idx on itinerary_points using gin (title gin_trgm_ops);
create unique index if not exists itinerary_points_trip_title_category_unique on itinerary_points (trip_id, lower(title), lower(category));

do $$
declare
  v_trip uuid;
  v_flavien uuid;
  v_manon uuid;
  v_alex uuid;
  v_corse uuid;
  v_porto uuid;
  v_lodging uuid;
  v_day1 uuid;
  v_day2 uuid;
  v_transfer uuid;
begin
  insert into trips (name, edition_year, description, slug, status)
  values (
    'Vacances des Djeuns',
    2026,
    'Démo réaliste pour choisir les dates, voter les destinations, comparer les logements et préparer un road trip.',
    'demo-les-djeuns-2026',
    'preparation_itineraire'
  )
  on conflict (slug) do update set name = excluded.name
  returning id into v_trip;

  insert into participants (
    trip_id, display_name, color, avatar_emoji, budget_preference, style_preferences,
    can_drive, likes_beach, likes_food, likes_hiking, likes_roadtrip, likes_party, wants_comfort
  )
  values
    (v_trip, 'Flavien', '#126b64', '☀️', 'flexible', '["roadtrip","food","plage"]', true, true, true, false, true, true, true),
    (v_trip, 'Manon', '#df644a', '🌊', 'confort', '["plage","culture","food"]', false, true, true, false, false, false, true),
    (v_trip, 'Alex', '#6e8f4f', '⛰️', 'éco', '["rando","roadtrip","nature"]', true, false, true, true, true, false, false)
  on conflict do nothing;

  select id into v_flavien from participants where trip_id = v_trip and display_name = 'Flavien';
  select id into v_manon from participants where trip_id = v_trip and display_name = 'Manon';
  select id into v_alex from participants where trip_id = v_trip and display_name = 'Alex';

  insert into availabilities (trip_id, participant_id, date, status)
  select v_trip, v_flavien, d::date, 'available'
  from generate_series('2026-07-10'::date, '2026-07-24'::date, interval '1 day') d
  on conflict (participant_id, date) do nothing;

  insert into availabilities (trip_id, participant_id, date, status)
  select v_trip, v_manon, d::date, 'available'
  from generate_series('2026-07-14'::date, '2026-07-28'::date, interval '1 day') d
  on conflict (participant_id, date) do nothing;

  insert into availabilities (trip_id, participant_id, date, status)
  select v_trip, v_alex, d::date, 'maybe'
  from generate_series('2026-07-12'::date, '2026-07-26'::date, interval '1 day') d
  on conflict (participant_id, date) do nothing;

  insert into destinations (
    trip_id, name, country, region, city, description, budget_estimate, ideal_duration_days,
    best_season, vacation_styles, cover_image_url, why_this_destination, highlights, constraints, created_by_member_id
  )
  values
    (
      v_trip, 'Corse du Sud', 'France', 'Méditerranée', 'Bonifacio',
      'Plages, villages, petites randos et routes panoramiques.',
      '€€', 8, 'juin à septembre', '["plage","rando","roadtrip","food"]',
      'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80',
      'Très bon compromis entre chill et exploration.',
      'Bonifacio, Bavella, Palombaggia, criques.',
      'Voiture quasi obligatoire et prix hauts en pleine saison.',
      v_flavien
    ),
    (
      v_trip, 'Porto et vallée du Douro', 'Portugal', 'Nord', 'Porto',
      'Ville vivante puis échappée dans le Douro.',
      '€€', 6, 'mai à octobre', '["culture","food","fiesta"]',
      'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=1200&q=80',
      'Facile à organiser, très bon food/bar, budget raisonnable.',
      'Ribeira, caves de Gaia, train dans le Douro.',
      'Moins plage et road trip que la Corse.',
      v_manon
    )
  on conflict do nothing;

  select id into v_corse from destinations where trip_id = v_trip and name = 'Corse du Sud';
  select id into v_porto from destinations where trip_id = v_trip and name = 'Porto et vallée du Douro';

  insert into destination_votes (trip_id, destination_id, participant_id, score, recommendation)
  values
    (v_trip, v_corse, v_flavien, 5, 'Le meilleur équilibre pour tout le monde.'),
    (v_trip, v_corse, v_manon, 4, 'Très envie mais attention budget.'),
    (v_trip, v_corse, v_alex, 5, 'Bavella + routes = oui.'),
    (v_trip, v_porto, v_flavien, 4, 'Option facile et food solide.'),
    (v_trip, v_porto, v_manon, 5, 'Très simple niveau logistique.')
  on conflict (destination_id, participant_id) do nothing;

  insert into lodgings (
    trip_id, destination_id, title, external_url, total_price, price_per_person,
    sleeps_count, bedrooms_count, amenities, pros, cons, address_text, created_by_member_id
  )
  values
    (
      v_trip, v_corse, 'Maison proche Porto-Vecchio',
      'https://example.com/maison-porto-vecchio', 2800, 467, 8, 4,
      '["parking","clim","terrasse","lave-linge"]',
      'Bonne capacité, proche plages, pratique pour rayonner.',
      'Voiture obligatoire, acompte élevé.',
      'Porto-Vecchio, Corse',
      v_flavien
    )
  on conflict do nothing
  returning id into v_lodging;

  if v_lodging is null then
    select id into v_lodging from lodgings where trip_id = v_trip and title = 'Maison proche Porto-Vecchio';
  end if;

  insert into lodging_votes (trip_id, lodging_id, participant_id, score)
  values
    (v_trip, v_lodging, v_flavien, 5),
    (v_trip, v_lodging, v_manon, 4),
    (v_trip, v_lodging, v_alex, 4)
  on conflict (lodging_id, participant_id) do nothing;

  insert into itinerary_segments (trip_id, title, day_number, segment_type, start_location, end_location, sort_order, notes)
  values
    (v_trip, 'Jour 1 · Arrivée Ajaccio', 1, 'day', 'Aéroport Ajaccio', 'Ajaccio', 1, 'Récupérer voiture, courses, installation.'),
    (v_trip, 'Jour 2 · Bonifacio et plages', 2, 'day', 'Porto-Vecchio', 'Bonifacio', 2, 'Départ tôt pour éviter la foule.'),
    (v_trip, 'Transfert Bavella', 3, 'transfer', 'Porto-Vecchio', 'Bavella', 3, 'Route panoramique avec arrêts photo.')
  on conflict do nothing;

  select id into v_day1 from itinerary_segments where trip_id = v_trip and title = 'Jour 1 · Arrivée Ajaccio';
  select id into v_day2 from itinerary_segments where trip_id = v_trip and title = 'Jour 2 · Bonifacio et plages';
  select id into v_transfer from itinerary_segments where trip_id = v_trip and title = 'Transfert Bavella';

  insert into itinerary_points (
    trip_id, segment_id, title, category, subcategory, address_text, latitude, longitude,
    description, estimated_duration_minutes, day_number, daytime_slot, priority, status, tags, sort_order
  )
  values
    (v_trip, v_day1, 'Aéroport Ajaccio Napoléon Bonaparte', 'arrêt route', 'arrivée', 'Aéroport Ajaccio', 41.9236, 8.8029, 'Point de départ du séjour.', 45, 1, 'morning', 'must', 'booked', '["logistique","voiture"]', 1),
    (v_trip, v_day1, 'Supermarché avant route', 'supermarché', 'courses', 'Ajaccio', null, null, 'Courses communes avant de rejoindre le logement.', 45, 1, 'afternoon', 'must', 'idea', '["budget","groupe"]', 2),
    (v_trip, v_day2, 'Falaises de Bonifacio', 'point de vue', 'photo', 'Bonifacio', 41.3872, 9.1594, 'Balade et photos avant déjeuner.', 120, 2, 'morning', 'must', 'shortlisted', '["vue","photo"]', 1),
    (v_trip, v_day2, 'Restaurant port de Bonifacio', 'restaurant', 'déjeuner', 'Bonifacio Marina', null, null, 'Choisir selon dispos et budget.', 90, 2, 'lunch', 'nice', 'idea', '["food","poisson"]', 2),
    (v_trip, v_day2, 'Plage de Palombaggia', 'plage', 'baignade', 'Palombaggia', 41.5578, 9.3363, 'Après-midi plage claire, jeux, chill.', 180, 2, 'afternoon', 'must', 'shortlisted', '["plage","baignade"]', 3),
    (v_trip, v_transfer, 'Station essence Porto-Vecchio', 'station-service', 'carburant', 'Porto-Vecchio', null, null, 'Faire le plein avant Bavella.', 15, 3, 'morning', 'must', 'idea', '["route"]', 1),
    (v_trip, v_transfer, 'Col de Bavella', 'rando', 'montagne', 'Aiguilles de Bavella', 41.795, 9.224, 'Option rando selon météo et niveau du groupe.', 240, 3, 'afternoon', 'nice', 'idea', '["rando","montagne","vue"]', 2),
    (v_trip, v_transfer, 'Spot sunset route de Zonza', 'spot photo', 'sunset', 'Zonza', null, null, 'Arrêt photo si timing OK.', 30, 3, 'sunset', 'bonus', 'idea', '["sunset","photo"]', 3)
  on conflict do nothing;
end $$;
