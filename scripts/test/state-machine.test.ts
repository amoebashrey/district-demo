/** Phase 2 acceptance: plan lifecycle, atomic lock, idempotent votes, invites, opt-out. `npm test` */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { resetStore, store, friendsOf, joinedMembers } from "../../src/lib/store/store.ts";
import { createPlan, openVoting, castVote, planView, leavePlan, cancelPlan, reopenPlan, getPlan } from "../../src/lib/services/plan.ts";
import { joinViaToken, inviteContacts, respondToInvite, optOut } from "../../src/lib/services/invite.ts";

const d = (n: number) => { const x = new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
let organiser: string; let friends: string[];
before(() => { resetStore(); const u = [...store.users.values()].find((x) => x.city === "Bengaluru")!; organiser = u.id; friends = friendsOf(u.id).map((f) => f.id); assert.ok(friends.length >= 3, "seed has friends"); });

test("create → persists draft with organiser as joined member", () => {
  const p = createPlan({ creator_id: organiser, date_start: d(1), date_end: d(6), vibe: "chill", budget_band: "₹₹₹" });
  assert.equal(p.status, "draft"); assert.equal(joinedMembers(p.id).length, 1); assert.ok(p.share_token.length >= 10);
});

test("vote rejected before voting opens", () => {
  const p = createPlan({ creator_id: organiser, date_start: d(1), date_end: d(6), vibe: "chill", budget_band: "₹₹₹" });
  assert.throws(() => castVote(p.id, organiser, "x"), /Voting isn't open/);
});

test("open voting generates 2–3 in-budget, in-window, available options", () => {
  const p = createPlan({ creator_id: organiser, date_start: d(0), date_end: d(13), vibe: "loud", budget_band: "₹₹₹" });
  const { suggestions } = openVoting(p.id, organiser);
  assert.ok(suggestions.length >= 2 && suggestions.length <= 3);
  for (const s of suggestions) { assert.ok(s.est_cost_per_head <= 2800); assert.ok(s.components.every((c) => c.starts_at.slice(0, 10) >= p.date_start && c.starts_at.slice(0, 10) <= p.date_end)); assert.ok(s.is_available); }
  assert.throws(() => openVoting(p.id, organiser), /already open/);
});

test("majority + quorum locks atomically; late vote rejected; idempotent re-cast", () => {
  const p = createPlan({ creator_id: organiser, date_start: d(0), date_end: d(13), vibe: "chill", budget_band: "₹₹₹", quorum: 3 });
  const { suggestions: [a, b] } = openVoting(p.id, organiser);
  joinViaToken(p.share_token, { user_id: friends[0] }); joinViaToken(p.share_token, { user_id: friends[1] });
  assert.equal(joinedMembers(p.id).length, 3);
  assert.equal(castVote(p.id, organiser, a.id).locked, false);
  assert.equal(castVote(p.id, friends[0], b.id).locked, false); // 1–1, no majority
  assert.equal(castVote(p.id, friends[0], b.id).locked, false); // idempotent
  assert.equal(castVote(p.id, friends[0], a.id).locked, true);  // re-cast → 2 of 3 → lock
  assert.equal(getPlan(p.id).status, "locked"); assert.equal(getPlan(p.id).locked_suggestion_id, a.id);
  assert.throws(() => castVote(p.id, friends[1], b.id), /already locked/);
  const v = planView(p.id, friends[0]); assert.equal(v.my_vote, a.id); assert.equal(v.locked?.id, a.id);
});

test("quorum not met → no lock even with unanimous votes", () => {
  const p = createPlan({ creator_id: organiser, date_start: d(0), date_end: d(13), vibe: "chill", budget_band: "₹₹₹", quorum: 4 });
  const { suggestions: [a] } = openVoting(p.id, organiser);
  joinViaToken(p.share_token, { user_id: friends[0] });
  castVote(p.id, organiser, a.id); assert.equal(castVote(p.id, friends[0], a.id).locked, false);
  assert.equal(getPlan(p.id).status, "voting");
});

test("guest joins via link without an account and can vote", () => {
  const p = createPlan({ creator_id: organiser, date_start: d(0), date_end: d(13), vibe: "chill", budget_band: "₹₹₹" });
  const { suggestions: [a] } = openVoting(p.id, organiser);
  const { user } = joinViaToken(p.share_token, { guest_name: "Guest Priya" });
  assert.ok(user.is_guest); assert.equal(joinedMembers(p.id).length, 2);
  assert.throws(() => joinViaToken(p.share_token, { guest_name: "" }), /name/);
  castVote(p.id, organiser, a.id); assert.equal(castVote(p.id, user.id, a.id).locked, true);
});

test("member leaves after lock and quorum breaks → back to voting", () => {
  const p = createPlan({ creator_id: organiser, date_start: d(0), date_end: d(13), vibe: "chill", budget_band: "₹₹₹", quorum: 2 });
  const { suggestions: [a] } = openVoting(p.id, organiser);
  joinViaToken(p.share_token, { user_id: friends[0] });
  castVote(p.id, organiser, a.id); castVote(p.id, friends[0], a.id);
  assert.equal(getPlan(p.id).status, "locked");
  leavePlan(p.id, friends[0]);
  assert.equal(getPlan(p.id).status, "voting"); assert.equal(getPlan(p.id).locked_suggestion_id, undefined);
  assert.throws(() => leavePlan(p.id, organiser), /organiser/);
});

test("contact invites: cap enforced, opt-out honoured instantly, accept triggers lock check", () => {
  const p = createPlan({ creator_id: organiser, date_start: d(0), date_end: d(13), vibe: "chill", budget_band: "₹₹₹" });
  optOut(friends[2], "spam_report");
  const r = inviteContacts(p.id, organiser, [friends[0], friends[1], friends[2]]);
  assert.equal(r.invited.length, 2); assert.deepEqual(r.skipped, [{ user_id: friends[2], reason: "opted_out" }]);
  assert.equal(joinedMembers(p.id).length, 1); // invited ≠ joined
  const { suggestions: [a] } = openVoting(p.id, organiser);
  castVote(p.id, organiser, a.id);
  respondToInvite(p.id, friends[1], "decline");
  respondToInvite(p.id, friends[0], "accept"); // joined=2, quorum=2, but only 1 vote of 2 → no lock
  assert.equal(getPlan(p.id).status, "voting");
  castVote(p.id, friends[0], a.id); assert.equal(getPlan(p.id).status, "locked");
  // cap
  const p2 = createPlan({ creator_id: organiser, date_start: d(0), date_end: d(13), vibe: "chill", budget_band: "₹₹₹" });
  const many = [...store.users.values()].filter((u) => u.id !== organiser).slice(0, 20).map((u) => u.id);
  const r2 = inviteContacts(p2.id, organiser, many);
  assert.equal(r2.invited.length, p2.invite_cap); assert.ok(r2.skipped.some((s) => s.reason === "cap_reached"));
  assert.ok(store.events.some((e) => e.name === "invite.spam_reported"));
});

test("expiry is lazy and re-openable; cancel is terminal", () => {
  const p = createPlan({ creator_id: organiser, date_start: d(0), date_end: d(13), vibe: "chill", budget_band: "₹₹₹" });
  openVoting(p.id, organiser);
  p.expires_at = new Date(Date.now() - 1000).toISOString();
  assert.equal(getPlan(p.id).status, "expired");
  assert.throws(() => castVote(p.id, organiser, "x"), /expired/);
  reopenPlan(p.id, organiser); assert.equal(getPlan(p.id).status, "voting");
  cancelPlan(p.id, organiser); assert.equal(getPlan(p.id).status, "cancelled");
  assert.throws(() => reopenPlan(p.id, organiser), /isn't expired/);
  assert.throws(() => cancelPlan(p.id, friends[0]), /organiser/);
});

test("analytics stream is append-only in practice and records the funnel", () => {
  const names = new Set(store.events.map((e) => e.name));
  for (const n of ["plan.created", "plan.voting", "vote.cast", "vote.recast", "plan.locked", "invite.sent", "invite.accepted", "member.left", "plan.expired", "plan.cancelled"]) assert.ok(names.has(n), n);
});
