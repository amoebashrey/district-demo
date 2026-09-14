import { cookies } from "next/headers";
import { getUser } from "./store/store.ts";
import type { User } from "./store/types.ts";

export const SESSION_COOKIE = "district_uid";

/** Demo identity: a cookie naming a seeded (or guest) user. Real District would use its own auth. */
export async function currentUser(): Promise<User | undefined> {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  return id ? getUser(id) : undefined;
}
