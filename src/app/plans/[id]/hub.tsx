"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PlanView } from "@/lib/services/plan";
import { Avatar, Button, Card, Empty, Kicker, Pill, Headline } from "@/components/ui";
import { ActionButton, api, ApiError, useToast } from "@/components/client";
import { LockReveal, ProgressBar, Reveal, Stagger, StaggerItem, Swap, TallyAvatar, TallyAvatars, Pressable } from "@/components/motion";
import { bandLabel, countdown, dateRange, day, inr, time, vibeLabel } from "@/lib/format";

type Props = { view: PlanView; meId: string; shareUrl: string; friends: { id: string; name: string; area: string }[]; names: Record<string, string> };
const kindTone: Record<string, string> = { event: "text-v-event", dining: "text-v-dining", movie: "text-v-movie", ride: "text-v-activity" };
const kindLabel: Record<string, string> = { event: "Event", dining: "Table", movie: "Movie", ride: "Ride" };

export function PlanHub({ view, meId, shareUrl, friends, names }: Props) {
  const { plan, members, suggestions, joined_count, votes_needed, my_vote, my_role, locked } = view;
  const router = useRouter();
  const toast = useToast();
  const isOrganiser = my_role === "organiser";
  const me = members.find((m) => m.user_id === meId);
  const invited = members.filter((m) => m.rsvp_status === "invited");
  const joined = members.filter((m) => m.rsvp_status === "joined");
  const [inviteOpen, setInviteOpen] = useState(false);
  const err = (e: ApiError) => toast.show(e.message);

  return (
    <>
      {toast.node}
      <LockReveal planId={plan.id} active={plan.status === "locked" && !!locked} title={locked?.title ?? ""} subtitle={locked ? `${joined.length} going · ${inr(locked.est_cost_per_head)} a head` : undefined} />

      <div>
        <Kicker tone="brand">{plan.city} · {dateRange(plan.date_start, plan.date_end)}</Kicker>
        <Headline className="mt-2" tail="night.">{vibeLabel[plan.vibe] ?? plan.vibe}</Headline>
        <p className="t-body2 text-fg-2 mt-1.5">{bandLabel[plan.budget_band]} · lock at {votes_needed} of {Math.max(joined_count, plan.quorum)}{plan.status === "voting" && ` · closes in ${countdown(plan.expires_at)}`}</p>
      </div>

      {plan.status === "locked" && locked && (
        <Reveal>
          <Card tone="brand">
            <p className="t-button3 uppercase tracking-[0.12em] text-white/70">Locked · {joined.length} going</p>
            <p className="t-heading3 text-white mt-1 capitalize">{locked.title}</p>
            <ul className="mt-3 flex flex-col gap-1.5">{locked.components.map((c) => <li key={c.ref} className="t-body2 text-white/90"><span className="text-white/60">{kindLabel[c.kind]} · {time(c.starts_at)}</span> — {c.title}</li>)}</ul>
            <p className="t-caption text-white/70 mt-3">{inr(locked.est_cost_per_head)} a head. Booking and bill split arrive in Phase 4.</p>
          </Card>
        </Reveal>
      )}
      {plan.status === "expired" && (
        <Card tone="warning">
          <p className="t-button1 text-warning">No majority before the window closed</p>
          <p className="t-body2 text-fg-2 mt-1">Happens. Re-open for another 24 hours and nudge the crew.</p>
          {isOrganiser && <ActionButton url={`/api/plans/${plan.id}/reopen`} onError={err} className="mt-3 h-10 px-4 rounded-[14px] bg-warning text-bg t-button2">Re-open voting</ActionButton>}
        </Card>
      )}
      {plan.status === "cancelled" && <Card tone="error"><p className="t-button1 text-error">Plan cancelled</p></Card>}

      {/* crew */}
      <Card>
        <div className="flex items-center justify-between">
          <Kicker>Crew · {joined.length} in{invited.length ? `, ${invited.length} invited` : ""}</Kicker>
          {["draft", "voting"].includes(plan.status) && <Pressable onClick={() => setInviteOpen((o) => !o)} className="t-button2 text-offer"><Swap id={inviteOpen ? "done" : "invite"}>{inviteOpen ? "Done" : "+ Invite"}</Swap></Pressable>}
        </div>
        <Stagger as="ul" className="mt-3 grid grid-cols-4 gap-3">
          {members.map((m) => (
            <StaggerItem as="li" key={m.id} className="flex flex-col items-center gap-1 text-center">
              <Avatar name={m.display_name} size={44} dim={m.rsvp_status !== "joined"} />
              <span className="t-caption text-fg-2 truncate w-full">{m.user_id === meId ? "You" : m.display_name.split(" ")[0]}</span>
              {m.role === "organiser" && <span className="t-caption text-fg-3 -mt-1">host</span>}
              {m.rsvp_status === "invited" && <span className="t-caption text-fg-3 -mt-1">invited</span>}
            </StaggerItem>
          ))}
        </Stagger>
        {inviteOpen && (
          <Reveal className="mt-4 pt-4 border-t border-line flex flex-col gap-3">
            <div>
              <p className="t-button2">Share link</p>
              <p className="t-caption text-fg-3 mt-0.5">Anyone with it can join and vote — no account needed.</p>
              <div className="mt-2 flex gap-2">
                <input readOnly value={shareUrl} className="flex-1 min-w-0 h-10 rounded-[12px] bg-bg border border-line-2 px-3 t-caption text-fg-2" onFocus={(e) => e.currentTarget.select()} />
                <Button small variant="secondary" onClick={async () => {
                  if (navigator.share) { try { await navigator.share({ title: "Join my plan on District", url: shareUrl }); return; } catch { /* dismissed */ } }
                  await navigator.clipboard.writeText(shareUrl); toast.show("Link copied");
                }}>Share</Button>
              </div>
            </div>
            <InviteFriends planId={plan.id} friends={friends} onDone={(n) => { toast.show(n ? `Invited ${n}` : "No one new to invite"); router.refresh(); }} onError={err} />
            <p className="t-caption text-fg-3">We only reach people you pick. Anyone can opt out of invites, and we stop instantly.</p>
          </Reveal>
        )}
      </Card>

      {me?.rsvp_status === "invited" && plan.status !== "cancelled" && (
        <Reveal>
          <Card tone="brand">
            <p className="t-button1 text-white">{names[plan.creator_id]?.split(" ")[0] ?? "Your friend"} invited you</p>
            <p className="t-body2 text-white/80 mt-1">Say yes and you&apos;re in. Or vote below — that counts as yes.</p>
            <div className="flex gap-2 mt-3">
              <ActionButton url={`/api/plans/${plan.id}/respond`} body={{ answer: "accept" }} onError={err} className="h-10 px-4 rounded-[14px] bg-white text-bg t-button2">I&apos;m in</ActionButton>
              <ActionButton url={`/api/plans/${plan.id}/respond`} body={{ answer: "decline" }} onError={err} className="h-10 px-4 rounded-[14px] bg-white/15 text-white t-button2">Can&apos;t make it</ActionButton>
            </div>
          </Card>
        </Reveal>
      )}

      {/* options */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Kicker>{plan.status === "draft" ? "Options" : `Vote · ${votes_needed} needed to lock`}</Kicker>
          {suggestions.length > 0 && <span className="t-caption text-fg-3">{suggestions[0]?.rationale_source === "llm" ? "curated by District AI" : "rules-based · AI curation next"}</span>}
        </div>
        {plan.status === "draft" && (
          <Empty title={isOrganiser ? "Ready when you are" : "Waiting for the host"} body={isOrganiser ? "Invite a few people first, then open voting. District will propose 2–3 nights that fit the window and budget." : "Options appear once voting opens."}>
            {isOrganiser && <ActionButton url={`/api/plans/${plan.id}/open`} onError={err} className="mt-2 h-11 px-5 rounded-[14px] bg-brand-btn text-fg t-button1 glow-cta">Open voting</ActionButton>}
          </Empty>
        )}
        <Stagger className="flex flex-col gap-3">
          {suggestions.map((s) => {
            const mine = my_vote === s.id; const isLocked = plan.locked_suggestion_id === s.id; const pct = Math.round((s.votes.length / Math.max(votes_needed, 1)) * 100);
            return (
              <StaggerItem key={s.id}>
                <Card className={`relative overflow-hidden transition-[border-color,opacity] duration-200 ${mine ? "border-brand" : ""} ${isLocked ? "border-success" : ""} ${!s.is_available ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="t-title1 capitalize truncate">{s.title}</p><p className="t-caption text-fg-3 mt-0.5">{day(s.components[0].starts_at)}</p></div>
                    <div className="text-right shrink-0"><p className="t-button1 tabular">{inr(s.est_cost_per_head)}</p><p className="t-caption text-fg-3">a head</p></div>
                  </div>
                  <ul className="mt-3 flex flex-col gap-2">
                    {s.components.map((c) => (
                      <li key={c.ref} className="flex gap-3">
                        <span className={`t-button3 w-12 shrink-0 pt-0.5 ${kindTone[c.kind]}`}>{time(c.starts_at)}</span>
                        <span className="min-w-0"><span className="t-body2 block truncate">{c.title}</span>{c.subtitle && <span className="t-caption text-fg-3 block truncate">{c.subtitle}</span>}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="t-body2 text-fg-2 mt-3">“{s.rationale}”</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 h-7">
                      <TallyAvatars>
                        {s.votes.length === 0 && <TallyAvatar id="none"><span className="t-caption text-fg-3">No votes yet</span></TallyAvatar>}
                        {s.votes.map((u, i) => <TallyAvatar key={u} id={u} first={i === 0}><Avatar name={names[u] ?? "?"} size={24} ring /></TallyAvatar>)}
                      </TallyAvatars>
                      {s.votes.length > 0 && <span className="t-caption text-fg-3 tabular">{s.votes.length}/{votes_needed}</span>}
                    </div>
                    {plan.status === "voting" ? (
                      !s.is_available ? <Pill tone="error">Sold out</Pill> :
                      <ActionButton url={`/api/plans/${plan.id}/vote`} body={{ suggestion_id: s.id }} onError={err} onDone={(r) => { if ((r as { just_locked?: boolean }).just_locked) toast.show("Locked in"); }}
                        className={`h-10 px-4 rounded-[14px] t-button2 transition-colors duration-200 ${mine ? "bg-brand/20 text-offer" : "bg-brand-btn text-fg glow-cta"}`}>
                        <Swap id={mine ? "voted" : "vote"}>{mine ? <><CheckIcon /> Voted</> : "I'm in"}</Swap>
                      </ActionButton>
                    ) : isLocked ? <Pill tone="success">Locked</Pill> : null}
                  </div>
                  {plan.status === "voting" && <ProgressBar pct={pct} className="absolute left-0 right-0 bottom-0 !rounded-none !h-0.5 !bg-transparent" />}
                </Card>
              </StaggerItem>
            );
          })}
        </Stagger>
        {plan.status === "voting" && (
          <Pressable onClick={() => toast.show("Browse lands with curation in Phase 3")} className="h-11 rounded-[14px] bg-surface-2 text-fg-2 t-button2">None of these — browse instead</Pressable>
        )}
      </div>

      {!["cancelled", "completed"].includes(plan.status) && (
        <div className="flex justify-center gap-5 pt-2">
          {isOrganiser
            ? <ActionButton url={`/api/plans/${plan.id}/cancel`} onError={err} onDone={() => router.push("/")} className="t-button2 text-fg-3">Cancel plan</ActionButton>
            : <ActionButton url={`/api/plans/${plan.id}/leave`} onError={err} onDone={() => router.push("/")} className="t-button2 text-fg-3">Leave plan</ActionButton>}
          {!isOrganiser && <ActionButton url="/api/optout" body={{ reason: "spam_report", plan_id: plan.id }} onError={err} onDone={() => { toast.show("You won't get invites again"); router.push("/"); }} className="t-button2 text-fg-3">Report as spam</ActionButton>}
        </div>
      )}
    </>
  );
}

function CheckIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>; }

function InviteFriends({ planId, friends, onDone, onError }: { planId: string; friends: { id: string; name: string; area: string }[]; onDone: (n: number) => void; onError: (e: ApiError) => void }) {
  const [sel, setSel] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  if (friends.length === 0) return <p className="t-caption text-fg-3">Everyone in your contacts is already here. Use the link for others.</p>;
  return (
    <div>
      <p className="t-button2">From your contacts</p>
      <ul className="mt-2 flex flex-col gap-1">
        {friends.map((f) => { const on = sel.includes(f.id); return (
          <li key={f.id}><Pressable scale={0.985} onClick={() => setSel((s) => (on ? s.filter((x) => x !== f.id) : [...s, f.id]))} className={`w-full flex items-center gap-3 rounded-[12px] px-2 py-2 text-left transition-colors duration-150 ${on ? "bg-brand/15" : ""}`}>
            <Avatar name={f.name} size={32} /><span className="flex-1 min-w-0"><span className="t-body2 block truncate">{f.name}</span><span className="t-caption text-fg-3">{f.area}</span></span>
            <span className={`w-5 h-5 rounded-full border grid place-items-center transition-colors duration-150 ${on ? "bg-brand border-brand" : "border-line-3"}`}>{on && <CheckIcon />}</span>
          </Pressable></li>); })}
      </ul>
      <Button small full className="mt-3" disabled={sel.length === 0 || busy} onClick={async () => { setBusy(true); try { const r = await api<{ invited: unknown[] }>(`/api/plans/${planId}/invite`, { friend_ids: sel }); setSel([]); onDone(r.invited.length); } catch (e) { onError(e as ApiError); } finally { setBusy(false); } }}>
        Invite {sel.length || ""}
      </Button>
    </div>
  );
}
