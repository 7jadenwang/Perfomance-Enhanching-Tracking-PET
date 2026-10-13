import { it, expect } from "vitest";
import { dailyCmj, calibrate, recoverySignals } from "../src/metrics/recovery";
import { makeMorning } from "../src/domain/fixtures";
const days = Array.from({ length: 14 }, (_, i) =>
  makeMorning({
    id: String(i),
    localDate: `2026-10-${String(i + 1).padStart(2, "0")}`,
    trials: [30 + (i % 2), 30 + (i % 2), 30 + (i % 2)].map((heightCm) => ({
      heightCm,
      excluded: false,
      reason: "",
    })),
  }),
);
it("averages three trials but excludes sparse measurements from calibration", () => {
  expect(dailyCmj(makeMorning()).meanCm).toBe(31);
  expect(
    dailyCmj(
      makeMorning({ trials: [{ heightCm: 30, excluded: false, reason: "" }] }),
    ).eligible,
  ).toBe(false);
  expect(calibrate(days.slice(0, 13), "default")).toBeNull();
  expect(calibrate(days, "default")?.meanCm).toBe(30.5);
});
it("does not calibrate twice on the same day or from pain/illness exclusions", () => {
  expect(calibrate([...days.slice(0, 13), days[0]], "default")).toBeNull();
  expect(
    calibrate(
      days.map((d) => ({ ...d, pain: true })),
      "default",
    ),
  ).toBeNull();
});
it("explains concerns without certifying readiness or changing a program", () => {
  const b = calibrate(days, "default")!;
  const r = recoverySignals(
    makeMorning({
      fatigue: 4,
      trials: [20, 20, 20].map((heightCm) => ({
        heightCm,
        excluded: false,
        reason: "",
      })),
    }),
    b,
  );
  expect(r.lowCmj).toBe(true);
  expect(r.multipleConcerns).toBe(true);
  expect(r.limitedData).toBe(true);
  expect(
    recoverySignals(makeMorning({ protocolId: "changed" }), b).percentageChange,
  ).toBeNull();
  expect(recoverySignals(makeMorning(), { ...b, sampleSdCm: 0 }).lowCmj).toBe(
    false,
  );
});
