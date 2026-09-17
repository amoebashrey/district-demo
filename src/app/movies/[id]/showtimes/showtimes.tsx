"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, ApiError } from "@/components/client";
import { ArrowLeft, Search, Flame, Share2, SlidersHorizontal, ChevronDown, Bookmark, Star, Ban, ShieldCheck, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { inr } from "@/lib/format";

type Show = { id: string; starts_at: string; price: number; status: string };
type Cinema = { cinema: string; brand: string; address: string; rating: string; km: string; cancellation: boolean; shows: Show[] };
const TZ = "Asia/Kolkata";
const dayLabel = (d: string) => { const t = new Date(`${d}T12:00:00+05:30`); const today = new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10); const tomorrow = new Date(Date.now() + 5.5 * 3_600_000 + 86_400_000).toISOString().slice(0, 10); return { top: d === today ? "Today" : d === tomorrow ? "Tomorrow" : t.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: TZ }), sub: d === today || d === tomorrow ? t.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: TZ }) : t.toLocaleDateString("en-IN", { weekday: "short", timeZone: TZ }) }; };
const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).toUpperCase();
const BRAND_COLOR: Record<string, string> = { "PVR INOX": "#f5c400", "City Pride Multiplex": "#e11d48", MovieMax: "#f97316", Cinepolis: "#2563eb" };

