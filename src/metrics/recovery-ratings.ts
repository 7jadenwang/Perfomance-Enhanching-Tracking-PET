import type { MorningRecord } from "../domain/schema";
export const ratingKeys = [
  "sleepQuality",
  "fatigue",
  "soreness",
  "stress",
] as const;
export type RatingKey = (typeof ratingKeys)[number];
export function ratingOnTen(
  record: MorningRecord,
  key: RatingKey,
): number | null {
  const value = record[key];
  return value === null ? null : value * (record.ratingScale === 10 ? 1 : 2);
}
export function editRating(
  record: MorningRecord,
  key: RatingKey,
  value: number | null,
): MorningRecord {
  const ratings = Object.fromEntries(
    ratingKeys.map((k) => [k, ratingOnTen(record, k)]),
  );
  return { ...record, ...ratings, ratingScale: 10, [key]: value };
}
