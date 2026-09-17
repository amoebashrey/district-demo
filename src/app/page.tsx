import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { moviesIn } from "@/lib/services/movies";
import { BottomNav } from "@/components/shell/nav";
import { TopBar } from "@/components/shell/topbar";
import { ExploreGrid } from "@/components/shell/explore";
import { Home as HomeFeed } from "./feed";
import { IntroCard } from "@/components/highlight";

export const dynamic = "force-dynamic";

export default async function Home() {
  const me = await currentUser();
  if (!me) redirect("/switch");
  const movies = moviesIn(me.city);
  return (
    <div className="flex flex-col min-h-full">
      <TopBar city={me.city} name={me.name} area={me.home_area} />
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-2 shell-nav-pad space-y-7">
        <IntroCard />
        <ExploreGrid />
        <HomeFeed movies={movies.map((m) => ({ id: m.id, title: m.title, tagline: m.tagline, poster: m.poster, genres: m.genres.map((g) => g[1]), cert: m.cert, lang: m.langs[0], runtime: m.runtime_min, min_price: m.min_price }))} />
      </main>
      <BottomNav />
    </div>
  );
}
