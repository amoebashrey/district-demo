"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PlanShell, Section, Loading } from "@/components/plans/common";
import { useMe, useSession } from "@/components/session";
import { createPlan } from "@/lib/services/plan";
import { mutate } from "@/lib/client/plans-store";
import type { Plan } from "@/lib/store/types";
import { bandLabel, dateRange, vibeLabel } from "@/lib/format";

const iso = (d: Date) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
function windows() {
  const t = new Date(); const dow = t.getDay();
  const sat = new Date(t); sat.setDate(t.getDate() + ((6 - dow + 7) % 7)); const sun = new Date(sat); sun.setDate(sat.getDate() + 1);
  const nsat = new Date(sat); nsat.setDate(sat.getDate() + 7); const nsun = new Date(nsat); nsun.setDate(nsat.getDate() + 1);
  const week = new Date(t); week.setDate(t.getDate() + 6); const two = new Date(t); two.setDate(t.getDate() + 13);
  return [
    { key: "weekend", label: dow === 0 ? "Today" : "This weekend", a: dow === 0 ? iso(t) : iso(sat), b: dow === 0 ? iso(t) : iso(sun) },
    { key: "next", label: "Next weekend", a: iso(nsat), b: iso(nsun) },
    { key: "week", label: "This week", a: iso(t), b: iso(week) },
    { key: "two", label: "Next two weeks", a: iso(t), b: iso(two) },
  ];
}
type Band = "₹" | "₹₹" | "₹₹₹" | "₹₹₹₹";

/** Screen 1b — Vote mode. The lock rule is the anxiety-killer: "Locks when N are in. Majority of who joined. No chasing." */
export function NewPlanForm() {
  const router = useRouter(); const { ready } = useSession(); const me = useMe();
  const W = useMemo(() => windows(), []);
  const [win, setWin] = useState(W[3].key); const [vibe, setVibe] = useState("chill"); const [band, setBand] = useState<Band>("₹₹₹"); const [quorum, setQuorum] = useState(3);
  if (!ready) return <Loading />;
  if (!me) return <PlanShell title="New plan" back="/plans/starter"><Section className="text-center"><p className="font-semibold">Pick who you are first</p><Button className="mt-3 rounded-full" asChild><Link href="/switch">Choose a demo user</Link></Button></Section></PlanShell>;
  const w = W.find((x) => x.key === win)!;
  const create = () => { try { const p = mutate((r: Plan) => r.id, () => createPlan({ creator_id: me.id, date_start: w.a, date_end: w.b, vibe, budget_band: band, quorum })); router.push(`/plans/${p.id}/crew`); } catch (e) { toast.error((e as Error).message); } };
  return (
    <PlanShell title="Let the crew vote" back="/plans/starter" bottom={<><p className="mb-2 truncate text-center text-xs text-muted-foreground">{dateRange(w.a, w.b)} · {vibeLabel[vibe]} · {bandLabel[band]} · locks at {quorum}</p><Button size="lg" className="h-12 w-full rounded-full text-base" onClick={create}>Create plan</Button></>}>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-brand-soft">{me.city}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">We can&apos;t agree — let the group choose.</h2>
        <p className="mt-1 text-sm text-muted-foreground">District builds 2–3 nights around this. Everyone picks one in a tap.</p>
      </div>
      <Field label="When" hint={dateRange(w.a, w.b)}><ToggleGroup type="single" variant="outline" value={win} onValueChange={(v) => v && setWin(v)} className="flex-wrap justify-start">{W.map((x) => <ToggleGroupItem key={x.key} value={x.key} className="rounded-full">{x.label}</ToggleGroupItem>)}</ToggleGroup></Field>
      <Field label="Vibe"><ToggleGroup type="single" variant="outline" value={vibe} onValueChange={(v) => v && setVibe(v)} className="flex-wrap justify-start">{Object.entries(vibeLabel).map(([k, v]) => <ToggleGroupItem key={k} value={k} className="rounded-full">{v}</ToggleGroupItem>)}</ToggleGroup></Field>
      <Field label="Budget a head" hint={bandLabel[band]}><ToggleGroup type="single" variant="outline" value={band} onValueChange={(v) => v && setBand(v as Band)} className="w-full">{(["₹", "₹₹", "₹₹₹", "₹₹₹₹"] as Band[]).map((b) => <ToggleGroupItem key={b} value={b} className="flex-1 rounded-full">{b}</ToggleGroupItem>)}</ToggleGroup></Field>
      <Section className="border border-brand/30">
        <div className="flex items-center justify-between gap-3">
          <div><p className="flex items-center gap-1.5 text-sm font-semibold"><Lock className="size-3.5 text-brand-hot" /> Locks when {quorum} are in</p><p className="mt-0.5 text-xs text-muted-foreground">Majority of who joined, and at least {quorum} people. No chasing — it locks itself.</p></div>
          <div className="flex items-center gap-1">
            <Button type="button" variant="outline" size="icon-sm" className="rounded-full border-white/20" aria-label="Fewer" disabled={quorum <= 2} onClick={() => setQuorum((q) => q - 1)}><Minus /></Button>
            <span className="w-7 text-center text-sm font-semibold tabular-nums">{quorum}</span>
            <Button type="button" variant="outline" size="icon-sm" className="rounded-full border-white/20" aria-label="More" disabled={quorum >= 8} onClick={() => setQuorum((q) => q + 1)}><Plus /></Button>
          </div>
        </div>
      </Section>
      <div className="h-24" />
    </PlanShell>
  );
}
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <div className="space-y-2"><div className="flex items-baseline justify-between gap-3"><Label>{label}</Label>{hint && <span className="truncate text-xs text-muted-foreground">{hint}</span>}</div>{children}</div>;
}
