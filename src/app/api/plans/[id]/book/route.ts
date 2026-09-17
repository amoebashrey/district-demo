import { NextResponse } from "next/server";
import { handle, requireUser } from "@/lib/api";
import { confirmBooking, planView } from "@/lib/services/plan";
/** Organiser confirms the booking for everyone who has paid so far. */
export const POST = handle<{ id: string }>(async (_req, { params, userId }) => {
  const { id } = await params; const uid = requireUser(userId);
  confirmBooking(id, uid);
  return NextResponse.json({ ...planView(id, uid), just_booked: true });
});
