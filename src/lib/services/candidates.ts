/**
 * Curation stage 1 — rules-based candidate generation (PRD §6.5). Deterministic, no LLM.
 * Filters live inventory by city, date window, budget band and availability, then assembles
 * simple event+dining "nights". Phase 3 adds group-taste aggregation and the LLM assembler/rationale;
 * until then the rationale is a rules-generated sentence and is labelled as such in the UI.
 */
import { store, newId, nowIso } from "../store/store.ts";
import type { BudgetBand, DiningVenue, LiveEvent, Plan, Suggestion, SuggestionComponent } from "../store/types.ts";

const BAND_MAX: Record<BudgetBand, number> = { "₹": 800, "₹₹": 1600, "₹₹₹": 2800, "₹₹₹₹": 6000 };
const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371, dLat = ((b.lat - a.lat) * Math.PI) / 180, dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};
const inWindow = (iso: string, plan: Plan) => { const d = iso.slice(0, 10); return d >= plan.date_start && d <= plan.date_end && new Date(iso).getTime() > Date.now(); };

export function liveEventsFor(plan: Plan): LiveEvent[] {
  return [...store.inventory.events.values()].filter((e) => e.city === plan.city && e.status === "available" && e.tickets_left > 0 && inWindow(e.starts_at, plan));
}
export function diningNear(plan: Plan, anchor: { lat: number; lng: number }, afterIso: string, partySize: number, maxKm = 4) {
  const after = new Date(afterIso).getTime();
  const out: { venue: DiningVenue; slot: DiningVenue["slots"][number]; dist: number }[] = [];
  for (const v of store.inventory.dining.values()) {
    if (v.city !== plan.city) continue;
    const dist = km(anchor, v);
    if (dist > maxKm) continue;
    const slot = (store.inventory.slotsByVenue.get(v.id) ?? []).find((s) => s.status === "available" && s.capacity_left >= partySize && new Date(s.starts_at).getTime() >= after && new Date(s.starts_at).getTime() <= after + 2.5 * 3_600_000);
    if (slot) out.push({ venue: v, slot, dist });
  }
  return out.sort((a, b) => a.dist - b.dist);
}

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).replace(":00", "");

/** Build up to `n` candidate nights within budget. Pure w.r.t. the store; caller persists. */
export function generateCandidates(plan: Plan, partySize: number, n = 3): Suggestion[] {
  const cap = BAND_MAX[plan.budget_band];
  const events = liveEventsFor(plan).filter((e) => e.price_per_ticket <= cap * 0.7).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const out: Suggestion[] = [];
  const usedCats = new Set<string>();
  for (const ev of events) {
    if (out.length >= n) break;
    if (usedCats.has(ev.category) && events.length > n) continue; // variety across nights
    const endIso = new Date(new Date(ev.starts_at).getTime() + ev.duration_min * 60_000).toISOString();
    const dinner = diningNear(plan, ev, endIso, partySize).find((d) => d.venue.avg_cost_per_head + ev.price_per_ticket <= cap);
    const comps: SuggestionComponent[] = [{ kind: "event", ref: ev.id, title: ev.title, subtitle: ev.area, area: ev.area, starts_at: ev.starts_at, ends_at: endIso, price_per_head: ev.price_per_ticket, tags: [ev.category, ...ev.genre_tags] }];
    if (dinner) comps.push({ kind: "dining", ref: dinner.slot.id, title: dinner.venue.name, subtitle: `${dinner.venue.cuisines.join(" · ")} · ${dinner.venue.area}`, area: dinner.venue.area, starts_at: dinner.slot.starts_at, price_per_head: dinner.venue.avg_cost_per_head, tags: dinner.venue.cuisines });
    const cost = comps.reduce((s, c) => s + c.price_per_head, 0);
    if (cost > cap) continue;
    usedCats.add(ev.category);
    const day = new Date(ev.starts_at).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
    out.push({
      id: newId(), plan_id: plan.id, kind: "night_bundle",
      title: `${day} · ${ev.category.replace("-", " ")}${dinner ? " + dinner" : ""}`,
      components: comps, est_cost_per_head: cost, score: +(1 - out.length * 0.1).toFixed(3),
      rationale: dinner
        ? `${ev.title} at ${fmtTime(ev.starts_at)}, then ${dinner.venue.name} ${Math.max(1, Math.round(dinner.dist))} km away. ₹${cost.toLocaleString("en-IN")} a head, inside your ${plan.budget_band} band.`
        : `${ev.title} at ${fmtTime(ev.starts_at)} in ${ev.area}. ₹${cost.toLocaleString("en-IN")} a head.`,
      rationale_source: "rules", availability_checked_at: nowIso(), is_available: true, created_at: nowIso(),
    });
  }
  return out;
}

/** Live availability re-check for a suggestion (PRD: never show/book a sold-out slot). */
export function checkAvailability(s: Suggestion, partySize: number): boolean {
  return s.components.every((c) => {
    if (c.kind === "event") { const e = store.inventory.events.get(c.ref); return !!e && e.status === "available" && e.tickets_left >= partySize; }
    if (c.kind === "dining") { const sl = store.inventory.slots.get(c.ref); return !!sl && sl.status === "available" && sl.capacity_left >= partySize; }
    if (c.kind === "movie") { const m = store.inventory.movies.get(c.ref); return !!m && m.status === "available" && m.seats_left >= partySize; }
    return true;
  });
}
