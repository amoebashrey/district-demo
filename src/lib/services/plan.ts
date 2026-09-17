/**
 * Plan service — CRUD + the state machine.
 *   draft → voting → locked → booked → completed
 *   any pre-booked state → cancelled | expired
 * Owns lock logic (majority of joined members AND joined ≥ quorum), expiry, and membership changes.
 */
import { store, newId, newToken, nowIso, voteKey, membersOf, joinedMembers, memberOf, suggestionsOf, votesOf, getUser } from "../store/store.ts";
import type { BudgetBand, Plan, PlanMember, PlanStatus, Suggestion, SuggestionComponent, User } from "../store/types.ts";
import { ServiceError, conflict, forbidden, notFound } from "./errors.ts";
import { track } from "./analytics.ts";
import { checkAvailability, generateCandidates } from "./candidates.ts";
import { ensureSplits, mySplit, paySplit, splitSummary } from "./split.ts";
import { bookPlan, maybeAutoBook, planBookings } from "./booking.ts";
import { getItem, release, reserve, toComponent } from "./inventory.ts";

const EXPIRY_HOURS = 48;
const HOLD_MINUTES = 10;
const TRANSITIONS: Record<PlanStatus, PlanStatus[]> = {
  draft: ["voting", "locked", "cancelled", "expired"],
  voting: ["locked", "cancelled", "expired"],
  locked: ["booked", "cancelled", "voting"], // back to voting if quorum breaks after lock
  booked: ["completed", "cancelled"],
  completed: [], cancelled: [], expired: ["voting"], // re-open
};

function transition(plan: Plan, to: PlanStatus, actor?: string, props: Record<string, unknown> = {}) {
  if (!TRANSITIONS[plan.status].includes(to)) throw conflict("invalid_transition", `Can't go from ${plan.status} to ${to}`);
  const from = plan.status;
  plan.status = to; plan.updated_at = nowIso();
  track(`plan.${to}`, { user_id: actor, plan_id: plan.id, props: { from, ...props } });
}

export interface CreatePlanInput { creator_id: string; date_start: string; date_end: string; vibe: string; budget_band: BudgetBand; quorum?: number; city?: Plan["city"]; anchor?: Plan["anchor"] }

export function createPlan(input: CreatePlanInput): Plan {
  if (input.anchor) {
    const item = getItem(input.anchor.kind, input.anchor.ref); if (!item) throw notFound("item");
    return createAnchoredPlan({ creator_id: input.creator_id, components: [toComponent(item)], title: item.title, quorum: input.quorum, anchor: input.anchor, source: "ep2" });
  }
  const creator = getUser(input.creator_id); if (!creator) throw notFound("user");
  if (input.date_end < input.date_start) throw new ServiceError("bad_dates", "End date is before start date");
  const now = new Date();
  const startEve = new Date(`${input.date_start}T12:00:00+05:30`);
  const expires = new Date(Math.min(now.getTime() + EXPIRY_HOURS * 3_600_000, Math.max(startEve.getTime(), now.getTime() + 2 * 3_600_000)));
  const plan: Plan = {
    id: newId(), creator_id: creator.id, city: input.city ?? creator.city, date_start: input.date_start, date_end: input.date_end,
    vibe: input.vibe, budget_band: input.budget_band, status: "draft", quorum: Math.max(2, input.quorum ?? 2), lock_rule: "majority",
    mode: input.anchor ? "anchored" : "open",
    ...(input.anchor ? { anchor: input.anchor } : {}),
    share_token: newToken(), invite_cap: 12, expires_at: expires.toISOString(), created_at: nowIso(), updated_at: nowIso(),
  };
  store.plans.set(plan.id, plan);
  addMember(plan, creator, "organiser", "joined");
  track("plan.created", { user_id: creator.id, plan_id: plan.id, props: { vibe: plan.vibe, budget_band: plan.budget_band, city: plan.city } });
  return plan;
}

const istDate = (iso: string) => new Date(new Date(iso).getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);
const bandFor = (cost: number): BudgetBand => (cost <= 800 ? "₹" : cost <= 1600 ? "₹₹" : cost <= 2800 ? "₹₹₹" : "₹₹₹₹");

