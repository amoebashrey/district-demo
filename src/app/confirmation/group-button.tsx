"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/components/client";

/** EP4 action: convert my solo booking into a plan, then land on the hub with the invite sheet open. */
export function InviteToBookingButton({ bookingId, planId }: { bookingId: string; planId?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button className="w-full" disabled={pending} onClick={() => start(async () => {
      try {
        if (planId) { router.push(`/plans/${planId}?from=ep4`); return; }
        const { plan } = await api<{ plan: { id: string } }>(`/api/bookings/${bookingId}/group`);
        router.push(`/plans/${plan.id}?from=ep4`);
      } catch (e) { toast.error((e as ApiError).message); }
    })}>{pending ? "Setting up…" : "Invite the crew to join"}</Button>
  );
}
