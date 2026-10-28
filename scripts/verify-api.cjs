// Run only against the isolated QA trip created from a fictional fixture.
const fs=require('node:fs'),assert=require('node:assert/strict');
const origin=process.argv[2],file=process.argv[3];
if(!origin||!file)throw Error('Usage: node scripts/verify-api.cjs <origin> <private QA link file>');
const {slug,seed}=JSON.parse(fs.readFileSync(file,'utf8'));
if(!seed.startsWith('qa-'))throw Error('Only a QA trip can be tested.');
const url=origin+'/api/voyages/'+slug;
const call=async(method,body,overrides={})=>{const res=await fetch(url,{method,headers:{Origin:origin,'Content-Type':'application/json','X-Argentine-Client':'1',...overrides},...(body?{body:JSON.stringify(body)}:{})});return {status:res.status,body:await res.json(),headers:res.headers};};
(async()=>{
 let initial=await call('GET');assert.equal(initial.status,200);assert.match(initial.headers.get('cache-control'),/no-store/);
 const a={key:'vote:p1:ba',value:5,version:initial.body.versions['vote:p1:ba']||0},b={key:'vote:p2:iguazu',value:2,version:initial.body.versions['vote:p2:iguazu']||0};
 const both=await Promise.all([call('PATCH',{operations:[a]}),call('PATCH',{operations:[b]})]);assert.deepEqual(both.map(r=>r.status),[200,200]);
 let now=await call('GET');assert.equal(now.body.state.profiles[0].votes.ba,5);assert.equal(now.body.state.profiles[1].votes.iguazu,2);
 assert.equal((await call('PATCH',{operations:[{...a,value:1}]})).status,409);
 assert.equal((await call('PATCH',{operations:[{key:'vote:p1:unknown',value:5,version:0}]})).status,400);
 assert.equal((await call('PATCH',{operations:[{key:'vote:p1:ba',value:6,version:0}]})).status,400);
 assert.equal((await call('PATCH',{operations:[{key:'vote:p1:ba',value:5,version:0}]},{Origin:'https://invalid.example'})).status,403);
 assert.equal((await fetch(origin+'/api/voyages/invalid')).status,404);
 const wrong='argentine-'+'0'.repeat(48);assert.equal((await fetch(origin+'/api/voyages/'+wrong)).status,404);
 assert.equal((await call('PUT',{backup:{format:'argentine-a9',version:1,state:initial.body.state},revision:initial.body.revision})).status,409);
 now=await call('GET');
 const restored=await call('PUT',{backup:{format:'argentine-a9',version:1,state:initial.body.state},revision:now.body.revision});assert.equal(restored.status,200);assert.deepEqual(restored.body.state,initial.body.state);
 console.log('API verified: concurrent writes, conflicts, validation, origin, invalid links, atomic restore and private caching.');
})().catch(error=>{console.error('API verification failed:',error.message);process.exitCode=1;});
