"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Lock, Clock, BellRing, MapPin, CalendarPlus, MessageCircle, Repeat, MoreHorizontal, UserMinus, XCircle, LogOut, UserPlus, Ticket } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Initials } from "@/components/screen";
import { EntryPoint } from "@/components/highlight";
import { PlanShell, Section, PlanUnavailable, Loading, usePlan, StatusPill } from "@/components/plans/common";
import { Roster } from "@/components/plans/roster";
import { ShareRow, useShare } from "@/components/plans/share";
import { Simulator } from "@/components/plans/simulator";
import { castVote, cancelPlan, leavePlan, reopenPlan, replan, simulateDrop, simulateStep } from "@/lib/services/plan";
import { paySplit } from "@/lib/services/split";
import { maybeAutoBook } from "@/lib/services/booking";
import { store } from "@/lib/store/store";
import { mutate } from "@/lib/client/plans-store";
import type { Plan } from "@/lib/store/types";
import { day, inr, time } from "@/lib/format";
import { cn } from "@/lib/utils";

const kindLabel: Record<string, string> = { event: "Event", dining: "Table", movie: "Movie", ride: "Ride" };

/** Screen 3 (it fills, live) + Screen 5 (live plan card). One route, state-driven. */
export function StatusClient({ id }: { id: string }) {
  const router = useRouter();
  const { view, ready, meId } = usePlan(id);
  const [cooling, setCooling] = useState(false);
  const [speed, setSpeed] = useState(0);
  const plan = view?.plan;
  const share = useShare(id, view?.locked?.title ?? `${plan?.vibe ?? ""} night`, view?.locked?.est_cost_per_head ?? view?.suggestions[0]?.est_cost_per_head);
  // On lock, settle my share via the Splitpay mandate (no charge before this). When everyone's paid → You're out.
  useEffect(() => {
    if (!plan || !meId || !view) return;
    if (plan.status === "locked" && view.my_split && view.my_split.status === "pending" && view.my_role === "organiser") {
      const t = setTimeout(() => { try { mutate(id, () => { paySplit(id, meId); maybeAutoBook(store.plans.get(id)!); }); toast.success(`Locked — your ${inr(view.my_split!.amount)} settled via Splitpay`); } catch (e) { toast.error((e as Error).message); } }, 900);
      return () => clearTimeout(t);
    }
  }, [plan, meId, view, id]);
  useEffect(() => { if (plan?.status === "booked") { try { if (!sessionStorage.getItem(`out:${id}`)) { sessionStorage.setItem(`out:${id}`, "1"); router.push(`/plans/${id}/confirmed`); } } catch { /* ignore */ } } }, [plan?.status, id, router]);
  const onSim = useCallback((r: ReturnType<typeof simulateStep>) => { if (r.confirmed) toast.success("Enough people are in — locked. Settling shares via Splitpay."); if (r.booked) toast.success("Everyone's paid. You're out!"); }, []);

  if (!ready) return <Loading />;
  if (!view || !plan) return <PlanUnavailable />;
  if (!view.is_member) return <PlanUnavailable />;
  const { members, suggestions, votes_needed, my_vote, my_role, locked, paid_count, my_split, needed_to_confirm, has_pending_simulation } = view;
  const isOrganiser = my_role === "organiser";
  const joined = members.filter((m) => m.rsvp_status === "joined"); const pending = members.filter((m) => m.rsvp_status === "invited");
  const anchored = plan.mode === "anchored";
  const gathering = plan.status === "draft" || plan.status === "voting";
  const perHead = locked?.est_cost_per_head ?? suggestions[0]?.est_cost_per_head;
  const title = locked ? locked.title : `${plan.vibe} night`;
  const when = locked?.components[0]?.starts_at;
  const lockAt = anchored ? Math.max(plan.quorum, Math.floor(members.filter((m) => m.rsvp_status !== "declined").length / 2) + 1) : Math.max(plan.quorum, votes_needed);
  const leader = suggestions.reduce((a, s) => (s.votes.length > (a?.votes.length ?? 0) ? s : a), suggestions[0]);
  const canNudge = pending.length > 0 && !cooling;
  const nudge = () => { setCooling(true); setTimeout(() => setCooling(false), 45_000); setSpeed((s) => s + 1); toast(`District reminded ${pending.length} ${pending.length === 1 ? "person" : "people"} — from the app, not you`, { icon: "🔔" }); };

  return (
    <PlanShell title={plan.status === "booked" ? "Your plan" : gathering ? "It's filling up" : "Locked"} subtitle={plan.city} back="/profile" right={<div className="flex items-center gap-1"><StatusPill status={plan.status} /><Menu id={id} status={plan.status} isOrganiser={isOrganiser} meId={meId!} /></div>}>
      <Simulator planId={id} active={has_pending_simulation && !!view.is_member} onEvent={onSim} speedUp={speed} />

      {/* header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight capitalize">{title}</h2>
        <div className="flex flex-wrap gap-1.5">
          {when && <Badge variant="secondary" className="rounded-full">{day(when)} · {time(when)}</Badge>}
          {perHead && <Badge variant="secondary" className="rounded-full">{inr(perHead)} a head</Badge>}
          {gathering && <HoldTimer until={plan.expires_at} />}
        </div>
      </div>

      {/* Screen 5 — live plan card */}
      {plan.status === "booked" && locked && (
        <>
          <Section className="border border-brand/40 bg-[linear-gradient(160deg,rgba(100,68,228,.25),#141416_60%)]">
            <p className="flex items-center gap-2 text-lg font-semibold"><Ticket className="size-5 text-brand-hot" /> Booked</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{joined.length} going · {paid_count} paid via Splitpay{view.bookings[0]?.provider_ref ? ` · ref ${view.bookings[0].provider_ref}` : ""}</p>
            <ul className="mt-3 space-y-1.5 text-sm">{locked.components.map((c) => <li key={c.ref} className="flex gap-3"><span className="w-16 shrink-0 text-muted-foreground tabular-nums">{time(c.starts_at)}</span><span><span className="font-medium">{c.title}</span><span className="block text-xs text-muted-foreground">{kindLabel[c.kind]} · {c.subtitle ?? c.area}</span></span></li>)}</ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="rounded-full border-white/20" asChild><a href={`https://www.google.com/maps/search/${encodeURIComponent(`${locked.components[0].title} ${locked.components[0].area}`)}`} target="_blank" rel="noreferrer"><MapPin /> Directions</a></Button>
              <Button variant="outline" size="sm" className="rounded-full border-white/20" onClick={() => toast.success("Added to your calendar")}><CalendarPlus /> Calendar</Button>
              <Button variant="outline" size="sm" className="rounded-full border-white/20" onClick={() => window.open(share.wa(), "_blank", "noopener")}><MessageCircle /> Message the crew</Button>
            </div>
          </Section>
          <EntryPoint n={5} block>
            <Section className="flex w-full items-center gap-3 border border-brand/25">
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-brand/25 text-brand-hot"><Repeat className="size-5" /></div>
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Loved it? Plan the next one</p><p className="mt-0.5 text-xs text-muted-foreground">Same crew, pre-filled. One tap.</p></div>
              <Button size="sm" className="rounded-full" onClick={() => { const p = mutate((r: Plan) => r.id, () => replan(id, meId!)); router.push(`/plans/${p.id}/crew`); }}>Re-plan</Button>
            </Section>
          </EntryPoint>
        </>
      )}

      {/* the night (anchored) */}
      {plan.status !== "booked" && anchored && locked && (
        <Section>
          <div className="flex items-center justify-between"><p className="text-sm font-semibold">The night</p>{plan.status === "locked" && <Badge className="gap-1 rounded-full"><Lock className="size-3" /> Locked</Badge>}</div>
          <ul className="mt-3 space-y-2 text-sm">{locked.components.map((c) => <li key={c.ref} className="flex gap-3"><span className="w-16 shrink-0 text-muted-foreground tabular-nums">{time(c.starts_at)}</span><span><span className="font-medium">{c.title}</span><span className="block text-xs text-muted-foreground">{kindLabel[c.kind]} · {c.subtitle ?? c.area}</span></span></li>)}</ul>
        </Section>
      )}

      {/* vote mode: options + live tally */}
      {plan.status === "voting" && (
        <div className="space-y-3">
          <div className="flex items-end justify-between"><p className="text-sm font-semibold">Pick a night</p><p className="text-xs text-muted-foreground">{leader && leader.votes.length > 0 ? `leaning to ${leader.title}` : `${votes_needed} on one option locks it`}</p></div>
          {suggestions.map((s) => { const mine = my_vote === s.id; const pct = Math.min(100, Math.round((s.votes.length / Math.max(votes_needed, 1)) * 100)); return (
            <Section key={s.id} className={cn("space-y-3", mine && "border border-brand/40", !s.is_available && "opacity-60")}>
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold capitalize">{s.title}</p><p className="text-xs text-muted-foreground">{day(s.components[0].starts_at)}{leader?.id === s.id && s.votes.length > 0 ? " · leading" : ""}</p></div><div className="text-right"><p className="font-semibold tabular-nums">{inr(s.est_cost_per_head)}</p><p className="text-xs text-muted-foreground">a head</p></div></div>
              <ul className="space-y-1.5 text-sm">{s.components.map((c) => <li key={c.ref} className="flex gap-3"><span className="w-16 shrink-0 text-muted-foreground tabular-nums">{time(c.starts_at)}</span><span className="min-w-0"><span className="block truncate">{c.title}</span>{c.subtitle && <span className="block truncate text-xs text-muted-foreground">{c.subtitle}</span>}</span></li>)}</ul>
              <Progress value={pct} className="h-1" />
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">{s.votes.length > 0 ? <div className="flex -space-x-2">{s.votes.map((u) => <Avatar key={u} size="sm" className="ring-2 ring-[#141416]"><AvatarFallback className="text-[10px]"><Initials name={store.users.get(u)?.name ?? "?"} /></AvatarFallback></Avatar>)}</div> : <span className="text-xs text-muted-foreground">No votes yet</span>}{s.votes.length > 0 && <span className="text-xs text-muted-foreground tabular-nums">{s.votes.length}/{votes_needed}</span>}</div>
                {!s.is_available ? <Badge variant="destructive" className="rounded-full">Sold out</Badge> : <Button size="sm" variant={mine ? "secondary" : "default"} className="rounded-full" onClick={() => { try { const r = mutate(id, () => castVote(id, meId!, s.id)); if (r.locked) toast.success("Locked — settling shares via Splitpay"); } catch (e) { toast.error((e as Error).message); } }}>{mine ? <><Check /> I&apos;m in</> : "I'm in"}</Button>}
              </div>
            </Section>); })}
        </div>
      )}
      {plan.status === "draft" && !anchored && (
        <Section className="text-center"><p className="font-semibold">Invite the crew to open the vote</p><p className="mt-1 text-sm text-muted-foreground">District proposes 2–3 nights once you send the invite.</p><Button className="mt-3 rounded-full" asChild><Link href={`/plans/${id}/crew`}><UserPlus /> Who&apos;s coming?</Link></Button></Section>
      )}
      {plan.status === "locked" && !anchored && locked && (
        <Section><div className="flex items-center justify-between"><p className="text-sm font-semibold capitalize">{locked.title}</p><Badge className="gap-1 rounded-full"><Lock className="size-3" /> Locked</Badge></div><ul className="mt-3 space-y-2 text-sm">{locked.components.map((c) => <li key={c.ref} className="flex gap-3"><span className="w-16 shrink-0 text-muted-foreground tabular-nums">{time(c.starts_at)}</span><span><span className="font-medium">{c.title}</span><span className="block text-xs text-muted-foreground">{c.subtitle ?? c.area}</span></span></li>)}</ul></Section>
      )}

      {/* lock progress + your share (gathering) */}
      {gathering && (
        <Section className="space-y-3">
          <div className="flex items-baseline justify-between"><p className="text-sm font-semibold">{joined.length} of {members.length} in — locks at {lockAt}</p><p className="text-xs text-muted-foreground">{needed_to_confirm ? `${needed_to_confirm} more` : pending.length ? "waiting" : ""}</p></div>
          <Progress value={Math.round((Math.min(joined.length, lockAt) / lockAt) * 100)} className="h-1.5" />
          <div className="flex items-center justify-between rounded-xl bg-black/30 px-3 py-2 text-sm"><span className="text-muted-foreground">Your share</span><span className="font-semibold tabular-nums">{perHead ? `You'll pay ${inr(perHead)} when it locks` : "Set by the winning option"}</span></div>
          <p className="text-xs text-muted-foreground">No charge yet. Locks itself at {lockAt} — you don&apos;t chase anyone.</p>
        </Section>
      )}

      {/* locked → paying */}
      {plan.status === "locked" && locked && (
        <Section className="space-y-3 border border-white/10">
          <div className="flex items-start justify-between"><div><p className="text-sm font-semibold">Settling via Splitpay</p><p className="mt-0.5 text-xs text-muted-foreground">{paid_count} of {joined.length} paid · price at lock is the price charged</p></div><div className="text-right"><p className="font-semibold tabular-nums">{inr(my_split?.amount ?? locked.est_cost_per_head)}</p><p className="text-xs text-muted-foreground">your share</p></div></div>
          <Progress value={Math.round((paid_count / Math.max(joined.length, 1)) * 100)} className="h-1.5" />
          {my_split?.status === "captured" ? <p className="flex items-center gap-1 text-xs text-[#22c55e]"><Check className="size-3" /> Your share is settled. Waiting for the rest — it books itself.</p>
            : my_split?.status === "failed" ? <div className="flex items-center justify-between gap-2"><p className="text-xs text-destructive">{my_split.failure_reason}. Nobody else was affected.</p><Button size="sm" className="rounded-full" onClick={() => { try { mutate(id, () => { paySplit(id, meId!); maybeAutoBook(store.plans.get(id)!); }); } catch (e) { toast.error((e as Error).message); } }}>Retry</Button></div>
            : <Button size="lg" className="h-12 w-full rounded-full text-base" onClick={() => { try { mutate(id, () => { paySplit(id, meId!); maybeAutoBook(store.plans.get(id)!); }); toast.success("Paid your share"); } catch (e) { toast.error((e as Error).message); } }}>Pay {inr(my_split?.amount ?? locked.est_cost_per_head)} now</Button>}
        </Section>
      )}
      {plan.booking_failed_reason && plan.status === "locked" && <Section className="border border-destructive/40"><p className="font-semibold">{plan.booking_failed_reason}</p><p className="mt-1 text-sm text-muted-foreground">Everyone&apos;s share was refunded automatically — no support ticket.</p><Button variant="outline" size="sm" className="mt-3 rounded-full border-white/20" asChild><Link href="/plans/starter">Pick a new night</Link></Button></Section>}

      {/* roster */}
      {plan.status !== "cancelled" && (
        <Section>
          <div className="flex items-center justify-between"><p className="text-sm font-semibold">Who&apos;s coming</p><p className="text-xs text-muted-foreground">{joined.length} in{pending.length ? ` · ${pending.length} pending` : ""}</p></div>
          <Roster view={view} meId={meId} />
          {gathering && (
            <div className="mt-3 space-y-2">
              {pending.length > 0 && <Button variant="outline" size="sm" className="w-full rounded-full border-white/20" disabled={!canNudge} onClick={nudge}><BellRing /> {canNudge ? `Nudge the ${pending.length} pending — District sends it` : "Nudge sent · try again in a bit"}</Button>}
              <ShareRow planId={id} title={title} perHead={perHead} compact />
              <Button variant="ghost" size="sm" className="w-full rounded-full" asChild><Link href={`/plans/${id}/crew`}><UserPlus /> Add more people</Link></Button>
            </div>
          )}
        </Section>
      )}

      {/* edges */}
      {plan.status === "expired" && (
        <Section className="border border-warning/40 space-y-3"><p className="font-semibold">Not enough people this time</p><p className="text-sm text-muted-foreground">The seat hold ran out before {plan.quorum} were in. Nobody was charged.</p><div className="flex gap-2"><Button size="sm" className="rounded-full" onClick={() => { try { mutate(id, () => reopenPlan(id, meId!)); nudge(); } catch (e) { toast.error((e as Error).message); } }}><BellRing /> Nudge again</Button><Button size="sm" variant="outline" className="rounded-full border-white/20" asChild><Link href="/plans/starter">Pick a new night</Link></Button></div></Section>
      )}
      {plan.status === "cancelled" && <Section className="border border-destructive/40"><p className="font-semibold">Plan cancelled</p><p className="mt-1 text-sm text-muted-foreground">Anything paid was refunded in full.</p><Button size="sm" className="mt-3 rounded-full" asChild><Link href="/plans/starter">Start a new plan</Link></Button></Section>}
    </PlanShell>
  );
}

function HoldTimer({ until }: { until: string }) {
  const [left, setLeft] = useState(() => Math.max(0, new Date(until).getTime() - Date.now()));
  useEffect(() => { const t = setInterval(() => setLeft(Math.max(0, new Date(until).getTime() - Date.now())), 1000); return () => clearInterval(t); }, [until]);
  const m = Math.floor(left / 60_000), s = Math.floor((left % 60_000) / 1000);
  return <Badge variant="outline" className="gap-1 rounded-full border-white/20 tabular-nums"><Clock className="size-3" /> Seats held {m}:{String(s).padStart(2, "0")}</Badge>;
}

function Menu({ id, status, isOrganiser, meId }: { id: string; status: string; isOrganiser: boolean; meId: string }) {
  const router = useRouter();
  if (["cancelled", "completed"].includes(status)) return null;
  const drop = () => { const r = mutate(id, () => simulateDrop(id)); toast(r.name ? `${r.name.split(" ")[0]} dropped out — ${r.remaining} going, shares re-split${r.per_head ? ` at ${inr(r.per_head)} each` : ""}. The plan holds.` : "Nobody else to drop", { icon: "↩︎" }); };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="More" className="rounded-full"><MoreHorizontal /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild><Link href={`/plans/${id}/crew`}><UserPlus /> Who&apos;s coming</Link></DropdownMenuItem>
        {["locked", "booked"].includes(status) && <DropdownMenuItem onClick={drop}><UserMinus /> Demo: someone drops out</DropdownMenuItem>}
        <DropdownMenuSeparator />
        {isOrganiser ? <DropdownMenuItem variant="destructive" onClick={() => { try { mutate(id, () => cancelPlan(id, meId)); toast("Plan cancelled — anything paid is refunded"); } catch (e) { toast.error((e as Error).message); } }}><XCircle /> Cancel plan</DropdownMenuItem>
          : <DropdownMenuItem onClick={() => { try { mutate(id, () => leavePlan(id, meId)); toast("You left the plan"); router.push("/profile"); } catch (e) { toast.error((e as Error).message); } }}><LogOut /> Leave plan</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
