"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eachDate } from "@/lib/dates";
import { generatePrivateSlug } from "@/lib/slugs";
import {
  checkbox,
  csvList,
  intValue,
  isoDate,
  oneOf,
  optionalNumber,
  optionalString,
  optionalUrl,
  requiredString
} from "@/lib/validation";
import {
  insertDestination,
  insertItineraryPoint,
  insertLodging,
  insertParticipant,
  insertSegment,
  insertTrip,
  updateTripStatus,
  upsertAvailability,
  upsertDestinationVote,
  upsertLodgingVote
} from "@/lib/queries/mutations";
import { getTripBySlug, testConnection } from "@/lib/queries/trips";
import type { AvailabilityStatus, PointPriority, PointStatus, SegmentType, TripStatus } from "@/lib/types";

const TRIP_STATUSES = [
  "brainstorming",
  "vote_dates",
  "vote_destinations",
  "vote_logements",
  "preparation_itineraire",
  "verrouille",
  "termine"
] as const;

const AVAILABILITY_STATUSES = ["available", "maybe", "unavailable"] as const;
const SEGMENT_TYPES = ["day", "transfer", "zone", "custom"] as const;
const DAYTIME_SLOTS = ["morning", "lunch", "afternoon", "sunset", "evening", "night"] as const;
const PRIORITIES = ["must", "nice", "bonus"] as const;
const POINT_STATUSES = ["idea", "shortlisted", "booked", "done", "canceled"] as const;

function slugFromForm(formData: FormData) {
  return requiredString(formData.get("slug"), "Slug", 120);
}

function tripIdFromForm(formData: FormData) {
  return requiredString(formData.get("tripId"), "Voyage", 80);
}

