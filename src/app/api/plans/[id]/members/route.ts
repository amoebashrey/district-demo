import { NextResponse } from "next/server";
import { handle, json, requireUser } from "@/lib/api";
import { addGuestInvitee, planView } from "@/lib/services/plan";
/** Who's coming → "Add someone by name". */
export const POST = handle<{ id: string }>(async (req, { params, userId }) => {
  const { id } = await params; const uid = requireUser(userId);
  const { name } = await json<{ name?: string }>(req);
  const m = addGuestInvitee(id, uid, name ?? "");
  return NextResponse.json({ member: m, view: planView(id, uid) }, { status: 201 });
});
