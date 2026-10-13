import { it, expect } from "vitest";
import {
  sessionLoad,
  loadDifference,
  weeklyLoad,
  externalWork,
} from "../src/metrics/load";
import { makeWorkout, makeRow } from "../src/domain/fixtures";
it("separates unknown load from zero and percentage differences", () => {
  expect(sessionLoad(60, 6)).toBe(360);
  expect(sessionLoad(null, 6)).toBeNull();
  expect(loadDifference(0, 10).percent).toBeNull();
});
it("counts confirmed partial work but excludes drafts and unconfirmed rows", () => {
  const row = makeRow({ reps: 5, loadKg: 10, confirmed: true, perSide: true });
  expect(externalWork([makeWorkout({ status: "draft", rows: [row] })])).toEqual(
    [],
  );
  expect(
    externalWork([
      makeWorkout({ status: "partial", rows: [row, makeRow()] }),
    ])[0].reps,
  ).toBe(10);
  expect(
    externalWork([makeWorkout({ status: "partial", rows: [row] })])[0]
      .loadVolume,
  ).toBe(100);
});
it("reports weekly completeness and avoids fabricated bodyweight volume", () => {
  const w = makeWorkout({
    status: "partial",
    actualDuration: 60,
    actualRpe: 6,
  });
  expect(weeklyLoad([w], 5).actualComplete).toBe(1);
  expect(weeklyLoad([w], 5).prescribedCount).toBe(5);
  expect(
    externalWork([
      makeWorkout({
        status: "completed",
        rows: [
          makeRow({ confirmed: true, reps: 5, loadConvention: "bodyweight" }),
        ],
      }),
    ])[0].loadVolume,
  ).toBeNull();
});
it("counts grouped sprint efforts and conditioning work in their own units", () => {
  const w = makeWorkout({
    status: "partial",
    rows: [
      makeRow({
        confirmed: true,
        kind: "sprint",
        reps: 3,
        distanceMetres: 5,
        perSide: true,
      }),
      makeRow({
        confirmed: true,
        kind: "conditioning",
        rounds: 8,
        workSeconds: 15,
        restSeconds: 45,
      }),
    ],
  });
  const x = externalWork([w]);
  expect(x[0].distanceMetres).toBe(30);
  expect(x[1].conditioningWorkSeconds).toBe(120);
});
it("does not double-count two hands when unilateral reps already count both sides", () => {
  const r = makeRow({
    confirmed: true,
    reps: 5,
    loadKg: 10,
    perSide: true,
    loadConvention: "perHand",
  });
  expect(
    externalWork([makeWorkout({ status: "partial", rows: [r] })])[0].loadVolume,
  ).toBe(100);
});
