import { it, expect } from "vitest";
import { velocityHistory } from "../src/metrics/velocity";
import { makeWorkout, makeRow, makeVelocity } from "../src/domain/fixtures";
it("orders historical measurements by training date rather than last edit position", () => {
  const later = makeWorkout({
    id: "later",
    localDate: "2026-10-14",
    status: "completed",
    rows: [
      makeRow({
        id: "later-row",
        confirmed: true,
        velocity: makeVelocity({ setAverage: 0.8 }),
      }),
    ],
  });
  const earlier = makeWorkout({
    id: "earlier",
    localDate: "2026-10-13",
    status: "completed",
    rows: [
      makeRow({
        id: "earlier-row",
        confirmed: true,
        velocity: makeVelocity({ setAverage: 1 }),
      }),
    ],
  });
  const h = velocityHistory([later, earlier]);
  expect(h[0].date).toBe("2026-10-13");
  expect(h[0].previous).toBeNull();
  expect(h[1].previous?.date).toBe("2026-10-13");
});
