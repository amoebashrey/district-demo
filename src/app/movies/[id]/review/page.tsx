import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { movieByShowtime, seatLabel } from "@/lib/services/movies";
import { getItem } from "@/lib/services/inventory";
import { priceBreakdown } from "@/lib/services/booking";
import { store } from "@/lib/store/store";
import { Review } from "./review";

export const dynamic = "force-dynamic";

export default async function ReviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ show?: string; plan?: string; qty?: string }> }) {
  const me = await currentUser();
  if (!me) redirect("/switch");
  const { id } = await params; const { show, plan, qty } = await searchParams;
  const movie = movieByShowtime(show ?? id); if (!movie) notFound();
  const item = getItem("movie", show ?? id); if (!item) notFound();
  const st = store.inventory.movies.get(item.id)!;
  const n = Math.min(10, Math.max(1, Number(qty) || (plan === "1" ? 3 : 2)));
  return (
    <Review
      id={movie.id} showId={item.id} title={movie.meta.title} cert={movie.meta.cert} lang={st.language} cinema={st.cinema} starts_at={st.starts_at} runtime={movie.meta.runtime_min} poster={movie.meta.poster}
      price={item.price} left={item.left} qty={n} seats={seatLabel(item.id, n)} breakdown={priceBreakdown(item.price, n)} user={{ name: me.name, phone: me.phone ?? "+91-98XXXXXXXX", city: me.city }} withPlan={plan === "1"}
    />
  );
}
