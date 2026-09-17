"use client";
/**
 * Proposal layer UI:
 *  - HighlightProvider / HighlightToggle — "Highlight my additions" (persisted per browser; default ON)
 *  - EntryPoint — wraps a real control; when ON: dim purple ring with a bright lavender hotspot sweeping
 *    around it + numbered chip. When OFF the app looks exactly like production.
 *  - IntroCard — first-visit explainer with "Take the tour"
 *  - Tour — steps through EP1–EP6 with one-line tooltips, navigating to where each lives.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles, X, ChevronRight, ChevronLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const KEY = "district:highlight", INTRO = "district:intro-seen", TOUR = "district:tour-step";
const ls = { get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } }, del: (k: string) => { try { localStorage.removeItem(k); } catch { /* ignore */ } } };

type Ctx = { on: boolean; set: (v: boolean) => void; pulse: number; tour: number; setTour: (n: number) => void; showIntro: boolean; dismissIntro: () => void };
const C = createContext<Ctx>({ on: true, set: () => {}, pulse: 0, tour: 0, setTour: () => {}, showIntro: false, dismissIntro: () => {} });

export function HighlightProvider({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(true);
  const [pulse, setPulse] = useState(0);
  const [tour, setTourState] = useState(0);
  const [showIntro, setShowIntro] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => {
      const v = ls.get(KEY); if (v !== null) setOn(v === "1");
      if (!ls.get(INTRO)) setShowIntro(true);
      const ts = Number(ls.get(TOUR) ?? 0); if (ts > 0) setTourState(ts);
    }, 0);
    return () => clearTimeout(t);
  }, []);
  const set = (v: boolean) => { setOn(v); if (v) setPulse((p) => p + 1); ls.set(KEY, v ? "1" : "0"); };
  const setTour = (n: number) => { setTourState(n); if (n > 0) { ls.set(TOUR, String(n)); set(true); } else ls.del(TOUR); };
  const dismissIntro = () => { setShowIntro(false); ls.set(INTRO, "1"); };
  return <C.Provider value={{ on, set, pulse, tour, setTour, showIntro, dismissIntro }}>{children}<Tour /></C.Provider>;
}
export const useHighlight = () => useContext(C);

export function HighlightToggle({ compact }: { compact?: boolean }) {
  const { on, set } = useHighlight();
  return (
    <div className="flex items-center gap-2">
      {!compact && <Label htmlFor="hl" className="flex items-center gap-1.5 text-xs text-muted-foreground"><Sparkles className="size-3.5 text-brand-soft" /> Highlight my additions</Label>}
      <Switch id="hl" checked={on} onCheckedChange={set} aria-label="Highlight my additions" className="data-[state=checked]:bg-brand" />
    </div>
  );
}

/** Wrap any control/card. `n` = entry-point number from the integration map. */
export function EntryPoint({ n, children, className, block }: { n: 1 | 2 | 3 | 4 | 5 | 6; children: ReactNode; className?: string; block?: boolean }) {
  const { on, pulse, tour } = useHighlight();
  const [pulsing, setPulsing] = useState(false);
  useEffect(() => { if (pulse === 0) return; const t0 = setTimeout(() => setPulsing(true), 0); const t1 = setTimeout(() => setPulsing(false), 700); return () => { clearTimeout(t0); clearTimeout(t1); }; }, [pulse]);
  const focused = tour === n;
  useEffect(() => { if (!focused) return; const el = document.querySelector(`[data-ep="${n}"]`); const t = setTimeout(() => el?.scrollIntoView({ behavior: "smooth", block: "center" }), 150); return () => clearTimeout(t); }, [focused, n]);
  if (!on) return <div className={cn(block ? "block" : "inline-flex", "rounded-[inherit]", className)} data-ep={n}>{children}</div>;
  return (
    <div className={cn("ep rounded-full", block && "block rounded-2xl", !block && "inline-flex", pulsing && "ep-pulse", focused && "tour-focus", className)} data-ep={n}>
      <span className="ep-tag" aria-label={`Proposed addition ${n}`}>{n}</span>
      {children}
    </div>
  );
}