export function Showtimes({ id, title, meta, days, initialDay, withPlan }: { id: string; title: string; meta: string; days: { day: string; cinemas: Cinema[] }[]; initialDay?: string; withPlan?: boolean }) {
  const [day, setDay] = useState(initialDay && days.some((d) => d.day === initialDay) ? initialDay : days[0]?.day);
  const router = useRouter();
  const [pending, start] = useTransition();
  const goTogether = (showId: string) => start(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { plan } = await api<{ plan: { id: string } }>("/api/plans", { date_start: today, date_end: today, vibe: "movie", budget_band: "₹₹", quorum: 2, anchor_kind: "movie", anchor_ref: showId });
      router.push(`/plans/${plan.id}/invite`);
    } catch (e) { toast.error((e as ApiError).message); }
  });
  const [filter, setFilter] = useState<"all" | "morning" | "evening">("all");
  const cinemas = days.find((d) => d.day === day)?.cinemas ?? [];
  const hour = (iso: string) => new Date(new Date(iso).getTime() + 5.5 * 3_600_000).getUTCHours();
  const keep = (s: Show) => filter === "all" || (filter === "morning" ? hour(s.starts_at) < 13 : hour(s.starts_at) >= 17);
  return (
    <main className="mx-auto w-full max-w-md flex-1 flex flex-col shell-nav-pad">
      <header className="sticky top-0 z-20 bg-[#141416]">
        <div className="flex h-16 items-center gap-3 px-3">
          <Button variant="ghost" size="icon" className="rounded-full bg-white/6" asChild aria-label="Back"><Link href={`/movies/${id}`}><ArrowLeft /></Link></Button>
          <div className="min-w-0 flex-1"><p className="truncate text-lg font-semibold leading-tight">{title}</p><p className="text-xs text-muted-foreground">{meta}</p></div>
          {[Search, Flame, Share2].map((I, i) => <span key={i} className="grid size-9 place-items-center rounded-full bg-white/6"><I className="size-4" /></span>)}
        </div>
        <div className="flex px-2">
          {days.map((d) => { const l = dayLabel(d.day); const on = d.day === day; return <button key={d.day} onClick={() => setDay(d.day)} className={cn("flex-1 border-b-2 px-2 pb-2.5 pt-1 text-center", on ? "border-white" : "border-transparent")}><p className={cn("text-base font-semibold", !on && "text-muted-foreground")}>{l.top}</p><p className="text-xs text-muted-foreground">{l.sub}</p></button>; })}
        </div>
      </header>
      <div className="-mx-0 flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
        <Chip><SlidersHorizontal className="size-3.5" /> Filters <ChevronDown className="size-3.5" /></Chip>
        <Chip>Sort by <ChevronDown className="size-3.5" /></Chip>
        <Chip on={filter === "morning"} onClick={() => setFilter((f) => (f === "morning" ? "all" : "morning"))}>Morning</Chip>
        <Chip on={filter === "evening"} onClick={() => setFilter((f) => (f === "evening" ? "all" : "evening"))}>After 5 PM</Chip>
      </div>
      {withPlan && <p className="mx-4 mb-2 rounded-xl border border-brand/40 bg-brand/10 px-3 py-2 text-xs text-brand-hot">Going together — pick a show, then choose who&apos;s coming. Nobody pays until the plan is confirmed.</p>}
      <div className="space-y-2">
        {cinemas.map((c, i) => (
          <section key={c.cinema} className="px-4 py-4">
            <div className="flex items-start gap-3">
              <span className="grid size-14 shrink-0 place-items-center rounded-full bg-white text-center text-[10px] font-black leading-tight" style={{ color: BRAND_COLOR[c.brand] ?? "#111" }}>{c.brand.split(" ")[0]}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-snug">{c.brand}, {c.address}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">{c.km} km <span>|</span> <Star className="size-3 fill-[#22c55e] text-[#22c55e]" /> <span className="text-[#22c55e]">{c.rating}</span> Google <span>|</span> {c.cancellation ? <><ShieldCheck className="size-3 text-[#22c55e]" /> Cancellation</> : <><Ban className="size-3" /> Cancellation unavailable</>}</p>
                {i === 1 && <Badge className="mt-1.5 rounded-md bg-[#1d4ed8] text-white">Previously Booked</Badge>}
              </div>
              <Bookmark className="size-5 text-muted-foreground" />
            </div>
            {i === 0 && <div className="mt-3 flex items-center gap-2 rounded-full bg-offer px-3 py-2 text-sm text-white"><span className="size-2 rounded-full bg-white/40" /><span className="flex-1">Get Flat ₹50 OFF on your booking</span><ChevronRight className="size-4 text-white/70" /></div>}
            <div className="mt-3 grid grid-cols-3 gap-2">
              {c.shows.filter(keep).map((s) => {
                const inner = <><p className="bg-offer py-1 text-[11px] font-medium text-brand-hot">{inr(s.price)} onwards</p><p className="pt-2 text-base font-semibold">{clock(s.starts_at)}</p><p className="truncate px-2 pb-2 text-[11px] text-muted-foreground">QSC 7.1 REC…</p></>;
                const cls = cn("overflow-hidden rounded-xl border border-white/12 text-center", s.status === "sold_out" && "pointer-events-none opacity-40", withPlan && "border-brand/50");
                return withPlan
                  ? <button key={s.id} disabled={pending || s.status === "sold_out"} onClick={() => goTogether(s.id)} className={cls}>{inner}</button>
                  : <Link key={s.id} href={s.status === "sold_out" ? "/movies" : `/movies/${id}/review?show=${s.id}`} className={cls}>{inner}</Link>;
              })}
            </div>
          </section>
        ))}
      </div>
      <div className="fixed inset-x-0 z-20" style={{ bottom: "var(--nav-h, 88px)" }}>
        <div className="mx-auto w-full max-w-md px-4 pb-2"><div className="flex items-center justify-end gap-1 rounded-2xl bg-[#1c1c1f]/95 px-4 py-3 text-sm font-medium backdrop-blur">23 offers <ChevronRight className="size-4" /></div></div>
      </div>
    </main>
  );
}
function Chip({ children, on, onClick }: { children: React.ReactNode; on?: boolean; onClick?: () => void }) {
  return <button onClick={onClick} className={cn("flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm", on ? "border-white bg-white text-black" : "border-white/25")}>{children}</button>;
}
