"use client";
import Link from "next/link";
import { toast } from "sonner";

const TILES: { label: string; emoji: string; bg: string; href?: string }[] = [
  { label: "Dining", emoji: "🍽️", bg: "radial-gradient(80% 80% at 50% 20%, rgba(244,63,94,.45), transparent 70%)" },
  { label: "Movies", emoji: "🎬", bg: "radial-gradient(80% 80% at 50% 20%, rgba(109,73,253,.55), transparent 70%)", href: "/movies" },
  { label: "Events", emoji: "🎤", bg: "radial-gradient(80% 80% at 50% 20%, rgba(232,217,84,.45), transparent 70%)" },
  { label: "Stores", emoji: "🛍️", bg: "radial-gradient(80% 80% at 50% 20%, rgba(34,197,194,.45), transparent 70%)" },
  { label: "Activities", emoji: "🕹️", bg: "radial-gradient(80% 80% at 50% 20%, rgba(236,72,153,.45), transparent 70%)" },
  { label: "Play", emoji: "🏓", bg: "radial-gradient(80% 80% at 50% 20%, rgba(74,222,128,.45), transparent 70%)" },
  { label: "Salon & Spa", emoji: "💇", bg: "radial-gradient(80% 80% at 50% 20%, rgba(168,85,247,.45), transparent 70%)" },
];

/** District's "Explore" category grid. Only Movies is wired in this demo. */
export function ExploreGrid() {
  const Tile = ({ t }: { t: (typeof TILES)[number] }) => (
    <div className="relative flex h-[104px] flex-col items-center justify-end overflow-hidden rounded-2xl border border-white/6 bg-[#141416] pb-3">
      <div className="pointer-events-none absolute inset-0" style={{ background: t.bg }} />
      <span className="relative mb-1.5 text-[34px] leading-none drop-shadow-[0_6px_12px_rgba(0,0,0,.6)]">{t.emoji}</span>
      <span className="relative text-sm font-medium">{t.label}</span>
    </div>
  );
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight">Explore</h2>
      <div className="grid grid-cols-3 gap-3">
        {TILES.slice(0, 3).map((t) => t.href ? <Link key={t.label} href={t.href} className="block active:scale-[0.98] transition-transform"><Tile t={t} /></Link> : <button key={t.label} className="text-left active:scale-[0.98] transition-transform" onClick={() => toast(`${t.label} isn't part of this demo — movies only`)}><Tile t={t} /></button>)}
      </div>
      <div className="grid grid-cols-4 gap-3">
        {TILES.slice(3).map((t) => <button key={t.label} className="text-left active:scale-[0.98] transition-transform" onClick={() => toast(`${t.label} isn't part of this demo — movies only`)}><Tile t={t} /></button>)}
      </div>
    </section>
  );
}
