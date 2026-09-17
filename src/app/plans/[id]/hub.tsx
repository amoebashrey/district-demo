"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Lock, MoreHorizontal, Clock, Crown, Copy, RefreshCw, Flag, LogOut, XCircle, MessageCircle, MapPin, CalendarPlus, Repeat, Ticket, UserPlus, Users, Pause, Play, UserMinus, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type { PlanView } from "@/lib/services/plan";
import { Initials } from "@/components/screen";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EntryPoint } from "@/components/highlight";
import { ActionButton, api, ApiError } from "@/components/client";
import { day, inr, time } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = { view: PlanView; meId: string; shareUrl: string; names: Record<string, string>; from?: string };
const kindLabel: Record<string, string> = { event: "Event", dining: "Table", movie: "Movie", ride: "Ride" };
const Section = ({ children, className }: { children: React.ReactNode; className?: string }) => <section className={cn("rounded-2xl bg-[#141416] p-4", className)}>{children}</section>;

export function PlanHub({ view, meId, shareUrl, names }: Props) {
  const { plan, members, suggestions, votes_needed, my_vote, my_role, locked, splits, paid_count, my_split, needed_to_confirm, has_pending_simulation } = view;
  const isOrganiser = my_role === "organiser";
  const me = members.find((m) => m.user_id === meId);
  const joined = members.filter((m) => m.rsvp_status === "joined");
  const pending = members.filter((m) => m.rsvp_status === "invited");
  const anchored = plan.mode === "anchored";
  const gathering = plan.status === "draft" || plan.status === "voting";
  const confirmed = plan.status === "locked";
  const booked = plan.status === "booked";
  const perHead = locked?.est_cost_per_head ?? suggestions[0]?.est_cost_per_head;
  const paidBy = (uid: string) => splits.find((s) => s.user_id === uid)?.status;
  const title = locked ? locked.title : `${plan.vibe} night`;
  const when = locked?.components[0]?.starts_at;
  const msg = `Join me for ${title}${perHead ? ` — ${inr(perHead)} a head` : ""}. Tap "I'm in" to hold your seat, no app needed:\n${shareUrl}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  const leader = suggestions.reduce((a, s) => (s.votes.length > (a?.votes.length ?? 0) ? s : a), suggestions[0]);

  return (
    <>
      <Celebration active={booked} planId={plan.id} />
      <Simulator planId={plan.id} active={has_pending_simulation && !!me && me.rsvp_status === "joined"} />

      {/* header */}
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-soft">{plan.city} · {anchored ? "Going together" : "Crew vote"}</p>
        <h2 className="text-2xl font-semibold tracking-tight capitalize">{title}</h2>
        <div className="flex flex-wrap gap-1.5">
          {when && <Badge variant="secondary" className="rounded-full">{day(when)} · {time(when)}</Badge>}
          {perHead && <Badge variant="secondary" className="rounded-full">{inr(perHead)} a head</Badge>}
          {gathering && <HoldTimer until={plan.expires_at} />}
        </div>
      </div>

      {/* ---------- BOOKED: payoff card ---------- */}
      {booked && locked && (
        <Section className="border border-brand/40 bg-[linear-gradient(160deg,rgba(100,68,228,.25),#141416_60%)]">
          <p className="flex items-center gap-2 text-lg font-semibold"><Ticket className="size-5 text-brand-hot" /> You&apos;re all set</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{paid_count} paid · {joined.length} going · booked via Splitpay</p>
          <ul className="mt-3 space-y-1.5 text-sm">{locked.components.map((c) => <li key={c.ref} className="flex gap-3"><span className="w-16 shrink-0 text-muted-foreground tabular-nums">{time(c.starts_at)}</span><span><span className="font-medium">{c.title}</span><span className="block text-xs text-muted-foreground">{kindLabel[c.kind]} · {c.subtitle ?? c.area}</span></span></li>)}</ul>
          <div className="mt-3 flex flex-wrap gap-1.5">{joined.map((m) => <Badge key={m.id} className={cn("gap-1 rounded-full", paidBy(m.user_id) !== "captured" && "bg-white/15 text-white")}>{paidBy(m.user_id) === "captured" && <Check className="size-3" />}{m.user_id === meId ? "You" : m.display_name.split(" ")[0]}</Badge>)}</div>
          {view.bookings[0]?.provider_ref && <p className="mt-2 text-xs text-muted-foreground">Booking ref <span className="font-mono">{view.bookings[0].provider_ref}</span></p>}
          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" className="rounded-full border-white/20" asChild><a href={`https://www.google.com/maps/search/${encodeURIComponent(`${locked.components[0].title} ${locked.components[0].area}`)}`} target="_blank" rel="noreferrer"><MapPin /> Directions</a></Button>
            <Button variant="outline" size="sm" className="rounded-full border-white/20" onClick={() => toast("Added to calendar")}><CalendarPlus /> Calendar</Button>
            <Button variant="outline" size="sm" className="rounded-full border-white/20" asChild><a href={wa} target="_blank" rel="noreferrer"><MessageCircle /> Share</a></Button>
          </div>
        </Section>
      )}
      {booked && (
        <EntryPoint n={5} block>
          <Section className="w-full flex items-center gap-3 border border-brand/25">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-brand/25 text-brand-hot"><Repeat className="size-5" /></div>
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Loved it? Plan the next one</p><p className="mt-0.5 text-xs text-muted-foreground">Same crew, next weekend, one tap.</p></div>
            <ReplanButton planId={plan.id} />
          </Section>
        </EntryPoint>
      )}

      {/* ---------- GATHERING / CONFIRMED: the night, or the vote ---------- */}
      {!booked && anchored && locked && (
        <Section>
          <div className="flex items-center justify-between"><p className="text-sm font-semibold">The night</p>{confirmed && <Badge className="gap-1 rounded-full"><Lock className="size-3" /> Confirmed</Badge>}</div>
          <ul className="mt-3 space-y-2 text-sm">{locked.components.map((c) => <li key={c.ref} className="flex gap-3"><span className="w-16 shrink-0 text-muted-foreground tabular-nums">{time(c.starts_at)}</span><span><span className="font-medium">{c.title}</span><span className="block text-xs text-muted-foreground">{kindLabel[c.kind]} · {c.subtitle ?? c.area}</span></span></li>)}</ul>
        </Section>
      )}
      {!booked && !anchored && plan.status === "voting" && (
        <div className="space-y-3">
          <div className="flex items-end justify-between"><p className="text-sm font-semibold">Pick a night</p><p className="text-xs text-muted-foreground">{leader && leader.votes.length > 0 ? `${leader.votes.length} of ${votes_needed} on the leader` : `${votes_needed} on one option confirms it`}</p></div>
          {suggestions.map((s) => { const mine = my_vote === s.id; const pct = Math.min(100, Math.round((s.votes.length / Math.max(votes_needed, 1)) * 100)); return (
            <Section key={s.id} className={cn("space-y-3", mine && "border border-brand/40", !s.is_available && "opacity-60")}>
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold capitalize">{s.title}</p><p className="text-xs text-muted-foreground">{day(s.components[0].starts_at)}{leader?.id === s.id && s.votes.length > 0 ? " · leading" : ""}</p></div><div className="text-right"><p className="font-semibold tabular-nums">{inr(s.est_cost_per_head)}</p><p className="text-xs text-muted-foreground">a head</p></div></div>
              <ul className="space-y-1.5 text-sm">{s.components.map((c) => <li key={c.ref} className="flex gap-3"><span className="w-16 shrink-0 text-muted-foreground tabular-nums">{time(c.starts_at)}</span><span className="min-w-0"><span className="block truncate">{c.title}</span>{c.subtitle && <span className="block truncate text-xs text-muted-foreground">{c.subtitle}</span>}</span></li>)}</ul>
              <Progress value={pct} className="h-1" />
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">{s.votes.length > 0 ? <div className="flex -space-x-2">{s.votes.map((u) => <Avatar key={u} size="sm" className="ring-2 ring-[#141416]"><AvatarFallback className="text-[10px]"><Initials name={names[u] ?? "?"} /></AvatarFallback></Avatar>)}</div> : <span className="text-xs text-muted-foreground">No votes yet</span>}{s.votes.length > 0 && <span className="text-xs text-muted-foreground tabular-nums">{s.votes.length}/{votes_needed}</span>}</div>
                {!s.is_available ? <Badge variant="destructive" className="rounded-full">Sold out</Badge> : <ActionButton url={`/api/plans/${plan.id}/vote`} body={{ suggestion_id: s.id }} size="sm" variant={mine ? "secondary" : "default"} className="rounded-full" onDone={(r) => { if ((r as { just_locked?: boolean }).just_locked) toast.success("Confirmed — time to pay"); }}>{mine ? <><Check /> I&apos;m in</> : "I'm in"}</ActionButton>}
              </div>
            </Section>); })}
          <Button variant="outline" size="sm" className="w-full rounded-full border-white/20" asChild><Link href="/movies">None of these — browse instead</Link></Button>
        </div>
      )}
      {!booked && !anchored && plan.status === "draft" && (
        <Section className="text-center">
          <p className="font-semibold">Options open once you invite the crew</p>
          <p className="mt-1 text-sm text-muted-foreground">District proposes 2–3 nights that fit the window and budget.</p>
          <Button className="mt-3 rounded-full" asChild><Link href={`/plans/${plan.id}/invite`}><UserPlus /> Who&apos;s coming?</Link></Button>
        </Section>
      )}
      {!booked && !anchored && confirmed && locked && (
        <Section>
          <div className="flex items-center justify-between"><p className="text-sm font-semibold capitalize">{locked.title}</p><Badge className="gap-1 rounded-full"><Lock className="size-3" /> Confirmed</Badge></div>
          <ul className="mt-3 space-y-2 text-sm">{locked.components.map((c) => <li key={c.ref} className="flex gap-3"><span className="w-16 shrink-0 text-muted-foreground tabular-nums">{time(c.starts_at)}</span><span><span className="font-medium">{c.title}</span><span className="block text-xs text-muted-foreground">{c.subtitle ?? c.area}</span></span></li>)}</ul>
        </Section>
      )}
      {plan.booking_failed_reason && confirmed && <Section className="border border-destructive/40"><p className="font-semibold">{plan.booking_failed_reason}</p><p className="mt-1 text-sm text-muted-foreground">Everyone&apos;s share was refunded automatically.</p></Section>}
      {plan.status === "expired" && <Section className="border border-warning/40"><p className="font-semibold">The seat hold ran out before enough people said yes</p><p className="mt-1 text-sm text-muted-foreground">Re-open it and nudge the crew.</p>{isOrganiser && <ActionButton url={`/api/plans/${plan.id}/reopen`} size="sm" className="mt-3 rounded-full"><RefreshCw /> Re-open</ActionButton>}</Section>}
      {plan.status === "cancelled" && <Section className="border border-destructive/40"><p className="font-semibold">Plan cancelled</p></Section>}

      {/* ---------- me: invited → free one-tap I'm in ---------- */}
      {me?.rsvp_status === "invited" && gathering && (
        <Section className="border border-brand/40 bg-brand/10">
          <p className="font-semibold">{names[plan.creator_id]?.split(" ")[0] ?? "Your friend"} wants you there</p>
          <p className="mt-1 text-sm text-muted-foreground">Free to say yes — you only pay your {perHead ? inr(perHead) : ""} share once the plan is confirmed.</p>
          <div className="mt-3 flex gap-2"><ActionButton url={`/api/plans/${plan.id}/respond`} body={{ answer: "accept" }} className="h-11 flex-1 rounded-full text-base" onDone={(r) => toast.success((r as { plan?: { status: string } }).plan?.status === "locked" ? "You're in — and it's confirmed!" : "You're in")}>I&apos;m in</ActionButton><ActionButton url={`/api/plans/${plan.id}/respond`} body={{ answer: "decline" }} variant="ghost" className="rounded-full">Can&apos;t</ActionButton></div>
        </Section>
      )}

      {/* ---------- Who's in / pending, with shares ---------- */}
      {plan.status !== "cancelled" && (
        <Section>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Who&apos;s coming</p>
            <p className="text-xs text-muted-foreground">{joined.length} in{pending.length ? ` · ${pending.length} pending` : ""}{gathering && needed_to_confirm ? ` · ${needed_to_confirm} more to confirm` : ""}</p>
          </div>
          {gathering && anchored && <Progress value={Math.round((joined.length / Math.max(joined.length + pending.length, 1)) * 100)} className="mt-3 h-1" />}
          <ul className="mt-3 divide-y divide-white/6">
            {[...joined, ...pending].map((m) => { const st = paidBy(m.user_id); return (
              <li key={m.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="relative"><Avatar size="sm"><AvatarFallback className="text-[10px]"><Initials name={m.display_name} /></AvatarFallback></Avatar>{m.role === "organiser" && <Crown className="absolute -right-1 -bottom-1 size-3.5 text-brand-hot" />}</span>
                <span className="min-w-0 flex-1 truncate">{m.user_id === meId ? "You" : m.display_name}</span>
                {perHead && <span className={cn("text-xs tabular-nums", m.rsvp_status === "joined" ? "text-foreground" : "text-muted-foreground")}>{inr(perHead)}</span>}
                {m.rsvp_status === "invited" ? <Badge variant="outline" className="rounded-full">Pending</Badge> : st === "captured" ? <Badge className="gap-1 rounded-full"><Check className="size-3" /> Paid</Badge> : st === "failed" ? <Badge variant="destructive" className="rounded-full">Failed</Badge> : <Badge variant="secondary" className="gap-1 rounded-full bg-[#22c55e]/15 text-[#22c55e]"><Check className="size-3" /> In</Badge>}
              </li>); })}
          </ul>
          {gathering && (
            <div className="mt-3 flex gap-2">
              <Button className="flex-1 rounded-full bg-[#25D366] text-black hover:bg-[#1ebe5b]" size="sm" asChild><a href={wa} target="_blank" rel="noreferrer"><MessageCircle /> Share on WhatsApp</a></Button>
              <Button variant="outline" size="sm" className="rounded-full border-white/20" onClick={async () => { await navigator.clipboard.writeText(shareUrl); toast.success("Link copied"); }}><Copy /></Button>
              <Button variant="outline" size="sm" className="rounded-full border-white/20" asChild><Link href={`/plans/${plan.id}/invite`}><UserPlus /></Link></Button>
            </div>
          )}
        </Section>
      )}

      {/* ---------- CONFIRMED: Splitpay ---------- */}
      {confirmed && locked && me?.rsvp_status === "joined" && (
        <Section className={cn(my_split?.status !== "captured" && "border border-brand/40")}>
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-sm font-semibold">Splitpay</p><p className="mt-0.5 text-xs text-muted-foreground">{paid_count} of {joined.length} paid · books itself when everyone has</p></div>
            <div className="text-right"><p className="font-semibold tabular-nums">{inr(my_split?.amount ?? locked.est_cost_per_head)}</p><p className="text-xs text-muted-foreground">your share</p></div>
          </div>
          <Progress value={Math.round((paid_count / Math.max(joined.length, 1)) * 100)} className="mt-3 h-1" />
          {my_split?.status === "failed" && <p className="mt-2 text-xs text-destructive">{my_split.failure_reason}. Nobody else was affected — try again.</p>}
          <div className="mt-4 flex items-center gap-2">
            {my_split?.status === "captured"
              ? <Badge variant="secondary" className="gap-1 rounded-full py-1.5"><Check className="size-3" /> You&apos;ve paid {inr(my_split.amount)}</Badge>
              : <ActionButton url={`/api/plans/${plan.id}/pay`} className="h-12 flex-1 rounded-full text-base" onDone={(r) => toast.success((r as { just_booked?: boolean }).just_booked ? "Paid — and it's booked" : "Paid your share")}>Pay {inr(my_split?.amount ?? locked.est_cost_per_head)} now <ChevronRight /></ActionButton>}
            {isOrganiser && paid_count >= 2 && paid_count < joined.length && <ActionButton url={`/api/plans/${plan.id}/book`} variant="outline" size="sm" className="rounded-full border-white/20" onDone={() => toast.success("Booked for everyone who paid")}>Book for {paid_count}</ActionButton>}
          </div>
        </Section>
      )}
    </>
  );
}

