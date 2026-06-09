"use server";

import { getDb } from "@/lib/db/client";
import { listActivityFiles } from "@/lib/db/repo";

export interface ActivityFileView {
  id: number;
  filename: string;
  mime: string;
  size: number;
  isImage: boolean;
}

/** Attachments for an activity, in the shape the Files modal renders. */
export async function listActivityFilesAction(
  activityId: number,
): Promise<ActivityFileView[]> {
  const db = getDb();
  return listActivityFiles(db, activityId).map((f) => ({
    id: f.id,
    filename: f.filename,
    mime: f.mime,
    size: f.size,
    isImage: f.is_image === 1,
  }));
}
