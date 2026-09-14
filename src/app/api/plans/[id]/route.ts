import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { planView } from "@/lib/services/plan";
export const dynamic = "force-dynamic";
export const GET = handle<{ id: string }>(async (_req, { params, userId }) => NextResponse.json(planView((await params).id, userId)));