/** "Seats held 9:32" — counts down to the plan's hold expiry. */
function HoldTimer({ until }: { until: string }) {
  const [left, setLeft] = useState(() => Math.max(0, new Date(until).getTime() - Date.now()));
  useEffect(() => { const t = setInterval(() => setLeft(Math.max(0, new Date(until).getTime() - Date.now())), 1000); return () => clearInterval(t); }, [until]);
  const m = Math.floor(left / 60_000), s = Math.floor((left % 60_000) / 1000);
  return <Badge variant="outline" className="gap-1 rounded-full border-white/20 tabular-nums"><Clock className="size-3" /> Seats held {m}:{String(s).padStart(2, "0")}</Badge>;
}

/** Demo: friends respond one by one every ~2.5s so a solo viewer sees the plan fill and confirm. */
function Simulator({ planId, active }: { planId: string; active: boolean }) {
  const router = useRouter();
  const [paused, setPaused] = useState(false);
  const busy = useRef(false);
  useEffect(() => {
    if (!active || paused) return;
    const tick = async () => {
      if (busy.current) return; busy.current = true;
      try {
        const r = await api<{ action: string; name?: string; confirmed?: boolean; booked?: boolean }>(`/api/plans/${planId}/simulate`, {});
        if (r.action === "joined" || r.action === "voted") toast(`${r.name?.split(" ")[0]} is in`, { icon: "✅" });
        if (r.action === "paid") toast(`${r.name?.split(" ")[0]} paid their share`, { icon: "💸" });
        if (r.confirmed) toast.success("Majority in — plan confirmed. Time to pay.");
        if (r.booked) toast.success("Everyone paid — booked!");
        router.refresh();
      } catch (e) { toast.error((e as ApiError).message); } finally { busy.current = false; }
    };
    const first = setTimeout(tick, 2500);
    const id = setInterval(tick, 3200);
    return () => { clearTimeout(first); clearInterval(id); };
  }, [active, paused, planId, router]);
  if (!active) return null;
  return (
    <div className="flex items-center justify-between rounded-full border border-white/10 bg-[#141416] px-3 py-1.5 text-xs text-muted-foreground">
      <span className="flex items-center gap-2"><span className={cn("size-1.5 rounded-full bg-[#22c55e]", !paused && "animate-pulse")} /> Demo · friends {paused ? "paused" : "are responding…"}</span>
      <button className="flex items-center gap-1 text-foreground" onClick={() => setPaused((p) => !p)}>{paused ? <><Play className="size-3" /> Resume</> : <><Pause className="size-3" /> Pause</>}</button>
    </div>
  );
}

