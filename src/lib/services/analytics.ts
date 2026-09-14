import { store, nowIso } from "../store/store.ts";

let seq = 0;
/** Append-only event stream (PRD §7). Metrics view lands in Phase 5; emitting from day one keeps the funnel measurable. */
export function track(name: string, ctx: { user_id?: string; plan_id?: string; props?: Record<string, unknown> } = {}) {
  const plan = ctx.plan_id ? store.plans.get(ctx.plan_id) : undefined;
  store.events.push({ id: ++seq, name, user_id: ctx.user_id, plan_id: ctx.plan_id, props: ctx.props ?? {}, experiment_variant: plan?.experiment_variant, ts: nowIso() });
}
