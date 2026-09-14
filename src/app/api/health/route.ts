import { NextResponse } from "next/server";
import { store } from "@/lib/store/store";
export const dynamic = "force-dynamic";
export function GET() {
  return NextResponse.json({
    ok: true, mode: "in-memory", seeded_at: store.seeded_at, anchor_shift_days: store.anchor_shift_days,
    counts: { users: store.users.size, plans: store.plans.size, members: store.members.size, suggestions: store.suggestions.size, votes: store.votes.size, events: store.events.length,
      dining_venues: store.inventory.dining.size, live_events: [...store.inventory.events.values()].filter((e) => e.status === "available").length, showtimes: store.inventory.movies.size },
  });
}
