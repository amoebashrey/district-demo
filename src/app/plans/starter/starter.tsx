"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Initials } from "@/components/screen";
import { api, ApiError } from "@/components/client";
import { day, inr, time } from "@/lib/format";
import type { SuggestionComponent } from "@/lib/store/types";

type Opt = { title: string; rationale: string; est: number; components: SuggestionComponent[] };

export function StarterCard({ options, crew, city, weekend }: { options: Opt[]; crew: string[]; city: string; weekend: string }) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [pending, start] = useTransition();
  const o = options[i];
  const accept = () => start(async () => {
    try { const { plan } = await api<{ plan: { id: string } }>("/api/starter", { title: o.title, rationale: o.rationale, components: o.components }); router.push(`/plans/${plan.id}/invite`); }
    catch (e) { toast.error((e as ApiError).message); }
  });
  // "Let the crew vote instead" → open plan for the same window → Who's coming → vote opens on Send
  const vote = () => start(async () => {
    try {
      const t = new Date(); const dow = t.getDay(); const sat = new Date(t); sat.setDate(t.getDate() + ((6 - dow + 7) % 7)); const sun = new Date(sat); sun.setDate(sat.getDate() + 1);
      const iso = (d: Date) => d.toISOString().slice(0, 10);
      const { plan } = await api<{ plan: { id: string } }>("/api/plans", { date_start: iso(dow === 0 ? t : sat), date_end: iso(dow === 0 ? t : sun), vibe: "chill", budget_band: "₹₹₹", quorum: 3 });
      router.push(`/plans/${plan.id}/invite`);
    } catch (e) { toast.error((e as ApiError).message); }
  });
  return (
    <main className="mx-auto w-full max-w-md flex-1 flex flex-col pb-28">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-1 border-b bg-background/90 px-2 backdrop-blur">
        <Button variant="ghost" size="icon" asChild aria-label="Back"><Link href="/"><ArrowLeft /></Link></Button>
        <h1 className="flex-1 truncate text-sm font-medium">Plan a night</h1>
      </header>
      <div className="flex-1 space-y-5 px-4 pt-4">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-brand-soft"><Sparkles className="size-3.5" /> Picked for your crew</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Free {weekend}? Here&apos;s one night that fits.</h2>
          <p className="mt-1 text-sm text-muted-foreground">One suggestion, not a poll. Say yes and we&apos;ll set it up; your friends join and pay their share from the link.</p>
        </div>
        {!o ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Nothing fits {weekend} in {city}. <Link href="/plans/new" className="text-brand-soft underline">Build a plan by hand</Link>.</CardContent></Card>
        ) : (
          <Card className="border-brand/40 bg-[#141416]">
            <CardHeader>
              <CardTitle className="capitalize">{o.title}</CardTitle>
              <CardDescription>{day(o.components[0].starts_at)} · {inr(o.est)} a head</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2">
                {o.components.map((c) => (
                  <li key={c.ref} className="flex gap-3 text-sm">
                    <span className="w-14 shrink-0 text-muted-foreground tabular-nums">{time(c.starts_at)}</span>
                    <span className="min-w-0"><span className="block truncate font-medium">{c.title}</span>{c.subtitle && <span className="block truncate text-xs text-muted-foreground">{c.subtitle}</span>}</span>
                  </li>
                ))}
              </ul>
              <p className="border-l-2 border-brand/40 pl-3 text-sm text-muted-foreground">{o.rationale}</p>
              {crew.length > 0 && (
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex -space-x-2">{crew.map((n) => <Avatar key={n} size="sm" className="ring-2 ring-card"><AvatarFallback className="text-[10px]"><Initials name={n} /></AvatarFallback></Avatar>)}</div>
                  <span className="text-xs text-muted-foreground">Your usual crew · we&apos;ll suggest them first</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="gap-2">
              <Button className="flex-1" disabled={pending} onClick={accept}>{pending ? "Setting up…" : "Yes, plan it"}</Button>
              {options.length > 1 && <Button variant="outline" onClick={() => setI((x) => (x + 1) % options.length)}><RefreshCw /> Another</Button>}
            </CardFooter>
          </Card>
        )}
        <Button variant="outline" size="lg" className="h-12 w-full rounded-full border-white/20" disabled={pending} onClick={vote}>Let the crew vote instead</Button>
        <p className="text-center text-xs text-muted-foreground">Prefer to set the dates yourself? <Link href="/plans/new" className="underline">Build a plan by hand</Link></p>
      </div>
    </main>
  );
}
