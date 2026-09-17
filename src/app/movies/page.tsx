import Link from "next/link";
import { redirect } from "next/navigation";
import { Flame } from "lucide-react";
import { currentUser } from "@/lib/session";
import { moviesIn } from "@/lib/services/movies";
import { BottomNav } from "@/components/shell/nav";
import { TopBar } from "@/components/shell/topbar";
import { Poster } from "@/components/shell/poster";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NowShowing } from "../feed";

export const dynamic = "force-dynamic";

export default async function MoviesPage() {
  const me = await currentUser();
  if (!me) redirect("/switch");
  const movies = moviesIn(me.city);
  const cards = movies.map((m) => ({ id: m.id, title: m.title, tagline: m.tagline, poster: m.poster, genres: m.genres.map((g) => g[1]), cert: m.cert, lang: m.langs[0], runtime: m.runtime_min, min_price: m.min_price }));
  return (
    <div className="flex flex-col min-h-full">
      <TopBar city={me.city} name={me.name} area={me.home_area} section="Movies" />
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-2 shell-nav-pad space-y-7">
        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">In the Spotlight</h2>
          <div className="-mx-4 flex snap-x-mandatory gap-3 overflow-x-auto px-6 pb-1 no-scrollbar">
            {movies.slice(0, 5).map((m) => (
              <div key={m.id} className="snap-center shrink-0 w-[88%]">
                <Poster title={m.title} gradient={m.poster} big className="aspect-[4/5] rounded-3xl border border-white/8">
                  <div className="absolute right-3 top-3 z-[1]"><Badge variant="secondary" className="rounded-full bg-black/50 text-white backdrop-blur">{m.tagline}</Badge></div>
                  <div className="absolute inset-x-0 bottom-0 z-[2] flex flex-col items-center gap-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pb-5 pt-16 text-center">
                    <p className="text-2xl font-semibold text-white">{m.title}</p>
                    <div className="flex gap-2">{m.genres.slice(0, 2).map((g) => <Badge key={g[1]} variant="secondary" className="rounded-full bg-white/10 text-white">{g[1]}</Badge>)}</div>
                    <div className="flex items-center gap-2"><Button asChild><Link href={`/movies/${m.id}/showtimes`}>Book tickets</Link></Button><Link href={`/movies/${m.id}`} className="grid size-10 place-items-center rounded-full bg-white/10 text-white"><Flame className="size-4" /></Link></div>
                  </div>
                </Poster>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-1.5">{movies.slice(0, 5).map((m, i) => <span key={m.id} className={i === 0 ? "h-1.5 w-5 rounded-full bg-white" : "size-1.5 rounded-full bg-white/30"} />)}</div>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">Offers for you</h2>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 no-scrollbar">
            {[["Get 50% off up to ₹200", "Valid only at INOX Royal Heritage Mall, NIBM Ext.", "INOX"], ["Buy 1 Get 1 on tickets", "Every Friday with District Pass", "PASS"], ["Flat ₹75 off", "Kotak credit cards · min ₹500", "KOTAK"]].map(([t, s, logo]) => (
              <div key={t} className="flex w-[86%] shrink-0 items-center gap-3 rounded-2xl bg-[linear-gradient(135deg,#3b2bb5,#1f1866)] p-4">
                <div className="min-w-0 flex-1"><p className="font-semibold text-white">{t}</p><p className="mt-0.5 text-xs text-white/70">{s}</p><p className="mt-2 text-xs font-medium text-white underline decoration-dotted">Know more</p></div>
                <span className="grid size-14 shrink-0 place-items-center rounded-full bg-white text-[11px] font-black text-[#1f1866]">{logo}</span>
              </div>
            ))}
          </div>
        </section>
        <NowShowing movies={cards} />
      </main>
      <BottomNav />
    </div>
  );
}
