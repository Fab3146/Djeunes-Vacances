/* Pure planning engine. No network calls, storage or DOM access. */
function createEngine(DATA) {
 const byId=Object.fromEntries(DATA.destinations.map(d=>[d.id,d]));
 const DAY=86400000;
 const clone=x=>JSON.parse(JSON.stringify(x));
 const dateNumber=s=>Date.parse(s+'T12:00:00Z');
 const plusDays=(s,n)=>new Date(dateNumber(s)+n*DAY).toISOString().slice(0,10);
 const nightsBetween=(a,b)=>Math.round((dateNumber(b)-dateNumber(a))/DAY);
 const validDate=s=>typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(dateNumber(s)) && new Date(dateNumber(s)).toISOString().slice(0,10)===s;
 function defaultState(){return {version:1,active:'p1',profiles:Array.from({length:9},(_,i)=>({id:'p'+(i+1),name:'Voyageur '+(i+1),themes:{},votes:{}})),settings:{arrival:'2027-02-04',departure:'2027-02-16',maxDrive:5,confirmed:false},selected:null,notes:''};}
 const hasAnswered=p=>Object.keys(p.themes).length>0 || Object.keys(p.votes).length>0;
 function placeScore(p,id){
  if(Object.hasOwn(p.votes,id)) return (p.votes[id]-1)/4;
  const tags=byId[id].tags.filter(t=>Object.hasOwn(p.themes,t));
  return tags.length ? tags.reduce((s,t)=>s+p.themes[t]/3,0)/tags.length : .5;
 }
 function votesFor(state,id){const votes=state.profiles.filter(p=>Object.hasOwn(p.votes,id)).map(p=>({name:p.name,score:p.votes[id],id:p.id}));return {votes,count:votes.length,average:votes.length?votes.reduce((s,v)=>s+v.score,0)/votes.length:null,spread:votes.length>1?Math.max(...votes.map(v=>v.score))-Math.min(...votes.map(v=>v.score)):0};}
 function affinity(state,stops){
  const stays=stops.filter(s=>!byId[s.id].transit);
  const responses=state.profiles.filter(hasAnswered).map(p=>({id:p.id,name:p.name,value:stays.reduce((sum,s)=>sum+placeScore(p,s.id)*s.nights,0)/Math.max(1,stays.reduce((s,t)=>s+t.nights,0))}));
  return {score:responses.length?responses.reduce((s,p)=>s+p.value,0)/responses.length:null,responses};
 }
 const leg=(a,b)=>a===b?{km:0,minutes:0,baseMinutes:0,source:'Même lieu'}:DATA.legs[a+'|'+b]||null;
 const breaks=minutes=>minutes>=120?Math.floor(minutes/120)*20:0;
 function settingsErrors(settings){
  const errors=[];
  if(!validDate(settings.arrival)||!validDate(settings.departure)) errors.push('Renseigner des dates valides.');
  else {
   if(settings.arrival<'2027-02-03'||settings.departure>'2027-02-17') errors.push('Les dates sur place doivent rester entre le 3 et le 17 février 2027.');
   if(nightsBetween(settings.arrival,settings.departure)<2) errors.push('Prévoir au moins deux nuits sur place.');
  }
  if(!Number.isFinite(settings.maxDrive)||settings.maxDrive<1||settings.maxDrive>8) errors.push('La limite de conduite doit être comprise entre 1 et 8 heures.');
  return errors;
 }
 function allocate(state,t,ids){
  const stops=t.stops.map((slot,i)=>({id:ids?ids[i]:slot.id,nights:slot.min}));
  let left=nightsBetween(state.settings.arrival,state.settings.departure)-stops.reduce((s,x)=>s+x.nights,0);
  const candidates=stops.map((s,i)=>i).filter(i=>t.focus.includes(stops[i].id)&&i!==stops.length-1);
  while(left>0&&candidates.length){
   const respondents=state.profiles.filter(hasAnswered);
   const rank=i=>((respondents.length?respondents.reduce((s,p)=>s+placeScore(p,stops[i].id),0)/respondents.length:.5)+.3)/(stops[i].nights+.5);
   const best=[...candidates].sort((a,b)=>rank(b)-rank(a)||a-b)[0];
   stops[best].nights++;left--;
  }
  return {templateId:t.id,stops};
 }
 function schedule(state,route){
  const days=[];let cursor=state.settings.arrival;
  for(let i=0;i<route.stops.length;i++){
   const stop=route.stops[i],d=byId[stop.id],incoming=i?leg(route.stops[i-1].id,stop.id):null;
   const used=new Set();
   for(let n=0;n<stop.nights;n++){
    const transfer=n===0?incoming:null,drive=transfer?.minutes||0,pause=breaks(drive);
    const arrival=i===0&&n===0;
    const options=d.activities.map((a,index)=>({...a,index})).filter(a=>!used.has(a.index) && (a.driveMinutes||0)+drive<=state.settings.maxDrive*60 && a.hours*60+drive+pause<=420);
    let activity=null;
    if(!arrival&&drive+pause<240&&options.length){activity=n===0&&drive>0?[...options].sort((a,b)=>a.hours-b.hours)[0]:options[0];used.add(activity.index);}
    const local=activity?.driveMinutes||0;
    days.push({date:cursor,stopIndex:i,id:d.id,night:d.name,transfer,from:i?route.stops[i-1].id:null,drive:drive+local,transferDrive:drive,localDrive:local,pauses:pause+(local?breaks(local):0),activity,title:arrival?'Arrivée & installation':drive+pause>=240?'Route & installation':activity?activity.name:'Du temps pour profiter',tip:arrival?'Récupération du vol, installation et balade légère selon l’heure d’arrivée.':activity?activity.tip:drive+pause>=240?'Garder la fin de journée libre après le trajet.':'Journée libre, activités à choisir selon la météo et les envies.'});
    cursor=plusDays(cursor,1);
   }
  }
  return days;
 }
 function evaluate(state,route){
  const errors=settingsErrors(state.settings),t=DATA.templates.find(t=>t.id===route.templateId);
  if(!t)return {feasible:false,errors:['Circuit inconnu.'],warnings:[],days:[],stops:[],km:0,drive:0};
  if(route.stops.length!==t.stops.length)errors.push('Le nombre d’étapes ne correspond pas au circuit.');
  route.stops.forEach((s,i)=>{
   const slot=t.stops[i];
   if(!byId[s.id]||!slot||![slot.id,...slot.alternatives].includes(s.id))errors.push('Une étape ne fait pas partie de ce circuit.');
   if(!Number.isInteger(s.nights)||s.nights<1||s.nights>14)errors.push('Chaque étape doit avoir entre 1 et 14 nuits.');
   else if(slot&&s.nights<slot.min)errors.push(byId[s.id].name+' : prévoir au moins '+slot.min+' nuit'+(slot.min>1?'s':'')+'.');
  });
  if(errors.some(e=>e.includes('étape ne')||e.includes('14 nuits')||e.includes('nombre d’étapes')))return {feasible:false,errors,warnings:[],days:[],stops:[],km:0,drive:0};
  const expected=nightsBetween(state.settings.arrival,state.settings.departure),total=route.stops.reduce((sum,s)=>sum+s.nights,0);
  if(total!==expected)errors.push(total>expected?`${total-expected} nuit(s) en trop : retirer des nuits ou changer les dates.`:`${expected-total} nuit(s) à affecter : ajouter des nuits ou rééquilibrer.`);
  let km=0,drive=0,transfers=0;const segments=[];
  for(let i=1;i<route.stops.length;i++){
   const a=route.stops[i-1].id,b=route.stops[i].id,l=leg(a,b);
   if(!l){errors.push('Trajet non documenté : '+byId[a].name+' → '+byId[b].name+'.');continue;}
   km+=l.km;drive+=l.minutes;if(l.minutes>0)transfers++;
   segments.push({...l,from:a,to:b});
   if(l.minutes>state.settings.maxDrive*60)errors.push(byId[a].name+' → '+byId[b].name+' : '+formatTime(l.minutes)+' de conduite, au-delà de la limite.');
  }
  const days=validDate(state.settings.arrival)?schedule(state,route):[];
  const lastArrival=days.find(d=>d.stopIndex===route.stops.length-1)?.date;
  if(lastArrival&&lastArrival>plusDays(state.settings.departure,-1))errors.push('Le retour à Buenos Aires doit avoir lieu au moins la veille du vol.');
  const warnings=[];
  if(transfers>=7)warnings.push(`${transfers} journées avec transfert : ce circuit laisse moins de temps aux visites.`);
  if(route.stops.some(s=>s.id==='ibera'))warnings.push('Iberá : accès sur piste via Mercedes, à confirmer selon pluie et conditions de location.');
  if(!state.settings.confirmed)warnings.push('Dates sur place provisoires, à ajuster aux vols réservés.');
  return {feasible:errors.length===0,errors:[...new Set(errors)],warnings,days,segments,km,drive,localDrive:days.reduce((s,d)=>s+d.localDrive,0),pauses:days.reduce((s,d)=>s+d.pauses,0),transfers,totalNights:total,expectedNights:expected,lastArrival,affinity:affinity(state,route.stops)};
 }
 function variants(t,index=0,ids=[]){
  if(index===t.stops.length)return [ids];
  const slot=t.stops[index];return [slot.id,...slot.alternatives].flatMap(id=>variants(t,index+1,[...ids,id]));
 }
 function suggestions(state){
  if(settingsErrors(state.settings).length)return {valid:[],all:[],catalog:[],rejected:[]};
  const valid=[],rejected=[],incompatible=[];
  for(const t of DATA.templates){
   const candidates=variants(t).map(ids=>{const route=allocate(state,t,ids);return {...route,assessment:evaluate(state,route)};});
   const good=candidates.filter(c=>c.assessment.feasible).sort(compare);
   if(good.length)valid.push(good[0]);else {const representative=candidates[0];incompatible.push(representative);rejected.push({templateId:t.id,reasons:[...new Set(representative.assessment.errors)]});}
  }
  valid.sort(compare);return {valid:valid.slice(0,3),all:valid,catalog:[...valid,...incompatible],rejected};
 }
 function compare(a,b){const sa=a.assessment.affinity?.score??0,sb=b.assessment.affinity?.score??0;return sb-sa || (a.assessment.drive+a.assessment.localDrive)-(b.assessment.drive+b.assessment.localDrive) || a.templateId.localeCompare(b.templateId);}
 function formatTime(minutes){const min=Math.round(minutes),h=Math.floor(min/60),m=min%60;return h?`${h} h${m?' '+String(m).padStart(2,'0'):''}`:`${m} min`;}
 function parseBackup(input){
  if(!input||input.format!=='argentine-a9'||input.version!==1||!input.state)throw new Error('Ce fichier n’est pas une sauvegarde Argentine à 9 compatible.');
  const raw=input.state,state=defaultState();
  if(!Array.isArray(raw.profiles)||raw.profiles.length!==9)throw new Error('La sauvegarde doit contenir les neuf profils.');
  state.profiles=raw.profiles.map((p,i)=>{
   if(!p||typeof p.name!=='string'||!p.name.trim()||p.name.length>40)throw new Error('Un prénom est invalide.');
   const out={id:'p'+(i+1),name:p.name.trim(),themes:{},votes:{}};
   if(!p.themes||typeof p.themes!=='object'||Array.isArray(p.themes)||!p.votes||typeof p.votes!=='object'||Array.isArray(p.votes))throw new Error('Préférences invalides.');
   for(const [k,v] of Object.entries(p.themes)){if(!DATA.themes.some(t=>t.id===k)||!Number.isInteger(v)||v<0||v>3)throw new Error('Une préférence est invalide.');out.themes[k]=v;}
   for(const [k,v] of Object.entries(p.votes)){if(!byId[k]||byId[k].hidden||!Number.isInteger(v)||v<1||v>5)throw new Error('Un vote est invalide.');out.votes[k]=v;}
   return out;
  });
  if(!raw.settings||settingsErrors(raw.settings).length)throw new Error('Les paramètres du voyage sont invalides.');
  state.settings={arrival:raw.settings.arrival,departure:raw.settings.departure,maxDrive:raw.settings.maxDrive,confirmed:raw.settings.confirmed===true};
  state.active=state.profiles.some(p=>p.id===raw.active)?raw.active:'p1';
  if(raw.notes!==undefined&&(typeof raw.notes!=='string'||raw.notes.length>10000))throw new Error('Les notes sont invalides ou trop longues.');
  state.notes=raw.notes||'';
  if(raw.selected){
   const t=DATA.templates.find(t=>t.id===raw.selected.templateId);
   if(!t||!Array.isArray(raw.selected.stops)||raw.selected.stops.length!==t.stops.length)throw new Error('Circuit sauvegardé invalide.');
   state.selected={templateId:t.id,stops:raw.selected.stops.map((s,i)=>{
    if(!s||![t.stops[i].id,...t.stops[i].alternatives].includes(s.id)||!Number.isInteger(s.nights)||s.nights<1||s.nights>14)throw new Error('Une étape sauvegardée est invalide.');
    return {id:s.id,nights:s.nights};
   })};
  }
  return state;
 }
 return {byId,clone,defaultState,hasAnswered,placeScore,votesFor,affinity,leg,breaks,settingsErrors,allocate,schedule,evaluate,suggestions,formatTime,parseBackup,plusDays,nightsBetween};
}
