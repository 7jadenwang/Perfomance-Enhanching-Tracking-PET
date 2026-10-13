import { it, expect } from "vitest";
import { compareVelocityTarget } from "../src/metrics/velocity";
import { program } from "../src/program/catalog";
import { makeVelocity } from "../src/domain/fixtures";
it("requires metric confirmation and distinguishes a minimum from a range", () => {
  const p = program.sessions[0].exercises[0];
  expect(p.velocityTarget).toEqual([1.35, 1.35]);
  expect(compareVelocityTarget(p, makeVelocity({ setAverage: 1.5 }))).toBe(
    "unknown",
  );
  expect(
    compareVelocityTarget(
      { ...p, velocityMetric: "mean" },
      makeVelocity({ setAverage: 1.5 }),
    ),
  ).toBe("within");
});
