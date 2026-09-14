import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { handle, json } from "@/lib/api";
import { joinViaToken } from "@/lib/services/invite";
import { SESSION_COOKIE } from "@/lib/session";
/** Join via share link. Signed-in users join as themselves; anyone else joins as a guest (light account). */
export const POST = handle<{ token: string }>(async (req, { params, userId }) => {
  const { token } = await params;
  const { guest_name, as_guest } = await json<{ guest_name?: string; as_guest?: boolean }>(req);
  const { plan, user } = joinViaToken(token, as_guest ? { guest_name } : { user_id: userId, guest_name });
  (await cookies()).set(SESSION_COOKIE, user.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return NextResponse.json({ plan_id: plan.id, user });
});
