"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { api, ApiError } from "@/components/client";
import { ChipGroup, NumberFlow, Pressable, Reveal } from "@/components/motion";
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
    { key: "week", label: "Any day this week", a: iso(t), b: iso(week) },
    { key: "two", label: "Next two weeks", a: iso(t), b: iso(two) },
  ];
}
type Band = "₹" | "₹₹" | "₹₹₹" | "₹₹₹₹";

export function NewPlanForm() {
  const router = useRouter();
  const W = useMemo(() => windows(), []);
  const [win, setWin] = useState(W[3].key);
  const [vibe, setVibe] = useState("chill");
  const [band, setBand] = useState<Band>("₹₹₹");
  const [quorum, setQuorum] = useState(3);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const w = W.find((x) => x.key === win)!;

  return (
    <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); setErr(null); start(async () => {
      try { const { plan } = await api<{ plan: { id: string } }>("/api/plans", { date_start: w.a, date_end: w.b, vibe, budget_band: band, quorum }); router.push(`/plans/${plan.id}`); }
      catch (x) { setErr((x as ApiError).message); }
    }); }}>
      <Reveal delay={0.05}><Field label="When" hint={dateRange(w.a, w.b)}><ChipGroup options={W.map((x) => ({ key: x.key, label: x.label }))} value={win} onChange={setWin} /></Field></Reveal>
      <Reveal delay={0.1}><Field label="Vibe"><ChipGroup options={Object.entries(vibeLabel).map(([k, v]) => ({ key: k, label: v }))} value={vibe} onChange={setVibe} /></Field></Reveal>
      <Reveal delay={0.15}><Field label="Budget a head" hint={bandLabel[band]}><ChipGroup<Band> options={(["₹", "₹₹", "₹₹₹", "₹₹₹₹"] as Band[]).map((b) => ({ key: b, label: b }))} value={band} onChange={setBand} /></Field></Reveal>
      <Reveal delay={0.2}>
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div><p className="t-button1">Lock when <NumberFlow value={quorum} className="text-accent" /> are in</p><p className="t-caption text-fg-3 mt-0.5">Majority of who&apos;s joined, and at least {quorum} people. No chasing.</p></div>
            <div className="flex items-center gap-1 rounded-full bg-surface-2 p-1">
              <Pressable type="button" aria-label="Fewer" scale={0.9} onClick={() => setQuorum((q) => Math.max(2, q - 1))} className="w-9 h-9 rounded-full t-button1 text-fg-2">−</Pressable>
              <NumberFlow value={quorum} className="t-title1 w-6" />
              <Pressable type="button" aria-label="More" scale={0.9} onClick={() => setQuorum((q) => Math.min(8, q + 1))} className="w-9 h-9 rounded-full t-button1 text-fg-2">+</Pressable>
            </div>
          </div>
        </Card>
      </Reveal>
      {err && <p className="t-body2 text-error">{err}</p>}
      <Reveal delay={0.25}><Button type="submit" full disabled={pending}>{pending ? "Creating…" : "Create plan"}</Button></Reveal>
    </form>
  );
}
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-2"><div className="flex items-baseline justify-between"><p className="t-button2 text-fg">{label}</p>{hint && <p className="t-caption text-fg-3">{hint}</p>}</div>{children}</div>;
}
