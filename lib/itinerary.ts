import type { ItineraryPoint } from "@/lib/types";

export type ItineraryFilters = {
  segmentId?: string;
  day?: number;
  category?: string;
  query?: string;
};

export function filterItineraryPoints(points: ItineraryPoint[], filters: ItineraryFilters) {
  const query = filters.query?.trim().toLowerCase();

  return points.filter((point) => {
    if (filters.segmentId && point.segment_id !== filters.segmentId) return false;
    if (filters.day && point.day_number !== filters.day) return false;
    if (filters.category && point.category !== filters.category) return false;
    if (query) {
      const haystack = [
        point.title,
        point.category,
        point.subcategory,
        point.address_text,
        point.description,
        point.notes,
        point.tags.join(" ")
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export function groupPointsByCategory(points: ItineraryPoint[]) {
  return points.reduce<Record<string, ItineraryPoint[]>>((groups, point) => {
    const key = point.category || "Autre";
    groups[key] = groups[key] ?? [];
    groups[key].push(point);
    return groups;
  }, {});
}

export function groupPointsByDay(points: ItineraryPoint[]) {
  return points.reduce<Record<string, ItineraryPoint[]>>((groups, point) => {
    const key = point.day_number ? `Jour ${point.day_number}` : "Non planifié";
    groups[key] = groups[key] ?? [];
    groups[key].push(point);
    return groups;
  }, {});
}

export function uniqueCategories(points: ItineraryPoint[]) {
  return Array.from(new Set(points.map((point) => point.category))).sort((a, b) => a.localeCompare(b));
}
