"use client";
/**
 * "Highlight my additions" — marks the six proposed entry points with a rotating District-purple
 * border and a numbered tag. Off = the app looks exactly like production. Persisted per browser.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const Ctx = createContext<{ on: boolean; set: (v: boolean) => void; pulse: number }>({ on: true, set: () => {}, pulse: 0 });
const KEY = "district:highlight";

export function HighlightProvider({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(true);
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => { try { const v = localStorage.getItem(KEY); if (v !== null) setOn(v === "1"); } catch { /* ignore */ } }, 0);
    return () => clearTimeout(t);
  }, []);
  const set = (v: boolean) => { setOn(v); if (v) setPulse((p) => p + 1); try { localStorage.setItem(KEY, v ? "1" : "0"); } catch { /* ignore */ } };
  return <Ctx.Provider value={{ on, set, pulse }}>{children}</Ctx.Provider>;
}
export const useHighlight = () => useContext(Ctx);

export function HighlightToggle({ compact }: { compact?: boolean }) {
  const { on, set } = useHighlight();
  return (
    <div className="flex items-center gap-2">
      {!compact && <Label htmlFor="hl" className="flex items-center gap-1.5 text-xs text-muted-foreground"><Sparkles className="size-3.5 text-primary" /> Highlight my additions</Label>}
      <Switch id="hl" checked={on} onCheckedChange={set} aria-label="Highlight my additions" />
    </div>
  );
}

/** Wrap any control/card. `n` = entry-point number from the integration map. */
export function EntryPoint({ n, children, className, block }: { n: 1 | 2 | 3 | 4 | 5 | 6; children: ReactNode; className?: string; block?: boolean }) {
  const { on, pulse } = useHighlight();
  const [pulsing, setPulsing] = useState(false);
  useEffect(() => {
    if (pulse === 0) return;
    const t0 = setTimeout(() => setPulsing(true), 0);
    const t1 = setTimeout(() => setPulsing(false), 700);
    return () => { clearTimeout(t0); clearTimeout(t1); };
  }, [pulse]);
  if (!on) return <div className={cn(block ? "block" : "inline-flex", "rounded-[inherit]", className)}>{children}</div>;
  return (
    <div className={cn("ep rounded-xl", block ? "block" : "inline-flex", pulsing && "ep-pulse", className)} data-ep={n}>
      <span className="ep-tag" aria-label={`Proposed addition ${n}`}>{n}</span>
      {children}
    </div>
  );
}
