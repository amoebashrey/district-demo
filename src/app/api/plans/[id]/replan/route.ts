import { NextResponse } from "next/server";
import { handle, requireUser } from "@/lib/api";
import { replan } from "@/lib/services/plan";
/** EP5/EP6: one-tap re-plan with the same crew. */
export const POST = handle<{ id: string }>(async (_req, { params, userId }) => {
  const { id } = await params; const plan = replan(id, requireUser(userId));
  return NextResponse.json({ plan }, { status: 201 });
});