export interface AnchoredInput { creator_id: string; components: SuggestionComponent[]; title: string; rationale?: string; quorum?: number; anchor?: Plan["anchor"]; source: "ep1" | "ep2" | "ep3" | "ep4" | "replan"; status?: "locked" | "booked" }

/**
 * Anchored plan (EP1–EP4): rides one existing item or bundle, so there is nothing to vote on.
 * Created straight into `locked` with the item as the locked suggestion; friends join and pay their share.
 */
export function createAnchoredPlan(input: AnchoredInput): Plan {
  const creator = getUser(input.creator_id); if (!creator) throw notFound("user");
  if (input.components.length === 0) throw new ServiceError("no_components", "Nothing to plan around");
  const first = [...input.components].sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
  const cost = input.components.reduce((n, c) => n + c.price_per_head, 0);
  const date = first.starts_at ? istDate(first.starts_at) : new Date().toISOString().slice(0, 10);
  const plan: Plan = {
    id: newId(), creator_id: creator.id, city: creator.city, date_start: date, date_end: date,
    vibe: first.tags[0] ?? "together", budget_band: bandFor(cost), status: "draft", quorum: Math.max(2, input.quorum ?? 2), lock_rule: "majority",
    mode: "anchored", anchor: input.anchor, share_token: newToken(), invite_cap: 12,
    expires_at: new Date(Date.now() + HOLD_MINUTES * 60_000).toISOString(), // seats held while the crew commits
    created_at: nowIso(), updated_at: nowIso(),
  };
  const s: Suggestion = { id: newId(), plan_id: plan.id, kind: "night_bundle", title: input.title, components: input.components, est_cost_per_head: cost, score: 1, rationale: input.rationale ?? `${input.title} — ${inrShort(cost)} a head, split with the crew.`, rationale_source: "rules", availability_checked_at: nowIso(), is_available: true, created_at: nowIso() };
  store.suggestions.set(s.id, s);
  plan.locked_suggestion_id = s.id; // the night is fixed from the start; "locked" status = the crew has confirmed
  if (input.status === "booked") { plan.status = "booked"; plan.locked_at = nowIso(); }
  store.plans.set(plan.id, plan);
  addMember(plan, creator, "organiser", "joined");
  if (plan.status === "booked") ensureSplits(plan);
  track("plan.created", { user_id: creator.id, plan_id: plan.id, props: { mode: "anchored", source: input.source, city: plan.city } });
  return plan;
}
const inrShort = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** EP4: an existing solo booking becomes a group plan friends can join and pay into. */
export function convertBookingToPlan(bookingId: string, userId: string): Plan {
  const b = store.bookings.get(bookingId); if (!b) throw notFound("booking");
  if (b.user_id !== userId) throw forbidden("That booking isn't yours");
  if (b.plan_id) return getPlan(b.plan_id);
  const item = getItem(b.category, b.inventory_ref); if (!item) throw notFound("item");
  const plan = createAnchoredPlan({ creator_id: userId, components: [toComponent(item)], title: item.title, anchor: { kind: b.category, ref: b.inventory_ref }, source: "ep4", status: "booked" });
  b.plan_id = plan.id; b.suggestion_id = plan.locked_suggestion_id; b.updated_at = nowIso();
  // organiser already paid at checkout → their share is captured
  const mine = mySplit(plan.id, userId); if (mine) { mine.status = "captured"; mine.payment_intent_ref = b.provider_ref; mine.updated_at = nowIso(); }
  track("plan.from_booking", { user_id: userId, plan_id: plan.id, props: { booking_id: b.id } });
  return plan;
}

/** EP5/EP6: one-tap re-plan with the same crew → new open plan, crew pre-invited. */
export function replan(planId: string, actorId: string): Plan {
  const prev = getPlan(planId);
  const crew = membersOf(prev.id).filter((m) => m.rsvp_status === "joined" && m.user_id !== actorId);
  const next = new Date(); const dow = next.getDay(); next.setDate(next.getDate() + ((6 - dow + 7) % 7 || 7));
  const sat = next.toISOString().slice(0, 10); const sun = new Date(next); sun.setDate(next.getDate() + 1);
  const plan = createPlan({ creator_id: actorId, date_start: sat, date_end: sun.toISOString().slice(0, 10), vibe: prev.vibe, budget_band: prev.budget_band, quorum: Math.min(prev.quorum, Math.max(2, crew.length + 1)) });
  for (const m of crew) { const u = getUser(m.user_id); if (u) addMember(plan, u, "member", "invited"); }
  track("plan.replanned", { user_id: actorId, plan_id: plan.id, props: { from_plan: prev.id, crew: crew.length } });
  return plan;
}

