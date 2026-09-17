"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Ban, ChevronDown, ChevronRight, Wallet, Users, Minus, Plus, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { EntryPoint } from "@/components/highlight";
import { Poster } from "@/components/shell/poster";
import { api, ApiError } from "@/components/client";
import { useMe } from "@/components/session";
import { createAnchoredPlan } from "@/lib/services/plan";
import { getItem, toComponent } from "@/lib/services/inventory";
import { mutate } from "@/lib/client/plans-store";
import type { Plan } from "@/lib/store/types";
import { inr } from "@/lib/format";

const TZ = "Asia/Kolkata";
const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).toUpperCase();
const dayLabel = (iso: string) => { const d = new Date(iso); const today = new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10); const dd = new Date(d.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10); const tomorrow = new Date(Date.now() + 5.5 * 3_600_000 + 86_400_000).toISOString().slice(0, 10); const pre = dd === today ? "Today, " : dd === tomorrow ? "Tomorrow, " : ""; return pre + d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: TZ }); };

type Props = { id: string; showId: string; title: string; cert: string; lang: string; cinema: string; starts_at: string; runtime: number; poster: string; price: number; left: number; qty: number; seats: string; breakdown: { subtotal: number; fee: number; gst: number; total: number }; user: { name: string; phone: string; city: string }; withPlan: boolean };

