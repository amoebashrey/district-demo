import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ServiceError } from "./services/errors.ts";
import { SESSION_COOKIE } from "./session.ts";

type Handler<P> = (req: Request, ctx: { params: Promise<P>; userId?: string }) => Promise<Response> | Response;

/** Wrap a route handler: parses session, maps ServiceError → JSON {error, code} with status. */
export function handle<P = Record<string, never>>(fn: Handler<P>) {
  return async (req: Request, ctx: { params: Promise<P> }) => {
    try {
      const jar = await cookies();
      return await fn(req, { ...ctx, userId: jar.get(SESSION_COOKIE)?.value });
    } catch (e) {
      if (e instanceof ServiceError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
      console.error(e);
      return NextResponse.json({ error: "Something went wrong", code: "internal" }, { status: 500 });
    }
  };
}
export const requireUser = (userId?: string) => { if (!userId) throw new ServiceError("unauthenticated", "Pick who you are first", 401); return userId; };
export const json = async <T,>(req: Request): Promise<T> => { try { return (await req.json()) as T; } catch { return {} as T; } };
