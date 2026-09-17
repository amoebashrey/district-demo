"use client";
import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { simulateStep } from "@/lib/services/plan";
import { mutate } from "@/lib/client/plans-store";
import { cn } from "@/lib/utils";

/**
 * Demo only: invited friends respond one by one every ~3s (and pay after lock) so a solo viewer watches
 * the plan fill and lock itself. Real District would deliver invites and collect Splitpay mandates.
 */
export function Simulator({ planId, active, onEvent, speedUp }: { planId: string; active: boolean; onEvent?: (r: ReturnType<typeof simulateStep>) => void; speedUp?: number }) {
  const [paused, setPaused] = useState(false);
  const busy = useRef(false);
  useEffect(() => {
    if (!active || paused) return;
    const tick = () => {
      if (busy.current) return; busy.current = true;
      try {
        const r = mutate(planId, () => simulateStep(planId));
        if (r.action === "joined" || r.action === "voted") toast(`${r.name?.split(" ")[0]} is in`, { icon: "✅" });
        if (r.action === "paid") toast(`${r.name?.split(" ")[0]} paid their share`, { icon: "💸" });
        onEvent?.(r);
      } catch (e) { toast.error((e as Error).message); } finally { busy.current = false; }
    };
    const first = setTimeout(tick, speedUp ? 600 : 2600);
    const id = setInterval(tick, 3200);
    return () => { clearTimeout(first); clearInterval(id); };
  }, [active, paused, planId, onEvent, speedUp]);
  if (!active) return null;
  return (
    <div className="flex items-center justify-between rounded-full border border-white/10 bg-[#141416] px-3 py-1.5 text-xs text-muted-foreground">
      <span className="flex items-center gap-2"><span className={cn("size-1.5 rounded-full bg-[#22c55e]", !paused && "animate-pulse")} /> Demo · friends {paused ? "paused" : "are responding…"}</span>
      <button className="flex items-center gap-1 text-foreground" onClick={() => setPaused((p) => !p)}>{paused ? <><Play className="size-3" /> Resume</> : <><Pause className="size-3" /> Pause</>}</button>
    </div>
  );
}