/**
 * Anchored plans confirm when a majority of everyone asked has tapped "I'm in" (and at least `quorum` are in).
 * Free to commit; money is only asked for once confirmed. Returns true when it just confirmed.
 */
export function evaluateCommit(plan: Plan, actorId?: string): boolean {
  if (plan.mode !== "anchored" || plan.status !== "draft") return false;
  const joined = joinedMembers(plan.id).length;
  const asked = membersOf(plan.id).filter((m) => m.rsvp_status === "joined" || m.rsvp_status === "invited").length;
  if (joined < plan.quorum || joined * 2 <= asked) return false;
  plan.locked_at = nowIso();
  transition(plan, "locked", actorId, { anchored: true, joined, asked, seconds_to_confirm: Math.round((Date.now() - new Date(plan.created_at).getTime()) / 1000) });
  ensureSplits(plan);
  return true;
}

/** "Add someone by name" on Who's coming → light guest account, invited (not joined) until they tap I'm in. */
export function addGuestInvitee(planId: string, actorId: string, name: string): PlanMember {
  const plan = getPlan(planId); requireMember(plan, actorId);
  const clean = name.trim(); if (clean.length < 2) throw new ServiceError("name_required", "Type a name");
  const user: User = { id: newId(), name: clean, city: plan.city, is_guest: true, created_at: nowIso() };
  store.users.set(user.id, user);
  store.edges.push({ user_id: actorId, friend_id: user.id, source: "invite", status: "active" });
  const m = addMember(plan, user, "member", "invited");
  track("invite.sent", { user_id: actorId, plan_id: planId, props: { channel: "name", invitee: user.id } });
  return m;
}

/**
 * Demo only: pretend one invited friend responds. Gathering → someone taps "I'm in" (and votes if there are options);
 * confirmed → someone pays their share. Returns what happened so the UI can toast it.
 */
export function simulateStep(planId: string): { action: "joined" | "voted" | "paid" | "idle"; name?: string; confirmed?: boolean; booked?: boolean } {
  const plan = getPlan(planId);
  if (plan.status === "draft" || plan.status === "voting") {
    const next = membersOf(plan.id).find((m) => m.rsvp_status === "invited");
    if (!next) return { action: "idle" };
    next.rsvp_status = "joined"; next.joined_at = nowIso();
    track("invite.accepted", { user_id: next.user_id, plan_id: plan.id, props: { channel: "simulated" } });
    if (plan.status === "voting") {
      const t = tallies(plan.id); const opts = suggestionsOf(plan.id).filter((s) => s.is_available);
      const leader = opts.sort((a, b) => (t[b.id]?.length ?? 0) - (t[a.id]?.length ?? 0))[0];
      const pick = Math.random() < 0.75 || !opts[1] ? leader : opts[1];
      if (pick) { store.votes.set(voteKey(plan.id, next.user_id), { plan_id: plan.id, suggestion_id: pick.id, user_id: next.user_id, created_at: nowIso(), updated_at: nowIso() }); track("vote.cast", { user_id: next.user_id, plan_id: plan.id, props: { simulated: true } }); }
      return { action: "voted", name: next.display_name, confirmed: evaluateLock(plan, next.user_id) };
    }
    return { action: "joined", name: next.display_name, confirmed: evaluateCommit(plan, next.user_id) };
  }
  if (plan.status === "locked") {
    ensureSplits(plan);
    const unpaid = joinedMembers(plan.id).find((m) => m.user_id !== plan.creator_id && mySplit(plan.id, m.user_id)?.status !== "captured");
    if (!unpaid) return { action: "idle" };
    paySplit(plan.id, unpaid.user_id);
    return { action: "paid", name: unpaid.display_name, booked: maybeAutoBook(plan) };
  }
  return { action: "idle" };
}

