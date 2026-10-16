import { expect, it } from "vitest";
import { chartDomain } from "../src/metrics/chart-domain";
it("zooms around measured values with padding and a nonzero span", () => {
  const [min, max] = chartDomain([75.1, 75.3, null], false, 0.5);
  expect(min).toBeGreaterThan(74);
  expect(min).toBeLessThan(75.1);
  expect(max).toBeGreaterThan(75.3);
  const flat = chartDomain([31, 31], false, 1);
  expect(flat[1] - flat[0]).toBeGreaterThanOrEqual(1);
  expect(chartDomain([null], false, 1)).toEqual([0, 1]);
  expect(chartDomain([100, 200], true)).toEqual([0, 200]);
});
