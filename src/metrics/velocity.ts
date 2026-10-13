import type {
  VelocityRecord,
  Prescription,
  Workout,
  ActualRow,
} from "../domain/schema";
export function compatibleVelocity(
  a: VelocityRecord,
  b: VelocityRecord,
): boolean {
  return (
    a.exerciseId === b.exerciseId &&
    a.loadKg !== null &&
    a.loadKg === b.loadKg &&
    a.loadConvention !== "unknown" &&
    a.loadConvention === b.loadConvention &&
    (a.loadConvention !== "perHand" ||
      (a.loadedHands !== null && a.loadedHands === b.loadedHands)) &&
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

export type VelocityHistoryEntry = {
  date: string;
  row: ActualRow;
  velocity: VelocityRecord;
  previous: { date: string; velocity: VelocityRecord } | null;
};
export function velocityHistory(workouts: Workout[]): VelocityHistoryEntry[] {
  const entries = workouts
    .filter((w) => w.status === "completed" || w.status === "partial")
    .slice()
    .sort(
      (a, b) =>
        a.localDate.localeCompare(b.localDate) ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.id.localeCompare(b.id),
    )
    .flatMap((w) =>
      w.rows
        .filter((r) => r.confirmed && r.velocity)
        .map((row) => ({ date: w.localDate, row, velocity: row.velocity! })),
    );
  return entries.map((v, i) => {
    const prior = entries
      .slice(0, i)
      .filter((x) => compatibleVelocity(x.velocity, v.velocity))
      .at(-1);
    return {
      ...v,
      previous: prior ? { date: prior.date, velocity: prior.velocity } : null,
    };
  });
}
