"use client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useMe } from "@/components/session";
import { createAnchoredPlan } from "@/lib/services/plan";
import { getItem, toComponent } from "@/lib/services/inventory";
import { ensureSplits, mySplit } from "@/lib/services/split";
import { store, nowIso } from "@/lib/store/store";
import { mutate } from "@/lib/client/plans-store";
import type { Plan } from "@/lib/store/types";

/** EP4: turn my solo booking into a plan friends can join and pay into (my share already paid at checkout). */
export function InviteToBookingButton({ bookingId, category, inventoryRef, providerRef }: { bookingId: string; planId?: string; category: string; inventoryRef: string; providerRef?: string }) {
  const router = useRouter(); const me = useMe();
  return (
    <Button className="w-full rounded-full" onClick={() => {
      try {
        if (!me) { router.push("/switch"); return; }
        const item = getItem(category, inventoryRef); if (!item) throw new Error("That booking's item isn't available");
        const p = mutate((r: Plan) => r.id, () => {
          const plan = createAnchoredPlan({ creator_id: me.id, components: [toComponent(item)], title: item.title, anchor: { kind: item.kind, ref: inventoryRef }, source: "ep4", status: "booked" });
          ensureSplits(plan); const mine = mySplit(plan.id, me.id); if (mine) { mine.status = "captured"; mine.payment_intent_ref = providerRef ?? bookingId; mine.updated_at = nowIso(); }
          void store; return plan;
        });
        router.push(`/plans/${p.id}/crew`);
      } catch (e) { toast.error((e as Error).message); }
    }}>Invite the crew to join</Button>
  );
}
