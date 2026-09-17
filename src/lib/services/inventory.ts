/** Read helpers over the inventory stub — what the District shell screens render. */
import { store } from "../store/store.ts";
import type { City, ComponentKind, DiningVenue, LiveEvent, MovieShowtime, SuggestionComponent } from "../store/types.ts";

export type Item =
  | { kind: "event"; id: string; title: string; subtitle: string; area: string; city: City; starts_at: string; price: number; left: number; tags: string[]; meta: LiveEvent }
  | { kind: "movie"; id: string; title: string; subtitle: string; area: string; city: City; starts_at: string; price: number; left: number; tags: string[]; meta: MovieShowtime }
  | { kind: "dining"; id: string; title: string; subtitle: string; area: string; city: City; starts_at: string; price: number; left: number; tags: string[]; meta: DiningVenue; slot_id: string };

const upcoming = (iso: string) => new Date(iso).getTime() > Date.now();

export function eventItem(e: LiveEvent): Item { return { kind: "event", id: e.id, title: e.title, subtitle: `${e.category.replace("-", " ")} · ${e.area}`, area: e.area, city: e.city, starts_at: e.starts_at, price: e.price_per_ticket, left: e.tickets_left, tags: [e.category, ...e.genre_tags], meta: e }; }
export function movieItem(m: MovieShowtime): Item { return { kind: "movie", id: m.id, title: m.title, subtitle: `${m.language} · ${m.cinema}`, area: m.area, city: m.city, starts_at: m.starts_at, price: m.price_per_ticket, left: m.seats_left, tags: m.genre_tags, meta: m }; }
export function diningItem(d: DiningVenue, slotId?: string): Item {
  const slots = (store.inventory.slotsByVenue.get(d.id) ?? []).filter((s) => s.status === "available" && s.capacity_left > 0 && upcoming(s.starts_at)).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const slot = (slotId && slots.find((s) => s.id === slotId)) || slots[0];
  return { kind: "dining", id: d.id, title: d.name, subtitle: `${d.cuisines.join(" · ")} · ${d.area}`, area: d.area, city: d.city, starts_at: slot?.starts_at ?? "", price: d.avg_cost_per_head, left: slot?.capacity_left ?? 0, tags: [...d.cuisines, ...d.vibe_tags], meta: d, slot_id: slot?.id ?? "" };
}

export function getItem(kind: ComponentKind | string, id: string): Item | undefined {
  if (kind === "event") { const e = store.inventory.events.get(id); return e && eventItem(e); }
  if (kind === "movie") { const m = store.inventory.movies.get(id); return m && movieItem(m); }
  if (kind === "dining") {
    const d = store.inventory.dining.get(id); if (d) return diningItem(d);
    const slot = store.inventory.slots.get(id); const v = slot && store.inventory.dining.get(slot.venue_id); return v && diningItem(v, slot.id);
  }
  return undefined;
}

export function listItems(kind: "event" | "movie" | "dining", city: City): Item[] {
  if (kind === "event") return [...store.inventory.events.values()].filter((e) => e.city === city && e.status === "available" && upcoming(e.starts_at)).sort((a, b) => a.starts_at.localeCompare(b.starts_at)).map(eventItem);
  if (kind === "movie") {
    const seen = new Set<string>();
    return [...store.inventory.movies.values()].filter((m) => m.city === city && m.status === "available" && upcoming(m.starts_at)).sort((a, b) => a.starts_at.localeCompare(b.starts_at)).filter((m) => (seen.has(m.title) ? false : (seen.add(m.title), true))).map(movieItem);
  }
  return [...store.inventory.dining.values()].filter((d) => d.city === city).sort((a, b) => b.rating - a.rating).map((d) => diningItem(d)).filter((i) => i.left > 0);
}

/** For You feed: one trending event, one movie, three restaurants. */
export function feedFor(city: City) {
  const events = listItems("event", city); const movies = listItems("movie", city); const dining = listItems("dining", city);
  const trending = [...events].sort((a, b) => (b.meta as LiveEvent).tickets_left - (a.meta as LiveEvent).tickets_left)[0] ?? events[0];
  return { trending, movie: movies[0], dining: dining.slice(0, 3), moreEvents: events.filter((e) => e.id !== trending?.id).slice(0, 4) };
}

export function toComponent(item: Item): SuggestionComponent {
  const ref = item.kind === "dining" ? item.slot_id : item.id;
  return { kind: item.kind, ref, title: item.title, subtitle: item.subtitle, area: item.area, starts_at: item.starts_at, price_per_head: item.price, tags: item.tags };
}

/** Decrement inventory for one component; returns false (no change) if unavailable. */
export function reserve(c: SuggestionComponent, qty: number): boolean {
  if (c.kind === "event") { const e = store.inventory.events.get(c.ref); if (!e || e.status !== "available" || e.tickets_left < qty) return false; e.tickets_left -= qty; if (e.tickets_left === 0) e.status = "sold_out"; return true; }
  if (c.kind === "movie") { const m = store.inventory.movies.get(c.ref); if (!m || m.status !== "available" || m.seats_left < qty) return false; m.seats_left -= qty; if (m.seats_left === 0) m.status = "sold_out"; return true; }
  if (c.kind === "dining") { const s = store.inventory.slots.get(c.ref); if (!s || s.status !== "available" || s.capacity_left < qty) return false; s.capacity_left -= qty; if (s.capacity_left === 0) s.status = "sold_out"; return true; }
  return true;
}
export function release(c: SuggestionComponent, qty: number) {
  if (c.kind === "event") { const e = store.inventory.events.get(c.ref); if (e) { e.tickets_left += qty; e.status = "available"; } }
  if (c.kind === "movie") { const m = store.inventory.movies.get(c.ref); if (m) { m.seats_left += qty; m.status = "available"; } }
  if (c.kind === "dining") { const s = store.inventory.slots.get(c.ref); if (s) { s.capacity_left += qty; s.status = "available"; } }
}
