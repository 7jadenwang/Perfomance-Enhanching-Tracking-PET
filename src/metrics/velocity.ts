import type { VelocityRecord, Prescription } from "../domain/schema";
export function compatibleVelocity(
  a: VelocityRecord,
  b: VelocityRecord,
): boolean {
  return (
    a.exerciseId === b.exerciseId &&
    a.loadKg !== null &&
    a.loadKg === b.loadKg &&
    !!a.method &&
    a.method === b.method &&
    a.metric === b.metric &&
    !!a.rangeOfMotion &&
    a.rangeOfMotion === b.rangeOfMotion
  );
}
export function velocityLoss(r: VelocityRecord): number | null {
  if (!r.completeSeries || r.repVelocities.length < 2) return null;
  const fastest = Math.max(...r.repVelocities);
  return fastest > 0
    ? (100 * (fastest - r.repVelocities.at(-1)!)) / fastest
    : null;
}
export function compareVelocityTarget(
  t: Prescription,
  r: VelocityRecord,
): "below" | "within" | "above" | "unknown" {
  if (!t.velocityTarget || !t.velocityMetric || t.velocityMetric !== r.metric)
    return "unknown";
  const v =
    r.setAverage ??
    (r.repVelocities.length
      ? r.repVelocities.reduce((a, b) => a + b, 0) / r.repVelocities.length
      : null);
  return v === null
    ? "unknown"
    : v < t.velocityTarget[0]
      ? "below"
      : t.velocityComparison !== "min" && v > t.velocityTarget[1]
        ? "above"
        : "within";
}
