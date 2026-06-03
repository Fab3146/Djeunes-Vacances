import "server-only";

import { sql } from "@/lib/db";
import type {
  Availability,
  DestinationWithScore,
  ItineraryPoint,
  ItinerarySegment,
  LodgingWithScore,
  Participant,
  Trip,
  TripDashboard,
  TripStatus
} from "@/lib/types";
import { fillDateScores, findBestWindows, findPlanningRange, scoreAvailabilityByDate } from "@/lib/availability";

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapParticipant(row: Record<string, unknown>): Participant {
  return {
    id: String(row.id),
    trip_id: String(row.trip_id),
    display_name: String(row.display_name),
    color: String(row.color),
    avatar_emoji: row.avatar_emoji ? String(row.avatar_emoji) : null,
    avatar_seed: row.avatar_seed ? String(row.avatar_seed) : null,
    budget_preference: row.budget_preference ? String(row.budget_preference) : null,
    style_preferences: stringArray(row.style_preferences),
    can_drive: Boolean(row.can_drive),
    likes_beach: Boolean(row.likes_beach),
    likes_food: Boolean(row.likes_food),
    likes_hiking: Boolean(row.likes_hiking),
    likes_roadtrip: Boolean(row.likes_roadtrip),
    likes_party: Boolean(row.likes_party),
    wants_comfort: Boolean(row.wants_comfort),
    created_at: String(row.created_at)
  };
}

