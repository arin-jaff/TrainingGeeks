import Link from "next/link";
import type { ExerciseMax } from "@/lib/queries/strength";
import type { Units } from "@/lib/db/types";

const MEDAL_SRC = ["/medal-gold.png", "/medal-silver.png", "/medal-bronze.png"];
const KG_PER_LB = 0.453592;

function weight(kg: number | null, units: Units): string {
  if (kg == null) return "—";
  const v = units === "imperial" ? kg / KG_PER_LB : kg;
  return `${Math.round(v)} ${units === "imperial" ? "lb" : "kg"}`;
}

/** Per-exercise estimated 1RM leaderboard — the strength analog of Peak Performances. */
export default function StrengthMaxes({
  maxes,
  units,
}: {
  maxes: ExerciseMax[];
  units: Units;
}) {
  const ranked = maxes.filter((m) => m.estOneRmKg != null).slice(0, 5);

  return (
    <section className="rounded border border-line bg-surface-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Strength Maxes</h2>
        <Link href="/strength" className="text-xs font-medium text-accent">
          View All
        </Link>
      </div>
      {ranked.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Add weights to your strength sets to see estimated 1-rep maxes.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {ranked.map((m, i) => (
            <li key={m.exercise} className="flex items-center gap-3 text-sm">
              {i < 3 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={MEDAL_SRC[i]} alt={`#${i + 1}`} className="h-5 w-5 object-contain" />
              ) : (
                <span className="w-5 text-center text-xs text-ink-muted">{i + 1}</span>
              )}
              <span className="min-w-0 flex-1 truncate text-ink">{m.exercise}</span>
              <span className="font-semibold tabular-nums text-ink">
                {weight(m.estOneRmKg, units)}
              </span>
              <span className="w-24 text-right text-xs text-ink-muted">
                {m.bestWeightReps != null
                  ? `${weight(m.bestWeightKg, units)} × ${m.bestWeightReps}`
                  : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
