/**
 * Estimated one-rep max from a weight × reps set.
 *
 *   Brzycki (default): 1RM = weight / (1.0278 − 0.0278 × reps)
 *   Epley:             1RM = weight × (1 + reps / 30)
 *
 * Both return the lifted weight for a true 1-rep set. Brzycki's denominator
 * goes non-positive past ~37 reps, where it falls back to Epley.
 */
export type OneRmFormula = "brzycki" | "epley";

export function estimateOneRm(
  weightKg: number | null,
  reps: number | null,
  formula: OneRmFormula = "brzycki",
): number | null {
  if (weightKg == null || reps == null || weightKg <= 0 || reps < 1) return null;
  if (reps === 1) return weightKg;
  if (formula === "epley") return weightKg * (1 + reps / 30);
  const denom = 1.0278 - 0.0278 * reps;
  if (denom <= 0) return weightKg * (1 + reps / 30); // very high reps → Epley
  return weightKg / denom;
}

export function parseFormula(v: string | null | undefined): OneRmFormula {
  return (v ?? "").toLowerCase() === "epley" ? "epley" : "brzycki";
}
