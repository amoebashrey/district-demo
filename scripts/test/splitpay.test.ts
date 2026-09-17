/** Anchored plans (EP2–EP4), Splitpay shares, auto-book, refund on failure, re-plan. `npm test` */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { resetStore, store, friendsOf, joinedMembers } from "../../src/lib/store/store.ts";
import { createPlan, getPlan, payShare, confirmBooking, convertBookingToPlan, replan, leavePlan, planView } from "../../src/lib/services/plan.ts";
import { joinViaToken } from "../../src/lib/services/invite.ts";
import { listItems, getItem } from "../../src/lib/services/inventory.ts";
import { bookSolo } from "../../src/lib/services/booking.ts";
import { splitSummary } from "../../src/lib/services/split.ts";

let organiser: string; let friends: string[];
before(() => { resetStore(); const u = [...store.users.values()].find((x) => x.city === "Bengaluru")!; organiser = u.id; friends = friendsOf(u.id).map((f) => f.id); });
const d = (n: number) => { const x = new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const anyEvent = () => listItems("event", "Bengaluru").find((e) => e.left >= 5)!;

test("EP2: anchored plan is created locked with the item as the only option and a share per member", () => {
  const ev = anyEvent();
  const p = createPlan({ creator_id: organiser, date_start: d(0), date_end: d(0), vibe: "loud", budget_band: "₹₹", anchor: { kind: "event", ref: ev.id } });
  assert.equal(p.mode, "anchored"); assert.equal(p.status, "locked"); assert.ok(p.locked_suggestion_id);
  const v = planView(p.id, organiser);
  assert.equal(v.locked?.components[0].ref, ev.id); assert.equal(v.my_split?.amount, ev.price); assert.equal(v.my_split?.status, "pending");
});

test("friends join from the link, pay their share; plan auto-books when everyone has paid; price charged == price quoted", () => {
  const ev = anyEvent(); const before = ev.left;
  const p = createPlan({ creator_id: organiser, date_start: d(0), date_end: d(0), vibe: "loud", budget_band: "₹₹", anchor: { kind: "event", ref: ev.id } });
  joinViaToken(p.share_token, { user_id: friends[0] });
  const { user: guest } = joinViaToken(p.share_token, { guest_name: "Guest Meera" });
  assert.equal(joinedMembers(p.id).length, 3);
  assert.equal(payShare(p.id, organiser).booked, false);
  assert.equal(payShare(p.id, friends[0]).booked, false);
  assert.equal(getPlan(p.id).status, "locked");
  assert.equal(payShare(p.id, guest.id).booked, true); // last one pays → booked
  assert.equal(getPlan(p.id).status, "booked");
  const sum = splitSummary(p.id); assert.equal(sum.paid_count, 3); assert.equal(sum.paid_amount, ev.price * 3);
  const v = planView(p.id, organiser); assert.equal(v.bookings.length, 1); assert.equal(v.bookings[0].qty, 3);
  assert.equal(getItem("event", ev.id)!.left, before - 3);
  assert.equal(payShare(p.id, organiser).booked, true); // idempotent after booked
});

test("a declined payment fails only that member; others unaffected; organiser can book for those who paid", () => {
  const ev = anyEvent();
  const p = createPlan({ creator_id: organiser, date_start: d(0), date_end: d(0), vibe: "loud", budget_band: "₹₹", anchor: { kind: "event", ref: ev.id } });
  joinViaToken(p.share_token, { user_id: friends[0] });
  const { user: bad } = joinViaToken(p.share_token, { guest_name: "Card Declines-fail" });
  payShare(p.id, organiser); payShare(p.id, friends[0]);
  assert.throws(() => payShare(p.id, bad.id), /declined/);
  const v = planView(p.id, bad.id); assert.equal(v.my_split?.status, "failed"); assert.equal(v.paid_count, 2);
  assert.equal(getPlan(p.id).status, "locked"); // not everyone paid → not auto-booked
  assert.throws(() => confirmBooking(p.id, friends[0]), /organiser/);
  confirmBooking(p.id, organiser); assert.equal(getPlan(p.id).status, "booked");
  assert.equal(planView(p.id, organiser).bookings[0].qty, 2);
});

test("booking failure (sold out under us) refunds every captured share automatically", () => {
  const ev = anyEvent();
  const p = createPlan({ creator_id: organiser, date_start: d(0), date_end: d(0), vibe: "loud", budget_band: "₹₹", anchor: { kind: "event", ref: ev.id } });
  joinViaToken(p.share_token, { user_id: friends[0] }); joinViaToken(p.share_token, { user_id: friends[1] });
  payShare(p.id, organiser); payShare(p.id, friends[0]);
  store.inventory.events.get(ev.id)!.tickets_left = 1; // someone else grabbed the seats
  assert.throws(() => confirmBooking(p.id, organiser), /refunded/);
  assert.equal(getPlan(p.id).status, "locked"); assert.ok(getPlan(p.id).booking_failed_reason);
  assert.equal(splitSummary(p.id).paid_count, 0);
  assert.ok([...store.splits.values()].filter((s) => s.plan_id === p.id && s.status === "refunded").length === 2);
});

test("EP4: a solo booking becomes a joinable plan; organiser's share is already paid; a late joiner adds a seat", () => {
  const ev = anyEvent(); const left = ev.left;
  const b = bookSolo(organiser, ev, 2);
  assert.equal(getItem("event", ev.id)!.left, left - 2);
  const p = convertBookingToPlan(b.id, organiser);
  assert.equal(p.status, "booked"); assert.equal(store.bookings.get(b.id)!.plan_id, p.id);
  assert.equal(planView(p.id, organiser).my_split?.status, "captured");
  assert.throws(() => convertBookingToPlan(b.id, friends[0]), /isn't yours/);
  joinViaToken(p.share_token, { user_id: friends[0] });
  assert.equal(payShare(p.id, friends[0]).booked, true);
  assert.equal(getItem("event", ev.id)!.left, left - 3);
});

test("member leaves a locked plan → their pending share is dropped; a paid share is refunded", () => {
  const ev = anyEvent();
  const p = createPlan({ creator_id: organiser, date_start: d(0), date_end: d(0), vibe: "loud", budget_band: "₹₹", anchor: { kind: "event", ref: ev.id } });
  joinViaToken(p.share_token, { user_id: friends[0] }); joinViaToken(p.share_token, { user_id: friends[1] });
  payShare(p.id, friends[1]);
  leavePlan(p.id, friends[0]); leavePlan(p.id, friends[1]);
  assert.equal(getPlan(p.id).status, "locked"); // anchored plans never fall back to voting
  const s = [...store.splits.values()].filter((x) => x.plan_id === p.id);
  assert.ok(s.some((x) => x.user_id === friends[1] && x.status === "refunded"));
  assert.ok(!s.some((x) => x.user_id === friends[0]));
});

test("EP5/EP6: re-plan invites the same crew into a fresh open plan", () => {
  const ev = anyEvent();
  const p = createPlan({ creator_id: organiser, date_start: d(0), date_end: d(0), vibe: "loud", budget_band: "₹₹", anchor: { kind: "event", ref: ev.id } });
  joinViaToken(p.share_token, { user_id: friends[0] }); joinViaToken(p.share_token, { user_id: friends[1] });
  const n = replan(p.id, organiser);
  assert.equal(n.mode, "open"); assert.equal(n.status, "draft"); assert.equal(n.vibe, p.vibe);
  const v = planView(n.id, organiser); assert.equal(v.members.length, 3); assert.equal(v.members.filter((m) => m.rsvp_status === "invited").length, 2);
});
