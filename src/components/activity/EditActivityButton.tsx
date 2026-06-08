"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import WorkoutModal from "@/components/calendar/WorkoutModal";
import { getWorkoutForEdit, type WorkoutEditData } from "@/app/actions/workout";
import type { EquipmentRow } from "@/lib/db/repo";
import type { Modality, Units } from "@/lib/db/types";

/** "Edit" button on the activity page that opens the workout editor modal. */
export default function EditActivityButton({
  activityId,
  units,
  today,
  equipment,
}: {
  activityId: number;
  units: Units;
  today: string;
  equipment: EquipmentRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [data, setData] = useState<WorkoutEditData | null>(null);

  return (
    <>
      <button
        onClick={() =>
          start(async () => {
            const d = await getWorkoutForEdit("activity", activityId);
            if (d) setData(d);
          })
        }
        disabled={pending}
        className="rounded border border-line px-3 py-1.5 text-sm font-medium text-ink hover:border-accent hover:text-accent disabled:opacity-50"
      >
        Edit
      </button>
      {data && (
        <WorkoutModal
          date={data.date}
          modality={data.modality as Modality}
          units={units}
          today={today}
          equipment={equipment}
          initial={data}
          onClose={() => {
            setData(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
