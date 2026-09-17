"use client";
import Link from "next/link";
import { ChevronRight, CalendarDays, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Initials } from "@/components/screen";
import { EntryPoint } from "@/components/highlight";
import { PlanShell, Section, StatusPill, Loading } from "@/components/plans/common";
import { useSession, useStoreVersion } from "@/components/session";
import { plansFor, membersOf, joinedMembers, store } from "@/lib/store/store";
import { getPlan } from "@/lib/services/plan";
import { dateRange, inr } from "@/lib/format";

/** EP6 — Your Plans. Reads the persisted client store. */
export function YourPlans({ standalone }: { standalone?: boolean }) {
  const { meId, ready } = useSession(); useStoreVersion();
  if (!ready) return standalone ? <Loading /> : null;
  const plans = meId ? plansFor(meId).map((p) => getPlan(p.id)) : [];
  const active = plans.filter((p) => !["cancelled", "completed", "expired"].includes(p.status));
  const past = plans.filter((p) => ["expired", "cancelled"].includes(p.status));
  const list = (
    <EntryPoint n={6} block>
      <section className="w-full space-y-3">
        <div className="flex items-center justify-between"><h2 className="flex items-center gap-1.5 text-sm font-semibold"><CalendarDays className="size-4 text-brand-soft" /> Your Plans</h2>{active.length > 0 && <Badge variant="secondary" className="rounded-full">{active.length} active</Badge>}</div>
        {plans.length === 0 ? (
          <Section className="flex flex-col items-center py-8 text-center border border-dashed border-white/15"><Users className="mb-3 size-8 text-muted-foreground" /><p className="font-medium">No plans yet</p><p className="mt-1 max-w-[26ch] text-sm text-muted-foreground">Start one, invite the crew, and let it lock itself.</p><Button size="sm" className="mt-4 rounded-full" asChild><Link href="/plans/starter">Start a plan</Link></Button></Section>
        ) : [...active, ...past].map((p) => { const joined = joinedMembers(p.id); const all = membersOf(p.id).filter((m) => m.rsvp_status !== "left"); const s = p.locked_suggestion_id ? store.suggestions.get(p.locked_suggestion_id) : undefined; return (
          <Link key={p.id} href={`/plans/${p.id}`} className="block"><Section className="flex items-center gap-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center gap-2"><p className="truncate font-medium capitalize">{s?.title ?? `${p.vibe} night`}</p><StatusPill status={p.status} /></div>
              <p className="text-xs text-muted-foreground">{p.city} · {dateRange(p.date_start, p.date_end)}{s ? ` · ${inr(s.est_cost_per_head)} a head` : ""}</p>
              <div className="flex items-center gap-2"><div className="flex -space-x-2">{all.slice(0, 4).map((m) => <Avatar key={m.id} className="size-6 ring-2 ring-[#141416]"><AvatarFallback className="text-[9px]"><Initials name={m.display_name} /></AvatarFallback></Avatar>)}</div><span className="text-xs text-muted-foreground">{joined.length} in{all.length > joined.length ? ` · ${all.length - joined.length} pending` : ""}</span></div>
            </div><ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </Section></Link>); })}
        <Button variant="outline" className="w-full rounded-full border-white/20" asChild><Link href="/plans/starter">+ Start a new plan</Link></Button>
      </section>
    </EntryPoint>
  );
  return standalone ? <PlanShell title="Your Plans" back="/profile">{list}</PlanShell> : list;
}
