import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { syncIntervals } from "@/lib/connectors/intervals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const params = new URL(req.url).searchParams;
  const since = params.get("since");
  const days = Number(params.get("days"));
  const opts: { since?: string; lookbackDays?: number } = {};
  if (since && /^\d{4}-\d{2}-\d{2}$/.test(since)) opts.since = since;
  else if (Number.isFinite(days) && days > 0) opts.lookbackDays = days;
  const result = await syncIntervals(getDb(), opts);
  return NextResponse.json(result);
}
