import type { Prescription, AthleteState, LocalDate } from "../domain/schema";
export function targetKilograms(
  p: Prescription,
  refs: AthleteState["reference1RMs"],
  date: LocalDate,
): [number, number] | null {
  if (!p.loadPercent || !p.referenceExerciseId) return null;
  const ref = refs
    .filter((r) => r.exerciseId === p.referenceExerciseId && r.date <= date)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  return ref
    ? [(ref.kg * p.loadPercent[0]) / 100, (ref.kg * p.loadPercent[1]) / 100]
    : null;
}
