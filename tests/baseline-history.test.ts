import { it, expect } from "vitest";
import { baselineForDate } from "../src/metrics/recovery";
import { initialState } from "../src/domain/schema";
import { makeMorning } from "../src/domain/fixtures";
it("uses the baseline active on that date without rewriting history on recalibration", () => {
  const s = initialState();
  s.mornings = Array.from({ length: 14 }, (_, i) =>
    makeMorning({
      id: String(i),
      localDate: `2026-09-${String(i + 1).padStart(2, "0")}`,
    }),
  );
  const b = {
    id: "old",
    protocolId: "default",
    eligibleRecordIds: s.mornings.map((m) => m.id),
    meanCm: 30,
    sampleSdCm: 1,
    createdAt: "2026-10-01T12:00:00Z",
    archivedAt: "2026-10-10T12:00:00Z",
  };
  s.baselines = [
    b,
    {
      ...b,
      id: "new",
      meanCm: 32,
      createdAt: "2026-10-10T12:00:00Z",
      archivedAt: null,
    },
  ];
  expect(baselineForDate(s, "default", "2026-09-30")).toBeNull();
  expect(baselineForDate(s, "default", "2026-10-05")?.id).toBe("old");
  expect(baselineForDate(s, "default", "2026-10-11")?.id).toBe("new");
});
