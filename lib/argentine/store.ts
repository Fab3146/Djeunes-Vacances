import "server-only";
import {createHash} from "node:crypto";
import {neon} from "@neondatabase/serverless";
import {inflate, flatten, validateOperations, parseState, type Snapshot, type Operation} from "./model";
export const validSlug = (slug: string) => /^argentine-[a-f0-9]{48}$/.test(slug);
export const hashSlug = (slug: string) => createHash("sha256").update(slug).digest("hex");
function database() {
  if (!process.env.DATABASE_URL) throw new Error("Stockage indisponible.");
  return neon(process.env.DATABASE_URL);
}
export async function readSnapshot(slug: string): Promise<Snapshot | null> {
  if (!validSlug(slug)) return null;
  const rows = await database()`select a9_snapshot(${hashSlug(slug)}) as snapshot`;
  const raw = rows[0]?.snapshot;
  if (!raw) return null;
  return {state: inflate(raw.fields), revision: Number(raw.revision), versions: raw.versions};
}
export class Conflict extends Error { constructor() {super("Des réponses ont changé depuis votre saisie.");} }
export class InvalidInput extends Error {}
async function apply(slug: string, operations: Operation[], revision: number | null) {
  try {
    const rows = await database()`select a9_apply(${hashSlug(slug)}, ${JSON.stringify(operations)}::jsonb, ${revision}) as snapshot`;
    const raw = rows[0]?.snapshot;
    if (!raw) return null;
    return {state: inflate(raw.fields), revision: Number(raw.revision), versions: raw.versions} as Snapshot;
  } catch(error) {
    if ((error as {code?:string}).code === "40001") throw new Conflict();
    throw error;
  }
}
export async function changeFields(slug: string, raw: unknown, snapshot: Snapshot) {
  let operations: Operation[];
  try {operations=validateOperations(raw, snapshot);} catch(e){throw new InvalidInput((e as Error).message);}
  return apply(slug, operations, null);
}
export async function restoreState(slug: string, raw: unknown, revision: number, snapshot: Snapshot) {
  let operations: Operation[];
  try {
    if (!Number.isSafeInteger(revision) || revision < 0) throw new Error("Version de sauvegarde invalide.");
    const fields = flatten(parseState(raw));
    const keys = new Set([...Object.keys(snapshot.versions), ...Object.keys(fields)]);
    const ops = [...keys].map(key => ({key, value: fields[key] ?? null, version: snapshot.versions[key] ?? 0}));
    operations=validateOperations(ops, snapshot);
  }catch(e){throw new InvalidInput((e as Error).message);}
  return apply(slug, operations, revision);
}
