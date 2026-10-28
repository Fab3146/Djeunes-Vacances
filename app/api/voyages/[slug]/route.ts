import {NextRequest, NextResponse} from "next/server";
import {readSnapshot, changeFields, restoreState, Conflict, InvalidInput, validSlug} from "@/lib/argentine/store";
export const dynamic = "force-dynamic";
const headers = {"Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer"};
const json = (body: unknown, status = 200) => NextResponse.json(body, {status, headers});
export async function GET(_req: NextRequest, {params}: {params: Promise<{slug: string}>}) {
  if (!validSlug((await params).slug)) return json({error: "Voyage introuvable."}, 404);
  try {const s = await readSnapshot((await params).slug);return s ? json(s) : json({error: "Voyage introuvable."}, 404);}
  catch {return json({error: "Connexion au voyage indisponible. Réessayez."}, 503);}
}
async function mutate(req: NextRequest, slug: string, restore: boolean) {
  if (!validSlug(slug)) return json({error: "Voyage introuvable."}, 404);
  // Next can normalize req.url to localhost internally; Host retains the
  // public authority the browser actually contacted (including its port).
  const authority = req.headers.get("host");
  const publicOrigin = authority ? `${new URL(req.url).protocol}//${authority}` : null;
  if (!publicOrigin || req.headers.get("origin") !== publicOrigin || req.headers.get("x-argentine-client") !== "1") return json({error: "Origine non autorisée."}, 403);
  if (!req.headers.get("content-type")?.startsWith("application/json")) return json({error: "Format invalide."}, 415);
  try {
    const text = await req.text();if (text.length > 150000) return json({error: "Sauvegarde trop volumineuse."}, 413);
    let body;try {body = JSON.parse(text);} catch {return json({error: "JSON invalide."}, 400);}
    const snapshot = await readSnapshot(slug);if (!snapshot) return json({error: "Voyage introuvable."}, 404);
    try {
      if (restore && (body?.backup?.format !== "argentine-a9" || body?.backup?.version !== 1)) return json({error: "Sauvegarde incompatible."}, 400);
      const next = restore ? await restoreState(slug, body.backup.state, body.revision, snapshot) : await changeFields(slug, body?.operations, snapshot);
      return json(next);
    } catch(error) {
      if (error instanceof Conflict) return json({error: error.message, snapshot: await readSnapshot(slug)}, 409);
      if (error instanceof InvalidInput) return json({error: error.message}, 400);
      throw error;
    }
  } catch {return json({error: "Enregistrement indisponible. Votre saisie reste sur cet appareil."}, 503);}
}
export async function PATCH(req: NextRequest, {params}: {params: Promise<{slug: string}>}) {return mutate(req, (await params).slug, false);}
export async function PUT(req: NextRequest, {params}: {params: Promise<{slug: string}>}) {return mutate(req, (await params).slug, true);}
