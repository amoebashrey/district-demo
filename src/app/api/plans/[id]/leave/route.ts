import { NextResponse } from "next/server";
import { handle, requireUser } from "@/lib/api";
import { leavePlan, planView } from "@/lib/services/plan";
export const POST = handle<{ id: string }>(async (_req, { params, userId }) => {
  const { id } = await params; const uid = requireUser(userId);
  leavePlan(id, uid);
  return NextResponse.json(planView(id, uid));
});