function mapTrip(row: Record<string, unknown>): Trip {
  return {
    id: String(row.id),
    name: String(row.name),
    edition_year: Number(row.edition_year),
    description: row.description ? String(row.description) : null,
    slug: String(row.slug),
    status: row.status as TripStatus,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

function mapAvailability(row: Record<string, unknown>): Availability {
  return {
    id: String(row.id),
    trip_id: String(row.trip_id),
    participant_id: String(row.participant_id),
    date: String(row.date).slice(0, 10),
    status: row.status as Availability["status"],
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

function mapDestination(row: Record<string, unknown>): DestinationWithScore {
  return {
    id: String(row.id),
    trip_id: String(row.trip_id),
    name: String(row.name),
    country: row.country ? String(row.country) : null,
    region: row.region ? String(row.region) : null,
    city: row.city ? String(row.city) : null,
    description: row.description ? String(row.description) : null,
    budget_estimate: row.budget_estimate ? String(row.budget_estimate) : null,
    ideal_duration_days: numberOrNull(row.ideal_duration_days),
    best_season: row.best_season ? String(row.best_season) : null,
    vacation_styles: stringArray(row.vacation_styles),
    cover_image_url: row.cover_image_url ? String(row.cover_image_url) : null,
    gallery_urls: stringArray(row.gallery_urls),
    why_this_destination: row.why_this_destination ? String(row.why_this_destination) : null,
    highlights: row.highlights ? String(row.highlights) : null,
    constraints: row.constraints ? String(row.constraints) : null,
    notes: row.notes ? String(row.notes) : null,
    created_by_member_id: row.created_by_member_id ? String(row.created_by_member_id) : null,
    created_at: String(row.created_at),
    vote_count: Number(row.vote_count ?? 0),
    average_score: Number(row.average_score ?? 0)
  };
}

function mapLodging(row: Record<string, unknown>): LodgingWithScore {
  return {
    id: String(row.id),
    trip_id: String(row.trip_id),
    destination_id: row.destination_id ? String(row.destination_id) : null,
    destination_name: row.destination_name ? String(row.destination_name) : null,
    title: String(row.title),
    external_url: row.external_url ? String(row.external_url) : null,
    total_price: numberOrNull(row.total_price),
    price_per_person: numberOrNull(row.price_per_person),
    sleeps_count: numberOrNull(row.sleeps_count),
    bedrooms_count: numberOrNull(row.bedrooms_count),
    amenities: stringArray(row.amenities),
    pros: row.pros ? String(row.pros) : null,
    cons: row.cons ? String(row.cons) : null,
    cover_image_url: row.cover_image_url ? String(row.cover_image_url) : null,
    address_text: row.address_text ? String(row.address_text) : null,
    latitude: numberOrNull(row.latitude),
    longitude: numberOrNull(row.longitude),
    notes: row.notes ? String(row.notes) : null,
    created_by_member_id: row.created_by_member_id ? String(row.created_by_member_id) : null,
    created_at: String(row.created_at),
    vote_count: Number(row.vote_count ?? 0),
    average_score: Number(row.average_score ?? 0)
  };
}

function mapSegment(row: Record<string, unknown>): ItinerarySegment {
  return {
    id: String(row.id),
    trip_id: String(row.trip_id),
    title: String(row.title),
    day_number: numberOrNull(row.day_number),
    segment_type: row.segment_type as ItinerarySegment["segment_type"],
    start_location: row.start_location ? String(row.start_location) : null,
    end_location: row.end_location ? String(row.end_location) : null,
    notes: row.notes ? String(row.notes) : null,
    sort_order: Number(row.sort_order ?? 0),
    created_at: String(row.created_at)
  };
}

function mapPoint(row: Record<string, unknown>): ItineraryPoint {
  return {
    id: String(row.id),
    trip_id: String(row.trip_id),
    segment_id: row.segment_id ? String(row.segment_id) : null,
    segment_title: row.segment_title ? String(row.segment_title) : null,
    title: String(row.title),
    category: String(row.category),
    subcategory: row.subcategory ? String(row.subcategory) : null,
    address_text: row.address_text ? String(row.address_text) : null,
    google_maps_url: row.google_maps_url ? String(row.google_maps_url) : null,
    latitude: numberOrNull(row.latitude),
    longitude: numberOrNull(row.longitude),
    description: row.description ? String(row.description) : null,
    notes: row.notes ? String(row.notes) : null,
    estimated_cost: numberOrNull(row.estimated_cost),
    estimated_duration_minutes: numberOrNull(row.estimated_duration_minutes),
    day_number: numberOrNull(row.day_number),
    daytime_slot: row.daytime_slot ? (row.daytime_slot as ItineraryPoint["daytime_slot"]) : null,
    priority: row.priority ? (row.priority as ItineraryPoint["priority"]) : null,
    status: row.status ? (row.status as ItineraryPoint["status"]) : null,
    tags: stringArray(row.tags),
    sort_order: Number(row.sort_order ?? 0),
    created_at: String(row.created_at)
  };
}

export async function getTripBySlug(slug: string) {
  const rows = await sql`select * from trips where slug = ${slug} limit 1`;
  return rows[0] ? mapTrip(rows[0]) : null;
}

export async function getParticipants(tripId: string) {
  const rows = await sql`
    select * from participants
    where trip_id = ${tripId}
    order by created_at asc, display_name asc
  `;
  return rows.map(mapParticipant);
}

export async function getAvailabilities(tripId: string) {
  const rows = await sql`
    select * from availabilities
    where trip_id = ${tripId}
    order by date asc
  `;
  return rows.map(mapAvailability);
}

export async function getDestinations(tripId: string) {
  const rows = await sql`
    select
      d.*,
      count(dv.id)::int as vote_count,
      coalesce(round(avg(dv.score)::numeric, 2), 0)::float as average_score
    from destinations d
    left join destination_votes dv on dv.destination_id = d.id
    where d.trip_id = ${tripId}
    group by d.id
    order by average_score desc, vote_count desc, d.created_at asc
  `;
  return rows.map(mapDestination);
}

export async function getLodgings(tripId: string) {
  const rows = await sql`
    select
      l.*,
      d.name as destination_name,
      count(lv.id)::int as vote_count,
      coalesce(round(avg(lv.score)::numeric, 2), 0)::float as average_score
    from lodgings l
    left join destinations d on d.id = l.destination_id
    left join lodging_votes lv on lv.lodging_id = l.id
    where l.trip_id = ${tripId}
    group by l.id, d.name
    order by average_score desc, vote_count desc, l.created_at asc
  `;
  return rows.map(mapLodging);
}

export async function getSegments(tripId: string) {
  const rows = await sql`
    select * from itinerary_segments
    where trip_id = ${tripId}
    order by sort_order asc, day_number asc nulls last, created_at asc
  `;
  return rows.map(mapSegment);
}

export async function getItineraryPoints(tripId: string) {
  const rows = await sql`
    select p.*, s.title as segment_title
    from itinerary_points p
    left join itinerary_segments s on s.id = p.segment_id
    where p.trip_id = ${tripId}
    order by p.day_number asc nulls last, p.sort_order asc, p.created_at asc
  `;
  return rows.map(mapPoint);
}

export async function getDashboardData(slug: string): Promise<TripDashboard | null> {
  const trip = await getTripBySlug(slug);
  if (!trip) return null;

  const [participants, availabilities, topDestinations, topLodgings, segments, points] = await Promise.all([
    getParticipants(trip.id),
    getAvailabilities(trip.id),
    getDestinations(trip.id),
    getLodgings(trip.id),
    getSegments(trip.id),
    getItineraryPoints(trip.id)
  ]);

  const range = findPlanningRange(availabilities);
  const dateScores = fillDateScores(scoreAvailabilityByDate(participants, availabilities), participants, range.start, range.end);

  return {
    trip,
    participants,
    dateScores,
    topWeekends: findBestWindows(dateScores, 3, 3),
    topWeeks: findBestWindows(dateScores, 7, 3),
    topDestinations: topDestinations.slice(0, 3),
    topLodgings: topLodgings.slice(0, 3),
    segments,
    pointCount: points.length
  };
}

export async function getAvailabilityPageData(slug: string) {
  const trip = await getTripBySlug(slug);
  if (!trip) return null;
  const [participants, availabilities] = await Promise.all([getParticipants(trip.id), getAvailabilities(trip.id)]);
  const range = findPlanningRange(availabilities);
  const scores = fillDateScores(scoreAvailabilityByDate(participants, availabilities), participants, range.start, range.end);
  return {
    trip,
    participants,
    availabilities,
    scores,
    topWeekends: findBestWindows(scores, 3, 3),
    topWeeks: findBestWindows(scores, 7, 3),
    alternatives: findBestWindows(scores, 10, 3)
  };
}

export async function testConnection() {
  const result = await sql`select 1 as ok`;
  return result[0] as { ok: number };
}
