import {NextResponse} from "next/server";
import {readSnapshot,validSlug} from "@/lib/argentine/store";
import {travelPage} from "@/lib/argentine/page";
export const dynamic="force-dynamic";
const headers={"Content-Type":"text/html; charset=utf-8","Cache-Control":"private, no-store","Referrer-Policy":"no-referrer","X-Robots-Tag":"noindex, nofollow","Content-Security-Policy":"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"};
export async function GET(_req:Request,{params}:{params:Promise<{slug:string}>}){
 try{const s=validSlug((await params).slug)?await readSnapshot((await params).slug):null;if(s)return new NextResponse(travelPage(s,(await params).slug),{headers});
 return new NextResponse('<!doctype html><html lang="fr"><meta charset="utf-8"><title>Lien introuvable</title><body><h1>Ce lien de voyage est introuvable.</h1><p>Demandez le lien complet à l’organisateur.</p><a href="/">Accueil</a></body></html>',{status:404,headers});}
 catch{return new NextResponse('<!doctype html><html lang="fr"><meta charset="utf-8"><title>Connexion interrompue</title><body><h1>Le voyage est temporairement indisponible.</h1><p>Réessayez dans quelques instants. Vos réponses enregistrées sont conservées.</p><button onclick="location.reload()">Réessayer</button></body></html>',{status:503,headers});}
}
