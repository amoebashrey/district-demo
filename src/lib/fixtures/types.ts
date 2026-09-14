/**
 * Shapes shared by the fixtures generator (scripts/fixtures/generate.ts) and,
 * from Phase 1 onward, the seed loader. Everything here is SYNTHETIC demo data.
 */

export type City = "Bengaluru" | "Mumbai" | "Delhi NCR";
export type BudgetBand = "₹" | "₹₹" | "₹₹₹" | "₹₹₹₹";
export type Dietary = "veg" | "jain" | "halal" | "no-beef" | "vegan" | "none";
export type Vibe = "chill" | "loud" | "fancy" | "cheap-and-cheerful" | "date-ish" | "big-group";

export interface Area {
  city: City;
  name: string;
  lat: number;
  lng: number;
}

export interface SyntheticUser {
  id: string; // uuid
  phone: string; // synthetic +91 9xxxxxxxxx — never a real number
  name: string;
  city: City;
  home_area: string;
  persona: "metro-pro" | "genz-flaky";
  created_at: string;
}

export interface TasteProfile {
  user_id: string;
  cuisine_vec: Record<string, number>; // 0..1 affinity
  genre_vec: Record<string, number>; // event/movie genres, 0..1
  price_band: BudgetBand;
  fav_areas: string[];
  dietary: Dietary;
  time_pattern: { preferred_days: number[]; preferred_start_hour: number }; // 0=Sun
  travel_tolerance_km: number;
  last_built_at: string;
  source: "synthetic"; // flagged: prod reads District/Zomato history instead
}

export interface SocialEdge {
  user_id: string;
  friend_id: string;
  source: "contacts" | "co-attendance" | "invite";
  status: "active";
}

export interface DiningVenue {
  id: string;
  kind: "dining";
  city: City;
  area: string;
  lat: number;
  lng: number;
  name: string;
  cuisines: string[];
  price_band: BudgetBand;
  avg_cost_per_head: number; // INR
  dietary_ok: Dietary[];
  rating: number; // 3.5..4.9
  vibe_tags: Vibe[];
  slots: DiningSlot[];
}

export interface DiningSlot {
  id: string;
  venue_id: string;
  starts_at: string; // ISO
  capacity_left: number; // covers
  status: "available" | "sold_out";
}

export interface LiveEvent {
  id: string;
  kind: "event";
  city: City;
  area: string;
  lat: number;
  lng: number;
  title: string;
  category: "comedy" | "live-music" | "theatre" | "nightlife" | "sports" | "activity";
  genre_tags: string[];
  starts_at: string;
  duration_min: number;
  price_per_ticket: number;
  tickets_left: number;
  status: "available" | "sold_out";
  vibe_tags: Vibe[];
}

export interface MovieShowtime {
  id: string;
  kind: "movie";
  city: City;
  area: string;
  lat: number;
  lng: number;
  title: string;
  genre_tags: string[];
  language: string;
  cinema: string;
  starts_at: string;
  duration_min: number;
  price_per_ticket: number;
  seats_left: number;
  status: "available" | "sold_out";
}

export interface FixtureBundle {
  generated_at: string;
  anchor_date: string; // YYYY-MM-DD
  seed: number;
  note: string;
  areas: Area[];
  users: SyntheticUser[];
  taste_profiles: TasteProfile[];
  social_edges: SocialEdge[];
  dining: DiningVenue[];
  events: LiveEvent[];
  movies: MovieShowtime[];
}
