import {travelPage} from "@/lib/argentine/page";
export const dynamic="force-dynamic";
export async function GET(){
 if(process.env.VERCEL_ENV!=="preview"&&process.env.NODE_ENV!=="development")return new Response("Introuvable",{status:404});
 return new Response(travelPage(null),{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","X-Robots-Tag":"noindex, nofollow"}});
}
