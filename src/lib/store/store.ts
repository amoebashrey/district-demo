/**
 * In-memory store, seeded from fixtures/out/bundle.json at first access.
 *
 * Why: the prototype must run with `npm run dev` alone and deploy to Vercel with zero services.
 * Trade-off (deliberate): state lives in the server process — it resets on restart/cold start and
 * is per-instance on serverless. Fine for a clickable demo; docs/data-model/ holds the production schema.
 *
 * All mutation goes through src/lib/services/*, never directly from routes or components.
 */
import bundle from "../../../fixtures/out/bundle.json" with { type: "json" };
import type { FixtureBundle } from "../fixtures/types.ts";
import type {
  AnalyticsEvent, Booking, DiningSlot, DiningVenue, Invite, LiveEvent, MovieShowtime, Plan, PlanMember,
  SocialEdge, Split, Suggestion, TasteProfile, User, Vote,
} from "./types.ts";

export interface Store {
  seeded_at: string;
  flags: Record<string, boolean>;
  anchor_shift_days: number;
  users: Map<string, User>;
  taste: Map<string, TasteProfile>;
  edges: SocialEdge[];
  plans: Map<string, Plan>;
  members: Map<string, PlanMember>;
  invites: Map<string, Invite>;
  suggestions: Map<string, Suggestion>;
  votes: Map<string, Vote>; // key `${plan_id}:${user_id}` — one active vote per member
  bookings: Map<string, Booking>;
  splits: Map<string, Split>;
  events: AnalyticsEvent[]; // append-only
  optouts: Map<string, { user_id?: string; reason: string; created_at: string }>; // by contact hash
  inventory: {
    dining: Map<string, DiningVenue>;
    slots: Map<string, DiningSlot>; // by slot id
    slotsByVenue: Map<string, DiningSlot[]>;
    events: Map<string, LiveEvent>;
    movies: Map<string, MovieShowtime>;
  };
}

export const voteKey = (planId: string, userId: string) => `${planId}:${userId}`;
export const nowIso = () => new Date().toISOString();
export const newId = () => crypto.randomUUID();
export const newToken = (bytes = 9) => {
  const a = new Uint8Array(bytes); crypto.getRandomValues(a);
  return Buffer.from(a).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

/** Shift fixture timestamps so the fixture's anchor day lands on real today; keeps inventory "live" on Vercel. */
function shiftIso(iso: string, days: number) {
  if (!days) return iso;
  const d = new Date(iso); d.setUTCDate(d.getUTCDate() + days); return d.toISOString();
}

function seed(): Store {
  const fx = bundle as unknown as FixtureBundle;
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const anchor = new Date(`${fx.anchor_date}T00:00:00Z`);
  const shift = Math.round((today.getTime() - anchor.getTime()) / 86_400_000);

  const s: Store = {
    seeded_at: nowIso(), anchor_shift_days: shift, flags: {},
    users: new Map(), taste: new Map(), edges: [], plans: new Map(), members: new Map(), invites: new Map(),
    suggestions: new Map(), votes: new Map(), bookings: new Map(), splits: new Map(), events: [], optouts: new Map(),
    inventory: { dining: new Map(), slots: new Map(), slotsByVenue: new Map(), events: new Map(), movies: new Map() },
  };
  for (const u of fx.users) s.users.set(u.id, { id: u.id, phone: u.phone, name: u.name, city: u.city, home_area: u.home_area, persona: u.persona, created_at: u.created_at });
  for (const t of fx.taste_profiles) s.taste.set(t.user_id, t);
  s.edges = fx.social_edges.map((e) => ({ ...e }));
  for (const d of fx.dining) {
    const slots = d.slots.map((sl) => ({ ...sl, starts_at: shiftIso(sl.starts_at, shift) }));
    s.inventory.dining.set(d.id, { ...d, slots });
    s.inventory.slotsByVenue.set(d.id, slots);
    for (const sl of slots) s.inventory.slots.set(sl.id, sl);
  }
  for (const e of fx.events) s.inventory.events.set(e.id, { ...e, starts_at: shiftIso(e.starts_at, shift) });
  for (const m of fx.movies) s.inventory.movies.set(m.id, { ...m, starts_at: shiftIso(m.starts_at, shift) });
  return s;
}

declare global { var __districtStore: Store | undefined; }
export const store: Store = globalThis.__districtStore ?? (globalThis.__districtStore = seed());

/** Test hook: fresh store (used by scripts/test). */
export function resetStore(): Store { globalThis.__districtStore = seed(); return globalThis.__districtStore; }

// ---------- read helpers (pure) ----------
export const getUser = (id: string) => store.users.get(id);
export const friendsOf = (userId: string): User[] =>
  store.edges.filter((e) => e.user_id === userId && e.status === "active").map((e) => store.users.get(e.friend_id)!).filter(Boolean);
export const membersOf = (planId: string): PlanMember[] =>
  [...store.members.values()].filter((m) => m.plan_id === planId).sort((a, b) => a.created_at.localeCompare(b.created_at));
export const joinedMembers = (planId: string) => membersOf(planId).filter((m) => m.rsvp_status === "joined");
export const memberOf = (planId: string, userId: string) => membersOf(planId).find((m) => m.user_id === userId);
export const suggestionsOf = (planId: string): Suggestion[] =>
  [...store.suggestions.values()].filter((x) => x.plan_id === planId).sort((a, b) => b.score - a.score);
export const votesOf = (planId: string): Vote[] => [...store.votes.values()].filter((v) => v.plan_id === planId);
export const invitesOf = (planId: string): Invite[] => [...store.invites.values()].filter((i) => i.plan_id === planId);
export const plansFor = (userId: string): Plan[] => {
  const ids = new Set(membersOf_all().filter((m) => m.user_id === userId && m.rsvp_status !== "left").map((m) => m.plan_id));
  return [...store.plans.values()].filter((p) => ids.has(p.id) || p.creator_id === userId).sort((a, b) => b.created_at.localeCompare(a.created_at));
};
const membersOf_all = () => [...store.members.values()];
export const bookingsOf = (planId: string): Booking[] => [...store.bookings.values()].filter((b) => b.plan_id === planId);
export const splitsOf = (planId: string): Split[] => [...store.splits.values()].filter((s) => s.plan_id === planId);
export const planByToken = (token: string) => [...store.plans.values()].find((p) => p.share_token === token);