/** District "Review your booking": countdown, ticket summary, offers, payment summary, District Money, UPI + white Pay now. EP3 lives here. */
export function Review(p: Props) {
  const router = useRouter();
  const [qty, setQty] = useState(p.qty);
  const [split, setSplit] = useState(p.withPlan);
  const [secs, setSecs] = useState(8 * 60);
  const [pending, start] = useTransition();
  const me = useMe();
  useEffect(() => { const t = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { if (qty !== p.qty) { const u = new URL(window.location.href); u.searchParams.set("qty", String(qty)); window.history.replaceState(null, "", u); } }, [qty, p.qty]);
  const sub = p.price * qty; const fee = Math.round(sub * 0.05); const gst = Math.round(fee * 0.18); const total = sub + fee + gst;
  const ends = new Date(new Date(p.starts_at).getTime() + p.runtime * 60_000).toISOString();
  const pay = () => start(async () => {
    try {
      if (split) {
        if (!me) { router.push("/switch"); return; }
        const item = getItem("movie", p.showId); if (!item) throw new Error("That show isn't available");
        const plan = mutate((r: Plan) => r.id, () => createAnchoredPlan({ creator_id: me.id, components: [toComponent(item)], title: item.title, quorum: Math.max(2, qty), anchor: { kind: "movie", ref: p.showId }, source: "ep3" }));
        router.push(`/plans/${plan.id}/crew`);
      } else {
        const r = await api<{ booking: { id: string } }>("/api/checkout", { kind: "movie", id: p.showId, qty });
        router.push(`/confirmation/${r.booking.id}`);
      }
    } catch (e) { toast.error((e as ApiError).message); }
  });
  return (
    <main className="mx-auto w-full max-w-md flex-1 flex flex-col pb-40">
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 bg-background/90 px-4 backdrop-blur">
        <Link href={`/movies/${p.id}/showtimes${p.withPlan ? "?plan=1" : ""}`} aria-label="Back"><ArrowLeft className="size-5" /></Link>
        <div><p className="text-lg font-semibold leading-tight">Review your booking</p><p className="text-xs text-muted-foreground">Complete your booking in <span className="text-[#22c55e]">{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}</span> mins</p></div>
      </header>
      <div className="space-y-5 px-4 pt-2">
        {/* ticket summary */}
        <section className="overflow-hidden rounded-2xl bg-[#141416]">
          <div className="flex gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-xl font-semibold">{p.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{p.cert} <span className="mx-1">|</span> {p.lang} <span className="mx-1">|</span> 2D</p>
              <p className="mt-1 text-sm text-muted-foreground">{p.cinema}</p>
            </div>
            <Poster title={p.title} gradient={p.poster} className="h-24 w-[68px] shrink-0 rounded-lg" />
          </div>
          {p.cert === "A" && <div className="mx-4 flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm text-[#fde047]"><span className="text-[10px] font-black">18+</span> Adults only, no entry for children</div>}
          <div className="px-4 pt-4 text-sm"><p className="font-medium">{dayLabel(p.starts_at)}</p><p className="text-muted-foreground">{clock(p.starts_at)} - {clock(ends)} <span className="text-xs">(approx)</span></p></div>
          <Separator className="my-4 mx-4 w-auto" />
          <div className="flex items-center justify-between px-4 pb-4">
            <div><p className="font-semibold">{qty} {qty === 1 ? "ticket" : "tickets"}</p><p className="text-sm text-muted-foreground">ROYAL GO - {p.seats}</p><p className="text-sm text-muted-foreground">SCREEN 2</p></div>
            <div className="flex flex-col items-end gap-2"><p className="font-semibold">{inr(sub)}</p><div className="flex items-center gap-1"><Button size="icon-xs" variant="outline" className="rounded-full" disabled={qty <= 1} onClick={() => setQty((q) => q - 1)} aria-label="Fewer"><Minus /></Button><span className="w-5 text-center text-sm tabular-nums">{qty}</span><Button size="icon-xs" variant="outline" className="rounded-full" disabled={qty >= Math.min(10, p.left)} onClick={() => setQty((q) => q + 1)} aria-label="More"><Plus /></Button></div></div>
          </div>
          <div className="flex items-center gap-2 bg-white/4 px-4 py-3 text-sm text-muted-foreground"><Ban className="size-4" /> Cancellation is unavailable</div>
        </section>

        {/* EP3 — Split & invite */}
        <EntryPoint n={3} block>
          <section className={`w-full rounded-2xl border ${split ? "border-brand/40 bg-brand/10" : "border-white/8 bg-[#141416]"} p-4`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-brand/25 text-brand-hot"><Users className="size-4" /></span><div><p className="text-sm font-semibold">Split & invite</p><p className="text-xs text-muted-foreground">Turn this into a group booking</p></div></div>
              <Switch checked={split} onCheckedChange={(v) => { setSplit(v); if (v && qty < 2) setQty(2); }} aria-label="Split and invite" />
            </div>
            {split && <p className="mt-3 border-t border-white/10 pt-3 text-xs text-muted-foreground">Next: choose who&apos;s coming. Everyone taps a free &ldquo;I&apos;m in&rdquo;; you all pay <span className="text-foreground">{inr(p.price)}</span> each via Splitpay only once the plan is confirmed.</p>}
          </section>
        </EntryPoint>

        {/* offers */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Offers for you</h2>
          <div className="flex items-center gap-3 rounded-2xl bg-[#141416] px-4 py-3.5"><span className="grid size-9 place-items-center rounded-lg bg-brand text-white">%</span><div className="flex-1"><p className="font-medium">Get Flat ₹50 OFF on your booking</p><p className="text-xs text-muted-foreground">Save ₹50 with this code</p></div><button className="text-sm font-medium" onClick={() => toast("Offer codes are mocked in this demo")}>Apply</button></div>
          <div className="flex items-center justify-center gap-2 rounded-full bg-[#141416] py-3 text-sm font-medium"><span className="flex -space-x-2">{["#c026d3", "#dc2626", "#7c3aed"].map((c) => <span key={c} className="size-6 rounded-full ring-2 ring-[#141416]" style={{ background: c }} />)}</span> See all 30 offers <ChevronRight className="size-4" /></div>
        </section>

        {/* payment summary */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Payment summary</h2>
          <div className="rounded-2xl bg-[#141416] p-4 text-sm">
            <div className="flex justify-between py-1.5"><span className="flex items-center gap-1 text-muted-foreground">Order amount <ChevronDown className="size-3.5" /></span><span>{inr(sub)}.00</span></div>
            <div className="flex justify-between py-1.5"><span className="flex items-center gap-1 text-muted-foreground">Booking charge (incl. of GST) <ChevronDown className="size-3.5" /></span><span>{inr(fee + gst)}.00</span></div>
            <Separator className="my-2" />
            <div className="flex justify-between py-1.5 text-base font-semibold"><span>To be paid</span><span>{inr(total)}.00</span></div>
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Your details</h2><button className="text-sm underline decoration-dotted">Edit</button></div>
          <div className="flex gap-3 rounded-2xl bg-[#141416] p-4 text-sm"><UserIcon className="size-5 text-muted-foreground" /><div><p>{p.user.name}</p><p className="text-muted-foreground">{p.user.phone}</p><p className="text-muted-foreground">{p.user.city}</p></div></div>
        </section>
      </div>

      {/* sticky pay bar */}
      <div className="fixed inset-x-0 bottom-0 z-30">
        <div className="mx-auto w-full max-w-md rounded-t-3xl bg-[#141416] px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_-12px_rgba(0,0,0,.8)]">
          <div className="flex items-center justify-between border-b border-white/8 pb-3 text-sm"><span className="flex items-center gap-2"><Wallet className="size-4 text-brand-soft" /> District Money <span className="text-xs text-[#f97316]">Balance: ₹0</span></span><ChevronRight className="size-4 text-muted-foreground" /></div>
          <div className="flex items-center justify-between gap-3 pt-3">
            <div className="min-w-0"><p className="flex items-center gap-1 text-xs text-muted-foreground"><span className="inline-block size-3 rounded-full bg-[conic-gradient(#4285f4,#34a853,#fbbc05,#ea4335,#4285f4)]" /> Pay using <ChevronDown className="size-3" /></p><p className="truncate text-base font-medium">Google Pay UPI</p></div>
            <button disabled={pending} onClick={pay} className="flex items-center gap-4 rounded-2xl bg-white px-4 py-2.5 text-black disabled:opacity-60">
              <span className="text-left leading-tight"><span className="block text-base font-semibold">{inr(split ? p.price : total)}</span><span className="block text-[11px] text-black/60">{split ? "Your share, later" : "Total"}</span></span>
              <span className="flex items-center text-lg font-semibold">{pending ? "…" : split ? "Invite crew" : "Pay now"} <ChevronRight className="size-5" /></span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
