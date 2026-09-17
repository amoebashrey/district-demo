/** Seed one demo plan + crew so /plans/demo and /join/demo always resolve, on any device, with no backend. */
import { store, nowIso, friendsOf } from "../store/store.ts";
import { moviesIn, movieByShowtime } from "../services/movies.ts";
import { toComponent, getItem } from "../services/inventory.ts";
import type { Plan, PlanMember, Suggestion, User } from "../store/types.ts";
import { persistPlan } from "./plans-store.ts";

export const DEMO_PLAN_ID = "demo-plan";
export const DEMO_TOKEN = "demo";

export function ensureDemoPlan(meId?: string) {
  if (store.plans.has(DEMO_PLAN_ID)) return store.plans.get(DEMO_PLAN_ID)!;
  const organiser: User = store.users.get(meId ?? "") ?? [...store.users.values()].find((u) => u.city === "Bengaluru") ?? [...store.users.values()][0];
  const movie = moviesIn(organiser.city)[0]; const group = movie ? movieByShowtime(movie.id) : undefined;
  const show = group?.shows.find((s) => s.status === "available") ?? group?.shows[0];
  const item = show ? getItem("movie", show.id) : undefined;
  if (!item) return undefined;
  const comp = toComponent(item);
  const sug: Suggestion = { id: "demo-night", plan_id: DEMO_PLAN_ID, kind: "night_bundle", title: item.title, components: [comp], est_cost_per_head: item.price, score: 1, rationale: `${item.title} — ${item.subtitle}. Split with the crew.`, rationale_source: "rules", availability_checked_at: nowIso(), is_available: true, created_at: nowIso() };
  const plan: Plan = { id: DEMO_PLAN_ID, creator_id: organiser.id, city: organiser.city, date_start: comp.starts_at.slice(0, 10), date_end: comp.starts_at.slice(0, 10), vibe: "movie", budget_band: "₹₹", status: "draft", quorum: 2, lock_rule: "majority", mode: "anchored", anchor: { kind: "movie", ref: comp.ref }, share_token: DEMO_TOKEN, invite_cap: 12, expires_at: new Date(Date.now() + 10 * 60_000).toISOString(), locked_suggestion_id: sug.id, created_at: nowIso(), updated_at: nowIso() };
  store.suggestions.set(sug.id, sug); store.plans.set(plan.id, plan);
  const host: PlanMember = { id: "demo-m0", plan_id: plan.id, user_id: organiser.id, display_name: organiser.name, rsvp_status: "joined", role: "organiser", joined_at: nowIso(), created_at: nowIso() };
  store.members.set(host.id, host);
  friendsOf(organiser.id).slice(0, 3).forEach((f, i) => { const m: PlanMember = { id: `demo-m${i + 1}`, plan_id: plan.id, user_id: f.id, display_name: f.name, rsvp_status: "invited", role: "member", created_at: nowIso() }; store.members.set(m.id, m); });
  persistPlan(plan.id);
  return plan;
}
