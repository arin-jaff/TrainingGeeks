"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import {
  addEquipmentDistance,
  deleteEquipment,
  insertEquipment,
  setEquipmentActive,
} from "@/lib/db/repo";

export async function addEquipment(formData: FormData): Promise<void> {
  const type = String(formData.get("type") ?? "other");
  const name = String(formData.get("name") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim();
  if (name) {
    insertEquipment(getDb(), { type, name, brand: brand || null });
    revalidatePath("/settings");
  }
}

export async function addMileage(id: number, meters: number): Promise<void> {
  if (Number.isFinite(meters) && meters > 0) {
    addEquipmentDistance(getDb(), id, meters);
    revalidatePath("/settings");
  }
}

export async function toggleEquipment(id: number, active: boolean): Promise<void> {
  setEquipmentActive(getDb(), id, active);
  revalidatePath("/settings");
}

export async function removeEquipment(id: number): Promise<void> {
  deleteEquipment(getDb(), id);
  revalidatePath("/settings");
}