/** First-visit explainer. Dismiss persists; "Take the tour" starts the 6-step walkthrough. */
export function IntroCard() {
  const { showIntro, dismissIntro, setTour } = useHighlight();
  if (!showIntro) return null;
  return (
    <Card className="border-brand/40 bg-[linear-gradient(135deg,rgba(100,68,228,.25),rgba(100,68,228,.05))]">
      <CardContent className="relative py-4 pr-10">
        <button aria-label="Dismiss" onClick={dismissIntro} className="absolute right-3 top-3 grid size-7 place-items-center rounded-full bg-white/10 text-muted-foreground"><X className="size-4" /></button>
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-hot"><Sparkles className="size-3.5" /> Working demo</p>
        <p className="mt-1.5 text-sm leading-relaxed">This is a working demo of the real District app with my proposed additions woven in. The glowing controls are the additions — tap <span className="font-semibold">&ldquo;Go together&rdquo;</span> to see the flow.</p>
        <div className="mt-3 flex gap-2"><Button size="sm" onClick={() => { dismissIntro(); setTour(1); }}>Take the tour</Button><Button size="sm" variant="ghost" onClick={dismissIntro}>Got it</Button></div>
      </CardContent>
    </Card>
  );
}

const STEPS: { n: 1 | 2 | 3 | 4 | 5 | 6; title: string; tip: string; where: (r: Routes) => string | null; note?: string }[] = [
  { n: 1, title: "Plan a night", tip: "One dismissible card in the feed you already scroll. District proposes a night; yes/no, not a poll.", where: () => "/" },
  { n: 2, title: "Go together", tip: "Beside Book on every movie — the high-intent moment. Starts a plan around this film.", where: (r) => (r.movie_id ? `/movies/${r.movie_id}` : "/movies") },
  { n: 3, title: "Split & invite", tip: "One toggle at checkout turns a solo booking into a group one. Friends pay their share via Splitpay.", where: (r) => (r.show_id && r.movie_id ? `/movies/${r.movie_id}/review?show=${r.show_id}` : "/movies") },
  { n: 4, title: "Invite friends to this booking", tip: "On the confirmation screen, after you've paid. Share to WhatsApp; friends join and pay, no download.", where: () => null, note: "Appears on any confirmation screen after a solo booking. Pay for a ticket to see it live." },
  { n: 5, title: "Plan the next one", tip: "After Splitpay settles, one tap re-plans with the same crew — the frequency loop.", where: (r) => (r.booked_plan_id ? `/plans/${r.booked_plan_id}` : "/plans"), note: "Shows on a booked plan's card once everyone has paid." },
  { n: 6, title: "Your Plans", tip: "The only new surface: a light list in Profile where the crew graph lives.", where: () => "/profile" },
];
type Routes = { movie_id: string | null; show_id: string | null; booked_plan_id: string | null };

function Tour() {
  const { tour, setTour } = useHighlight();
  const router = useRouter(); const path = usePathname();
  const [routes, setRoutes] = useState<Routes | null>(null);
  useEffect(() => { if (tour > 0 && !routes) fetch("/api/tour").then((r) => r.json()).then(setRoutes).catch(() => setRoutes({ movie_id: null, show_id: null, booked_plan_id: null })); }, [tour, routes]);
  if (tour < 1 || tour > 6) return null;
  const step = STEPS[tour - 1];
  const target = routes ? step.where(routes) : null;
  const here = target ? path === target.split("?")[0] : false;
  const go = (n: number) => { setTour(n); const s = STEPS[n - 1]; const t = routes ? s?.where(routes) : null; if (t && n >= 1 && n <= 6) router.push(t); };
  return (
    <div className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4" style={{ bottom: "calc(var(--nav-h, 88px) + 8px)" }}>
      <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-brand/40 bg-[#141416]/95 p-4 shadow-[0_20px_60px_-20px_rgba(0,0,0,.9)] backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-hot text-xs font-bold text-[#2b1c7a]">{step.n}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{step.title} <span className="text-xs font-normal text-muted-foreground">· {tour} of 6</span></p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{step.tip}</p>
            {!here && target && <button className="mt-1.5 text-xs font-medium text-brand-soft" onClick={() => router.push(target)}>Take me there →</button>}
            {!target && step.note && <p className="mt-1.5 text-xs italic text-muted-foreground">{step.note}</p>}
          </div>
          <button aria-label="End tour" onClick={() => setTour(0)} className="grid size-7 place-items-center rounded-full bg-white/10 text-muted-foreground"><X className="size-4" /></button>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <Button size="sm" variant="ghost" disabled={tour === 1} onClick={() => go(tour - 1)}><ChevronLeft /> Back</Button>
          <div className="flex gap-1">{STEPS.map((s) => <span key={s.n} className={cn("h-1.5 rounded-full", s.n === tour ? "w-4 bg-brand-hot" : "w-1.5 bg-white/25")} />)}</div>
          {tour < 6 ? <Button size="sm" onClick={() => go(tour + 1)}>Next <ChevronRight /></Button> : <Button size="sm" onClick={() => setTour(0)}>Done</Button>}
        </div>
      </div>
    </div>
  );
}
