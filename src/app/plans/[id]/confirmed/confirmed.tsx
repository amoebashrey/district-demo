"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, CalendarPlus, MessageCircle, Ticket, UtensilsCrossed, IndianRupee, Car, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Initials } from "@/components/screen";
import { PlanShell, Section, PlanUnavailable, Loading, usePlan } from "@/components/plans/common";
import { useShare } from "@/components/plans/share";
import { day, inr, time } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Screen 4 — You're out. The payoff: a checklist of what's done, who paid what, and the celebration. */
export function ConfirmedClient({ id }: { id: string }) {
  const { view, ready, meId } = usePlan(id);
  if (!ready) return <Loading />;
  if (!view || !view.is_member) return <PlanUnavailable />;
  const { plan, locked, members, splits, paid_count } = view;
  if (plan.status !== "booked" || !locked) return <PlanShell title="Not there yet" back={`/plans/${id}`}><Section className="text-center"><p className="font-semibold">This plan isn&apos;t confirmed yet</p><p className="mt-1 text-sm text-muted-foreground">Once enough people are in and shares settle, this is where you land.</p><Button className="mt-3 rounded-full" asChild><Link href={`/plans/${id}`}>Back to the plan</Link></Button></Section></PlanShell>;
  return <Payoff id={id} view={view} meId={meId} locked={locked} members={members} splits={splits} paidCount={paid_count} />;
}

function Payoff({ id, locked, members, splits, paidCount, meId }: { id: string; view: unknown; meId: string | null; locked: NonNullable<ReturnType<typeof usePlan>["view"]>["locked"] & object; members: NonNullable<ReturnType<typeof usePlan>["view"]>["members"]; splits: NonNullable<ReturnType<typeof usePlan>["view"]>["splits"]; paidCount: number }) {
  const share = useShare(id, locked.title, locked.est_cost_per_head);
  const joined = members.filter((m) => m.rsvp_status === "joined");
  const paid = (uid: string) => splits.find((s) => s.user_id === uid)?.status === "captured";
  const hasTable = locked.components.some((c) => c.kind === "dining"); const hasTickets = locked.components.some((c) => c.kind !== "dining" && c.kind !== "ride");
  return (
    <PlanShell title="You're out" back={`/plans/${id}`} bottom={<Button size="lg" className="h-12 w-full rounded-full text-base" asChild><Link href={`/plans/${id}`}>Done</Link></Button>}>
      <Celebration planId={id} />
      <div className="pt-2 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-[#22c55e] text-black"><Check className="size-8" /></div>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight capitalize">{locked.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{day(locked.components[0].starts_at)} · {time(locked.components[0].starts_at)} · {joined.length} going</p>
      </div>
      <Section className="space-y-3">
        <Row done icon={<Ticket className="size-4" />} label={hasTickets ? "Tickets booked" : "Booking confirmed"} sub={locked.components.filter((c) => c.kind !== "dining").map((c) => c.title).join(" · ") || locked.title} />
        {hasTable && <Row done icon={<UtensilsCrossed className="size-4" />} label="Table reserved" sub={locked.components.find((c) => c.kind === "dining")?.title} />}
        <Row done icon={<IndianRupee className="size-4" />} label="Bill split via Splitpay" sub={`${paidCount} of ${joined.length} paid · ${inr(locked.est_cost_per_head)} each`} />
        <Row icon={<Car className="size-4" />} label="Ride home" sub="Not included in this plan" />
      </Section>
      <Section>
        <p className="text-sm font-semibold">Who paid what</p>
        <ul className="mt-2 divide-y divide-white/6">{joined.map((m) => <li key={m.id} className="flex items-center gap-3 py-2 text-sm"><Avatar size="sm"><AvatarFallback className="text-[10px]"><Initials name={m.display_name} /></AvatarFallback></Avatar><span className="min-w-0 flex-1 truncate">{m.user_id === meId ? "You" : m.display_name}</span><span className={cn("tabular-nums", paid(m.user_id) ? "" : "text-muted-foreground")}>{inr(locked.est_cost_per_head)}</span>{paid(m.user_id) ? <Check className="size-4 text-[#22c55e]" /> : <span className="text-xs text-muted-foreground">pending</span>}</li>)}</ul>
      </Section>
      <p className="flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 shrink-0 text-[#22c55e]" /> The price shown at lock is the price charged. If any part had failed, every share auto-refunds — no support ticket.</p>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 rounded-full border-white/20" onClick={() => toast.success("Added to your calendar")}><CalendarPlus /> Add to calendar</Button>
        <Button variant="outline" className="flex-1 rounded-full border-white/20" onClick={() => window.open(share.wa(), "_blank", "noopener")}><MessageCircle /> Message the crew</Button>
      </div>
      <div className="h-20" />
    </PlanShell>
  );
}
function Row({ done, icon, label, sub }: { done?: boolean; icon: React.ReactNode; label: string; sub?: string }) {
  return <div className="flex items-center gap-3"><span className={cn("grid size-8 shrink-0 place-items-center rounded-full", done ? "bg-[#22c55e]/15 text-[#22c55e]" : "bg-white/6 text-muted-foreground")}>{done ? <Check className="size-4" /> : icon}</span><div className="min-w-0"><p className={cn("text-sm font-medium", !done && "text-muted-foreground")}>{label}</p>{sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}</div></div>;
}
/** Once per plan per browser. Pure CSS; hidden under reduced motion. */
function Celebration({ planId }: { planId: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => { const k = `celebrated:${planId}`; try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, "1"); } catch { /* ignore */ } const t0 = setTimeout(() => setShow(true), 0); const t1 = setTimeout(() => setShow(false), 1500); return () => { clearTimeout(t0); clearTimeout(t1); }; }, [planId]);
  if (!show) return null;
  const colors = ["#e9deff", "#8972fe", "#6444e4", "#ffffff", "#22c55e", "#f59e0b"];
  return <div className="celebrate" aria-hidden><span className="ring" />{Array.from({ length: 18 }, (_, i) => { const a = (i / 18) * Math.PI * 2; const r = 120 + (i % 3) * 40; return <span key={i} className="dot" style={{ background: colors[i % colors.length], ["--dx" as string]: `${Math.cos(a) * r}px`, ["--dy" as string]: `${Math.sin(a) * r}px`, animationDelay: `${(i % 4) * 60}ms` }} />; })}</div>;
}
