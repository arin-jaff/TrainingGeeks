"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import {
  deleteEvent,
  deleteGoal,
  insertEvent,
  insertGoal,
  setGoalDone,
} from "@/lib/db/repo";

export async function addEvent(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  if (name && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    insertEvent(getDb(), name, date);
    revalidatePath("/");
  }
}

export async function removeEvent(id: number): Promise<void> {
  deleteEvent(getDb(), id);
  revalidatePath("/");
}

export async function addGoal(formData: FormData): Promise<void> {
  const text = String(formData.get("text") ?? "").trim();
  if (text) {
    insertGoal(getDb(), text);
    revalidatePath("/");
  }
}

export async function toggleGoal(id: number, done: boolean): Promise<void> {
  setGoalDone(getDb(), id, done);
  revalidatePath("/");
}

export async function removeGoal(id: number): Promise<void> {
  deleteGoal(getDb(), id);
  revalidatePath("/");
}
