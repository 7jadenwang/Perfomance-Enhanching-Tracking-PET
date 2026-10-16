import { expect, it } from "vitest";
import { morningSchema } from "../src/domain/schema";
import { makeMorning } from "../src/domain/fixtures";
import { ratingOnTen, editRating } from "../src/metrics/recovery-ratings";
import { recoverySignals } from "../src/metrics/recovery";
it("accepts half-point ratings on the new scale while retaining strict legacy data", () => {
  expect(
    morningSchema.safeParse(
      makeMorning({ ratingScale: 10, fatigue: 7.5, stress: 10 }),
    ).success,
  ).toBe(true);
  expect(
    morningSchema.safeParse(makeMorning({ ratingScale: 10, fatigue: 7.25 }))
      .success,
  ).toBe(false);
  expect(morningSchema.safeParse(makeMorning({ fatigue: 7.5 })).success).toBe(
    false,
  );
});
it("normalizes legacy ratings without rewriting records, and converts only an edited check-in", () => {
  const old = makeMorning({ fatigue: 4, soreness: 3, sleepQuality: 2 });
  const before = JSON.stringify(old);
  expect(ratingOnTen(old, "fatigue")).toBe(8);
  expect(JSON.stringify(old)).toBe(before);
  expect(morningSchema.parse(old)).toEqual(old);
  expect(morningSchema.parse(old)).not.toHaveProperty("ratingScale");
  const next = editRating(old, "soreness", 6.5);
  expect(next).toMatchObject({
    ratingScale: 10,
    fatigue: 8,
    soreness: 6.5,
    sleepQuality: 4,
  });
  expect(JSON.stringify(old)).toBe(before);
  expect(recoverySignals(next, null).reasons).toContain("fatigue: 8/10");
  expect(
    recoverySignals(makeMorning({ ratingScale: 10, fatigue: 4 }), null).reasons,
  ).toEqual([]);
});