/** Demo only: a joined friend drops out after confirm → their share is dropped/refunded, everyone else's recomputed. */
export function simulateDrop(planId: string): { name?: string; remaining: number; per_head?: number } {
  const plan = getPlan(planId);
  const victim = joinedMembers(plan.id).filter((m) => m.user_id !== plan.creator_id).at(-1);
  if (!victim) return { remaining: joinedMembers(plan.id).length };
  leavePlan(plan.id, victim.user_id);
  const s = plan.locked_suggestion_id ? store.suggestions.get(plan.locked_suggestion_id) : undefined;
  return { name: victim.display_name, remaining: joinedMembers(plan.id).length, per_head: s?.est_cost_per_head };
}

/** Pay my share; for an already-booked plan, reserve one more seat per component first (never charge for a seat we can't get). */
export function payShare(planId: string, userId: string): { booked: boolean } {
  const plan = getPlan(planId);
  requireMember(plan, userId);
  if (plan.status === "booked") {
    const s = store.suggestions.get(plan.locked_suggestion_id ?? ""); if (!s) throw conflict("not_locked", "Nothing to pay for");
    const already = mySplit(planId, userId); if (already?.status === "captured") return { booked: true };
    const done: SuggestionComponent[] = [];
    for (const c of s.components) { if (!reserve(c, 1)) { done.forEach((d) => release(d, 1)); throw conflict("sold_out", `${c.title} is sold out — you can still come, but we couldn't add a seat`); } done.push(c); }
    try { paySplit(planId, userId); } catch (e) { done.forEach((d) => release(d, 1)); throw e; }
    for (const b of planBookings(planId)) { b.qty += 1; b.amount += s.components.find((c) => c.ref === b.inventory_ref)?.price_per_head ?? 0; b.quoted_amount = b.amount; b.updated_at = nowIso(); }
    return { booked: true };
  }
  paySplit(planId, userId);
  return { booked: maybeAutoBook(plan) };
}

export function confirmBooking(planId: string, actorId: string) {
  const plan = getPlan(planId); requireOrganiser(plan, actorId);
  return bookPlan(plan, actorId);
}

export function addMember(plan: Plan, user: User, role: PlanMember["role"], rsvp: PlanMember["rsvp_status"]): PlanMember {
  const existing = memberOf(plan.id, user.id);
  if (existing) {
    if (rsvp === "joined" && existing.rsvp_status !== "joined") { existing.rsvp_status = "joined"; existing.joined_at = nowIso(); }
    return existing;
  }
  const m: PlanMember = { id: newId(), plan_id: plan.id, user_id: user.id, display_name: user.name, rsvp_status: rsvp, role, joined_at: rsvp === "joined" ? nowIso() : undefined, created_at: nowIso() };
  store.members.set(m.id, m);
  return m;
}

/** Lazy expiry: evaluated on every read so no scheduler is needed. */
export function getPlan(planId: string): Plan {
  const plan = store.plans.get(planId); if (!plan) throw notFound("plan");
  if ((plan.status === "draft" || plan.status === "voting") && new Date(plan.expires_at).getTime() < Date.now()) {
    transition(plan, "expired", undefined, { reason: "no_majority_before_expiry" });
  }
  return plan;
}

export function requireOrganiser(plan: Plan, userId: string) {
  const m = memberOf(plan.id, userId);
  if (plan.creator_id !== userId && m?.role !== "organiser") throw forbidden("Only the organiser can do that");
}
export function requireMember(plan: Plan, userId: string): PlanMember {
  const m = memberOf(plan.id, userId);
  if (!m || m.rsvp_status === "left" || m.rsvp_status === "declined") throw forbidden("You're not in this plan");
  return m;
}

