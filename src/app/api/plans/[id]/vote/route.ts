import { NextResponse } from "next/server";
import { handle, json, requireUser } from "@/lib/api";
import { castVote, planView } from "@/lib/services/plan";
import { ServiceError } from "@/lib/services/errors";
export const POST = handle<{ id: string }>(async (req, { params, userId }) => {
  const { id } = await params; const uid = requireUser(userId);
  const { suggestion_id } = await json<{ suggestion_id?: string }>(req);
  if (!suggestion_id) throw new ServiceError("invalid", "suggestion_id required");
  const { locked } = castVote(id, uid, suggestion_id);
  return NextResponse.json({ ...planView(id, uid), just_locked: locked });
});
