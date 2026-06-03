export function requiredString(value: FormDataEntryValue | null, label: string, maxLength = 180) {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new Error(`${label} est obligatoire.`);
  }
  if (text.length > maxLength) {
    throw new Error(`${label} est trop long.`);
  }
  return text;
}

export function optionalString(value: FormDataEntryValue | null, maxLength = 2000) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (text.length > maxLength) {
    throw new Error("Un champ texte est trop long.");
  }
  return text;
}

export function optionalUrl(value: FormDataEntryValue | null) {
  const text = optionalString(value, 1000);
  if (!text) return null;
  try {
    const url = new URL(text);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("URL invalide.");
    }
    return url.toString();
  } catch {
    throw new Error("URL invalide.");
  }
}

export function intValue(value: FormDataEntryValue | null, label: string, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${label} doit être entre ${min} et ${max}.`);
  }
  return parsed;
}

export function optionalNumber(value: FormDataEntryValue | null, label: string) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} doit être un nombre.`);
  }
  return parsed;
}

export function checkbox(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

export function csvList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 40);
}

export function oneOf<T extends string>(value: FormDataEntryValue | null, allowed: readonly T[], label: string) {
  const text = String(value ?? "");
  if (!allowed.includes(text as T)) {
    throw new Error(`${label} invalide.`);
  }
  return text as T;
}

export function isoDate(value: FormDataEntryValue | null, label: string) {
  const text = requiredString(value, label, 20);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error(`${label} doit être une date valide.`);
  }
  return text;
}
