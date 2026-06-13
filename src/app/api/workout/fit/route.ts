import { getDb } from "@/lib/db/client";
import { getPlanned, getWorkoutTemplate } from "@/lib/db/repo";
import type { Modality } from "@/lib/db/types";
import { encodeWorkoutFit, fitFilename } from "@/lib/workout/fit";
import type { WorkoutStep } from "@/lib/workout/template";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Download a structured workout as a Garmin-loadable .FIT file.
 * Query: ?template=<id> (a library template) or ?planned=<id> (a scheduled
 * calendar instance). Copy the result to a watch's GARMIN/NewFiles folder, or
 * import it through Garmin Connect / Express.
 */
export async function GET(req: Request): Promise<Response> {
  const params = new URL(req.url).searchParams;
  const db = getDb();

  let name: string;
  let modality: Modality;
  let steps: WorkoutStep[];

  const templateId = Number(params.get("template"));
  const plannedId = Number(params.get("planned"));

  if (Number.isInteger(templateId) && templateId > 0) {
    const t = getWorkoutTemplate(db, templateId);
    if (!t) return new Response("Workout not found", { status: 404 });
    name = t.name;
    modality = t.modality;
    steps = JSON.parse(t.steps) as WorkoutStep[];
  } else if (Number.isInteger(plannedId) && plannedId > 0) {
    const p = getPlanned(db, plannedId);
    if (!p || !p.structure) return new Response("Workout not found", { status: 404 });
    name = p.name ?? "Workout";
    modality = p.modality;
    steps = JSON.parse(p.structure) as WorkoutStep[];
  } else {
    return new Response("Provide ?template=<id> or ?planned=<id>", { status: 400 });
  }

  let bytes: Uint8Array;
  try {
    bytes = encodeWorkoutFit({ name, modality, steps });
  } catch (e) {
    return new Response(`Cannot export: ${(e as Error).message}`, { status: 422 });
  }

  return new Response(bytes as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${fitFilename(name)}"`,
      "Content-Length": String(bytes.byteLength),
    },
  });
}
