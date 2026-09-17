import { NextResponse } from "next/server";
import { handle, requireUser } from "@/lib/api";
import { payShare, planView } from "@/lib/services/plan";
/** Splitpay: pay my share (mock provider). Auto-books when everyone who joined has paid. */
export const POST = handle<{ id: string }>(async (_req, { params, userId }) => {
  const { id } = await params; const uid = requireUser(userId);
  const { booked } = payShare(id, uid);
  return NextResponse.json({ ...planView(id, uid), just_booked: booked });
});
