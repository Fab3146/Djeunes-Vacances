import fs from "node:fs";
import path from "node:path";
import data from "../../data/argentine/catalog.json";
import photos from "../../data/argentine/gallery.json";
import type {Snapshot} from "./model";
const safe=(x:unknown)=>JSON.stringify(x).replace(/</g,"\\u003c");
export function travelPage(snapshot:Snapshot|null,slug?:string){
 const shell=fs.readFileSync(path.join(process.cwd(),"src/argentine/shell.html"),"utf8");
 return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><title>Argentine à 9 · ${snapshot?'Notre voyage':'Aperçu de test'}</title><link rel="stylesheet" href="/argentine/style.css"></head><body>${shell}<script id="trip-data" type="application/json">${safe(data)}</script><script id="photo-data" type="application/json">${safe(photos)}</script><script id="cloud-data" type="application/json">${safe(snapshot?{snapshot,url:'/api/voyages/'+slug}:null)}</script><script>const DATA=JSON.parse(document.getElementById('trip-data').textContent),PHOTOS=JSON.parse(document.getElementById('photo-data').textContent);window.ARGENTINE_CLOUD=JSON.parse(document.getElementById('cloud-data').textContent);window.ARGENTINE_PREVIEW=${!snapshot};</script><script src="/argentine/engine.js"></script><script src="/argentine/map.js"></script><script src="/argentine/cloud.js"></script><script src="/argentine/app.js"></script></body></html>`;
}
