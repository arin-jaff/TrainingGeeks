"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EquipmentRow } from "@/lib/db/repo";
import type { Units } from "@/lib/db/types";
import { formatDistance } from "@/lib/util/format";
import { addEquipment, addMileage, removeEquipment, toggleEquipment } from "@/app/actions/equipment";

const input = "rounded border border-line px-3 py-2 text-sm outline-none focus:border-accent";

function MileageAdd({ id, units }: { id: number; units: Units }) {
  const router = useRouter();
  const [v, setV] = useState("");
  const [, start] = useTransition();
  const per = units === "imperial" ? 1609.34 : 1000;
  return (
    <span className="flex items-center gap-1">
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder={`+${units === "imperial" ? "mi" : "km"}`}
        className="w-16 rounded border border-line px-2 py-1 text-xs outline-none focus:border-accent"
      />
      <button
        onClick={() => {
          const n = Number(v);
          if (n > 0)
            start(async () => {
              await addMileage(id, n * per);
              setV("");
              router.refresh();
            });
        }}
        className="text-xs font-medium text-accent"
      >
        Add
      </button>
    </span>
  );
}

export default function EquipmentManager({
  equipment,
  units,
}: {
  equipment: EquipmentRow[];
  units: Units;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const run = (fn: () => Promise<void>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  return (
    <div className="max-w-2xl">
      <h2 className="mb-4 border-b border-line pb-1 text-lg text-ink">Equipment</h2>

      <form
        action={async (fd) => {
          await addEquipment(fd);
          router.refresh();
        }}
        className="mb-4 flex flex-wrap items-center gap-2"
      >
        <select name="type" className={`${input} w-32`}>
          <option value="bike">Bike</option>
          <option value="shoes">Shoes</option>
          <option value="other">Other</option>
        </select>
        <input name="name" placeholder="Name (e.g. Trek Émonda)" required className={`${input} flex-1`} />
        <input name="brand" placeholder="Brand (optional)" className={`${input} w-40`} />
        <button className="rounded bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover">
          Add
        </button>
      </form>

      {equipment.length === 0 ? (
        <p className="text-sm text-ink-muted">No equipment yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {equipment.map((e) => (
            <li key={e.id} className={`flex items-center gap-3 py-2 text-sm ${e.active ? "" : "opacity-50"}`}>
              <span className="w-16 text-xs uppercase tracking-wide text-ink-muted">{e.type}</span>
              <div className="min-w-0">
                <div className="font-medium text-ink">{e.name}</div>
                {e.brand && <div className="text-xs text-ink-muted">{e.brand}</div>}
              </div>
              <span className="ml-auto tabular-nums text-ink">{formatDistance(e.distance_m, units)}</span>
              <MileageAdd id={e.id} units={units} />
              <button onClick={() => run(() => toggleEquipment(e.id, !e.active))} className="text-xs text-ink-muted hover:text-ink">
                {e.active ? "Retire" : "Activate"}
              </button>
              <button onClick={() => run(() => removeEquipment(e.id))} className="text-xs text-ink-muted hover:text-fatigue">
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
