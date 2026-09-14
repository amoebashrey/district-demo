/**
 * Plan service — CRUD + the state machine.
 *   draft → voting → locked → booked → completed
 *   any pre-booked state → cancelled | expired
 * Owns lock logic (majority of joined members AND joined ≥ quorum), expiry, and membership changes.
 */
import { store, newId, newToken, nowIso, voteKey, membersOf, joinedMembers, memberOf, suggestionsOf, votesOf, getUser } from "../store/store.ts";
import type { BudgetBand, Plan, PlanMember, PlanStatus, Suggestion, User } from "../store/types.ts";
import { ServiceError, conflict, forbidden, notFound } from "./errors.ts";
import { track } from "./analytics.ts";
import { checkAvailability, generateCandidates } from "./candidates.ts";

const EXPIRY_HOURS = 48;
const TRANSITIONS: Record<PlanStatus, PlanStatus[]> = {
  draft: ["voting", "cancelled", "expired"],
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

export interface CreatePlanInput { creator_id: string; date_start: string; date_end: string; vibe: string; budget_band: BudgetBand; quorum?: number; city?: Plan["city"] }

export function createPlan(input: CreatePlanInput): Plan {
  const creator = getUser(input.creator_id); if (!creator) throw notFound("user");
  if (input.date_end < input.date_start) throw new ServiceError("bad_dates", "End date is before start date");
  const now = new Date();
  const startEve = new Date(`${input.date_start}T12:00:00+05:30`);
  const expires = new Date(Math.min(now.getTime() + EXPIRY_HOURS * 3_600_000, Math.max(startEve.getTime(), now.getTime() + 2 * 3_600_000)));
  const plan: Plan = {
    id: newId(), creator_id: creator.id, city: input.city ?? creator.city, date_start: input.date_start, date_end: input.date_end,
    vibe: input.vibe, budget_band: input.budget_band, status: "draft", quorum: Math.max(2, input.quorum ?? 2), lock_rule: "majority",
    share_token: newToken(), invite_cap: 12, expires_at: expires.toISOString(), created_at: nowIso(), updated_at: nowIso(),
  };
  store.plans.set(plan.id, plan);
  addMember(plan, creator, "organiser", "joined");
  track("plan.created", { user_id: creator.id, plan_id: plan.id, props: { vibe: plan.vibe, budget_band: plan.budget_band, city: plan.city } });
  return plan;
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
  return true;
}

export function leavePlan(planId: string, userId: string): Plan {
  const plan = getPlan(planId);
  const m = requireMember(plan, userId);
  if (plan.creator_id === userId) throw forbidden("The organiser can cancel the plan instead");
  m.rsvp_status = "left";
  store.votes.delete(voteKey(planId, userId));
  track("member.left", { user_id: userId, plan_id: planId });
  // member drops after lock → re-confirm quorum (PRD edge case). Re-split happens in Phase 4.
  if (plan.status === "locked" && joinedMembers(planId).length < plan.quorum) {
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
  return {
    plan, members, joined_count: joined.length, votes_needed: votesNeeded,
    suggestions: suggestions.map((s) => ({ ...s, votes: t[s.id] ?? [] })),
    my_vote: myVote, my_role: me?.role, is_member: !!me && me.rsvp_status !== "left" && me.rsvp_status !== "declined",
    locked: plan.locked_suggestion_id ? suggestions.find((s) => s.id === plan.locked_suggestion_id) : undefined,
  };
}
export type PlanView = ReturnType<typeof planView>;