function optionalSelect(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

export async function createTripAction(formData: FormData) {
  const slug = generatePrivateSlug("djeuns");
  const createdSlug = await insertTrip({
    name: requiredString(formData.get("name"), "Nom du voyage", 120),
    editionYear: intValue(formData.get("editionYear"), "Année", 2024, 2100),
    description: optionalString(formData.get("description"), 1000),
    slug,
    status: "brainstorming"
  });

  redirect(`/trips/${createdSlug}`);
}

export async function updateTripStatusAction(formData: FormData) {
  const slug = slugFromForm(formData);
  await updateTripStatus(tripIdFromForm(formData), oneOf(formData.get("status"), TRIP_STATUSES, "Statut") as TripStatus);
  revalidatePath(`/trips/${slug}`);
}

export async function addParticipantAction(formData: FormData) {
  const slug = slugFromForm(formData);
  await insertParticipant({
    tripId: tripIdFromForm(formData),
    displayName: requiredString(formData.get("displayName"), "Prénom", 80),
    color: optionalString(formData.get("color"), 20) ?? "#126b64",
    avatarEmoji: optionalString(formData.get("avatarEmoji"), 8),
    budgetPreference: optionalString(formData.get("budgetPreference"), 80),
    stylePreferences: csvList(formData.get("stylePreferences")),
    canDrive: checkbox(formData.get("canDrive")),
    likesBeach: checkbox(formData.get("likesBeach")),
    likesFood: checkbox(formData.get("likesFood")),
    likesHiking: checkbox(formData.get("likesHiking")),
    likesRoadtrip: checkbox(formData.get("likesRoadtrip")),
    likesParty: checkbox(formData.get("likesParty")),
    wantsComfort: checkbox(formData.get("wantsComfort"))
  });
  revalidatePath(`/trips/${slug}`);
  revalidatePath(`/trips/${slug}/availability`);
}

export async function addAvailabilityRangeAction(formData: FormData) {
  const slug = slugFromForm(formData);
  const start = isoDate(formData.get("startDate"), "Date de début");
  const end = isoDate(formData.get("endDate"), "Date de fin");
  if (start > end) {
    throw new Error("La date de début doit être avant la date de fin.");
  }

  await upsertAvailability({
    tripId: tripIdFromForm(formData),
    participantId: requiredString(formData.get("participantId"), "Participant", 80),
    dates: eachDate(start, end),
    status: oneOf(formData.get("status"), AVAILABILITY_STATUSES, "Disponibilité") as AvailabilityStatus
  });
  revalidatePath(`/trips/${slug}`);
  revalidatePath(`/trips/${slug}/availability`);
}

export async function addDestinationAction(formData: FormData) {
  const slug = slugFromForm(formData);
  await insertDestination({
    tripId: tripIdFromForm(formData),
    name: requiredString(formData.get("name"), "Destination", 140),
    country: optionalString(formData.get("country"), 100),
    region: optionalString(formData.get("region"), 100),
    city: optionalString(formData.get("city"), 100),
    description: optionalString(formData.get("description"), 1200),
    budgetEstimate: optionalString(formData.get("budgetEstimate"), 80),
    idealDurationDays: optionalNumber(formData.get("idealDurationDays"), "Durée idéale"),
    bestSeason: optionalString(formData.get("bestSeason"), 120),
    vacationStyles: csvList(formData.get("vacationStyles")),
    coverImageUrl: optionalUrl(formData.get("coverImageUrl")),
    galleryUrls: csvList(formData.get("galleryUrls")),
    why: optionalString(formData.get("why"), 1000),
    highlights: optionalString(formData.get("highlights"), 1200),
    constraints: optionalString(formData.get("constraints"), 1200),
    notes: optionalString(formData.get("notes"), 1200),
    createdByMemberId: optionalSelect(formData.get("createdByMemberId"))
  });
  revalidatePath(`/trips/${slug}`);
  revalidatePath(`/trips/${slug}/destinations`);
}

export async function voteDestinationAction(formData: FormData) {
  const slug = slugFromForm(formData);
  await upsertDestinationVote({
    destinationId: requiredString(formData.get("destinationId"), "Destination", 80),
    participantId: requiredString(formData.get("participantId"), "Participant", 80),
    score: intValue(formData.get("score"), "Score", 1, 5),
    recommendation: optionalString(formData.get("recommendation"), 500)
  });
  revalidatePath(`/trips/${slug}`);
  revalidatePath(`/trips/${slug}/destinations`);
}

export async function addLodgingAction(formData: FormData) {
  const slug = slugFromForm(formData);
  await insertLodging({
    tripId: tripIdFromForm(formData),
    destinationId: optionalSelect(formData.get("destinationId")),
    title: requiredString(formData.get("title"), "Logement", 180),
    externalUrl: optionalUrl(formData.get("externalUrl")),
    totalPrice: optionalNumber(formData.get("totalPrice"), "Prix total"),
    pricePerPerson: optionalNumber(formData.get("pricePerPerson"), "Prix par personne"),
    sleepsCount: optionalNumber(formData.get("sleepsCount"), "Couchages"),
    bedroomsCount: optionalNumber(formData.get("bedroomsCount"), "Chambres"),
    amenities: csvList(formData.get("amenities")),
    pros: optionalString(formData.get("pros"), 1000),
    cons: optionalString(formData.get("cons"), 1000),
    coverImageUrl: optionalUrl(formData.get("coverImageUrl")),
    addressText: optionalString(formData.get("addressText"), 500),
    latitude: optionalNumber(formData.get("latitude"), "Latitude"),
    longitude: optionalNumber(formData.get("longitude"), "Longitude"),
    notes: optionalString(formData.get("notes"), 1000),
    createdByMemberId: optionalSelect(formData.get("createdByMemberId"))
  });
  revalidatePath(`/trips/${slug}`);
  revalidatePath(`/trips/${slug}/lodgings`);
}

export async function voteLodgingAction(formData: FormData) {
  const slug = slugFromForm(formData);
  await upsertLodgingVote({
    lodgingId: requiredString(formData.get("lodgingId"), "Logement", 80),
    participantId: requiredString(formData.get("participantId"), "Participant", 80),
    score: intValue(formData.get("score"), "Score", 1, 5)
  });
  revalidatePath(`/trips/${slug}`);
  revalidatePath(`/trips/${slug}/lodgings`);
}

export async function addSegmentAction(formData: FormData) {
  const slug = slugFromForm(formData);
  await insertSegment({
    tripId: tripIdFromForm(formData),
    title: requiredString(formData.get("title"), "Étape", 140),
    dayNumber: optionalNumber(formData.get("dayNumber"), "Jour"),
    segmentType: oneOf(formData.get("segmentType"), SEGMENT_TYPES, "Type") as SegmentType,
    startLocation: optionalString(formData.get("startLocation"), 240),
    endLocation: optionalString(formData.get("endLocation"), 240),
    notes: optionalString(formData.get("notes"), 1000),
    sortOrder: Number(optionalNumber(formData.get("sortOrder"), "Ordre") ?? 0)
  });
  revalidatePath(`/trips/${slug}`);
  revalidatePath(`/trips/${slug}/itinerary`);
  revalidatePath(`/trips/${slug}/exports`);
}

export async function addItineraryPointAction(formData: FormData) {
  const slug = slugFromForm(formData);
  const slot = optionalSelect(formData.get("daytimeSlot"));
  const priority = optionalSelect(formData.get("priority"));
  const status = optionalSelect(formData.get("status"));

  await insertItineraryPoint({
    tripId: tripIdFromForm(formData),
    segmentId: optionalSelect(formData.get("segmentId")),
    title: requiredString(formData.get("title"), "Point d'intérêt", 180),
    category: requiredString(formData.get("category"), "Catégorie", 80),
    subcategory: optionalString(formData.get("subcategory"), 80),
    addressText: optionalString(formData.get("addressText"), 500),
    googleMapsUrl: optionalUrl(formData.get("googleMapsUrl")),
    latitude: optionalNumber(formData.get("latitude"), "Latitude"),
    longitude: optionalNumber(formData.get("longitude"), "Longitude"),
    description: optionalString(formData.get("description"), 1200),
    notes: optionalString(formData.get("notes"), 1200),
    estimatedCost: optionalNumber(formData.get("estimatedCost"), "Coût estimé"),
    estimatedDurationMinutes: optionalNumber(formData.get("estimatedDurationMinutes"), "Durée estimée"),
    dayNumber: optionalNumber(formData.get("dayNumber"), "Jour"),
    daytimeSlot: slot ? oneOf(slot, DAYTIME_SLOTS, "Moment") : null,
    priority: priority ? (oneOf(priority, PRIORITIES, "Priorité") as PointPriority) : null,
    status: status ? (oneOf(status, POINT_STATUSES, "Statut") as PointStatus) : null,
    tags: csvList(formData.get("tags")),
    sortOrder: Number(optionalNumber(formData.get("sortOrder"), "Ordre") ?? 0)
  });
  revalidatePath(`/trips/${slug}`);
  revalidatePath(`/trips/${slug}/itinerary`);
  revalidatePath(`/trips/${slug}/exports`);
}

export async function testDatabaseConnectionAction(_previousState?: unknown, _formData?: FormData) {
  try {
    const result = await testConnection();
    return { ok: true, message: `Connexion Neon OK (${result.ok}).` };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Erreur de connexion inconnue."
    };
  }
}

export async function ensureTripExists(slug: string) {
  const trip = await getTripBySlug(slug);
  if (!trip) {
    redirect("/");
  }
  return trip;
}
