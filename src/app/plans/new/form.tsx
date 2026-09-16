"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Screen } from "@/components/screen";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { api, ApiError } from "@/components/client";
import { bandLabel, dateRange, vibeLabel } from "@/lib/format";

const iso = (d: Date) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
function windows() {
  const t = new Date(); const dow = t.getDay();
  const sat = new Date(t); sat.setDate(t.getDate() + ((6 - dow + 7) % 7)); const sun = new Date(sat); sun.setDate(sat.getDate() + 1);
  const nsat = new Date(sat); nsat.setDate(sat.getDate() + 7); const nsun = new Date(nsat); nsun.setDate(nsat.getDate() + 1);
  const week = new Date(t); week.setDate(t.getDate() + 6);
  const two = new Date(t); two.setDate(t.getDate() + 13);
  return [
    { key: "weekend", label: dow === 0 ? "Today" : "This weekend", a: dow === 0 ? iso(t) : iso(sat), b: dow === 0 ? iso(t) : iso(sun) },
    { key: "next", label: "Next weekend", a: iso(nsat), b: iso(nsun) },
    { key: "week", label: "This week", a: iso(t), b: iso(week) },
    { key: "two", label: "Next two weeks", a: iso(t), b: iso(two) },
  ];
}
type Band = "₹" | "₹₹" | "₹₹₹" | "₹₹₹₹";
const bandHint: Record<Band, string> = { "₹": "Street food, a show", "₹₹": "Casual dinner + event", "₹₹₹": "Good dinner + a big gig", "₹₹₹₹": "Splash out" };

export function NewPlanForm({ city }: { city: string }) {
  const router = useRouter();
  const W = useMemo(() => windows(), []);
  const [win, setWin] = useState(W[3].key);
  const [vibe, setVibe] = useState("chill");
  const [band, setBand] = useState<Band>("₹₹₹");
  const [quorum, setQuorum] = useState(3);
  const [pending, start] = useTransition();
  const w = W.find((x) => x.key === win)!;
  const submit = () => start(async () => {
    try { const { plan } = await api<{ plan: { id: string } }>("/api/plans", { date_start: w.a, date_end: w.b, vibe, budget_band: band, quorum }); router.push(`/plans/${plan.id}`); }
    catch (x) { toast.error((x as ApiError).message); }
  });

  return (
    <Screen title="New plan" back="/" bottom={
      <div className="space-y-2">
        <p className="truncate text-center text-xs text-muted-foreground">{dateRange(w.a, w.b)} · {vibeLabel[vibe]} · {bandLabel[band]} · lock at {quorum}</p>
        <Button size="lg" className="w-full" disabled={pending} onClick={submit}>{pending ? "Creating…" : "Create plan"}</Button>
      </div>
    }>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-primary">{city}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">When, and what kind of night?</h2>
        <p className="mt-1 text-sm text-muted-foreground">District builds 2–3 options around this. Your crew votes. It locks itself.</p>
      </div>
      <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Field label="When" hint={dateRange(w.a, w.b)}>
          <ToggleGroup type="single" variant="outline" value={win} onValueChange={(v) => v && setWin(v)} className="flex-wrap justify-start">
            {W.map((x) => <ToggleGroupItem key={x.key} value={x.key}>{x.label}</ToggleGroupItem>)}
          </ToggleGroup>
        </Field>
        <Field label="Vibe">
          <ToggleGroup type="single" variant="outline" value={vibe} onValueChange={(v) => v && setVibe(v)} className="flex-wrap justify-start">
            {Object.entries(vibeLabel).map(([k, v]) => <ToggleGroupItem key={k} value={k}>{v}</ToggleGroupItem>)}
          </ToggleGroup>
        </Field>
        <Field label="Budget a head" hint={`${bandLabel[band]} · ${bandHint[band]}`}>
          <ToggleGroup type="single" variant="outline" value={band} onValueChange={(v) => v && setBand(v as Band)} className="w-full">
            {(["₹", "₹₹", "₹₹₹", "₹₹₹₹"] as Band[]).map((b) => <ToggleGroupItem key={b} value={b} className="flex-1">{b}</ToggleGroupItem>)}
          </ToggleGroup>
        </Field>
        <Card>
          <CardContent className="flex items-center justify-between gap-3">
            <div><p className="text-sm font-medium">Lock when {quorum} are in</p><p className="text-xs text-muted-foreground">Majority of who&apos;s joined, and at least {quorum} people. No chasing.</p></div>
            <div className="flex items-center gap-1">
              <Button type="button" variant="outline" size="icon-sm" aria-label="Fewer" disabled={quorum <= 2} onClick={() => setQuorum((q) => Math.max(2, q - 1))}><Minus /></Button>
              <span className="w-7 text-center text-sm font-semibold tabular-nums">{quorum}</span>
              <Button type="button" variant="outline" size="icon-sm" aria-label="More" disabled={quorum >= 8} onClick={() => setQuorum((q) => Math.min(8, q + 1))}><Plus /></Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </Screen>
  );
}
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <div className="space-y-2"><div className="flex items-baseline justify-between gap-3"><Label>{label}</Label>{hint && <span className="truncate text-xs text-muted-foreground">{hint}</span>}</div>{children}</div>;
}
