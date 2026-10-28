const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),write=(p,v)=>{fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),v);};
const data=JSON.parse(read('data/argentine/base.json'));
if(fs.existsSync(path.join(root,'data/argentine/enrichment.json'))){const e=JSON.parse(read('data/argentine/enrichment.json'));for(const d of data.destinations)Object.assign(d,e.updates?.[d.id]||{});data.destinations.push(...e.additions);data.sources.push(...(e.sources||[]).map(s=>Array.isArray(s)?s:[s.title,s.url]));}
let photos=JSON.parse(read('data/argentine/photos.json'));
const manifestPath=path.join(root,'assets/photo-enrichment/manifest.json');
if(fs.existsSync(manifestPath)){
 const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 for(const [id,g] of Object.entries(manifest)){
  const images=(g.images||g).map((im,i)=>{const name=`${id}-enriched-${i}.webp`;const source=path.isAbsolute(im.path)?im.path:path.join(root,im.path);fs.copyFileSync(source,path.join(root,'public/photos',name));const {path:ignore,...meta}=im;return {...meta,data:'/photos/'+name};});
  photos[id]={...images[0],id,images};
 }
}
write('data/argentine/catalog.json',JSON.stringify(data,null,2)+'\n');
write('data/argentine/gallery.json',JSON.stringify(photos,null,2)+'\n');
const engine=read('src/argentine/engine.js');write('src/argentine/engine.cjs',engine+'\nmodule.exports=createEngine;\n');
write('public/argentine/engine.js',engine+'\nconst TripEngine=createEngine(DATA);\n');
for(const name of ['app.js','map.js','style.css','cloud.js'])if(fs.existsSync(path.join(root,'src/argentine',name)))write('public/argentine/'+name,read('src/argentine/'+name));
const inlinePhotos=JSON.parse(JSON.stringify(photos));for(const g of Object.values(inlinePhotos)){for(const im of g.images){im.data='data:image/webp;base64,'+fs.readFileSync(path.join(root,'public',im.data)).toString('base64');}delete g.data;}
const safe=x=>JSON.stringify(x).replace(/</g,'\\u003c');
const html=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'"><title>Argentine à 9 · février 2027</title><style>${read('src/argentine/style.css')}</style></head><body>${read('src/argentine/shell.html')}<script id="trip-data" type="application/json">${safe(data)}</script><script id="photo-data" type="application/json">${safe(inlinePhotos)}</script><script>const DATA=JSON.parse(document.getElementById('trip-data').textContent),PHOTOS=JSON.parse(document.getElementById('photo-data').textContent);</script><script id="trip-engine">${engine}\nconst TripEngine=createEngine(DATA);</script><script id="trip-map">${read('src/argentine/map.js')}</script><script id="trip-app">${read('src/argentine/app.js')}</script></body></html>`;
write('argentine-2027.html',html);
console.log(`Catalogue: ${data.destinations.filter(d=>!d.hidden).length} destinations, ${Object.values(photos).reduce((n,g)=>n+g.images.length,0)} photos. HTML autonome: ${(Buffer.byteLength(html)/1024/1024).toFixed(1)} Mo.`);
