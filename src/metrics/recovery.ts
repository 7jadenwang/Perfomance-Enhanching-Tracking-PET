import { ratingOnTen } from "./recovery-ratings";
import type { MorningRecord, Baseline } from "../domain/schema";
export function dailyCmj(r: MorningRecord) {
  const trials = r.trials.filter((t) => !t.excluded);
  return {
    meanCm: trials.length
      ? trials.reduce((a, t) => a + t.heightCm, 0) / trials.length
      : null,
    validTrials: trials.length,
    eligible:
      trials.length === 3 &&
      r.baselineEligible &&
      r.pain !== true &&
      r.illness !== true &&
      !r.exclusionReason,
  };
}
export function calibrationCount(records: MorningRecord[], protocolId: string) {
  return new Set(
    records
      .filter((r) => r.protocolId === protocolId && dailyCmj(r).eligible)
      .map((r) => r.localDate),
  ).size;
}
export function calibrate(
  records: MorningRecord[],
  protocolId: string,
): Baseline | null {
  const seen = new Set<string>();
  const eligible = records
    .filter((r) => r.protocolId === protocolId && dailyCmj(r).eligible)
    .sort((a, b) => a.localDate.localeCompare(b.localDate))
    .filter((r) => {
      if (seen.has(r.localDate)) return false;
      seen.add(r.localDate);
      return true;
    })
    .slice(0, 14);
  if (eligible.length < 14) return null;
  const means = eligible.map((r) => dailyCmj(r).meanCm!);
  const meanCm = means.reduce((a, b) => a + b, 0) / 14;
  return {
    id: crypto.randomUUID(),
    protocolId,
    eligibleRecordIds: eligible.map((r) => r.id),
    meanCm,
    sampleSdCm: Math.sqrt(
      means.reduce((a, v) => a + (v - meanCm) ** 2, 0) / 13,
    ),
    createdAt: new Date().toISOString(),
    archivedAt: null,
  };
}
export function recoverySignals(r: MorningRecord, b: Baseline | null) {
  const cmj = dailyCmj(r),
    compatible = b && b.protocolId === r.protocolId && cmj.validTrials === 3;
  const reasons: string[] = [];
  for (const key of ["fatigue", "soreness", "stress"] as const)
    if (ratingOnTen(r, key)! >= 8)
      reasons.push(`${key}: ${ratingOnTen(r, key)}/10`);
  if (r.sleepQuality !== null && ratingOnTen(r, "sleepQuality")! <= 4)
    reasons.push(`sleep quality: ${ratingOnTen(r, "sleepQuality")}/10`);
  const lowCmj =
    !!compatible &&
    b.sampleSdCm > 0 &&
    cmj.meanCm! < b.meanCm - 2 * b.sampleSdCm;
  return {
    percentageChange:
      compatible && b.meanCm > 0
        ? (100 * (cmj.meanCm! - b.meanCm)) / b.meanCm
        : null,
    lowCmj,
    reasons,
    multipleConcerns: lowCmj && reasons.length > 0,
    pain: r.pain,
    illness: r.illness,
    painLocation: r.painLocation,
    limitedData:
      !compatible ||
      [
        r.sleepHours,
        r.sleepQuality,
        r.fatigue,
        r.soreness,
        r.stress,
        r.pain,
      ].some((v) => v === null),
    zeroVariance: !!compatible && b.sampleSdCm === 0,
  };
}

export function baselineForDate(
  state: import("../domain/schema").AthleteState,
  protocolId: string,
  date: string,
) {
  return (
    state.baselines
      .filter(
        (b) =>
          b.protocolId === protocolId &&
          b.createdAt.slice(0, 10) <= date &&
          (!b.archivedAt || b.archivedAt.slice(0, 10) > date) &&
          b.eligibleRecordIds.every((id) =>
            state.mornings.some((m) => m.id === id && m.localDate <= date),
          ),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
  );
}
