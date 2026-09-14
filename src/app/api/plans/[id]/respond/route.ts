import { NextResponse } from "next/server";
import { handle, json, requireUser } from "@/lib/api";
import { respondToInvite } from "@/lib/services/invite";
import { planView } from "@/lib/services/plan";
export const POST = handle<{ id: string }>(async (req, { params, userId }) => {
  const { id } = await params; const uid = requireUser(userId);
  const { answer } = await json<{ answer: "accept" | "decline" }>(req);
  respondToInvite(id, uid, answer === "decline" ? "decline" : "accept");
  return NextResponse.json(planView(id, uid));
});
