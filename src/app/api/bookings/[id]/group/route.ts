import { NextResponse } from "next/server";
import { handle, requireUser } from "@/lib/api";
import { convertBookingToPlan } from "@/lib/services/plan";
/** EP4: turn my solo booking into a plan friends can join and pay into. */
export const POST = handle<{ id: string }>(async (_req, { params, userId }) => {
  const { id } = await params; const plan = convertBookingToPlan(id, requireUser(userId));
  return NextResponse.json({ plan }, { status: 201 });
});
