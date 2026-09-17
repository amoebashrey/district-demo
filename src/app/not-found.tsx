import Link from "next/link";
import { Button } from "@/components/ui/button";
/** Friendly recovery — no redirect to Home. */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-lg font-semibold">That page isn&apos;t here</p>
      <p className="text-sm text-muted-foreground">If it was a plan link, it may have been cancelled or made on another device.</p>
      <div className="mt-2 flex gap-2"><Button className="rounded-full" asChild><Link href="/plans/starter">Start a new plan</Link></Button><Button variant="outline" className="rounded-full border-white/20" asChild><Link href="/">Home</Link></Button></div>
    </main>
  );
}