/** draft → voting. Generates options (Phase 2: rules-only candidates; Phase 3 swaps in full curation). */
export function openVoting(planId: string, actorId: string): { plan: Plan; suggestions: Suggestion[] } {
  const plan = getPlan(planId); requireOrganiser(plan, actorId);
  if (plan.status !== "draft") throw conflict("not_draft", "Voting is already open");
  const party = Math.max(joinedMembers(plan.id).length, plan.quorum);
  let suggestions = suggestionsOf(plan.id);
  if (suggestions.length === 0) {
    suggestions = generateCandidates(plan, party, 3);
    if (suggestions.length < 2) { // widen: two weeks from the start date, so a thin weekend never dead-ends
      const widened = { ...plan, date_end: new Date(new Date(`${plan.date_start}T12:00:00+05:30`).getTime() + 13 * 86_400_000).toISOString().slice(0, 10) };
      suggestions = generateCandidates(widened, party, 3);
      if (suggestions.length >= 2) { plan.date_end = widened.date_end; track("plan.window_widened", { user_id: actorId, plan_id: plan.id }); }
    }
    if (suggestions.length < 2) throw conflict("no_options", "Not enough available nights in that window and budget. Widen the dates or budget.");
    for (const s of suggestions) store.suggestions.set(s.id, s);
  }
  transition(plan, "voting", actorId, { options: suggestions.length });
  return { plan, suggestions };
}

/** One tap. Idempotent and re-castable until lock; rejected cleanly after. Triggers the lock check. */
export function castVote(planId: string, userId: string, suggestionId: string): { plan: Plan; locked: boolean } {
  const plan = getPlan(planId);
  if (plan.status !== "voting") throw conflict("voting_closed", plan.status === "locked" || plan.status === "booked" ? "This plan is already locked" : `Voting isn't open (plan is ${plan.status})`);
  const member = requireMember(plan, userId);
  if (member.rsvp_status !== "joined") { member.rsvp_status = "joined"; member.joined_at = nowIso(); } // voting implies you're in
  const s = store.suggestions.get(suggestionId);
  if (!s || s.plan_id !== planId) throw notFound("option");
  if (!s.is_available) throw conflict("sold_out", "That night just sold out — pick another");
  const key = voteKey(planId, userId);
  const prev = store.votes.get(key);
  if (prev?.suggestion_id === suggestionId) return { plan, locked: false }; // idempotent
  store.votes.set(key, { plan_id: planId, suggestion_id: suggestionId, user_id: userId, created_at: prev?.created_at ?? nowIso(), updated_at: nowIso() });
  track(prev ? "vote.recast" : "vote.cast", { user_id: userId, plan_id: planId, props: { suggestion_id: suggestionId } });
  return { plan, locked: evaluateLock(plan, userId) };
}

export function tallies(planId: string): Record<string, string[]> {
  const t: Record<string, string[]> = {};
  for (const v of votesOf(planId)) (t[v.suggestion_id] ??= []).push(v.user_id);
  return t;
}

/**
 * Lock rule (majority): leading option has > 50% of joined members' votes AND joined ≥ quorum.
 * Atomic: JS is single-threaded per process and this function is synchronous, so two concurrent
 * votes cannot both observe "not locked" and both lock. (In Postgres this is a row lock on plans.)
 */
export function evaluateLock(plan: Plan, actorId?: string): boolean {
  if (plan.status !== "voting") return false;
  const joined = joinedMembers(plan.id);
  if (joined.length < plan.quorum) return false;
  const t = tallies(plan.id);
  const [leaderId, leaderVotes] = Object.entries(t).sort((a, b) => b[1].length - a[1].length)[0] ?? [undefined, []];
  if (!leaderId || leaderVotes.length * 2 <= joined.length) return false;
  const s = store.suggestions.get(leaderId)!;
  // never lock a sold-out option (PRD edge case): flag it and keep voting open
  if (!checkAvailability(s, joined.length)) {
    s.is_available = false; s.availability_checked_at = nowIso();
    track("suggestion.sold_out_mid_vote", { plan_id: plan.id, props: { suggestion_id: s.id } });
    return false;
  }
  plan.locked_suggestion_id = leaderId; plan.locked_at = nowIso();
  transition(plan, "locked", actorId, { suggestion_id: leaderId, votes: leaderVotes.length, joined: joined.length, seconds_to_lock: Math.round((Date.now() - new Date(plan.created_at).getTime()) / 1000) });
  ensureSplits(plan);
  return true;
}

