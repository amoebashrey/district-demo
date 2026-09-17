import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { movieByShowtime } from "@/lib/services/movies";
import { BottomNav } from "@/components/shell/nav";
import { MovieDetail } from "./detail";

export const dynamic = "force-dynamic";

export default async function MovieDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ plan?: string }> }) {
  const me = await currentUser();
  if (!me) redirect("/switch");
  const { id } = await params; const { plan } = await searchParams;
  const movie = movieByShowtime(id);
  if (!movie) notFound();
  return (
    <>
      <MovieDetail id={movie.id} meta={movie.meta} minPrice={movie.min_price} startWithPlan={plan === "1"} />
      <BottomNav />
    </>
  );
}
