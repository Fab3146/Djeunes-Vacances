import data from "../../data/argentine/catalog.json";
import createEngine from "../../src/argentine/engine.cjs";
export type Profile = { id: string; name: string; votes: Record<string, number>; themes: Record<string, number> };
export type State = { version: number; active: string; profiles: Profile[]; settings: {arrival: string; departure: string; maxDrive: number; confirmed: boolean}; selected: {templateId: string; stops: {id: string; nights: number}[]} | null; notes: string };
export type Operation = { key: string; value: unknown; version: number };
export type Snapshot = { state: State; revision: number; versions: Record<string, number> };
export const engine = createEngine(data);
export const catalog = data;
export function parseState(raw: unknown): State {
  return engine.parseBackup({format: "argentine-a9", version: 1, state: raw}) as State;
}
export function flatten(state: State): Record<string, unknown> {
  const fields: Record<string, unknown> = {settings: state.settings, selected: state.selected, notes: state.notes};
  for (const p of state.profiles) {
    fields[`profile:${p.id}`] = p.name;
    for (const [id, value] of Object.entries(p.votes)) fields[`vote:${p.id}:${id}`] = value;
    for (const [id, value] of Object.entries(p.themes)) fields[`theme:${p.id}:${id}`] = value;
  }
  return fields;
}
export function inflate(fields: Record<string, unknown>): State {
  const state = engine.defaultState() as State;
  for (const [key, value] of Object.entries(fields)) {
    if (key === "settings") state.settings = value as State["settings"];
    else if (key === "selected") state.selected = value as State["selected"];
    else if (key === "notes") state.notes = value as string;
    else {
      const [kind, id, item] = key.split(":");
      const p = state.profiles.find(p => p.id === id);
      if (!p) throw new Error("Profil inconnu.");
      if (kind === "profile") p.name = value as string;
      else if (value !== null && kind === "vote") p.votes[item] = value as number;
      else if (value !== null && kind === "theme") p.themes[item] = value as number;
    }
  }
  return parseState(state);
}
export function validateOperations(raw: unknown, snapshot: Snapshot): Operation[] {
  if (!Array.isArray(raw) || !raw.length || raw.length > 1000) throw new Error("Modifications invalides.");
  const values = flatten(snapshot.state), seen = new Set<string>();
  const ops = raw.map(op => {
    if (!op || typeof op.key !== "string" || seen.has(op.key) || !Number.isSafeInteger(op.version) || op.version < 0 || !("value" in op)) throw new Error("Modification invalide.");
    seen.add(op.key);
    const [kind, p, id, extra] = op.key.split(":");
    const profile = /^p[1-9]$/.test(p || "");
    if (!(["settings", "selected", "notes"].includes(op.key) || (!extra && profile && ((kind === "profile" && !id && typeof op.value === "string") || (kind === "vote" && data.destinations.some(d => d.id === id && !d.hidden) && (op.value === null || Number.isInteger(op.value) && op.value >= 1 && op.value <= 5)) || (kind === "theme" && data.themes.some(d => d.id === id) && (op.value === null || Number.isInteger(op.value) && op.value >= 0 && op.value <= 3)))))) throw new Error("Champ ou valeur invalide.");
    values[op.key] = op.value;
    return {key: op.key, value: op.value, version: op.version};
  });
  inflate(values);
  return ops;
}
