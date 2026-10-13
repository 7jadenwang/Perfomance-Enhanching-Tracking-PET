import { it, expect } from "vitest";
import { velocityLoss, compatibleVelocity } from "../src/metrics/velocity";
import { makeVelocity } from "../src/domain/fixtures";
it("requires a complete positive repetition series for velocity loss", () => {
  expect(
    velocityLoss(
      makeVelocity({ repVelocities: [1, 0.8], completeSeries: true }),
    ),
  ).toBeCloseTo(20);
  expect(velocityLoss(makeVelocity({ setAverage: 0.8 }))).toBeNull();
  expect(
    velocityLoss(makeVelocity({ repVelocities: [0, 0], completeSeries: true })),
  ).toBeNull();
  expect(velocityLoss(makeVelocity({ repVelocities: [1, 0.8] }))).toBeNull();
});
it("refuses incompatible metrics, loads, methods and ranges", () => {
  for (const o of [
    { metric: "peak" as const },
    { loadKg: 55 },
    { method: "other" },
    { rangeOfMotion: "quarter" },
  ])
    expect(compatibleVelocity(makeVelocity(), makeVelocity(o))).toBe(false);
});
it("keeps load convention and loaded hands separate from raw kilograms", () => {
  expect(
    compatibleVelocity(
      makeVelocity({ loadConvention: "totalExternal" }),
      makeVelocity({ loadConvention: "perHand", loadedHands: 2 }),
    ),
  ).toBe(false);
  expect(
    compatibleVelocity(
      makeVelocity({ loadConvention: "perHand", loadedHands: 1 }),
      makeVelocity({ loadConvention: "perHand", loadedHands: 2 }),
    ),
  ).toBe(false);
});
