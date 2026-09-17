import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, json, requireUser } from "@/lib/api";
import { bookSolo, getItem } from "@/lib/services/booking";
import { ServiceError } from "@/lib/services/errors";

const Body = z.object({
  kind: z.enum(["event", "movie", "dining"]),
  id: z.string().min(1),
  qty: z.number().int().min(1).max(10),
});

export const POST = handle(async (req, { userId }) => {
  const uid = requireUser(userId);
  const parsed = Body.safeParse(await json(req));
  if (!parsed.success) throw new ServiceError("invalid", parsed.error.issues[0]?.message ?? "Invalid input");
  const { kind, id, qty } = parsed.data;
  const item = getItem(kind, id);
  if (!item) throw new ServiceError("not_found", "Item not found", 404);
  const booking = bookSolo(uid, item, qty);
  return NextResponse.json({ booking }, { status: 201 });
});
