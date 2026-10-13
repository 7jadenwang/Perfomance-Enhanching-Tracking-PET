import type { Prescription } from "../domain/schema";
export function selectConditionalTarget(
  ps: Prescription[],
  group: string,
  id: string,
): Prescription[] {
  if (!ps.some((p) => p.id === id && p.conditionalGroup === group))
    throw Error("Unknown source choice");
  return ps
    .filter((p) => p.conditionalGroup !== group || p.id === id)
    .map((p) =>
      p.id === id ? { ...p, conditionalGroup: null, optional: false } : p,
    );
}
