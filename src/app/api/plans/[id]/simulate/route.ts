import { NextResponse } from "next/server";
import { handle, requireUser } from "@/lib/api";
import { simulateStep, simulateDrop, planView, requireMember, getPlan } from "@/lib/services/plan";
import { json } from "@/lib/api";
/** Demo: one invited friend responds (or pays). Only a member of the plan may drive it. */
export const POST = handle<{ id: string }>(async (req, { params, userId }) => {
  const { id } = await params; const uid = requireUser(userId);
  requireMember(getPlan(id), uid);
  const { action } = await json<{ action?: string }>(req);
  const r = action === "drop" ? { action: "dropped" as const, ...simulateDrop(id) } : simulateStep(id);
  return NextResponse.json({ ...r, view: planView(id, uid) });
});
