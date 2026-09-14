import { NextResponse } from "next/server";
import { handle, json, requireUser } from "@/lib/api";
import { inviteContacts } from "@/lib/services/invite";
import { planView } from "@/lib/services/plan";
export const POST = handle<{ id: string }>(async (req, { params, userId }) => {
  const { id } = await params; const uid = requireUser(userId);
  const { friend_ids = [] } = await json<{ friend_ids?: string[] }>(req);
  const result = inviteContacts(id, uid, friend_ids);
  return NextResponse.json({ ...result, view: planView(id, uid) });
});
