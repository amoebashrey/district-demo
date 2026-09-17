import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { movieByShowtime, showtimesByCinema } from "@/lib/services/movies";
import { BottomNav } from "@/components/shell/nav";
import { Showtimes } from "./showtimes";

export const dynamic = "force-dynamic";

export default async function ShowtimesPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ plan?: string; day?: string }> }) {
  const me = await currentUser();
  if (!me) redirect("/switch");
  const { id } = await params; const { plan, day } = await searchParams;
  const movie = movieByShowtime(id);
  if (!movie) notFound();
  const days = movie.days.map((d) => ({ day: d, cinemas: showtimesByCinema(movie.shows, d).map((c) => ({ ...c, shows: c.shows.map((s) => ({ id: s.id, starts_at: s.starts_at, price: s.price_per_ticket, status: s.status })) })) }));
  return (
    <>
      <Showtimes id={movie.id} title={movie.meta.title} meta={`${movie.meta.cert} • ${movie.meta.langs[0]} • ${Math.floor(movie.meta.runtime_min / 60)} hr ${movie.meta.runtime_min % 60} min`} days={days} initialDay={day} withPlan={plan === "1"} />
      <BottomNav />
    </>
  );
}
