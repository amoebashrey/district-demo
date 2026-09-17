"use client";
import Link from "next/link";
import { Sparkles, Flame, Bookmark, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EntryPoint } from "@/components/highlight";
import { Poster } from "@/components/shell/poster";
import { inr } from "@/lib/format";

export type MovieCard = { id: string; title: string; tagline: string; poster: string; genres: string[]; cert: string; lang: string; runtime: number; min_price: number };
const runtime = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`;

/** Home below Explore: EP1 plan card · "In the spotlight" poster carousel · Now showing list with EP2. */
export function Home({ movies }: { movies: MovieCard[] }) {
  return (<><PlanNightCard /><Spotlight movies={movies} /><NowShowing movies={movies} /></>);
}

/** EP1 — discovery / pre-intent */
export function PlanNightCard() {
  return (
      <EntryPoint n={1} block>
        <Card className="w-full border-brand/25 bg-[linear-gradient(135deg,rgba(100,68,228,.22),rgba(100,68,228,.06))]">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-brand/25"><Sparkles className="size-5 text-brand-hot" /></div>
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Free this weekend?</p><p className="mt-0.5 text-xs text-muted-foreground">Plan a night with your crew →</p></div>
            <Button size="sm" asChild><Link href="/plans/starter">Let&apos;s go</Link></Button>
          </CardContent>
        </Card>
      </EntryPoint>
  );
}

/** "In the spotlight" — large poster carousel */
export function Spotlight({ movies }: { movies: MovieCard[] }) {
  return (
      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">In the spotlight</h2>
        <div className="-mx-4 flex snap-x-mandatory gap-3 overflow-x-auto px-8 pb-2 no-scrollbar">
          {movies.slice(0, 5).map((m) => (
            <Link key={m.id} href={`/movies/${m.id}`} className="snap-center shrink-0 w-[78%]">
              <Poster title={m.title} gradient={m.poster} big className="aspect-[3/4] rounded-3xl border border-white/8">
                <div className="absolute inset-x-0 top-0 z-[1] flex items-center justify-between p-3">
                  <Badge variant="secondary" className="rounded-full bg-black/50 text-white backdrop-blur">{m.tagline}</Badge>
                  <span className="grid size-9 place-items-center rounded-full bg-black/50 text-white backdrop-blur"><Flame className="size-4" /></span>
                </div>
              </Poster>
            </Link>
          ))}
        </div>
      </section>
  );
}

/** Now showing — the EP2 surface */
export function NowShowing({ movies }: { movies: MovieCard[] }) {
  return (
      <section className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="text-xl font-semibold tracking-tight">Now showing</h2><Link href="/movies" className="text-xs text-brand-soft">See all</Link></div>
        {movies.map((m) => (
          <Card key={m.id} className="overflow-hidden py-0">
            <CardContent className="flex gap-3 p-3">
              <Link href={`/movies/${m.id}`} className="shrink-0"><Poster title={m.title} gradient={m.poster} className="h-28 w-20 rounded-xl" /></Link>
              <div className="min-w-0 flex-1 py-0.5">
                <div className="flex items-start justify-between gap-2"><Link href={`/movies/${m.id}`} className="min-w-0"><p className="truncate font-semibold">{m.title}</p><p className="text-xs text-muted-foreground">{m.cert} · {m.lang} · {runtime(m.runtime)}</p></Link><Bookmark className="size-4 shrink-0 text-muted-foreground" /></div>
                <div className="mt-1.5 flex flex-wrap gap-1">{m.genres.slice(0, 3).map((g) => <Badge key={g} variant="secondary" className="rounded-full text-[11px]">{g}</Badge>)}</div>
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{inr(m.min_price)} onwards</span>
                  <div className="flex items-center gap-1.5">
                    <EntryPoint n={2}><Button size="sm" variant="outline" className="rounded-full border-white/20 bg-transparent" asChild><Link href={`/movies/${m.id}?plan=1`}><Users className="size-3.5" /> Go together</Link></Button></EntryPoint>
                    <Button size="sm" asChild><Link href={`/movies/${m.id}/showtimes`}>Book</Link></Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
  );
}
