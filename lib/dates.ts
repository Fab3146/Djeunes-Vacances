const DAY_MS = 24 * 60 * 60 * 1000;

export function parseIsoDate(iso: string) {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, amount: number) {
  const date = parseIsoDate(iso);
  date.setUTCDate(date.getUTCDate() + amount);
  return toIsoDate(date);
}

export function daysBetweenInclusive(start: string, end: string) {
  const startDate = parseIsoDate(start);
  const endDate = parseIsoDate(end);
  return Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / DAY_MS) + 1);
}

export function eachDate(start: string, end: string) {
  const count = daysBetweenInclusive(start, end);
  return Array.from({ length: count }, (_, index) => addDays(start, index));
}

export function formatShortDate(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short"
  }).format(parseIsoDate(iso));
}

export function formatDateRange(start: string, end: string) {
  return `${formatShortDate(start)} - ${formatShortDate(end)}`;
}
