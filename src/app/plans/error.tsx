"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
/** Error boundary for /plans/*. Friendly recovery, never a redirect. */
export default function PlansError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-lg font-semibold">Something went sideways</p>
      <p className="text-sm text-muted-foreground">This plan isn&apos;t available right now — start a new one, or try again.</p>
      <div className="mt-2 flex gap-2"><Button className="rounded-full" onClick={reset}>Try again</Button><Button variant="outline" className="rounded-full border-white/20" asChild><Link href="/plans/starter">Start a new plan</Link></Button></div>
      <Button variant="ghost" className="rounded-full" asChild><Link href="/profile">Your plans</Link></Button>
    </main>
  );
}
