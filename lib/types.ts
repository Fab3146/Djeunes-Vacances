export type TripStatus =
  | "brainstorming"
  | "vote_dates"
  | "vote_destinations"
  | "vote_logements"
  | "preparation_itineraire"
  | "verrouille"
  | "termine";

export type AvailabilityStatus = "available" | "maybe" | "unavailable";
export type SegmentType = "day" | "transfer" | "zone" | "custom";
export type DaytimeSlot = "morning" | "lunch" | "afternoon" | "sunset" | "evening" | "night";
export type PointPriority = "must" | "nice" | "bonus";
export type PointStatus = "idea" | "shortlisted" | "booked" | "done" | "canceled";

export type Trip = {
  id: string;
  name: string;
  edition_year: number;
  description: string | null;
  slug: string;
  status: TripStatus;
  created_at: string;
  updated_at: string;
};

export type Participant = {
  id: string;
  trip_id: string;
  display_name: string;
  color: string;
  avatar_emoji: string | null;
  avatar_seed: string | null;
  budget_preference: string | null;
  style_preferences: string[];
  can_drive: boolean;
  likes_beach: boolean;
  likes_food: boolean;
  likes_hiking: boolean;
  likes_roadtrip: boolean;
  likes_party: boolean;
  wants_comfort: boolean;
  created_at: string;
};

export type Availability = {
  id: string;
  trip_id: string;
  participant_id: string;
  date: string;
  status: AvailabilityStatus;
  created_at: string;
  updated_at: string;
};

export type DateScore = {
  date: string;
  score: number;
  availableCount: number;
  maybeCount: number;
  unavailableCount: number;
  missingCount: number;
  participantCount: number;
};

export type DateWindow = {
  start: string;
  end: string;
  days: number;
  averageScore: number;
  minScore: number;
  availableDays: number;
  label: string;
};

export type Destination = {
  id: string;
  trip_id: string;
  name: string;
  country: string | null;
  region: string | null;
  city: string | null;
  description: string | null;
  budget_estimate: string | null;
  ideal_duration_days: number | null;
  best_season: string | null;
  vacation_styles: string[];
  cover_image_url: string | null;
  gallery_urls: string[];
  why_this_destination: string | null;
  highlights: string | null;
  constraints: string | null;
  notes: string | null;
  created_by_member_id: string | null;
  created_at: string;
};

export type DestinationVote = {
  id: string;
  destination_id: string;
  participant_id: string;
  score: number;
  recommendation: string | null;
  created_at: string;
  updated_at: string;
};

export type DestinationWithScore = Destination & {
  vote_count: number;
  average_score: number;
};

export type Lodging = {
  id: string;
  trip_id: string;
  destination_id: string | null;
  title: string;
  external_url: string | null;
  total_price: number | null;
  price_per_person: number | null;
  sleeps_count: number | null;
  bedrooms_count: number | null;
  amenities: string[];
  pros: string | null;
  cons: string | null;
  cover_image_url: string | null;
  address_text: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  created_by_member_id: string | null;
  created_at: string;
};

export type LodgingWithScore = Lodging & {
  destination_name: string | null;
  vote_count: number;
  average_score: number;
};

export type ItinerarySegment = {
  id: string;
  trip_id: string;
  title: string;
  day_number: number | null;
  segment_type: SegmentType;
  start_location: string | null;
  end_location: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
};

export type ItineraryPoint = {
  id: string;
  trip_id: string;
  segment_id: string | null;
  segment_title: string | null;
  title: string;
  category: string;
  subcategory: string | null;
  address_text: string | null;
  google_maps_url: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  notes: string | null;
  estimated_cost: number | null;
  estimated_duration_minutes: number | null;
  day_number: number | null;
  daytime_slot: DaytimeSlot | null;
  priority: PointPriority | null;
  status: PointStatus | null;
  tags: string[];
  sort_order: number;
  created_at: string;
};

export type TripDashboard = {
  trip: Trip;
  participants: Participant[];
  dateScores: DateScore[];
  topWeekends: DateWindow[];
  topWeeks: DateWindow[];
  topDestinations: DestinationWithScore[];
  topLodgings: LodgingWithScore[];
  segments: ItinerarySegment[];
  pointCount: number;
};
