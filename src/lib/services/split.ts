/**
 * Split service — per-member shares (Splitpay). The price quoted at vote/lock is the price charged.
 * One member's failure never voids the others.
 */
import { store, newId, nowIso, joinedMembers, splitsOf, getUser } from "../store/store.ts";
import type { Plan, Split } from "../store/types.ts";
import { payments } from "../providers/payments.ts";
import { ServiceError, conflict, notFound } from "./errors.ts";
import { track } from "./analytics.ts";

export function perHead(plan: Plan): number {
  const s = plan.locked_suggestion_id ? store.suggestions.get(plan.locked_suggestion_id) : undefined;
  if (!s) throw conflict("not_locked", "Nothing to split until the plan is locked");
  return s.est_cost_per_head;
}

/** Create pending shares for joined members that don't have one; drop shares for members who left. */
export function ensureSplits(plan: Plan): Split[] {
  if (!["locked", "booked"].includes(plan.status)) return splitsOf(plan.id);
  const amount = perHead(plan);
  const joined = new Set(joinedMembers(plan.id).map((m) => m.user_id));
  for (const s of splitsOf(plan.id)) {
    if (!joined.has(s.user_id) && s.status === "pending") store.splits.delete(s.id);
    if (!joined.has(s.user_id) && s.status === "captured") { payments.refund(s.payment_intent_ref ?? ""); s.status = "refunded"; s.updated_at = nowIso(); track("split.refunded", { user_id: s.user_id, plan_id: plan.id, props: { reason: "left" } }); }
  }
  for (const uid of joined) if (!splitsOf(plan.id).some((s) => s.user_id === uid && s.status !== "refunded")) {
    store.splits.set(newId(), { id: "", plan_id: plan.id, user_id: uid, amount, provider: "mock", status: "pending", created_at: nowIso(), updated_at: nowIso() } as Split);
  }
  // fix ids (Map key = id)
  for (const [k, s] of store.splits) if (!s.id) s.id = k;
  return splitsOf(plan.id);
}

export function mySplit(planId: string, userId: string) { return splitsOf(planId).find((s) => s.user_id === userId && s.status !== "refunded"); }

/** Pay my share via the mock provider (pre-auth + capture). Never charges more than quoted. */
export function paySplit(planId: string, userId: string): Split {
  const plan = store.plans.get(planId); if (!plan) throw notFound("plan");
  if (!["locked", "booked"].includes(plan.status)) throw conflict("not_locked", "You can pay once the plan is locked");
  ensureSplits(plan);
  const s = mySplit(planId, userId); if (!s) throw new ServiceError("no_share", "You're not in this plan", 403);
  if (s.status === "captured") return s; // idempotent
  const quoted = perHead(plan);
  if (s.amount !== quoted) throw conflict("price_changed", "Price changed — refresh before paying"); // Honest Checkout: shown == charged
  const user = getUser(userId);
  const auth = payments.authorise(s.amount, `${planId}:${userId}${user?.name.endsWith("-fail") ? "-fail" : ""}`);
  if (!auth.ok) { s.status = "failed"; s.failure_reason = auth.reason; s.updated_at = nowIso(); track("split.failed", { user_id: userId, plan_id: planId, props: { reason: auth.reason } }); throw new ServiceError("payment_failed", auth.reason, 402); }
  payments.capture(auth.intent_ref);
  s.status = "captured"; s.payment_intent_ref = auth.intent_ref; s.failure_reason = undefined; s.updated_at = nowIso();
  track("split.captured", { user_id: userId, plan_id: planId, props: { amount: s.amount } });
  return s;
}

export function refundAll(plan: Plan, reason: string) {
  for (const s of splitsOf(plan.id)) if (s.status === "captured") { payments.refund(s.payment_intent_ref ?? ""); s.status = "refunded"; s.updated_at = nowIso(); track("split.refunded", { user_id: s.user_id, plan_id: plan.id, props: { reason } }); }
}

export function splitSummary(planId: string) {
  const all = splitsOf(planId).filter((s) => s.status !== "refunded");
  const paid = all.filter((s) => s.status === "captured");
  return { total: all.reduce((n, s) => n + s.amount, 0), paid_amount: paid.reduce((n, s) => n + s.amount, 0), paid_count: paid.length, count: all.length, splits: all };
}
