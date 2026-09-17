"use client";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BottomNav } from "@/components/shell/nav";
import { planView, type PlanView } from "@/lib/services/plan";
import { useSession, useStoreVersion } from "@/components/session";
import { cn } from "@/lib/utils";

/** Plan-layer page frame: same tokens as the main app (near-black, #141416 cards, white pill CTAs). */
export function PlanShell({ title, subtitle, back, right, children, bottom, nav = true }: { title: string; subtitle?: string; back?: string; right?: ReactNode; children: ReactNode; bottom?: ReactNode; nav?: boolean }) {
  return (
    <div className="flex min-h-full flex-col">
      <main className={cn("mx-auto w-full max-w-md flex-1 flex flex-col", nav ? "shell-nav-pad" : "pb-8")}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 bg-background/90 px-4 backdrop-blur">
          {back && <Link href={back} aria-label="Back" className="grid size-9 place-items-center rounded-full bg-white/6"><ArrowLeft className="size-4" /></Link>}
          <div className="min-w-0 flex-1"><p className="truncate text-lg font-semibold leading-tight">{title}</p>{subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}</div>
          {right}
        </header>
        <div className="flex-1 space-y-4 px-4 pt-2">{children}</div>
        {bottom && (
          <div className="fixed inset-x-0 z-20" style={{ bottom: nav ? "var(--nav-h, 88px)" : "0px" }}>
            <div className="mx-auto w-full max-w-md px-4 pb-3"><div className="rounded-3xl bg-[#141416]/95 p-3 shadow-[0_-12px_40px_-12px_rgba(0,0,0,.8)] backdrop-blur">{bottom}</div></div>
          </div>
        )}
      </main>
      {nav && <BottomNav />}
    </div>
  );
}

export const Section = ({ children, className }: { children?: ReactNode; className?: string }) => <section className={cn("rounded-2xl bg-[#141416] p-4", className)}>{children}</section>;

/** Friendly recovery for an unknown / unavailable plan. Never a redirect. */
export function PlanUnavailable({ invitee }: { invitee?: boolean }) {
  return (
    <PlanShell title={invitee ? "This link isn't live" : "This plan isn't available"} back="/" nav={!invitee}>
      <Section className="text-center">
        <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-brand/20 text-brand-hot"><Sparkles className="size-5" /></div>
        <p className="font-semibold">{invitee ? "We couldn't find that plan" : "This plan isn't available — start a new one"}</p>
        <p className="mt-1 text-sm text-muted-foreground">{invitee ? "The organiser may have cancelled it, or the link is incomplete. Ask them to share it again — or start your own." : "It may have been cancelled, or it was created on another device. Plans live in your browser in this demo."}</p>
        <div className="mt-4 flex flex-col gap-2">
          <Button className="rounded-full" asChild><Link href="/plans/starter">Start a new plan</Link></Button>
          <Button variant="outline" className="rounded-full border-white/20" asChild><Link href="/plans/demo-plan">Open the demo plan</Link></Button>
          <Button variant="ghost" className="rounded-full" asChild><Link href="/profile">Your plans</Link></Button>
        </div>
      </Section>
    </PlanShell>
  );
}

export function Loading() { return <PlanShell title="Loading…"><Section className="h-40 animate-pulse" /></PlanShell>; }

/** Live view of one plan for the current user; undefined while booting or if missing. */
export function usePlan(id: string): { view?: PlanView; ready: boolean; meId: string | null } {
  const { meId, ready } = useSession(); useStoreVersion();
  if (!ready) return { ready: false, meId };
  try { return { view: planView(id, meId ?? undefined), ready: true, meId }; } catch { return { ready: true, meId }; }
}

export const statusLabel: Record<string, string> = { draft: "Inviting", voting: "Voting", locked: "Locked", booked: "Confirmed", completed: "Done", cancelled: "Cancelled", expired: "Expired" };
export function StatusPill({ status }: { status: string }) {
  const tone = status === "booked" ? "bg-[#22c55e]/15 text-[#22c55e]" : status === "locked" ? "bg-white text-black" : status === "cancelled" || status === "expired" ? "bg-destructive/20 text-destructive" : "bg-brand/25 text-brand-hot";
  return <Badge className={cn("rounded-full border-0", tone)}>{statusLabel[status] ?? status}</Badge>;
}
