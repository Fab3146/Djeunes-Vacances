import "server-only";

import { sql } from "@/lib/db";
import type { AvailabilityStatus, PointPriority, PointStatus, SegmentType, TripStatus } from "@/lib/types";

type JsonValue = string[] | Record<string, unknown>;

function jsonb(value: JsonValue) {
  return JSON.stringify(value);
}

export async function insertTrip(input: {
  name: string;
  editionYear: number;
  description: string | null;
  slug: string;
  status: TripStatus;
}) {
  const rows = await sql`
    insert into trips (name, edition_year, description, slug, status)
    values (${input.name}, ${input.editionYear}, ${input.description}, ${input.slug}, ${input.status})
    returning slug
  `;
  return String(rows[0].slug);
}

export async function updateTripStatus(tripId: string, status: TripStatus) {
  await sql`
    update trips
    set status = ${status}, updated_at = now()
    where id = ${tripId}
  `;
}

export async function insertParticipant(input: {
  tripId: string;
  displayName: string;
  color: string;
  avatarEmoji: string | null;
  budgetPreference: string | null;
  stylePreferences: string[];
  canDrive: boolean;
  likesBeach: boolean;
  likesFood: boolean;
  likesHiking: boolean;
  likesRoadtrip: boolean;
  likesParty: boolean;
  wantsComfort: boolean;
}) {
  await sql`
    insert into participants (
      trip_id, display_name, color, avatar_emoji, budget_preference, style_preferences,
      can_drive, likes_beach, likes_food, likes_hiking, likes_roadtrip, likes_party, wants_comfort
    )
    values (
      ${input.tripId}, ${input.displayName}, ${input.color}, ${input.avatarEmoji},
      ${input.budgetPreference}, ${jsonb(input.stylePreferences)}::jsonb,
      ${input.canDrive}, ${input.likesBeach}, ${input.likesFood}, ${input.likesHiking},
      ${input.likesRoadtrip}, ${input.likesParty}, ${input.wantsComfort}
    )
  `;
}

export async function upsertAvailability(input: {
  tripId: string;
  participantId: string;
  dates: string[];
  status: AvailabilityStatus;
}) {
  if (!input.dates.length) return;

  await sql`
    insert into availabilities (trip_id, participant_id, date, status)
    select ${input.tripId}, ${input.participantId}, dates.value::date, ${input.status}
    from jsonb_array_elements_text(${jsonb(input.dates)}::jsonb) as dates(value)
    on conflict (participant_id, date)
    do update set status = excluded.status, updated_at = now()
  `;
}

export async function insertDestination(input: {
  tripId: string;
  name: string;
  country: string | null;
  region: string | null;
  city: string | null;
  description: string | null;
  budgetEstimate: string | null;
  idealDurationDays: number | null;
  bestSeason: string | null;
  vacationStyles: string[];
  coverImageUrl: string | null;
  galleryUrls: string[];
  why: string | null;
  highlights: string | null;
  constraints: string | null;
  notes: string | null;
  createdByMemberId: string | null;
}) {
  await sql`
    insert into destinations (
      trip_id, name, country, region, city, description, budget_estimate, ideal_duration_days,
      best_season, vacation_styles, cover_image_url, gallery_urls, why_this_destination,
      highlights, constraints, notes, created_by_member_id
    )
    values (
      ${input.tripId}, ${input.name}, ${input.country}, ${input.region}, ${input.city},
      ${input.description}, ${input.budgetEstimate}, ${input.idealDurationDays},
      ${input.bestSeason}, ${jsonb(input.vacationStyles)}::jsonb, ${input.coverImageUrl},
      ${jsonb(input.galleryUrls)}::jsonb, ${input.why}, ${input.highlights},
      ${input.constraints}, ${input.notes}, ${input.createdByMemberId}
    )
  `;
}