export function leavePlan(planId: string, userId: string): Plan {
  const plan = getPlan(planId);
  const m = requireMember(plan, userId);
  if (plan.creator_id === userId) throw forbidden("The organiser can cancel the plan instead");
  m.rsvp_status = "left";
  store.votes.delete(voteKey(planId, userId));
  track("member.left", { user_id: userId, plan_id: planId });
  if (["locked", "booked"].includes(plan.status)) ensureSplits(plan); // re-split: drop/refund their share
  // member drops after lock → re-confirm quorum (PRD edge case). Re-split happens in Phase 4.
  if (plan.mode === "anchored" && plan.status === "locked" && joinedMembers(planId).length < 2) { transition(plan, "voting", userId, { reason: "everyone_dropped" }); plan.status = "draft"; }
  if (plan.mode === "open" && plan.status === "locked" && joinedMembers(planId).length < plan.quorum) {
    transition(plan, "voting", userId, { reason: "quorum_broken_after_lock" });
    plan.locked_suggestion_id = undefined; plan.locked_at = undefined;
  }
  return plan;
}

export function cancelPlan(planId: string, actorId: string): Plan {
  const plan = getPlan(planId); requireOrganiser(plan, actorId);
  transition(plan, "cancelled", actorId);
  return plan;
}

/** Expired with no majority → easy re-open (not silent death). */
export function reopenPlan(planId: string, actorId: string): Plan {
  const plan = getPlan(planId); requireOrganiser(plan, actorId);
  if (plan.status !== "expired") throw conflict("not_expired", "Plan isn't expired");
  plan.expires_at = new Date(Date.now() + 24 * 3_600_000).toISOString();
  transition(plan, "voting", actorId, { reason: "reopened" });
  return plan;
}

/** Everything a screen needs, in one read. */
export function planView(planId: string, viewerId?: string) {
  const plan = getPlan(planId);
  const members = membersOf(planId).filter((m) => m.rsvp_status !== "left");
  const suggestions = suggestionsOf(planId);
  const t = tallies(planId);
  const joined = members.filter((m) => m.rsvp_status === "joined");
  const votesNeeded = Math.floor(Math.max(joined.length, plan.quorum) / 2) + 1;
  const myVote = viewerId ? store.votes.get(voteKey(planId, viewerId))?.suggestion_id : undefined;
  const me = viewerId ? memberOf(planId, viewerId) : undefined;
  const money = ["locked", "booked"].includes(plan.status);
  if (money) ensureSplits(plan);
  const summary = money ? splitSummary(planId) : { total: 0, paid_amount: 0, paid_count: 0, count: 0, splits: [] };
  const my = viewerId && money ? mySplit(planId, viewerId) : undefined;
  return {
    plan, members, joined_count: joined.length, votes_needed: votesNeeded,
    suggestions: suggestions.map((s) => ({ ...s, votes: t[s.id] ?? [] })),
    my_vote: myVote, my_role: me?.role, is_member: !!me && me.rsvp_status !== "left" && me.rsvp_status !== "declined",
    locked: plan.locked_suggestion_id ? suggestions.find((s) => s.id === plan.locked_suggestion_id) : undefined,
    splits: summary.splits.map((s) => ({ user_id: s.user_id, amount: s.amount, status: s.status })),
    paid_count: summary.paid_count, paid_amount: summary.paid_amount,
    my_split: my ? { amount: my.amount, status: my.status, failure_reason: my.failure_reason } : undefined,
    bookings: money ? planBookings(planId).map((b) => ({ id: b.id, title: b.title, qty: b.qty, provider_ref: b.provider_ref })) : [],
    pending_count: members.filter((m) => m.rsvp_status === "invited").length,
    needed_to_confirm: plan.mode === "anchored" && plan.status === "draft" ? Math.max(plan.quorum - joined.length, Math.floor(members.filter((m) => m.rsvp_status !== "declined").length / 2) + 1 - joined.length, 0) : undefined,
    has_pending_simulation: ["draft", "voting"].includes(plan.status) ? members.some((m) => m.rsvp_status === "invited") : plan.status === "locked" ? joined.some((m) => m.user_id !== plan.creator_id && summary.splits.find((s) => s.user_id === m.user_id)?.status !== "captured") : false,
  };
}
export type PlanView = ReturnType<typeof planView>;
