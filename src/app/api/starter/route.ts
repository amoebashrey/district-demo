import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, json, requireUser } from "@/lib/api";
import { createAnchoredPlan } from "@/lib/services/plan";
import { ServiceError } from "@/lib/services/errors";
import { store } from "@/lib/store/store";

/** EP1: accept District's one suggested night → anchored plan around that bundle. */
const Body = z.object({ title: z.string().min(1), rationale: z.string().optional(), components: z.array(z.object({ kind: z.enum(["event", "dining", "movie", "ride"]), ref: z.string(), title: z.string(), subtitle: z.string().optional(), area: z.string(), starts_at: z.string(), ends_at: z.string().optional(), price_per_head: z.number(), tags: z.array(z.string()) })).min(1) });
export const POST = handle(async (req, { userId }) => {
  const uid = requireUser(userId);
  const parsed = Body.safeParse(await json(req));
  if (!parsed.success) throw new ServiceError("invalid", parsed.error.issues[0]?.message ?? "Invalid input");
  // guard: every component must still exist in inventory (the model/rules never invent inventory)
  for (const c of parsed.data.components) {
    const ok = c.kind === "event" ? store.inventory.events.has(c.ref) : c.kind === "dining" ? store.inventory.slots.has(c.ref) : c.kind === "movie" ? store.inventory.movies.has(c.ref) : true;
    if (!ok) throw new ServiceError("not_found", "That night is no longer available", 404);
  }
  const plan = createAnchoredPlan({ creator_id: uid, components: parsed.data.components, title: parsed.data.title, rationale: parsed.data.rationale, quorum: 2, source: "ep1" });
  return NextResponse.json({ plan }, { status: 201 });
});
