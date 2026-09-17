"use client";
import { MessageCircle, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { shareUrlFor } from "@/lib/client/plans-store";
import { inr } from "@/lib/format";

export function useShare(planId: string, title: string, perHead?: number) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = () => shareUrlFor(planId, origin); // computed at tap time so the snapshot is current
  const msg = () => `Join me for ${title}${perHead ? ` — ${inr(perHead)} a head` : ""}. Tap "I'm in" to hold your seat. No app, nothing to pay until it's locked:\n${url()}`;
  return { url, wa: () => `https://wa.me/?text=${encodeURIComponent(msg())}`, copy: async () => { await navigator.clipboard.writeText(url()); toast.success("Link copied"); } };
}

/** WhatsApp hero + copy. `onShared` lets the crew screen unlock "Send invite". */
export function ShareRow({ planId, title, perHead, onShared, compact }: { planId: string; title: string; perHead?: number; onShared?: () => void; compact?: boolean }) {
  const s = useShare(planId, title, perHead);
  return (
    <div className="flex gap-2">
      <Button className={`flex-1 rounded-full bg-[#25D366] text-black hover:bg-[#1ebe5b] ${compact ? "" : "h-12 text-base"}`} size={compact ? "sm" : "lg"} onClick={() => { onShared?.(); window.open(s.wa(), "_blank", "noopener"); }}><MessageCircle /> Share on WhatsApp</Button>
      <Button variant="outline" size={compact ? "sm" : "lg"} className={`rounded-full border-white/20 ${compact ? "" : "h-12"}`} aria-label="Copy link" onClick={async () => { onShared?.(); await s.copy(); }}><Copy /></Button>
    </div>
  );
}