/** Once per plan per browser when it flips to booked. Pure CSS; hidden under reduced motion. */
function Celebration({ active, planId }: { active: boolean; planId: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!active) return;
    const k = `booked-seen:${planId}`;
    try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, "1"); } catch { /* private */ }
    const t0 = setTimeout(() => setShow(true), 0); const t1 = setTimeout(() => setShow(false), 1400);
    return () => { clearTimeout(t0); clearTimeout(t1); };
  }, [active, planId]);
  if (!show) return null;
  const colors = ["#e9deff", "#8972fe", "#6444e4", "#ffffff", "#22c55e", "#f59e0b"];
  return (
    <div className="celebrate" aria-hidden>
      <span className="ring" />
      {Array.from({ length: 18 }, (_, i) => { const a = (i / 18) * Math.PI * 2; const r = 120 + (i % 3) * 40; return <span key={i} className="dot" style={{ background: colors[i % colors.length], ["--dx" as string]: `${Math.cos(a) * r}px`, ["--dy" as string]: `${Math.sin(a) * r}px`, animationDelay: `${(i % 4) * 60}ms` }} />; })}
    </div>
  );
}

export function ReplanButton({ planId }: { planId: string }) {
  const router = useRouter();
  return <ActionButton url={`/api/plans/${planId}/replan`} size="sm" className="rounded-full" onDone={(r) => router.push(`/plans/${(r as { plan: { id: string } }).plan.id}/invite`)}>Re-plan</ActionButton>;
}

