import { getDb } from "@/lib/db/client";
import { getAthlete } from "@/lib/db/repo";
import { getExerciseMaxes, strengthFormula } from "@/lib/queries/strength";
import type { Units } from "@/lib/db/types";

export const dynamic = "force-dynamic";

const MEDAL_SRC = ["/medal-gold.png", "/medal-silver.png", "/medal-bronze.png"];
const KG_PER_LB = 0.453592;

function w(kg: number | null, units: Units): string {
  if (kg == null) return "—";
  const v = units === "imperial" ? kg / KG_PER_LB : kg;
  return `${Math.round(v)} ${units === "imperial" ? "lb" : "kg"}`;
}

export default function StrengthPage() {
  const db = getDb();
  const units: Units = getAthlete(db)?.units ?? "imperial";
  const formula = strengthFormula(db);
  const maxes = getExerciseMaxes(db, formula);
  const ranked = maxes.filter((m) => m.estOneRmKg != null);
  const unweighted = maxes.filter((m) => m.estOneRmKg == null);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-ink">Strength Records</h1>
        <p className="mt-0.5 text-sm text-ink-muted">
          Per-exercise estimated 1-rep max ({formula === "epley" ? "Epley" : "Brzycki"}),
          best weight, reps, volume, and total tonnage.
        </p>
      </div>

      {ranked.length === 0 ? (
        <p className="rounded border border-line bg-surface-card p-6 text-center text-sm text-ink-muted">
          No weighted sets yet. Add weights to your strength sets to see estimated maxes.
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-line bg-surface-card">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-muted">
                <th className="px-3 py-2">Exercise</th>
                <th className="px-3 py-2 text-right">Est. 1RM</th>
                <th className="px-3 py-2 text-right">Best Set</th>
                <th className="px-3 py-2 text-right">Max Reps</th>
                <th className="px-3 py-2 text-right">Best Volume</th>
                <th className="px-3 py-2 text-right">Tonnage</th>
                <th className="px-3 py-2 text-right">Last</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((m, i) => (
                <tr key={m.exercise} className="border-b border-line last:border-0">
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2">
                      {i < 3 ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={MEDAL_SRC[i]} alt={`#${i + 1}`} className="h-4 w-4 object-contain" />
                      ) : (
                        <span className="w-4 text-center text-xs text-ink-muted">{i + 1}</span>
                      )}
                      <span className="font-medium text-ink">{m.exercise}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-ink">{w(m.estOneRmKg, units)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink-muted">
                    {m.bestWeightReps != null ? `${w(m.bestWeightKg, units)} × ${m.bestWeightReps}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink-muted">{m.maxReps ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink-muted">{w(m.bestVolumeKg, units)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink-muted">{w(m.tonnageKg, units)}</td>
                  <td className="px-3 py-2 text-right text-xs text-ink-muted">{m.lastDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {unweighted.length > 0 && (
        <p className="mt-3 text-xs text-ink-muted">
          Logged without weights (no 1RM):{" "}
          {unweighted.map((m) => m.exercise).join(", ")}.
        </p>
      )}
    </div>
  );
}
