"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Chip, Card } from "@/components/ui";
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
    { key: "week", label: "Any day this week", a: iso(t), b: iso(week) },
    { key: "two", label: "Next two weeks", a: iso(t), b: iso(two) },
  ];
}

export function NewPlanForm() {
  const router = useRouter();
  const W = useMemo(() => windows(), []);
  const [win, setWin] = useState(W[3].key);
  const [vibe, setVibe] = useState("chill");
  const [band, setBand] = useState<"₹" | "₹₹" | "₹₹₹" | "₹₹₹₹">("₹₹₹");
  const [quorum, setQuorum] = useState(3);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const w = W.find((x) => x.key === win)!;

  return (
    <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); setErr(null); start(async () => {
      try { const { plan } = await api<{ plan: { id: string } }>("/api/plans", { date_start: w.a, date_end: w.b, vibe, budget_band: band, quorum }); router.push(`/plans/${plan.id}`); }
      catch (x) { setErr((x as ApiError).message); }
    }); }}>
      <Field label="When" hint={dateRange(w.a, w.b)}>
        {W.map((x) => <Chip key={x.key} selected={win === x.key} onClick={() => setWin(x.key)}>{x.label}</Chip>)}
      </Field>
      <Field label="Vibe">
        {Object.entries(vibeLabel).map(([k, v]) => <Chip key={k} selected={vibe === k} onClick={() => setVibe(k)}>{v}</Chip>)}
      </Field>
      <Field label="Budget a head" hint={bandLabel[band]}>
        {(["₹", "₹₹", "₹₹₹", "₹₹₹₹"] as const).map((b) => <Chip key={b} selected={band === b} onClick={() => setBand(b)}>{b}</Chip>)}
      </Field>
      <Card>
        <div className="flex items-center justify-between">
          <div><p className="t-button1">Lock when {quorum} are in</p><p className="t-caption text-fg-3 mt-0.5">Majority of who&apos;s joined, and at least {quorum} people. No chasing.</p></div>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Fewer" onClick={() => setQuorum((q) => Math.max(2, q - 1))} className="w-10 h-10 rounded-full bg-surface-2 t-button1">−</button>
            <span className="t-title1 w-6 text-center tabular-nums">{quorum}</span>
            <button type="button" aria-label="More" onClick={() => setQuorum((q) => Math.min(8, q + 1))} className="w-10 h-10 rounded-full bg-surface-2 t-button1">+</button>
          </div>
        </div>
      </Card>
      {err && <p className="t-body2 text-error">{err}</p>}
      <Button type="submit" full disabled={pending}>{pending ? "Creating…" : "Create plan"}</Button>
    </form>
  );
}
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-2"><div className="flex items-baseline justify-between"><p className="t-button2 text-fg">{label}</p>{hint && <p className="t-caption text-fg-3">{hint}</p>}</div><div className="flex flex-wrap gap-2">{children}</div></div>;
}
