"use client";
import Link from "next/link";
import { Sparkles, ChevronRight, Star, Clock, MapPin, Ticket, Utensils, Clapperboard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EntryPoint } from "@/components/highlight";
import { day, inr, time } from "@/lib/format";
import type { Item } from "@/lib/services/inventory";
import type { feedFor } from "@/lib/services/inventory";

type Feed = ReturnType<typeof feedFor>;

/** Sections + EP1 "Free this weekend?" card + EP2 "Go together" badges on items */
export function ForYouFeed({ feed, city }: { feed: Feed; city: string }) {
  return (
    <>
      {/* EP1 — discovery / pre-intent */}
      <EntryPoint n={1} block>
        <Card className="bg-primary/10 border-primary/20 w-full">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/20">
              <Sparkles className="size-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm">Free this weekend?</p>
              <p className="text-xs text-muted-foreground mt-0.5">Plan a night with your crew →</p>
            </div>
            <Button size="sm" asChild>
              <Link href="/plans/starter">Let&apos;s go</Link>
            </Button>
          </CardContent>
        </Card>
      </EntryPoint>

      {/* Trending event */}
      {feed.trending && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Trending in {city}</h2>
            <Link href="/events" className="text-xs text-primary flex items-center gap-0.5">See all <ChevronRight className="size-3" /></Link>
          </div>
          <FeedItemCard item={feed.trending} ep2 />
        </section>
      )}

      {/* Movies */}
      {feed.movie && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-1.5"><Clapperboard className="size-4 text-muted-foreground" /> Movies</h2>
            <Link href="/movies" className="text-xs text-primary flex items-center gap-0.5">See all <ChevronRight className="size-3" /></Link>
          </div>
          <FeedItemCard item={feed.movie} ep2 />
        </section>
      )}

      {/* Dining */}
      {feed.dining.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-1.5"><Utensils className="size-4 text-muted-foreground" /> Restaurants near you</h2>
            <Link href="/dining" className="text-xs text-primary flex items-center gap-0.5">See all <ChevronRight className="size-3" /></Link>
          </div>
          <div className="space-y-3">
            {feed.dining.map((item) => <FeedItemCard key={item.id} item={item} ep2 />)}
          </div>
        </section>
      )}

      {/* District Pass banner */}
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-3 py-4">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-muted">
            <Star className="size-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm">District Pass</p>
            <p className="text-xs text-muted-foreground mt-0.5">Perks, priority access, and more</p>
          </div>
          <Button size="sm" variant="outline">Explore</Button>
        </CardContent>
      </Card>
    </>
  );
}

/** A single inventory card. ep2 = show "Go together" as a proposed Entry Point. */
function FeedItemCard({ item, ep2 }: { item: Item; ep2?: boolean }) {
  const kindIcon = item.kind === "event" ? <Ticket className="size-3" /> : item.kind === "movie" ? <Clapperboard className="size-3" /> : <Utensils className="size-3" />;
  const href = `/${item.kind === "dining" ? "dining" : item.kind === "movie" ? "movies" : "events"}/${item.id}`;
  return (
    <Card className="overflow-hidden">
      {/* colour stripe by kind */}
      <div className={`h-1 w-full ${item.kind === "event" ? "bg-primary" : item.kind === "movie" ? "bg-violet-600" : "bg-amber-600"}`} />
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base truncate">{item.title}</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1 truncate">
              <MapPin className="size-3 shrink-0" />{item.subtitle}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="shrink-0 gap-1">{kindIcon}{item.kind === "dining" ? "Dining" : item.kind === "movie" ? "Movie" : "Event"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {item.starts_at && <span className="flex items-center gap-1"><Clock className="size-3" />{day(item.starts_at)}{item.kind !== "dining" ? `, ${time(item.starts_at)}` : ""}</span>}
            <span className="font-medium text-foreground">{inr(item.price)}{item.kind === "dining" ? "/head" : ""}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* EP2 — "Go together" beside the Book button */}
            {ep2 && (
              <EntryPoint n={2}>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`${href}?plan=1`}>Go together</Link>
                </Button>
              </EntryPoint>
            )}
            <Button size="sm" asChild>
              <Link href={href}>Book</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
