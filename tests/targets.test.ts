import { it, expect } from "vitest";
import { targetKilograms } from "../src/program/targets";
import { program } from "../src/program/catalog";
it("uses only a dated matching reference exercise and never assumes a shared 1RM", () => {
  const p = {
    ...program.sessions[0].exercises[0],
    loadPercent: [30, 40] as [number, number],
    referenceExerciseId: "深蹲",
  };
  const refs = [
    { exerciseId: "深蹲", date: "2026-10-01", kg: 100 },
    { exerciseId: "深蹲", date: "2026-11-01", kg: 200 },
    { exerciseId: "前蹲", date: "2026-10-01", kg: 150 },
  ];
  expect(targetKilograms(p, refs, "2026-10-13")).toEqual([30, 40]);
  expect(
    targetKilograms({ ...p, referenceExerciseId: null }, refs, "2026-10-13"),
  ).toBeNull();
  expect(targetKilograms(p, refs, "2026-09-01")).toBeNull();
});
