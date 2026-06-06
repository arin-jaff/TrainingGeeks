import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { syncIntervals } from "@/lib/connectors/intervals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const days = Number(new URL(req.url).searchParams.get("days"));
  const opts = Number.isFinite(days) && days > 0 ? { lookbackDays: days } : {};
  const result = await syncIntervals(getDb(), opts);
  return NextResponse.json(result);
}