export async function upsertDestinationVote(input: {
  destinationId: string;
  participantId: string;
  score: number;
  recommendation: string | null;
}) {
  await sql`
    insert into destination_votes (trip_id, destination_id, participant_id, score, recommendation)
    select d.trip_id, d.id, ${input.participantId}, ${input.score}, ${input.recommendation}
    from destinations d
    where d.id = ${input.destinationId}
    on conflict (destination_id, participant_id)
    do update set score = excluded.score, recommendation = excluded.recommendation, updated_at = now()
  `;
}

export async function insertLodging(input: {
  tripId: string;
  destinationId: string | null;
  title: string;
  externalUrl: string | null;
  totalPrice: number | null;
  pricePerPerson: number | null;
  sleepsCount: number | null;
  bedroomsCount: number | null;
  amenities: string[];
  pros: string | null;
  cons: string | null;
  coverImageUrl: string | null;
  addressText: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  createdByMemberId: string | null;
}) {
  await sql`
    insert into lodgings (
      trip_id, destination_id, title, external_url, total_price, price_per_person,
      sleeps_count, bedrooms_count, amenities, pros, cons, cover_image_url,
      address_text, latitude, longitude, notes, created_by_member_id
    )
    values (
      ${input.tripId}, ${input.destinationId}, ${input.title}, ${input.externalUrl},
      ${input.totalPrice}, ${input.pricePerPerson}, ${input.sleepsCount}, ${input.bedroomsCount},
      ${jsonb(input.amenities)}::jsonb, ${input.pros}, ${input.cons}, ${input.coverImageUrl},
      ${input.addressText}, ${input.latitude}, ${input.longitude}, ${input.notes},
      ${input.createdByMemberId}
    )
  `;
}

export async function upsertLodgingVote(input: { lodgingId: string; participantId: string; score: number }) {
  await sql`
    insert into lodging_votes (trip_id, lodging_id, participant_id, score)
    select l.trip_id, l.id, ${input.participantId}, ${input.score}
    from lodgings l
    where l.id = ${input.lodgingId}
    on conflict (lodging_id, participant_id)
    do update set score = excluded.score, updated_at = now()
  `;
}

export async function insertSegment(input: {
  tripId: string;
  title: string;
  dayNumber: number | null;
  segmentType: SegmentType;
  startLocation: string | null;
  endLocation: string | null;
  notes: string | null;
  sortOrder: number;
}) {
  await sql`
    insert into itinerary_segments (
      trip_id, title, day_number, segment_type, start_location, end_location, notes, sort_order
    )
    values (
      ${input.tripId}, ${input.title}, ${input.dayNumber}, ${input.segmentType},
      ${input.startLocation}, ${input.endLocation}, ${input.notes}, ${input.sortOrder}
    )
  `;
}

export async function insertItineraryPoint(input: {
  tripId: string;
  segmentId: string | null;
  title: string;
  category: string;
  subcategory: string | null;
  addressText: string | null;
  googleMapsUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  notes: string | null;
  estimatedCost: number | null;
  estimatedDurationMinutes: number | null;
  dayNumber: number | null;
  daytimeSlot: string | null;
  priority: PointPriority | null;
  status: PointStatus | null;
  tags: string[];
  sortOrder: number;
}) {
  await sql`
    insert into itinerary_points (
      trip_id, segment_id, title, category, subcategory, address_text, google_maps_url,
      latitude, longitude, description, notes, estimated_cost, estimated_duration_minutes,
      day_number, daytime_slot, priority, status, tags, sort_order
    )
    values (
      ${input.tripId}, ${input.segmentId}, ${input.title}, ${input.category}, ${input.subcategory},
      ${input.addressText}, ${input.googleMapsUrl}, ${input.latitude}, ${input.longitude},
      ${input.description}, ${input.notes}, ${input.estimatedCost}, ${input.estimatedDurationMinutes},
      ${input.dayNumber}, ${input.daytimeSlot}, ${input.priority}, ${input.status},
      ${jsonb(input.tags)}::jsonb, ${input.sortOrder}
    )
  `;
}
