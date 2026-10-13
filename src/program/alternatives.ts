import type { Prescription, EquipmentProfile } from "../domain/schema";
export type Alternative = {
  modality: string;
  workSeconds: Prescription["workSeconds"];
  restSeconds: Prescription["restSeconds"];
  rounds: Prescription["rounds"];
  changes: string;
  reason: string;
  sourceProvided: boolean;
};
export function suggestAlternatives(
  p: Prescription,
  _equipment: EquipmentProfile,
): Alternative[] {
  if (
    p.kind !== "conditioning" ||
    !["generalAerobic", "conditioning"].includes(p.purpose)
  )
    return [];
  const sourceProvided = /单车\/冲刺|跑步|冲刺/.test(p.sourceText);
  return [
    {
      modality: "Running",
      workSeconds: p.workSeconds,
      restSeconds: p.restSeconds,
      rounds: p.rounds,
      changes:
        "Higher impact; different muscle involvement. No calorie/distance equivalence. Do not assume maximal sprint intensity.",
      reason: sourceProvided
        ? "Running is already an option in the source."
        : "Preserve work/rest duration and intended effort; review suitability before substituting.",
      sourceProvided,
    },
  ];
}
