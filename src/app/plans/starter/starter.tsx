"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlanShell, Section, Loading } from "@/components/plans/common";
import { useMe, useSession } from "@/components/session";
import { generateCandidates } from "@/lib/services/candidates";
import { createAnchoredPlan, createPlan } from "@/lib/services/plan";
import { mutate } from "@/lib/client/plans-store";
import { store } from "@/lib/store/store";
import type { Plan, Suggestion } from "@/lib/store/types";
import { day, inr, time } from "@/lib/format";

/** Screen 1a — Suggestion. One night that fits; crew is chosen next, never assumed. */
export function StarterClient() {
  const router = useRouter();
  const { ready } = useSession(); const me = useMe();
  const [i, setI] = useState(0);
  const options = useMemo<Suggestion[]>(() => {
    if (!ready || !me) return [];
    const t = new Date(); const dow = t.getDay(); const iso = (d: Date) => d.toISOString().slice(0, 10);
    const sat = new Date(t); sat.setDate(t.getDate() + ((6 - dow + 7) % 7)); const sun = new Date(sat); sun.setDate(sat.getDate() + 1);
    const band = store.taste.get(me.id)?.price_band ?? "₹₹₹";
    const probe = { id: "probe", creator_id: me.id, city: me.city, date_start: iso(dow === 0 ? t : sat), date_end: iso(dow === 0 ? t : sun), vibe: "chill", budget_band: band, status: "draft", quorum: 2, lock_rule: "majority", mode: "open", share_token: "", invite_cap: 12, expires_at: "", created_at: "", updated_at: "" } as Plan;
    let o = generateCandidates(probe, 3, 3);
    if (o.length === 0) o = generateCandidates({ ...probe, date_start: iso(t), date_end: iso(new Date(t.getTime() + 13 * 86_400_000)) }, 3, 3);
    return o;
  }, [ready, me]);
  if (!ready) return <Loading />;
  if (!me) return <PlanShell title="Plan a night" back="/"><Section className="text-center"><p className="font-semibold">Pick who you are first</p><Button className="mt-3 rounded-full" asChild><Link href="/switch">Choose a demo user</Link></Button></Section></PlanShell>;
  const o = options[i];
  const yes = () => { try { const p = mutate((r: Plan) => r.id, () => createAnchoredPlan({ creator_id: me.id, components: o.components, title: o.title, rationale: o.rationale, quorum: 2, source: "ep1" })); router.push(`/plans/${p.id}/crew`); } catch (e) { toast.error((e as Error).message); } };
  const vote = () => {
    try {
      const t = new Date(); const dow = t.getDay(); const iso = (d: Date) => d.toISOString().slice(0, 10); const sat = new Date(t); sat.setDate(t.getDate() + ((6 - dow + 7) % 7)); const sun = new Date(sat); sun.setDate(sat.getDate() + 1);
      const p = mutate((r: Plan) => r.id, () => createPlan({ creator_id: me.id, date_start: iso(dow === 0 ? t : sat), date_end: iso(dow === 0 ? t : sun), vibe: "chill", budget_band: "₹₹₹", quorum: 3 }));
      router.push(`/plans/${p.id}/crew`);
    } catch (e) { toast.error((e as Error).message); }
  };
  return (
    <PlanShell title="Plan a night" back="/">
      <div>
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-brand-soft"><Sparkles className="size-3.5" /> One night that fits</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">Free this weekend? Here&apos;s a night.</h2>
        <p className="mt-1 text-sm text-muted-foreground">Inside your budget, close together, all still available. You&apos;ll pick who&apos;s coming next.</p>
      </div>
      {!o ? (
        <Section className="text-center text-sm text-muted-foreground">Nothing fits this weekend in {me.city}. <Link href="/plans/new" className="text-foreground underline">Build a plan by hand</Link>.</Section>
      ) : (
        <Section className="border border-brand/30">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold capitalize">{o.title}</p><p className="text-xs text-muted-foreground">{day(o.components[0].starts_at)}</p></div><div className="text-right"><p className="font-semibold tabular-nums">{inr(o.est_cost_per_head)}</p><p className="text-xs text-muted-foreground">a head</p></div></div>
          <ul className="mt-3 space-y-2 text-sm">{o.components.map((c) => <li key={c.ref} className="flex gap-3"><span className="w-16 shrink-0 text-muted-foreground tabular-nums">{time(c.starts_at)}</span><span className="min-w-0"><span className="block truncate font-medium">{c.title}</span>{c.subtitle && <span className="block truncate text-xs text-muted-foreground">{c.subtitle}</span>}</span></li>)}</ul>
          <p className="mt-3 border-l-2 border-brand/40 pl-3 text-sm text-muted-foreground">{o.rationale}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{o.components.flatMap((c) => c.tags.slice(0, 2)).slice(0, 4).map((t) => <Badge key={t} variant="secondary" className="rounded-full capitalize">{t}</Badge>)}</div>
          <div className="mt-4 flex gap-2">
            <Button size="lg" className="h-12 flex-1 rounded-full text-base" onClick={yes}>Yes, plan it</Button>
            {options.length > 1 && <Button size="lg" variant="outline" className="h-12 rounded-full border-white/20" onClick={() => setI((x) => (x + 1) % options.length)}><RefreshCw /> Another</Button>}
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">Nothing is booked yet. Next: who&apos;s coming.</p>
        </Section>
      )}
      <Button variant="outline" size="lg" className="h-12 w-full rounded-full border-white/20" onClick={vote}>Let the crew vote instead</Button>
      <p className="text-center text-xs text-muted-foreground">Want to set when, vibe and budget yourself? <Link href="/plans/new" className="underline">Build a plan by hand</Link></p>
    </PlanShell>
  );
}
