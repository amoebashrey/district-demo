import { NextResponse } from "next/server";
import { handle, json, requireUser } from "@/lib/api";
import { optOut } from "@/lib/services/invite";
export const POST = handle(async (req, { userId }) => {
  const { reason, plan_id } = await json<{ reason?: "opt_out" | "spam_report"; plan_id?: string }>(req);
  optOut(requireUser(userId), reason === "spam_report" ? "spam_report" : "opt_out", plan_id);
  return NextResponse.json({ ok: true });
});
