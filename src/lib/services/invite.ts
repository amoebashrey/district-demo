/**
 * Invite service — share links (tokenised), contact invites with a hard cap, opt-out honoured instantly.
 * Feeds the primary guardrail metric (invite opt-out / spam-report rate).
 */
import { store, newId, nowIso, getUser, planByToken, memberOf, invitesOf, joinedMembers } from "../store/store.ts";
import type { Invite, Plan, User } from "../store/types.ts";
import { ServiceError, conflict, forbidden, notFound } from "./errors.ts";
import { track } from "./analytics.ts";
import { addMember, getPlan, evaluateLock, evaluateCommit, requireMember } from "./plan.ts";

/** Browser-safe FNV-1a (demo). Prod: sha256 server-side. */
export const hashContact = (phoneOrId: string) => { let h = 2166136261; for (const c of phoneOrId.trim()) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).padStart(8, "0"); };

export function planForToken(token: string): Plan {
  const p = planByToken(token); if (!p) throw notFound("invite link");
  return getPlan(p.id);
}

/** Join via share link. Works for existing users and for guests (light account, no prior signup). */
export function joinViaToken(token: string, who: { user_id?: string; guest_name?: string }): { plan: Plan; user: User } {
  const plan = planForToken(token);
  if (!["draft", "voting", "locked", "booked"].includes(plan.status)) throw conflict("closed", `This plan is ${plan.status}`);
  let user: User | undefined = who.user_id ? getUser(who.user_id) : undefined;
  if (!user) {
    const name = who.guest_name?.trim();
    if (!name || name.length < 2) throw new ServiceError("name_required", "Tell us your name to join");
    user = { id: newId(), name, city: plan.city, is_guest: true, created_at: nowIso() };
    store.users.set(user.id, user);
    track("guest.created", { user_id: user.id, plan_id: plan.id });
  }
  const wasMember = !!memberOf(plan.id, user.id);
  addMember(plan, user, "member", "joined");
  // record the accepted link invite for the funnel
  if (!wasMember) {
    const inv: Invite = { id: newId(), plan_id: plan.id, inviter_id: plan.creator_id, channel: "link", token, invitee_user_id: user.id, status: "accepted", created_at: nowIso(), responded_at: nowIso() };
    store.invites.set(inv.id, inv);
    track("invite.accepted", { user_id: user.id, plan_id: plan.id, props: { channel: "link" } });
    evaluateCommit(plan, user.id);
    // graph edge from co-attendance intent (PRD §6.3 social_edges.source = invite)
    for (const other of joinedMembers(plan.id)) if (other.user_id !== user.id) {
      if (!store.edges.some((e) => e.user_id === user!.id && e.friend_id === other.user_id)) store.edges.push({ user_id: user.id, friend_id: other.user_id, source: "invite", status: "active" });
      if (!store.edges.some((e) => e.user_id === other.user_id && e.friend_id === user!.id)) store.edges.push({ user_id: other.user_id, friend_id: user.id, source: "invite", status: "active" });
    }
  }
  return { plan, user };
}

/** Invite friends from contacts (explicit consent is the UI's job; here we enforce cap + opt-out). */
export function inviteContacts(planId: string, inviterId: string, friendIds: string[]): { invited: Invite[]; skipped: { user_id: string; reason: string }[] } {
  const plan = getPlan(planId); requireMember(plan, inviterId);
  if (!["draft", "voting", "locked", "booked"].includes(plan.status)) throw conflict("closed", "Invites are closed for this plan");
  const existing = invitesOf(planId).filter((i) => i.channel === "contact" && i.status !== "revoked");
  const invited: Invite[] = []; const skipped: { user_id: string; reason: string }[] = [];
  for (const fid of [...new Set(friendIds)]) {
    const u = getUser(fid);
    if (!u) { skipped.push({ user_id: fid, reason: "unknown" }); continue; }
    const hash = hashContact(u.phone ?? u.id);
    if (store.optouts.has(hash)) { skipped.push({ user_id: fid, reason: "opted_out" }); track("invite.blocked_optout", { user_id: inviterId, plan_id: planId }); continue; }
    if (memberOf(planId, fid)) { skipped.push({ user_id: fid, reason: "already_in" }); continue; }
    if (existing.length + invited.length >= plan.invite_cap) { skipped.push({ user_id: fid, reason: "cap_reached" }); continue; }
    const inv: Invite = { id: newId(), plan_id: planId, inviter_id: inviterId, channel: "contact", token: plan.share_token, contact_hash: hash, invitee_user_id: fid, status: "pending", created_at: nowIso() };
    store.invites.set(inv.id, inv); invited.push(inv);
    addMember(plan, u, "member", "invited");
    track("invite.sent", { user_id: inviterId, plan_id: planId, props: { channel: "contact", invitee: fid } });
  }
  if (invited.length === 0 && skipped.some((s) => s.reason === "cap_reached")) throw new ServiceError("invite_cap", `Plans are capped at ${plan.invite_cap} invites`, 429);
  return { invited, skipped };
}

export function respondToInvite(planId: string, userId: string, answer: "accept" | "decline"): Plan {
  const plan = getPlan(planId);
  const m = memberOf(planId, userId); if (!m) throw forbidden("You weren't invited to this plan");
  const inv = invitesOf(planId).find((i) => i.invitee_user_id === userId && i.status === "pending");
  if (answer === "accept") { m.rsvp_status = "joined"; m.joined_at = nowIso(); if (inv) inv.status = "accepted"; track("invite.accepted", { user_id: userId, plan_id: planId, props: { channel: "contact" } }); evaluateLock(plan, userId); evaluateCommit(plan, userId); }
  else { m.rsvp_status = "declined"; if (inv) inv.status = "declined"; track("invite.declined", { user_id: userId, plan_id: planId }); }
  if (inv) inv.responded_at = nowIso();
  return plan;
}

/** Opt-out / spam report — honoured instantly, and the primary guardrail signal. */
export function optOut(userId: string, reason: "opt_out" | "spam_report", planId?: string) {
  const u = getUser(userId); if (!u) throw notFound("user");
  store.optouts.set(hashContact(u.phone ?? u.id), { user_id: userId, reason, created_at: nowIso() });
  for (const inv of store.invites.values()) if (inv.invitee_user_id === userId && inv.status === "pending") { inv.status = "opted_out"; inv.responded_at = nowIso(); const m = memberOf(inv.plan_id, userId); if (m && m.rsvp_status === "invited") m.rsvp_status = "declined"; }
  track(reason === "spam_report" ? "invite.spam_reported" : "invite.opted_out", { user_id: userId, plan_id: planId });
}
