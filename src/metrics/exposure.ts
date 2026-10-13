import type {
  AthleteState,
  Prescription,
  Workout,
  Program,
  LocalDate,
} from "../domain/schema";
import {
  movementFor,
  movementLibrary,
  type Movement,
} from "../program/movements";
import { targetKilograms } from "../program/targets";
import { sessionDate } from "../program/schedule";
import { scheduledSessions } from "../program/enrollments";
import { compatibleVelocity } from "./velocity";
import { externalWork } from "./load";
export type Range = [number, number];
const plus = (a: Range, b: Range): Range => [a[0] + b[0], a[1] + b[1]];
const times = (a: Range, b: Range): Range => [a[0] * b[0], a[1] * b[1]];
export type DoseProfile = {
  strengthReps: Range | null;
  sets: Range | null;
  relativeIntensity: Range | null;
  kgReps: Range | null;
  restSeconds: Range | null;
  clusterRestSeconds: Range | null;
  velocity: Range | null;
  jumpContacts: Range | null;
  sprintMetres: Range | null;
  conditioningWorkSeconds: Range | null;
  workRestRatio: Range | null;
  tempoInstructions: string[];
  jumpDemand: Record<string, Range>;
  unknown: number;
  count: number;
  movements: string[];
};
export function plannedDose(
  prescriptions: Prescription[],
  state: AthleteState,
  date: LocalDate,
  dates: Record<string, string> = {},
): DoseProfile {
  const sums: {
    sets: Range;
    strengthReps: Range;
    kgReps: Range;
    jumpContacts: Range;
    sprintMetres: Range;
    conditioningWorkSeconds: Range;
  } = {
    sets: [0, 0],
    strengthReps: [0, 0],
    kgReps: [0, 0],
    jumpContacts: [0, 0],
    sprintMetres: [0, 0],
    conditioningWorkSeconds: [0, 0],
  };
  const counts = Object.fromEntries(Object.keys(sums).map((k) => [k, 0]));
  const intensities: Range[] = [],
    rests: Range[] = [],
    clusters: Range[] = [],
    velocities: Range[] = [],
    ratios: Range[] = [],
    demand: Record<string, Range> = {};
  let unknown = 0;
  for (const p of prescriptions) {
    if (p.optional || p.conditionalGroup) {
      unknown++;
      continue;
    }
    const sides = p.perSide ? 2 : 1,
      reps =
        p.sets && p.reps ? times(times(p.sets, p.reps), [sides, sides]) : null;
    const m = movementFor(p);
    if (p.sets) {
      sums.sets = plus(sums.sets, p.sets);
      counts.sets++;
    }
    if (p.restSeconds) rests.push(p.restSeconds);
    if (p.cluster)
      clusters.push([p.cluster.intraRestSeconds, p.cluster.intraRestSeconds]);
    if (p.velocityTarget) velocities.push(p.velocityTarget);
    else if (p.velocityVariants.length) unknown++;
    if (p.kind === "strength") {
      if (reps) {
        sums.strengthReps = plus(sums.strengthReps, reps);
        counts.strengthReps++;
      } else unknown++;
      if (p.loadPercent) intensities.push(p.loadPercent);
      const kg =
        targetKilograms(p, state.reference1RMs, dates[p.id] ?? date) ??
        (p.loadConvention === "totalExternal" ? p.loadKg : null);
      if (kg && reps) {
        sums.kgReps = plus(sums.kgReps, times(kg, reps));
        counts.kgReps++;
      }
    }
    if (p.kind === "jump") {
      if (reps) {
        sums.jumpContacts = plus(sums.jumpContacts, reps);
        counts.jumpContacts++;
        const key = m?.demand ?? "unknown";
        demand[key] = plus(demand[key] ?? [0, 0], reps);
      } else unknown++;
    }
    if (p.kind === "sprint") {
      if (reps && p.distanceMetres) {
        sums.sprintMetres = plus(
          sums.sprintMetres,
          times(reps, p.distanceMetres),
        );
        counts.sprintMetres++;
      } else unknown++;
    }
    if (p.kind === "conditioning") {
      if (p.rounds && p.workSeconds) {
        sums.conditioningWorkSeconds = plus(
          sums.conditioningWorkSeconds,
          times(p.rounds, p.workSeconds),
        );
        counts.conditioningWorkSeconds++;
      }
      if (p.workSeconds && p.restSeconds && p.restSeconds[0] > 0)
        ratios.push([
          p.workSeconds[0] / p.restSeconds[1],
          p.workSeconds[1] / p.restSeconds[0],
        ]);
    }
    if (p.kind === "other" || p.ambiguity || !m) unknown++;
  }
  const average = (ranges: Range[]): Range | null =>
    ranges.length
      ? [
          ranges.reduce((a, b) => a + b[0], 0) / ranges.length,
          ranges.reduce((a, b) => a + b[1], 0) / ranges.length,
        ]
      : null;
  return {
    sets: counts.sets ? sums.sets : null,
    strengthReps: counts.strengthReps ? sums.strengthReps : null,
    kgReps: counts.kgReps ? sums.kgReps : null,
    jumpContacts: counts.jumpContacts ? sums.jumpContacts : null,
    sprintMetres: counts.sprintMetres ? sums.sprintMetres : null,
    conditioningWorkSeconds: counts.conditioningWorkSeconds
      ? sums.conditioningWorkSeconds
      : null,
    relativeIntensity: average(intensities),
    restSeconds: average(rests),
    clusterRestSeconds: average(clusters),
    velocity:
      new Set(
        prescriptions
          .filter((p) => p.velocityTarget)
          .map((p) => (movementFor(p)?.id ?? p.name) + "|" + p.velocityMetric),
      ).size === 1
        ? average(velocities)
        : null,
    workRestRatio: average(ratios),
    tempoInstructions: [
      ...new Set(
        prescriptions.flatMap((p) =>
          p.tempo ? [`${p.name}: ${p.tempo}`] : [],
        ),
      ),
    ],
    jumpDemand: demand,
    unknown,
    count: prescriptions.length,
    movements: [
      ...new Set(prescriptions.map((p) => movementFor(p)?.id ?? p.name)),
    ],
  };
}
export type ExposureSummary = {
  strengthReps: number;
  kgReps: number;
  jumpContacts: Record<string, number>;
  sprintMetres: number;
  conditioningWorkSeconds: number;
  heavyLowerSets: number;
  sets: number;
  relativeIntensity: number | null;
  workRestRatio: number | null;
  unknown: number;
  movements: string[];
  restSeconds: number | null;
  velocity: number | null;
};
export function summarizeExposure(
  workouts: Workout[],
  library: Movement[] = movementLibrary,
  state?: AthleteState,
): ExposureSummary {
  const rows = workouts
    .filter((w) => ["completed", "partial"].includes(w.status))
    .flatMap((w) => w.rows.filter((r) => r.confirmed));
  const result: ExposureSummary = {
    strengthReps: 0,
    kgReps: 0,
    jumpContacts: {},
    sprintMetres: 0,
    conditioningWorkSeconds: 0,
    heavyLowerSets: 0,
    sets: rows.length,
    relativeIntensity: null,
    workRestRatio: null,
    unknown: 0,
    movements: [],
    restSeconds: null,
    velocity: null,
  };
  const measures = externalWork(workouts);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i],
      external = measures[i],
      m = library.find((m) =>
        r.movementId
          ? m.id === r.movementId
          : m.id === r.exerciseId ||
            m.name === r.name ||
            m.aliases.includes(r.name),
      );
    if (!m) result.unknown++;
    result.movements.push(m?.id ?? r.exerciseId);
    if (r.kind === "strength") {
      result.strengthReps += external.reps ?? 0;
      result.kgReps += external.loadVolume ?? 0;
      if (r.reps === null || external.loadVolume === null) result.unknown++;
    }
    if (r.kind === "jump") {
      const key = m?.demand ?? "unknown";
      result.jumpContacts[key] =
        (result.jumpContacts[key] ?? 0) + (external.jumpContacts ?? 0);
      if (external.jumpContacts === null) result.unknown++;
    }
    if (r.kind === "sprint") {
      result.sprintMetres += external.distanceMetres ?? 0;
      if (external.distanceMetres === null) result.unknown++;
    }
    if (r.kind === "conditioning") {
      result.conditioningWorkSeconds += external.conditioningWorkSeconds ?? 0;
      if (external.conditioningWorkSeconds === null) result.unknown++;
    }
  }
  const rests = rows.flatMap((r) =>
    r.restSeconds !== null ? [r.restSeconds] : [],
  );
  result.restSeconds = rests.length
    ? rests.reduce((a, b) => a + b, 0) / rests.length
    : null;
  const ratios = rows.flatMap((r) =>
    r.kind === "conditioning" &&
    r.workSeconds !== null &&
    r.restSeconds !== null &&
    r.restSeconds > 0
      ? [r.workSeconds / r.restSeconds]
      : [],
  );
  result.workRestRatio = ratios.length
    ? ratios.reduce((a, b) => a + b, 0) / ratios.length
    : null;
  const velocities = rows.flatMap((r) =>
    r.velocity &&
    r.velocity.method &&
    r.velocity.rangeOfMotion &&
    r.velocity.setAverage !== null
      ? [r.velocity]
      : [],
  );
  if (
    velocities.length &&
    velocities.every((v) => compatibleVelocity(velocities[0], v))
  )
    result.velocity =
      velocities.reduce((a, v) => a + v.setAverage!, 0) / velocities.length;
  const intensities: number[] = [];
  if (state)
    for (const w of workouts.filter((w) =>
      ["completed", "partial"].includes(w.status),
    ))
      for (const r of w.rows.filter(
        (r) =>
          r.confirmed &&
          r.kind === "strength" &&
          r.loadConvention === "totalExternal" &&
          r.loadKg !== null,
      )) {
        const p = (
          w.targetRevisions.at(-1)?.prescriptions ?? w.targetSnapshot
        ).find((p) => p.id === r.prescriptionId);
        const ref = p?.referenceExerciseId
          ? state.reference1RMs
              .filter(
                (x) =>
                  x.exerciseId === p.referenceExerciseId &&
                  x.date <= w.localDate,
              )
              .sort((a, b) => b.date.localeCompare(a.date))[0]
          : undefined;
        if (ref && p?.name === r.name)
          intensities.push((100 * r.loadKg!) / ref.kg);
      }
  result.relativeIntensity = intensities.length
    ? intensities.reduce((a, b) => a + b, 0) / intensities.length
    : null;
  // Velocity is reported only for compatible exercise, component, load, method and ROM.
  result.movements = [...new Set(result.movements)];
  return result;
}
export function programDoseSeries(
  programId: "lp" | "up",
  state: AthleteState,
  catalog: Program,
  enrollmentId?: string,
  movementId?: string,
) {
  const sessions = catalog.sessions.filter((s) => s.programId === programId),
    weeks = programId === "lp" ? 12 : 8;
  const run = state.enrollments.find((e) => e.id === enrollmentId),
    schedule = run ? scheduledSessions(run, catalog) : [];
  return Array.from({ length: weeks }, (_, i) => {
    const weekSessions = sessions.filter(
      (s) => s.blockIndex * 4 + s.week === i + 1,
    );
    const own = state.workouts.filter(
      (w) =>
        w.sessionId &&
        weekSessions.some((s) => s.id === w.sessionId) &&
        (!enrollmentId || w.enrollmentId === enrollmentId),
    );
    const dates: Record<string, string> = {};
    const targets = weekSessions
      .flatMap((s) => {
        const w = enrollmentId
          ? own.find((w) => w.sessionId === s.id)
          : undefined;
        const prescriptions =
          w?.targetRevisions.at(-1)?.prescriptions ??
          (w?.targetSnapshot.length ? w.targetSnapshot : undefined) ??
          run?.targetRevisions.filter((r) => r.sessionId === s.id).at(-1)
            ?.prescriptions ??
          s.exercises;
        for (const p of prescriptions)
          dates[p.id] =
            schedule.find((x) => x.session.id === s.id)?.date ??
            sessionDate(s, state.startDate);
        return prescriptions;
      })
      .filter(
        (p) => !movementId || (movementFor(p)?.id ?? p.name) === movementId,
      );
    const filtered = own.map((w) => ({
      ...w,
      rows: w.rows.filter(
        (r) =>
          !movementId ||
          (r.movementId ??
            movementFor({ movementId: null, name: r.name })?.id ??
            r.name) === movementId,
      ),
    }));
    return {
      week: i + 1,
      phaseId: weekSessions[0]?.phaseId ?? "",
      planned: plannedDose(targets, state, state.startDate, dates),
      actual: filtered.some(
        (w) =>
          ["completed", "partial"].includes(w.status) &&
          w.rows.some((r) => r.confirmed),
      )
        ? summarizeExposure(filtered, movementLibrary, state)
        : null,
      sessions: weekSessions.map((s) => s.id),
    };
  });
}
