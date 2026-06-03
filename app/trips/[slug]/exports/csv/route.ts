import { NextRequest } from "next/server";
import { itineraryPointsToCsv } from "@/lib/exports";
import { filterItineraryPoints } from "@/lib/itinerary";
import { getItineraryPoints, getTripBySlug } from "@/lib/queries/trips";

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  const trip = await getTripBySlug(params.slug);
  if (!trip) {
    return new Response("Trip not found", { status: 404 });
  }

  const points = await getItineraryPoints(trip.id);
  const searchParams = request.nextUrl.searchParams;
  const day = searchParams.get("day") ? Number(searchParams.get("day")) : undefined;
  const filtered = filterItineraryPoints(points, {
    segmentId: searchParams.get("segment") || undefined,
    day: Number.isFinite(day) ? day : undefined,
    category: searchParams.get("category") || undefined
  });

  return new Response(itineraryPointsToCsv(filtered), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="voyage-djeunes-${trip.slug}.csv"`
    }
  });
}
