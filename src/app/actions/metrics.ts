"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { upsertMetric } from "@/lib/db/repo";
import { WELLNESS_BY_ID } from "@/lib/metrics/wellness";

export async function addMetric(formData: FormData): Promise<void> {
  const type = String(formData.get("type") ?? "");
  const date = String(formData.get("date") ?? "");
  const value = Number(formData.get("value"));
  const notes = String(formData.get("notes") ?? "").trim();
  if (
    WELLNESS_BY_ID[type] &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(value)
  ) {
    upsertMetric(getDb(), type, date, value, notes || null);
    revalidatePath("/metrics");
    revalidatePath("/");
  }
}