/** Rare / destructive actions + demo controls live in an overflow menu. */
export function PlanMenu({ planId, status, isOrganiser }: { planId: string; status: string; isOrganiser: boolean }) {
  const router = useRouter();
  if (["cancelled", "completed"].includes(status)) return null;
  const run = async (url: string, body?: unknown, msg?: string, stay?: boolean) => { try { const r = await api<{ name?: string; remaining?: number; per_head?: number }>(url, body); if (msg) toast(msg); if (url.endsWith("simulate") && r.name) toast(`${r.name.split(" ")[0]} dropped out — ${r.remaining} going now${r.per_head ? `, still ${inr(r.per_head)} each` : ""}`, { icon: "↩︎" }); if (!stay) router.push("/profile"); router.refresh(); } catch (e) { toast.error((e as ApiError).message); } };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="More" className="rounded-full"><MoreHorizontal /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild><Link href={`/plans/${planId}/invite`}><Users /> Who&apos;s coming</Link></DropdownMenuItem>
        {["locked", "booked"].includes(status) && <DropdownMenuItem onClick={() => run(`/api/plans/${planId}/simulate`, { action: "drop" }, undefined, true)}><UserMinus /> Demo: someone drops out</DropdownMenuItem>}
        <DropdownMenuSeparator />
        {isOrganiser ? (
          <DropdownMenuItem variant="destructive" onClick={() => run(`/api/plans/${planId}/cancel`, undefined, "Plan cancelled")}><XCircle /> Cancel plan</DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem onClick={() => run(`/api/plans/${planId}/leave`, undefined, "You left the plan")}><LogOut /> Leave plan</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => run("/api/optout", { reason: "spam_report", plan_id: planId }, "You won't get invites again")}><Flag /> Report as spam</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
