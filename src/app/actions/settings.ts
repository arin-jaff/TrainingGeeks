"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { upsertConnector } from "@/lib/db/repo";

export async function saveConnector(formData: FormData): Promise<void> {
  const athleteId = String(formData.get("athleteId") ?? "").trim();
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const enabled = formData.get("enabled") === "on";
  upsertConnector(getDb(), "intervals", {
    athlete_id: athleteId || null,
    api_key: apiKey || null, // blank keeps the existing key (COALESCE)
    enabled: enabled ? 1 : 0,
  });
  revalidatePath("/settings");
}
