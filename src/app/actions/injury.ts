"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import {
  deleteInjury,
  getAthlete,
  insertInjury,
  setInjuryEnd,
} from "@/lib/db/repo";
import { todayLocal } from "@/lib/util/dates";

function refresh() {
  revalidatePath("/metrics");
  revalidatePath("/calendar");
}

export async function addInjury(formData: FormData): Promise<void> {
  const title = String(formData.get("title") ?? "").trim();
  const bodyPart = String(formData.get("bodyPart") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  if (title && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    insertInjury(getDb(), {
      title,
      body_part: bodyPart || null,
      start_date: startDate,
      notes: notes || null,
    });
    refresh();
  }
}

export async function resolveInjury(id: number, endDate?: string): Promise<void> {
  const db = getDb();
  const end =
    endDate && /^\d{4}-\d{2}-\d{2}$/.test(endDate)
      ? endDate
      : todayLocal(getAthlete(db)?.timezone ?? "America/New_York");
  setInjuryEnd(db, id, end);
  refresh();
}

export async function reopenInjury(id: number): Promise<void> {
  setInjuryEnd(getDb(), id, null);
  refresh();
}

export async function removeInjury(id: number): Promise<void> {
  deleteInjury(getDb(), id);
  refresh();
}
