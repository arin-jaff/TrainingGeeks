import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { syncIntervals } from "@/lib/connectors/intervals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const result = await syncIntervals(getDb());
  return NextResponse.json(result);
}
