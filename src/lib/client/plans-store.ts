/**
 * Client-side persistence for the Plans layer.
 *
 * Why: the prototype has no database and Vercel functions are stateless, so anything created on the
 * server vanishes between requests. Plan + member state therefore lives in the browser: the same
 * pure services (src/lib/services) run against the in-memory store, and every mutation snapshots the
 * affected plan to localStorage, keyed by plan id. Share links carry the snapshot in the URL hash so
 * another device can open them with no backend.
 *
 * In production this whole module is replaced by the Postgres model in docs/data-model/.
 */
import { store } from "../store/store.ts";
import type { Booking, Invite, Plan, PlanMember, Split, Suggestion, User, Vote } from "../store/types.ts";
import { membersOf, suggestionsOf, votesOf, invitesOf, bookingsOf, splitsOf } from "../store/store.ts";

export interface Snapshot { v: 1; plan: Plan; members: PlanMember[]; invites: Invite[]; suggestions: Suggestion[]; votes: Vote[]; splits: Split[]; bookings: Booking[]; users: User[] }
const INDEX = "district:plans:index";
const key = (id: string) => `district:plan:${id}`;
const canStore = () => typeof window !== "undefined" && !!window.localStorage;

export function snapshotOf(planId: string): Snapshot | null {
  const plan = store.plans.get(planId); if (!plan) return null;
  const members = membersOf(planId);
  const ids = new Set([plan.creator_id, ...members.map((m) => m.user_id)]);
  return { v: 1, plan, members, invites: invitesOf(planId), suggestions: suggestionsOf(planId), votes: votesOf(planId), splits: splitsOf(planId), bookings: bookingsOf(planId), users: [...ids].map((id) => store.users.get(id)).filter((u): u is User => !!u) };
}

/** Write a snapshot into the live store (replacing that plan's rows). Users are added if missing. */
export function applySnapshot(s: Snapshot) {
  const id = s.plan.id;
  for (const u of s.users) if (!store.users.has(u.id)) store.users.set(u.id, u);
  store.plans.set(id, s.plan);
  for (const m of [...store.members.values()]) if (m.plan_id === id) store.members.delete(m.id);
  for (const m of s.members) store.members.set(m.id, m);
  for (const i of [...store.invites.values()]) if (i.plan_id === id) store.invites.delete(i.id);
  for (const i of s.invites) store.invites.set(i.id, i);
  for (const x of [...store.suggestions.values()]) if (x.plan_id === id) store.suggestions.delete(x.id);
  for (const x of s.suggestions) store.suggestions.set(x.id, x);
  for (const [k, v] of [...store.votes]) if (v.plan_id === id) store.votes.delete(k);
  for (const v of s.votes) store.votes.set(`${v.plan_id}:${v.user_id}`, v);
  for (const x of [...store.splits.values()]) if (x.plan_id === id) store.splits.delete(x.id);
  for (const x of s.splits) store.splits.set(x.id, x);
  for (const b of [...store.bookings.values()]) if (b.plan_id === id) store.bookings.delete(b.id);
  for (const b of s.bookings) store.bookings.set(b.id, b);
}

export function persistPlan(planId: string) {
  if (!canStore()) return;
  const s = snapshotOf(planId); if (!s) return;
  try {
    localStorage.setItem(key(planId), JSON.stringify(s));
    const idx = new Set<string>(JSON.parse(localStorage.getItem(INDEX) ?? "[]"));
    idx.add(planId); localStorage.setItem(INDEX, JSON.stringify([...idx]));
  } catch { /* quota / private mode: state stays in memory for this tab */ }
}

/** Load every persisted plan into the store once per page load. */
export function loadPersisted() {
  if (!canStore() || store.flags.client_loaded) return;
  store.flags.client_loaded = true;
  try {
    const idx: string[] = JSON.parse(localStorage.getItem(INDEX) ?? "[]");
    for (const id of idx) { const raw = localStorage.getItem(key(id)); if (raw) applySnapshot(JSON.parse(raw)); }
  } catch { /* ignore corrupt entries */ }
}

// ---------- change notification (for useSyncExternalStore) ----------
let version = 0; const listeners = new Set<() => void>();
export const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const getVersion = () => version;
export function notify() { version++; for (const l of listeners) l(); }

/** Run a service mutation, persist the plan it touched, and notify subscribers. */
export function mutate<T>(planId: string | null | ((r: T) => string | null), fn: () => T): T {
  const r = fn();
  const id = typeof planId === "function" ? planId(r) : planId;
  if (id) persistPlan(id);
  notify();
  return r;
}

// ---------- share links: the plan travels in the URL hash ----------
const b64u = { enc: (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""), dec: (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/")))) };
export function encodeSnapshot(planId: string): string { const s = snapshotOf(planId); return s ? b64u.enc(JSON.stringify(s)) : ""; }
export function decodeSnapshot(str: string): Snapshot | null { try { const s = JSON.parse(b64u.dec(str)); return s && s.v === 1 && s.plan?.id ? (s as Snapshot) : null; } catch { return null; } }
/** If the URL carries `#s=<snapshot>` for a plan we don't have, adopt it. Returns the plan id if applied. */
export function hydrateFromHash(): string | null {
  if (typeof window === "undefined") return null;
  const m = /(?:^#|&)s=([^&]+)/.exec(window.location.hash); if (!m) return null;
  const s = decodeSnapshot(m[1]); if (!s) return null;
  const local = store.plans.get(s.plan.id);
  if (!local || new Date(s.plan.updated_at) > new Date(local.updated_at)) { applySnapshot(s); persistPlan(s.plan.id); notify(); }
  return s.plan.id;
}
export function shareUrlFor(planId: string, origin: string): string {
  const p = store.plans.get(planId); if (!p) return origin;
  return `${origin}/join/${p.share_token}#s=${encodeSnapshot(planId)}`;
}
