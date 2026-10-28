/* Shared storage adapter. Browser UI and server scoring remain independent. */
(function(root){
 'use strict';
 const clone=x=>JSON.parse(JSON.stringify(x));
 const equal=(a,b)=>JSON.stringify(a??null)===JSON.stringify(b??null);
 function flatten(s){const out={settings:s.settings,selected:s.selected,notes:s.notes};for(const p of s.profiles){out['profile:'+p.id]=p.name;for(const [k,v]of Object.entries(p.votes))out[`vote:${p.id}:${k}`]=v;for(const[k,v]of Object.entries(p.themes))out[`theme:${p.id}:${k}`]=v;}return out;}
 function overlay(s,entries){s=clone(s);for(const [key,op]of Object.entries(entries)){const v=op.value,[kind,id,item]=key.split(':');if(['settings','selected','notes'].includes(key))s[key]=clone(v);else{const p=s.profiles.find(p=>p.id===id);if(!p)continue;if(kind==='profile')p.name=v;else{const target=kind==='vote'?p.votes:p.themes;if(v===null)delete target[item];else target[item]=v;}}}return s;}
 function create(options){
  let snapshot=clone(options.snapshot),pending={},conflicts=new Set(),busy=false,offline=false,timer=null;
  const request=options.fetch||fetch,storage=options.storage,key=options.key;
  const persist=()=>{try{storage?.setItem(key,JSON.stringify({pending}));}catch{}};
  try{const cache=JSON.parse(storage?.getItem(key)||'null');if(cache?.pending&&typeof cache.pending==='object')pending=cache.pending;}catch{}
  const view=()=>overlay(snapshot.state,pending);
  function status(){return {busy,offline,count:Object.keys(pending).length,conflicts:[...conflicts]};}
  function emit(changed=true){persist();options.onStatus?.(status());if(changed)options.onChange?.(view());}
  function reconcile(next){
   snapshot=next;const fields=flatten(next.state);conflicts.clear();
   for(const[k,op]of Object.entries(pending)){
    if(equal(fields[k],op.value)){delete pending[k];continue;}
    if((next.versions[k]||0)!==op.version)conflicts.add(k);
   }
  }
  function record(state){
   const before=flatten(view()),after=flatten(state);
   for(const k of new Set([...Object.keys(before),...Object.keys(after)])){
    if(equal(before[k],after[k]))continue;
    pending[k]={value:clone(after[k]??null),version:pending[k]?.version??snapshot.versions[k]??0};
   }
   emit(false);clearTimeout(timer);timer=setTimeout(flush,180);
  }
  async function response(method,body){
   const res=await request(options.url,{method,cache:'no-store',headers:{'Content-Type':'application/json','X-Argentine-Client':'1'},...(body?{body:JSON.stringify(body)}:{})});
   const data=await res.json();return {res,data};
  }
  async function flush(){
   clearTimeout(timer);if(busy||conflicts.size||!Object.keys(pending).length)return;
   busy=true;emit(false);const sent=clone(pending);
   try{
    const {res,data}=await response('PATCH',{operations:Object.entries(sent).map(([key,op])=>({key,...op}))});
    if(res.status===409){reconcile(data.snapshot);offline=false;}
    else if(!res.ok){if(res.status>=400&&res.status<500){options.onError?.(data.error||'Ces modifications ne peuvent pas être enregistrées.');for(const k of Object.keys(sent))conflicts.add(k);}else throw Error('storage unavailable');}
    else{
     for(const [k,op]of Object.entries(sent)){if(!pending[k])continue;if(equal(pending[k].value,op.value))delete pending[k];else pending[k].version=data.versions[k]||0;}
     snapshot=data;offline=false;
    }
   }catch{offline=true;}
   finally{busy=false;emit();}
   if(!offline&&!conflicts.size&&Object.keys(pending).length)timer=setTimeout(flush,100);
  }
  async function refresh(){
   if(busy)return;busy=true;
   try{const {res,data}=await response('GET');if(!res.ok)throw Error('offline');const changed=data.revision!==snapshot.revision;reconcile(data);offline=false;busy=false;emit(changed||Object.keys(pending).length>0);if(Object.keys(pending).length&&!conflicts.size)await flush();}
   catch{offline=true;busy=false;emit(false);}
  }
  async function restore(state,revision){
   if(busy||Object.keys(pending).length)throw Error('Attendez la fin de l’enregistrement ou résolvez les saisies en attente.');
   busy=true;emit(false);
   try{
    const {res,data}=await response('PUT',{backup:{format:'argentine-a9',version:1,state},revision});
    if(res.status===409){reconcile(data.snapshot);throw Error('Le groupe a modifié ses réponses depuis cet aperçu. Importez de nouveau le fichier pour vérifier les changements.');}
    if(!res.ok)throw Error(data.error||'Restauration impossible.');
    snapshot=data;offline=false;return view();
   }finally{busy=false;emit();}
  }
  function resolve(keepMine){
   for(const k of conflicts){if(keepMine)pending[k].version=snapshot.versions[k]||0;else delete pending[k];}
   conflicts.clear();emit();if(keepMine)flush();
  }
  reconcile(snapshot);
  return {view,record,flush,refresh,restore,resolve,status,revision:()=>snapshot.revision,conflictDetails:()=>[...conflicts].map(key=>({key,mine:pending[key]?.value,theirs:flatten(snapshot.state)[key]??null})),start:()=>{emit();if(Object.keys(pending).length)flush();}};
 }
 const api={create,flatten,overlay};if(typeof module!=='undefined')module.exports=api;else root.A9Cloud=api;
})(typeof window!=='undefined'?window:globalThis);
