/**
 * Domain types — mirror docs/data-model/*.sql one-to-one so the store can be swapped for Postgres later.
 */
import type { BudgetBand, City, Dietary } from "../fixtures/types.ts";
export type { BudgetBand, City, Dietary, DiningVenue, DiningSlot, LiveEvent, MovieShowtime, Area } from "../fixtures/types.ts";

export type PlanStatus = "draft" | "voting" | "locked" | "booked" | "completed" | "cancelled" | "expired";
export type RsvpStatus = "invited" | "joined" | "declined" | "left";
export type MemberRole = "organiser" | "member";
export type InviteChannel = "link" | "contact";
export type InviteStatus = "pending" | "accepted" | "declined" | "opted_out" | "expired" | "revoked";
export type BookingStatus = "pending" | "confirmed" | "failed" | "cancelled" | "refunded";
export type RefundStatus = "none" | "pending" | "refunded" | "failed";
export type SplitStatus = "pending" | "authorised" | "captured" | "failed" | "refunded";
export type ComponentKind = "event" | "dining" | "movie" | "ride";

export interface User {
  id: string;
  phone?: string;
  name: string;
  city: City;
  home_area?: string;
  persona?: string;
  is_guest?: boolean; // joined via share link without an account (light account, PRD P0)
  created_at: string;
}

export interface TasteProfile {
  user_id: string;
  cuisine_vec: Record<string, number>;
  genre_vec: Record<string, number>;
  price_band: BudgetBand;
  fav_areas: string[];
  dietary: Dietary;
  time_pattern: { preferred_days: number[]; preferred_start_hour: number };
  travel_tolerance_km: number;
  source: "synthetic" | "district";
  last_built_at: string;
}

export interface SocialEdge {
  user_id: string;
  friend_id: string;
  source: "contacts" | "co-attendance" | "invite";
  status: "active" | "blocked" | "removed";
}

export interface Plan {
  id: string;
  creator_id: string;
  city: City;
  date_start: string; // YYYY-MM-DD
  date_end: string;
  vibe: string;
  budget_band: BudgetBand;
  status: PlanStatus;
  quorum: number;
  lock_rule: "majority";
  share_token: string;
  invite_cap: number;
  expires_at: string;
  locked_at?: string;
  locked_suggestion_id?: string;
  experiment_variant?: string;
  created_at: string;
  updated_at: string;
}

export interface PlanMember {
  id: string;
  plan_id: string;
  user_id: string;
  display_name: string;
  rsvp_status: RsvpStatus;
  role: MemberRole;
  joined_at?: string;
  created_at: string;
}

export interface Invite {
  id: string;
  plan_id: string;
  inviter_id: string;
  channel: InviteChannel;
  token: string;
  contact_hash?: string;
  invitee_user_id?: string;
  status: InviteStatus;
  created_at: string;
  responded_at?: string;
}

export interface SuggestionComponent {
  kind: ComponentKind;
  ref: string; // inventory id (event id, slot id, showtime id)
  title: string;
  subtitle?: string; // venue / cinema / area
  area: string;
  starts_at: string;
  ends_at?: string;
  price_per_head: number;
  tags: string[];
}

export interface Suggestion {
  id: string;
  plan_id: string;
  kind: "night_bundle";
  title: string;
  components: SuggestionComponent[];
  est_cost_per_head: number;
  score: number;
  rationale: string;
  rationale_source: "rules" | "llm";
  availability_checked_at: string;
  is_available: boolean;
  created_at: string;
}

export interface Vote {
  plan_id: string;
  suggestion_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  plan_id: string;
  suggestion_id: string;
  category: ComponentKind;
  inventory_ref: string;
  provider: string;
  provider_ref?: string;
  status: BookingStatus;
  amount: number;
  quoted_amount: number;
  refund_status: RefundStatus;
  failure_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface Split {
  id: string;
  plan_id: string;
  booking_id?: string;
  user_id: string;
  amount: number;
  payment_intent_ref?: string;
  provider: string;
  status: SplitStatus;
  failure_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsEvent {
  id: number;
  name: string;
  user_id?: string;
  plan_id?: string;
  props: Record<string, unknown>;
  experiment_variant?: string;
  ts: string;
}
