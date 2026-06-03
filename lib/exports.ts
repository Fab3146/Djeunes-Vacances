import type { ItineraryPoint } from "@/lib/types";

const CSV_COLUMNS = [
  "Name",
  "Description",
  "Category",
  "Address",
  "Latitude",
  "Longitude",
  "GoogleMapsURL",
  "Day",
  "Segment",
  "Priority"
] as const;

function csvEscape(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function itineraryPointsToCsv(points: ItineraryPoint[]) {
  const rows = points.map((point) => [
    point.title,
    [point.description, point.notes, point.tags.length ? `Tags: ${point.tags.join(", ")}` : null]
      .filter(Boolean)
      .join("\n"),
    point.category,
    point.address_text,
    point.latitude,
    point.longitude,
    point.google_maps_url,
    point.day_number ? `Day ${point.day_number}` : "",
    point.segment_title,
    point.priority
  ]);

  return [CSV_COLUMNS, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

export function googleMapsPlaceQuery(point: ItineraryPoint) {
  if (point.latitude !== null && point.longitude !== null) {
    return `${point.latitude},${point.longitude}`;
  }

  return encodeURIComponent([point.title, point.address_text].filter(Boolean).join(" "));
}

export function buildGoogleMapsLinks(points: ItineraryPoint[], maxStopsPerLink = 9) {
  const usablePoints = points.filter((point) => (point.latitude !== null && point.longitude !== null) || point.address_text);
  const chunks: ItineraryPoint[][] = [];

  for (let index = 0; index < usablePoints.length; index += maxStopsPerLink) {
    chunks.push(usablePoints.slice(index, index + maxStopsPerLink));
  }

  return chunks.map((chunk, index) => {
    const origin = googleMapsPlaceQuery(chunk[0]);
    const destination = googleMapsPlaceQuery(chunk[chunk.length - 1]);
    const waypoints = chunk.slice(1, -1).map(googleMapsPlaceQuery).join("|");
    const url = new URL("https://www.google.com/maps/dir/");
    url.searchParams.set("api", "1");
    url.searchParams.set("origin", origin);
    url.searchParams.set("destination", destination);
    if (waypoints) url.searchParams.set("waypoints", waypoints);

    return {
      label: chunk.length > 1 ? `Lien ${index + 1} (${chunk.length} arrêts)` : `Lieu ${index + 1}`,
      pointCount: chunk.length,
      url: url.toString()
    };
  });
}
