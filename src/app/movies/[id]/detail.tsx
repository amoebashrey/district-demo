"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Share2, Flame, ChevronRight, Users, AudioLines } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { EntryPoint } from "@/components/highlight";
import { Poster } from "@/components/shell/poster";
import { Initials } from "@/components/screen";
import type { MovieMeta } from "@/lib/services/movies";
import { inr } from "@/lib/format";

const runtime = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`;

/** District movie detail: poster backdrop → sheet with meta, hype row, synopsis, genres, offers strip, cast, critics; sticky white "Book tickets" + EP2. */
export function MovieDetail({ id, meta, minPrice, startWithPlan }: { id: string; meta: MovieMeta; minPrice: number; startWithPlan?: boolean }) {
  const [more, setMore] = useState(false);
  const goTogether = `/movies/${id}/showtimes?plan=1`;
  return (
    <main className="mx-auto w-full max-w-md flex-1 flex flex-col shell-nav-pad">
      {/* backdrop */}
      <div className="relative -mb-10">
        <Poster title={meta.title} gradient={meta.poster} big className="h-64 w-full">
          <div className="absolute inset-x-0 top-0 z-[2] flex items-center justify-between p-3">
            <Link href="/movies" aria-label="Back" className="grid size-10 place-items-center rounded-full bg-black/50 text-white backdrop-blur"><ChevronDown className="size-5" /></Link>
            <span className="flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-2 text-sm text-white backdrop-blur"><AudioLines className="size-4" /> {meta.langs[0]} <ChevronDown className="size-3.5" /></span>
            <span className="grid size-10 place-items-center rounded-full bg-black/50 text-white backdrop-blur"><Share2 className="size-4" /></span>
          </div>
        </Poster>
      </div>
      {/* sheet */}
      <div className="relative z-[3] flex-1 rounded-t-3xl bg-background px-4 pt-3">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
        <h1 className="text-2xl font-semibold tracking-tight">{meta.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{meta.cert} | {meta.langs[0]}{meta.langs.length > 1 ? ` +${meta.langs.length - 1} more` : ""} | {runtime(meta.runtime_min)}</p>
        <p className="text-sm text-muted-foreground">Released on {meta.released}</p>
        <Separator className="my-4" />
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[#f59e0b]">{meta.hype} fans are hyped!</p>
          <Button variant="secondary" size="sm" className="bg-white/8"><Flame className="size-3.5" /> Join the Hype</Button>
        </div>
        <Separator className="my-4" />
        <p className="text-sm leading-relaxed text-muted-foreground">
          {more ? meta.synopsis : `${meta.synopsis.slice(0, 120)}…`} <button className="font-medium text-foreground" onClick={() => setMore((m) => !m)}>{more ? "View less" : "View more"}</button>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">{meta.genres.map(([e, g]) => <Badge key={g} variant="secondary" className="rounded-full bg-white/8 px-3 py-1 text-sm">{e} {g}</Badge>)}</div>
        {/* offers strip — purple is reserved for this */}
        <button className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-[#141416] px-4 py-3.5 text-left">
          <span className="grid size-8 place-items-center rounded-lg bg-brand text-white text-sm">%</span>
          <span className="flex-1 font-medium">Get 50% OFF up to ₹200</span>
          <span className="text-sm font-medium">23 offers</span><ChevronRight className="size-4 text-muted-foreground" />
        </button>
        <h2 className="mt-7 text-lg font-semibold">Cast and crew</h2>
        <div className="-mx-4 mt-3 flex gap-6 overflow-x-auto px-4 no-scrollbar">
          {meta.cast.map((c) => <div key={c} className="flex shrink-0 items-center gap-3"><Avatar className="size-14 bg-white/6"><AvatarFallback className="bg-transparent text-muted-foreground"><Initials name={c} /></AvatarFallback></Avatar><span className="text-sm">{c}</span></div>)}
        </div>
        <h2 className="mt-7 text-lg font-semibold">What critics say</h2>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4">
          {meta.critics.map(([src, r]) => <div key={src} className="flex items-center gap-3"><Avatar className="size-12 bg-white/6"><AvatarFallback className="bg-transparent text-[10px] font-bold text-muted-foreground">{src.split(" ").map((w) => w[0]).slice(0, 2).join("")}</AvatarFallback></Avatar><div><p className="text-sm font-medium">{r.toFixed(1)}</p><p className="truncate text-xs text-muted-foreground">{src}</p></div></div>)}
        </div>
        <p className="mt-6 text-xs text-muted-foreground">Tickets from {inr(minPrice)}</p>
      </div>
      {/* sticky CTA: white pill + EP2 beside it */}
      <div className="fixed inset-x-0 z-20" style={{ bottom: "var(--nav-h, 88px)" }}>
        <div className="mx-auto flex w-full max-w-md items-center gap-2 px-4 pb-2">
          <EntryPoint n={2} className={startWithPlan ? "flex-1" : ""}>
            <Button size="lg" variant="outline" className="h-12 w-full rounded-full border-white/20 bg-[#0a0b0d]/90 backdrop-blur" asChild><Link href={goTogether}><Users className="size-4" /> Go together</Link></Button>
          </EntryPoint>
          <Button size="lg" className="h-12 flex-1 rounded-full text-base shadow-[0_10px_30px_-10px_rgba(255,255,255,.35)]" asChild><Link href={`/movies/${id}/showtimes`}>Book tickets</Link></Button>
        </div>
      </div>
    </main>
  );
}
