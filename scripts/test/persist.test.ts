/** Client persistence: snapshot round-trip through the URL-hash encoding (pure; no browser needed). */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { resetStore, store, friendsOf } from "../../src/lib/store/store.ts";
import { createPlan } from "../../src/lib/services/plan.ts";
import { joinViaToken } from "../../src/lib/services/invite.ts";
import { listItems } from "../../src/lib/services/inventory.ts";
import { snapshotOf, applySnapshot, encodeSnapshot, decodeSnapshot } from "../../src/lib/client/plans-store.ts";

let organiser: string;
before(() => { resetStore(); organiser = [...store.users.values()].find((x) => x.city === "Bengaluru")!.id; });

test("a plan survives snapshot → encode → wipe → decode → apply", () => {
  const ev = listItems("event", "Bengaluru")[0];
  const p = createPlan({ creator_id: organiser, date_start: "2026-09-20", date_end: "2026-09-20", vibe: "loud", budget_band: "₹₹", anchor: { kind: "event", ref: ev.id } });
  joinViaToken(p.share_token, { user_id: friendsOf(organiser)[0].id });
  const { user: guest } = joinViaToken(p.share_token, { guest_name: "Guest Meera" });
  const snap = snapshotOf(p.id)!; assert.equal(snap.members.length, 3); assert.ok(snap.users.some((u) => u.id === guest.id));
  const enc = encodeSnapshot(p.id); assert.ok(enc.length > 100 && !/[+/=]/.test(enc));
  store.plans.delete(p.id); for (const m of [...store.members.values()]) if (m.plan_id === p.id) store.members.delete(m.id); store.users.delete(guest.id);
  const dec = decodeSnapshot(enc); assert.ok(dec); applySnapshot(dec!);
  assert.equal(store.plans.get(p.id)?.status, "locked"); assert.equal([...store.members.values()].filter((m) => m.plan_id === p.id).length, 3); assert.equal(store.users.get(guest.id)?.name, "Guest Meera");
  assert.equal(decodeSnapshot("not-a-snapshot"), null);
});
