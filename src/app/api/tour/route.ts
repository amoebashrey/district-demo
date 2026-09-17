import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { getUser, plansFor } from "@/lib/store/store";
import { moviesIn, movieByShowtime } from "@/lib/services/movies";
export const dynamic = "force-dynamic";
/** Routes the guided tour needs for the current user's city (first movie, a showtime, a booked plan if any). */
export const GET = handle(async (_req, { userId }) => {
  const me = userId ? getUser(userId) : undefined;
  const city = me?.city ?? "Bengaluru";
  const movie = moviesIn(city)[0];
  const group = movie ? movieByShowtime(movie.id) : undefined;
  const show = group?.shows.find((s) => s.status === "available");
  const booked = me ? plansFor(me.id).find((p) => p.status === "booked") : undefined;
  return NextResponse.json({ movie_id: movie?.id ?? null, show_id: show?.id ?? null, booked_plan_id: booked?.id ?? null });
});
