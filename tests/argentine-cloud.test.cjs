const test=require('node:test'),assert=require('node:assert/strict');
const {create,flatten,overlay}=require('../src/argentine/cloud.js');
const E=require('../src/argentine/engine.cjs')(require('../data/argentine/catalog.json'));
const copy=x=>JSON.parse(JSON.stringify(x));
function backend(){
 let snapshot={state:E.defaultState(),versions:{},revision:0},offline=false,loseReply=false;
 const response=(status,data)=>({ok:status<400,status,json:async()=>copy(data)});
 return {get:()=>copy(snapshot),offline:v=>offline=v,loseReply:()=>loseReply=true,fetch:async(_url,req)=>{
  if(offline)throw Error('offline');
  if(req.method==='GET')return response(200,snapshot);
  const body=JSON.parse(req.body);
  if(req.method==='PUT'){
   if(body.revision!==snapshot.revision)return response(409,{snapshot});
   const values=flatten(body.backup.state);for(const k of new Set([...Object.keys(snapshot.versions),...Object.keys(values)]))snapshot.versions[k]=(snapshot.versions[k]||0)+1;
   snapshot.state=copy(body.backup.state);snapshot.revision++;return response(200,snapshot);
  }
  if(body.operations.some(op=>(snapshot.versions[op.key]||0)!==op.version))return response(409,{snapshot});
  snapshot.state=overlay(snapshot.state,Object.fromEntries(body.operations.map(op=>[op.key,op])));
  for(const op of body.operations)snapshot.versions[op.key]=(snapshot.versions[op.key]||0)+1;
  snapshot.revision++;
  if(loseReply){loseReply=false;throw Error('reply lost');}
  return response(200,snapshot);
 }};
}
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};};
const client=(db,cache=storage())=>create({snapshot:db.get(),fetch:db.fetch,url:'test',key:'pending',storage:cache});
function vote(c,p,id,n){const s=c.view();if(n===null)delete s.profiles[p].votes[id];else s.profiles[p].votes[id]=n;c.record(s);}
test('simultaneous participants and destinations preserve independent votes',async()=>{const db=backend(),a=client(db),b=client(db);vote(a,0,'ba',5);vote(b,1,'ba',2);await Promise.all([a.flush(),b.flush()]);await a.refresh();await b.refresh();assert.deepEqual(a.view(),b.view());assert.equal(a.view().profiles[0].votes.ba,5);assert.equal(a.view().profiles[1].votes.ba,2);});
test('same field conflict requires an explicit choice',async()=>{const db=backend(),a=client(db),b=client(db);vote(a,0,'ba',5);vote(b,0,'ba',1);await a.flush();await b.flush();assert.deepEqual(b.status().conflicts,['vote:p1:ba']);assert.equal(db.get().state.profiles[0].votes.ba,5);b.resolve(false);assert.equal(b.view().profiles[0].votes.ba,5);assert.equal(b.status().count,0);});
test('keeping a conflicted edit uses the latest version',async()=>{const db=backend(),a=client(db),b=client(db);vote(a,0,'ba',5);vote(b,0,'ba',1);await a.flush();await b.flush();b.resolve(true);await new Promise(resolve=>setImmediate(resolve));assert.equal(db.get().state.profiles[0].votes.ba,1);assert.equal(b.status().count,0);});
test('offline work survives reload and does not overwrite others',async()=>{const db=backend(),cache=storage(),a=client(db,cache);db.offline(true);vote(a,0,'chalten',5);await a.flush();assert.equal(a.status().offline,true);db.offline(false);const b=client(db);vote(b,1,'iguazu',4);await b.flush();const restored=client(db,cache);assert.equal(restored.view().profiles[0].votes.chalten,5);await restored.flush();assert.equal(db.get().state.profiles[1].votes.iguazu,4);});
test('lost success response is reconciled without duplicate write',async()=>{const db=backend(),a=client(db);db.loseReply();vote(a,0,'ba',5);await a.flush();const revision=db.get().revision;assert.equal(a.status().offline,true);await a.refresh();assert.equal(a.status().count,0);assert.equal(db.get().revision,revision);});
test('deleting a vote is distinct from a score of 1 and keeps version history',async()=>{const db=backend(),a=client(db);vote(a,0,'ba',1);await a.flush();vote(a,0,'ba',null);await a.flush();assert.equal(Object.hasOwn(db.get().state.profiles[0].votes,'ba'),false);assert.equal(db.get().versions['vote:p1:ba'],2);});
test('active participant is local and never submitted',async()=>{const db=backend(),a=client(db);const s=a.view();s.active='p8';a.record(s);await a.flush();assert.equal(db.get().revision,0);});
test('stale backup restoration cannot erase newer group votes',async()=>{const db=backend(),a=client(db),b=client(db),revision=a.revision();vote(b,2,'ba',4);await b.flush();await assert.rejects(a.restore(E.defaultState(),revision),/groupe a modifié/);assert.equal(db.get().state.profiles[2].votes.ba,4);});
test('new edits during an in-flight save survive its acknowledgement',async()=>{const db=backend();let release;const gate=new Promise(r=>release=r);const a=create({snapshot:db.get(),url:'test',key:'pending',storage:storage(),fetch:async(u,r)=>{await gate;return db.fetch(u,r);}});vote(a,0,'ba',5);const first=a.flush();vote(a,0,'ba',2);release();await first;await a.flush();assert.equal(db.get().state.profiles[0].votes.ba,2);assert.equal(a.status().count,0);});
