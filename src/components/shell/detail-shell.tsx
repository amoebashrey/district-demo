"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, MapPin, Users, Tag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { EntryPoint } from "@/components/highlight";
import { api, ApiError } from "@/components/client";
import { day, inr, time } from "@/lib/format";
import type { Item } from "@/lib/services/inventory";

/**
 * Detail page shell:
 *  - standard District detail view (venue/event info, Book CTA)
 *  - EP2: "Go together" button (primary entry point, beside Book)
 *  - If ?plan=1 or "Go together" tapped → opens plan creation → invite flow
 *  - EP3: "Split & invite" toggle inside checkout
 */
export function DetailShell({ item, meCity, startWithPlan }: { item: Item; meCity: string; startWithPlan?: boolean }) {
  const router = useRouter();
  const [view, setView] = useState<"detail" | "checkout" | "confirming">("detail");
  const [withCrew, setWithCrew] = useState(startWithPlan ?? false);
  const [qty, setQty] = useState(startWithPlan ? 3 : 1);
  const [pending, start] = useTransition();

  const backHref = item.kind === "dining" ? "/dining" : item.kind === "movie" ? "/movies" : "/events";

  // Solo checkout → confirmation
  const bookSolo = () =>
    start(async () => {
      try {
        const res = await api<{ booking: { id: string; plan_id?: string } }>("/api/checkout", { kind: item.kind, id: item.id, qty });
        router.push(`/confirmation/${res.booking.id}`);
      } catch (e) {
        toast.error((e as ApiError).message);
      }
    });

  // "Go together" → create anchored plan → go to plan detail (which has invite)
  const bookWithCrew = () =>
    start(async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const res = await api<{ plan: { id: string } }>("/api/plans", {
          date_start: today,
          date_end: today,
          vibe: item.tags[0] ?? "chill",
          budget_band: item.price <= 800 ? "₹" : item.price <= 1600 ? "₹₹" : item.price <= 2800 ? "₹₹₹" : "₹₹₹₹",
          quorum: qty,
          anchor_kind: item.kind,
          anchor_ref: item.kind === "dining" ? (item as { slot_id?: string }).slot_id || item.id : item.id,
        });
        router.push(`/plans/${res.plan.id}?from=ep2`);
      } catch (e) {
        toast.error((e as ApiError).message);
      }
    });

  if (view === "checkout" || view === "confirming") {
    return (
      <main className="mx-auto w-full max-w-md flex-1 flex flex-col pb-28">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-1 border-b bg-background/90 px-2 backdrop-blur">
          <Button variant="ghost" size="icon" onClick={() => setView("detail")} aria-label="Back"><ArrowLeft /></Button>
          <h1 className="flex-1 truncate text-sm font-medium">Checkout</h1>
        </header>
        <div className="flex-1 space-y-5 px-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{item.title}</CardTitle>
              <CardDescription>{item.subtitle}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tickets / seats</span>
                <div className="flex items-center gap-2">
                  <Button size="icon-sm" variant="outline" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1}>−</Button>
                  <span className="w-6 text-center font-semibold tabular-nums">{qty}</span>
                  <Button size="icon-sm" variant="outline" onClick={() => setQty((q) => Math.min(10, q + 1))} disabled={qty >= item.left}>+</Button>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Price per head</span>
                <span className="font-medium">{inr(item.price)}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <span className="font-semibold">Total</span>
                <span className="font-semibold tabular-nums">{inr(item.price * qty)}</span>
              </div>
            </CardContent>
          </Card>

          {/* EP3 — "Split & invite" toggle */}
          <EntryPoint n={3} block>
            <Card className={withCrew ? "border-primary/40 bg-primary/5 w-full" : "w-full"}>
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <div className="flex items-center gap-3">
                  <div className="grid size-9 place-items-center rounded-full bg-primary/10">
                    <Users className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Split & invite</p>
                    <p className="text-xs text-muted-foreground">Turn this into a group booking</p>
                  </div>
                </div>
                <Switch
                  checked={withCrew}
                  onCheckedChange={(v) => { setWithCrew(v); if (v && qty < 2) setQty(2); }}
                  aria-label="Split and invite the crew"
                />
              </CardContent>
              {withCrew && (
                <CardContent className="border-t pt-3 pb-4">
                  <Label className="text-xs text-muted-foreground">
                    Friends join via WhatsApp link and pay their share. No download needed.
                  </Label>
                </CardContent>
              )}
            </Card>
          </EntryPoint>
        </div>

        <div className="fixed inset-x-0 z-20" style={{ bottom: "var(--nav-h, 64px)" }}>
          <div className="mx-auto w-full max-w-md border-t bg-background/95 px-4 pt-3 pb-4 backdrop-blur">
            {withCrew ? (
              <Button size="lg" className="w-full" onClick={bookWithCrew} disabled={pending}>
                {pending ? "Creating plan…" : `Plan with crew · ${inr(item.price)}/head`}
              </Button>
            ) : (
              <Button size="lg" className="w-full" onClick={bookSolo} disabled={pending}>
                {pending ? "Booking…" : `Pay ${inr(item.price * qty)}`}
              </Button>
            )}
          </div>
        </div>
      </main>
    );
  }

  // Detail view
  return (
    <main className="mx-auto w-full max-w-md flex-1 flex flex-col pb-28">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-1 border-b bg-background/90 px-2 backdrop-blur">
        <Button variant="ghost" size="icon" asChild aria-label="Back"><Link href={backHref}><ArrowLeft /></Link></Button>
        <h1 className="flex-1 truncate text-sm font-medium">{item.title}</h1>
      </header>

      <div className="flex-1 space-y-5 px-4 pt-4">
        {/* colour accent bar */}
        <div className={`h-1.5 w-full rounded-full ${item.kind === "event" ? "bg-primary" : item.kind === "movie" ? "bg-violet-600" : "bg-amber-600"}`} />

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">{item.title}</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0" />{item.subtitle}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {item.tags.slice(0, 4).map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
          </div>
        </div>

        <Card>
          <CardContent className="space-y-3 pt-5">
            {item.starts_at && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="size-4 text-muted-foreground" />
                <span>{day(item.starts_at)}{item.kind !== "dining" ? ` at ${time(item.starts_at)}` : ""}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Tag className="size-4 text-muted-foreground" />
              <span>{inr(item.price)}{item.kind === "dining" ? " per head (avg)" : " per ticket"}</span>
            </div>
            {item.left > 0 && item.left < 20 && (
              <p className="text-xs text-warning font-medium">Only {item.left} spots left</p>
            )}
          </CardContent>
        </Card>

        {/* stub description */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {item.kind === "dining"
            ? `${item.title} is a popular spot in ${item.area}. Book a table and enjoy a great evening with your crew.`
            : item.kind === "movie"
            ? `Catch ${item.title} on the big screen. Grab your crew and make a night of it.`
            : `${item.title} is happening in ${item.area}. Don't miss it — bring the whole squad.`}
        </p>
      </div>

      {/* Fixed bottom bar with EP2 "Go together" */}
      <div className="fixed inset-x-0 z-20" style={{ bottom: "var(--nav-h, 64px)" }}>
        <div className="mx-auto w-full max-w-md border-t bg-background/95 px-4 pt-3 pb-4 backdrop-blur space-y-2">
          <div className="flex gap-2">
            {/* EP2 — primary entry point: "Go together" beside Book */}
            <EntryPoint n={2} className="flex-1">
              <Button
                size="lg"
                variant="outline"
                className="w-full"
                onClick={() => { setWithCrew(true); setQty(3); setView("checkout"); }}
              >
                <Users className="size-4" />
                Go together
              </Button>
            </EntryPoint>
            <Button size="lg" className="flex-1" onClick={() => { setWithCrew(false); setView("checkout"); }}>
              Book
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
