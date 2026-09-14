import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUser } from "@/lib/store/store";
import { SESSION_COOKIE } from "@/lib/session";
import { handle, json } from "@/lib/api";
import { notFound } from "@/lib/services/errors";

export const POST = handle(async (req) => {
  const { user_id } = await json<{ user_id: string }>(req);
  const u = getUser(user_id); if (!u) throw notFound("user");
  (await cookies()).set(SESSION_COOKIE, u.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return NextResponse.json({ user: u });
});
export const DELETE = handle(async () => { (await cookies()).delete(SESSION_COOKIE); return NextResponse.json({ ok: true }); });
