import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, json, requireUser } from "@/lib/api";
import { createPlan } from "@/lib/services/plan";
import { ServiceError } from "@/lib/services/errors";

const Body = z.object({
  date_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), date_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  vibe: z.string().min(2).max(40), budget_band: z.enum(["₹", "₹₹", "₹₹₹", "₹₹₹₹"]), quorum: z.number().int().min(2).max(12).optional(),
  // EP2/EP3: anchor an existing item — turns plan mode to "anchored"
  anchor_kind: z.enum(["event", "movie", "dining", "ride"]).optional(),
  anchor_ref: z.string().optional(),
});
export const POST = handle(async (req, { userId }) => {
  const parsed = Body.safeParse(await json(req));
  if (!parsed.success) throw new ServiceError("invalid", parsed.error.issues[0]?.message ?? "Invalid input");
  const { anchor_kind, anchor_ref, ...rest } = parsed.data;
  const plan = createPlan({
    creator_id: requireUser(userId),
    ...rest,
    ...(anchor_kind && anchor_ref ? { anchor: { kind: anchor_kind, ref: anchor_ref } } : {}),
  });
  return NextResponse.json({ plan }, { status: 201 });
});
