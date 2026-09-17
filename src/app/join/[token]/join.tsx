"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ShieldCheck, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Initials } from "@/components/screen";
import { PlanShell, Section, PlanUnavailable, Loading, StatusPill } from "@/components/plans/common";
import { Simulator } from "@/components/plans/simulator";
import { useSession, useStoreVersion } from "@/components/session";
import { planByToken, store, getUser, memberOf, newId, nowIso } from "@/lib/store/store";
import { planView, getPlan } from "@/lib/services/plan";
import { joinViaToken, respondToInvite } from "@/lib/services/invite";
import { paySplit } from "@/lib/services/split";
import { maybeAutoBook } from "@/lib/services/booking";
import { hydrateFromHash, mutate } from "@/lib/client/plans-store";
import type { User } from "@/lib/store/types";
import { day, inr, time } from "@/lib/format";

/** The Invitee — /join/[token]. Say yes in one tap, no download, no upfront payment; pay your share after lock. */
export function JoinClient({ token }: { token: string }) {
  const { meId, ready, setGuest } = useSession(); useStoreVersion();
  const [name, setName] = useState("");
  useEffect(() => { if (ready) hydrateFromHash(); }, [ready]);
  if (!ready) return <Loading />;
  const plan = planByToken(token);
  if (!plan) return <PlanUnavailable invitee />;
  let view; try { view = planView(plan.id, meId ?? undefined); } catch { return <PlanUnavailable invitee />; }
  const host = getUser(plan.creator_id);
  const { locked, members, my_split, paid_count } = view;
  const joined = members.filter((m) => m.rsvp_status === "joined");
  const me = meId ? memberOf(plan.id, meId) : undefined;
  const iAmIn = me?.rsvp_status === "joined";
  const perHead = locked?.est_cost_per_head;
  const open = ["draft", "voting", "locked", "booked"].includes(plan.status);

  const imIn = () => {
    try {
      if (meId && getUser(meId)) mutate(plan.id, () => joinViaToken(token, { user_id: meId }));
      else {
        if (name.trim().length < 2) { toast.error("Tell us your name"); return; }
        const u: User = { id: newId(), name: name.trim(), city: plan.city, is_guest: true, created_at: nowIso() };
        setGuest(u);
        mutate(plan.id, () => joinViaToken(token, { user_id: u.id }));
      }
      toast.success(getPlan(plan.id).status === "locked" ? "You're in — and it's locked!" : "You're in. Nothing to pay yet.");
    } catch (e) { toast.error((e as Error).message); }
  };
  const cant = () => { try { if (meId && me) mutate(plan.id, () => respondToInvite(plan.id, meId, "decline")); toast("No worries — we told the crew"); } catch (e) { toast.error((e as Error).message); } };
  const pay = () => { try { mutate(plan.id, () => { paySplit(plan.id, meId!); maybeAutoBook(store.plans.get(plan.id)!); }); toast.success("Paid — you're all set"); } catch (e) { toast.error((e as Error).message); } };

  return (
    <PlanShell title="You're invited" subtitle={`by ${host?.name ?? "a friend"} · District`} nav={false} right={<StatusPill status={plan.status} />}>
      <div className="pt-1">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-soft">district · going together</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{host?.name?.split(" ")[0] ?? "A friend"} is planning <span className="capitalize">{locked ? locked.title : `a ${plan.vibe} night`}</span></h1>
      </div>
      {locked ? (
        <Section>
          <ul className="space-y-2 text-sm">{locked.components.map((c) => <li key={c.ref} className="flex gap-3"><span className="w-16 shrink-0 text-muted-foreground tabular-nums">{time(c.starts_at)}</span><span><span className="font-medium">{c.title}</span><span className="block text-xs text-muted-foreground">{day(c.starts_at)} · {c.subtitle ?? c.area}</span></span></li>)}</ul>
        </Section>
      ) : <Section><p className="text-sm">The crew is voting between 2–3 nights in {plan.city}. Say yes and you&apos;ll get to pick too.</p></Section>}
      <Section className="space-y-3">
        <div className="flex items-center gap-3"><div className="flex -space-x-2">{joined.slice(0, 5).map((m) => <Avatar key={m.id} size="sm" className="ring-2 ring-[#141416]"><AvatarFallback className="text-[10px]"><Initials name={m.display_name} /></AvatarFallback></Avatar>)}</div><p className="text-sm text-muted-foreground">{joined.length === 1 ? `${joined[0].display_name.split(" ")[0]} is in` : `${joined.length} are in`}{members.length > joined.length ? ` · ${members.length - joined.length} deciding` : ""}</p></div>
        {plan.status !== "booked" && <Progress value={Math.round((joined.length / Math.max(members.length, 1)) * 100)} className="h-1" />}
        <div className="flex items-center justify-between rounded-xl bg-black/30 px-3 py-2 text-sm"><span className="text-muted-foreground">Your share</span><span className="font-semibold tabular-nums">{perHead ? inr(perHead) : "Set by the winning option"}</span></div>
        <p className="flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 shrink-0 text-[#22c55e]" /> {plan.status === "locked" || plan.status === "booked" ? "Locked. Pay your share via Splitpay — the price shown is the price charged." : "You won't be charged until it's locked. Saying yes is free."}</p>
      </Section>

      {!open && <Section className="border border-destructive/40"><p className="font-semibold">This plan is {plan.status}</p><p className="mt-1 text-sm text-muted-foreground">Ask {host?.name?.split(" ")[0] ?? "the organiser"} for a new link, or start your own.</p><Button size="sm" className="mt-3 rounded-full" asChild><Link href="/plans/starter">Start a plan</Link></Button></Section>}

      {open && !iAmIn && (
        <Section className="space-y-3 border border-brand/40">
          {!(meId && getUser(meId)) && <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="h-12 rounded-full bg-black/40" />}
          <Button size="lg" className="h-12 w-full rounded-full text-base" onClick={imIn}>I&apos;m in</Button>
          <p className="text-center text-xs text-muted-foreground">One tap · no app to download · nothing to pay now</p>
          <Button variant="ghost" className="w-full rounded-full" onClick={cant}>Can&apos;t make it</Button>
        </Section>
      )}
      {open && iAmIn && (
        <Section className="space-y-3 border border-brand/40">
          <p className="flex items-center gap-2 font-semibold"><Check className="size-4 text-[#22c55e]" /> You&apos;re in</p>
          {plan.status === "draft" || plan.status === "voting" ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="size-4" /> Waiting for the rest — it locks itself at majority. We&apos;ll ask for your {perHead ? inr(perHead) : "share"} then.</p>
            : my_split?.status === "captured" ? <p className="text-sm text-muted-foreground">Paid {inr(my_split.amount)} via Splitpay. {plan.status === "booked" ? "Booked — see you there." : `${paid_count} of ${joined.length} paid; it books when everyone has.`}</p>
            : <Button size="lg" className="h-12 w-full rounded-full text-base" onClick={pay}>Pay your share · {inr(my_split?.amount ?? perHead ?? 0)}</Button>}
          {plan.status === "voting" && <Badge variant="secondary" className="rounded-full">Vote from the plan page →</Badge>}
          <Button variant="outline" size="sm" className="w-full rounded-full border-white/20" asChild><Link href={`/plans/${plan.id}`}>Open the plan</Link></Button>
        </Section>
      )}
      <Simulator planId={plan.id} active={iAmIn && view.has_pending_simulation} onEvent={(r) => { if (r.confirmed) toast.success("Locked — pay your share when you're ready"); if (r.booked) toast.success("Booked!"); }} />
      <p className="text-center text-xs text-muted-foreground">Powered by District · plans live in your browser in this demo</p>
    </PlanShell>
  );
}
