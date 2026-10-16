import { expect, it } from "vitest";
import { aggregatePoints } from "../src/metrics/periods";
it("sums known load, averages recovery and discloses missing days", () => {
  const points = [
    { label: "2026-10-12", series: "A", value: 100 },
    { label: "2026-10-13", series: "A", value: 200 },
    { label: "2026-10-14", series: "A", value: null },
  ];
  expect(aggregatePoints(points, "week", "sum")[0]).toMatchObject({
    value: 300,
    note: expect.stringContaining("2/3"),
  });
  expect(aggregatePoints(points, "month", "mean")[0].value).toBe(150);
  expect(aggregatePoints([points[2]], "month", "sum")[0].value).toBeNull();
});
it("never merges different measurement protocols", () => {
  const points = ["a", "b"].map((segment, i) => ({
    label: "2026-10-12",
    series: "CMJ",
    value: 30 + i,
    segment,
  }));
  expect(aggregatePoints(points, "week", "mean")).toHaveLength(2);
});
