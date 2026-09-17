/**
 * Booking service — turns a locked plan (or a solo checkout) into inventory bookings.
 * All-or-nothing per plan; on failure every captured share is auto-refunded (no support ticket).
 */
import { store, newId, nowIso, joinedMembers, bookingsOf } from "../store/store.ts";
import type { Booking, Plan } from "../store/types.ts";
import { ServiceError, conflict, notFound } from "./errors.ts";
import { track } from "./analytics.ts";
import { ensureSplits, refundAll, splitSummary } from "./split.ts";
import { getItem, release, reserve, toComponent, type Item } from "./inventory.ts";

const fee = (subtotal: number) => Math.round(subtotal * 0.05);
const gst = (f: number) => Math.round(f * 0.18);
export function priceBreakdown(unit: number, qty: number) { const subtotal = unit * qty; const f = fee(subtotal); const g = gst(f); return { subtotal, fee: f, gst: g, total: subtotal + f + g }; }

/** Solo checkout (District's existing flow). */
export function bookSolo(userId: string, item: Item, qty: number): Booking {
  if (qty < 1 || qty > 10) throw new ServiceError("bad_qty", "Pick 1–10");
  const c = toComponent(item);
  if (!reserve(c, qty)) throw conflict("sold_out", "Sold out — try another time");
  const { total } = priceBreakdown(item.price, qty);
  const b: Booking = { id: newId(), user_id: userId, category: item.kind, inventory_ref: c.ref, provider: "mock", provider_ref: `mock_bk_${newId().slice(0, 8)}`, status: "confirmed", amount: total, quoted_amount: total, qty, title: item.title, starts_at: item.starts_at, venue: item.subtitle, refund_status: "none", created_at: nowIso(), updated_at: nowIso() };
  store.bookings.set(b.id, b);
  track("booking.solo", { user_id: userId, props: { kind: item.kind, qty, amount: total } });
  return b;
}

export function getBooking(id: string): Booking { const b = store.bookings.get(id); if (!b) throw notFound("booking"); return b; }

/** Book a locked plan for everyone who has paid. Atomic across components; refunds on any failure. */
export function bookPlan(plan: Plan, actorId?: string): Booking[] {
  if (plan.status !== "locked") throw conflict("not_locked", `Plan is ${plan.status}`);
  const s = plan.locked_suggestion_id ? store.suggestions.get(plan.locked_suggestion_id) : undefined; if (!s) throw conflict("not_locked", "No locked option");
  ensureSplits(plan);
  const { paid_count } = splitSummary(plan.id);
  if (paid_count < 2) throw conflict("not_enough_paid", "At least two people need to pay before booking");
  const qty = paid_count;
  const reserved: typeof s.components = [];
  for (const c of s.components) {
    if (!reserve(c, qty)) {
      for (const r of reserved) release(r, qty);
      plan.booking_failed_reason = `${c.title} sold out before we could book`; s.is_available = false; s.availability_checked_at = nowIso();
      refundAll(plan, "booking_failed");
      const failed: Booking = { id: newId(), plan_id: plan.id, suggestion_id: s.id, category: c.kind, inventory_ref: c.ref, provider: "mock", status: "failed", amount: 0, quoted_amount: c.price_per_head * qty, qty, title: c.title, starts_at: c.starts_at, venue: c.subtitle ?? c.area, refund_status: "refunded", failure_reason: plan.booking_failed_reason, created_at: nowIso(), updated_at: nowIso() };
      store.bookings.set(failed.id, failed);
      track("booking.failed", { plan_id: plan.id, props: { component: c.ref } });
      throw conflict("booking_failed", `${plan.booking_failed_reason}. Everyone's share was refunded.`);
    }
    reserved.push(c);
  }
  const out: Booking[] = s.components.map((c) => ({ id: newId(), plan_id: plan.id, user_id: plan.creator_id, suggestion_id: s.id, category: c.kind, inventory_ref: c.ref, provider: "mock", provider_ref: `mock_bk_${newId().slice(0, 8)}`, status: "confirmed" as const, amount: c.price_per_head * qty, quoted_amount: c.price_per_head * qty, qty, title: c.title, starts_at: c.starts_at, venue: c.subtitle ?? c.area, refund_status: "none" as const, created_at: nowIso(), updated_at: nowIso() }));
  for (const b of out) store.bookings.set(b.id, b);
  plan.status = "booked"; plan.updated_at = nowIso(); plan.booking_failed_reason = undefined;
  track("plan.booked", { user_id: actorId, plan_id: plan.id, props: { from: "locked", qty, attending: joinedMembers(plan.id).length } });
  return out;
}

/** Auto-book when everyone who joined has paid (and quorum is met). Called after each payment. */
export function maybeAutoBook(plan: Plan): boolean {
  if (plan.status !== "locked") return false;
  const joined = joinedMembers(plan.id);
  const { paid_count } = splitSummary(plan.id);
  if (joined.length >= plan.quorum && paid_count >= joined.length && paid_count >= 2) { try { bookPlan(plan); return true; } catch { return false; } }
  return false;
}

export function planBookings(planId: string) { return bookingsOf(planId).filter((b) => b.status === "confirmed"); }
export { getItem };
