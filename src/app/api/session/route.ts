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
/** Who am I (cookie) — lets client-rendered plan screens resolve identity after a client-side navigation. */
export const GET = handle(async (_req, { userId }) => NextResponse.json({ user_id: userId && getUser(userId) ? userId : null }));
export const DELETE = handle(async () => { (await cookies()).delete(SESSION_COOKIE); return NextResponse.json({ ok: true }); });
