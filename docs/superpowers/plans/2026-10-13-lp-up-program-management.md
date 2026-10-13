# LP/UP Performance Companion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved LP/UP program lifecycle, measured-demand transfer previews, movement substitutions, recovery charts, and dark interface while preserving existing records.

**Architecture:** Extend the existing validated catalogue and browser-local state to version 2. Pure enrollment, prescription, monitoring, and transfer functions feed small React views; Dexie commits validated changes atomically. A separate cross-device-sync milestone integrates through storage boundaries after its design is approved.

**Tech Stack:** React 19, TypeScript 5, Zod 4, Dexie 4, Vite 7, vite-plugin-pwa, Vitest/fake-indexeddb, Playwright. Use SVG charts with accessible tables; no additional chart dependency is required.

**Spec:** [Approved LP/UP specification](../specs/2026-10-13-lp-up-program-management-design.md). Conversational and written-spec approval received. This plan awaits review; preserve the user's native execution preference.

## Global Constraints

- Prioritize jump height and explosive athletic performance.
- At most one enrollment is active; one may be selected as the next queued program.
- An absent day is unspecified, not an invented rest session.
- All physical training remains relevant to global recovery regardless of enrollment status.
- Percentage deviation is performance deviation, not a measured fatigue percentage.
- Missing data creates gaps rather than zero-filled reassuring lines.
- Old mean velocity values retain their original metric; do not relabel them as MCV.
- Personal records and backups remain outside Git commits.
- Transfer advice cannot guarantee prevention of illness or injury.
- Implement only reviewed source prescriptions/substitutions; unsupported values stay unset with a reason.
- Do not deploy, merge the PR, or publish personal data as part of this implementation.

## Review Focus

1. A repeated LP run on the same local date must not reopen another enrollment's workout; test in Tasks 2 and 8.
2. A rest annotation colliding with actual training must not make incomplete load appear complete; test in Task 6.
3. Unsupported or corrupt legacy records must stay exportable when migration fails; test in Task 3.
4. A transfer preview accepted after a morning/setting/schedule edit must be rejected as stale; test in Task 7.
5. A source continuation/conditional supplement must not double-count work, and a tall image must remain available offline; test in Tasks 1 and 9.

## Files and shared types

Preserve current directories. Split schema definitions by responsibility, with `src/domain/schema.ts` re-exporting existing names to avoid import churn:

- `src/domain/program-schema.ts`: catalogue, program/phase metadata and source prescriptions.
- `src/domain/athlete-schema.ts`: mutable v2 state, workouts, morning records, activity annotations and measurement references.
- `src/domain/enrollment-schema.ts`: enrollment states, events, schedule/target revisions.
- `src/domain/legacy-v1.ts`: frozen v1 schemas and validation for migration/import; no dependency on evolving v2 defaults.
- `src/program/enrollments.ts`, `schedule.ts`, `velocity-rules.ts`, `movements.ts`, `substitutions.ts`: pure program behavior.
- `src/metrics/timeline.ts`, `exposure.ts`, `transfer.ts`: complete daily series, separate mechanical-demand dimensions and transfer advice.
- `src/storage/migrate.ts`, `db.ts`, `backup.ts`: atomic migration, persistence and backups.
- `src/app/EnrollmentPanel.tsx`, `SubstitutionPreview.tsx`, `TransferPreview.tsx`, `charts/TimeSeries.tsx`, `charts/RecoveryCharts.tsx`: focused new UI units.

Catalogue version is `lp-up-v2`; state schema version is `2`. Keep the existing `Program` type as the catalogue type and `program` export as the combined catalogue so existing consumers migrate gradually. Add `ProgramDefinition`, `PhaseDefinition`, `Enrollment`, `EnrollmentProgress`, `TargetRevision`, `DailyActivity`, `Movement`, `SubstitutionPreview`, `TransferAdvice` and `TransferPreview` exports in their owning modules.

Program IDs are `lp`/`up`; phase IDs are `lp-1` through `lp-3` and `up-1`/`up-2`. Preserve LP session IDs and use `July-WxDy`/`August-WxDy` for new sources. The source-folder/month field stays provenance-only. Every session gains programId/phaseId; each definition supplies reviewed microcycle entry session IDs. Every workout gains nullable enrollmentId and an immutable `targetSnapshot: Prescription[]`; accepted target changes are versioned revisions. Rows may carry a reviewed nullable movementId alongside their unchanged legacy exerciseId/name.

## Task 1: Reviewed combined source catalogue

**Files:** modify `scripts/import-program.py`, `scripts/check-program.mjs`, `src/program/catalog.ts`, `catalog.json`, `source-manifest.json`, `scripts/reviewed-prescriptions.json`, `src/domain/schema.ts`; create `program-schema.ts`, `enrollment-schema.ts`, `athlete-schema.ts`, `legacy-v1.ts`, `scripts/reviewed-program-metadata.json`, `scripts/reviewed-up-prescriptions.json`; add `public/program/July/*.jpg` and `August/*.jpg`; test `tests/program.test.ts`.

**Interfaces:** consumes existing source IDs and v1 schema; produces `program: Program`, `programDefinitions: ProgramDefinition[]`, `getPhase(phaseId: string): PhaseDefinition`, `getSession(sessionId: string): Session | undefined`. `Prescription` gains structured component, cluster and conditional/autoregulation fields; old fields remain meaningful. `Enrollment` and v2 state types are defined here; behavior arrives in Task 2.

- [ ] Write failing inventory/source tests asserting 119 unique images, 94 session identities, LP=57/UP=37, five phase labels, unchanged `April-W1D1`, one parent per continuation, optional July W3D7, conditional supplement selection, and filename/header conflicts disclosed.
- [ ] Use this minimal inventory regression, with the other source cases in the same suite:

```ts
it("includes both supplied tracks without duplicate source pages", () => {
  expect(program.sources).toHaveLength(119);
  expect(program.sessions).toHaveLength(94);
  expect(new Set(program.sources).size).toBe(119);
  expect(programDefinitions.map(p => p.id)).toEqual(["lp", "up"]);
});
```

- [ ] Run `npm test -- tests/program.test.ts`; verify new assertions fail against the v1 catalogue.
- [ ] Copy only source assets from the inspected main revision. Review all 41 UP images at readable scale and transcribe structured exercises, author rules and page relationships into the reviewed UP file; mark unclear fields instead of filling them from patterns. Preserve v1 summaries and export immutable v1 schemas before changing v2 definitions.
- [ ] Implement deterministic generation from reviewed data, not numeric inference from a generic OCR regex. Retain raw Chinese text and image mappings; handle source rules/components/alternatives directly. Populate phase labels exactly as specified, reviewed within-phase emphasis annotations, and microcycle entries. Update the source checker to verify expected per-track counts and structured coverage/review status.
- [ ] Run `python scripts/import-program.py`, `npm run check:program`, catalogue tests and typecheck. Resolve breaking existing imports through the schema re-export surface; do not disable checks. Confirm author exceptions and complex structures retain uncertainty.
- [ ] Commit source/schema foundation: `feat: import reviewed UP sources and name periodization phases`.

## Task 2: Enrollment lifecycle and continuation schedule

**Files:** create `src/program/enrollments.ts`; modify `src/program/schedule.ts`, `src/domain/records.ts`, `fixtures.ts`; test `tests/enrollments.test.ts`, `schedule.test.ts`.

**Interfaces:** consumes `Program`, `Enrollment`, `Workout`. Produces `createEnrollment(programId, entrySessionId, startDate): Enrollment`; `enrollmentProgress(enrollment: Enrollment, workouts: Workout[], catalog: Program): EnrollmentProgress`; `scheduledSessions(enrollment: Enrollment, catalog: Program): {session: Session; date: LocalDate}[]`; `transitionEnrollment(state: AthleteState, command: EnrollmentCommand, catalog: Program): AthleteState`. `EnrollmentCommand` is a discriminated union for queue/start/pause/resume/cancel/complete/skip/reschedule; commands include enrollment ID and relevant dates. Progress exposes trainingDays, elapsedDays, completed/partial/skipped counts, nextSessionId and requiredRemaining. Timeline daily values use actualAu and plannedAu; rolling results use nullable meanAu. Preview outputs use targetKg, targetVelocity and requiredCalibrations.

- [ ] Write lifecycle tests asserting queue replacement, one-active invariant, no date-driven completion, distinct-date counts, no-work partial excluded, completed/skipped resolved separately, optional session not blocking completion, future-only resume shifts, cancellation history retention and repeated-run isolation.
- [ ] Pin the continuation behavior with a required source session and no logs:

```ts
it("does not complete training because calendar dates passed", () => {
  const run = createEnrollment("lp", "April-W1D1", "2020-01-01");
  const progress = enrollmentProgress(run, [], program);
  expect(progress.completed).toBe(0);
  expect(progress.trainingDays).toBe(0);
  expect(progress.nextSessionId).toBe("April-W1D1");
});
```

- [ ] Run `npm test -- tests/enrollments.test.ts tests/schedule.test.ts`; verify the new functions/tests fail before implementation.
- [ ] Implement pure commands with explicit event records and validated transitions. Source day offsets anchor to the chosen entry; pause stores the first unresolved required continuation. Resume requires a restart date and explicit resolution of overdue work. Queue/start/resume preview affected enrollments before the storage caller applies the command. Resolve duplicate source sessions only within the relevant enrollment, never globally.
- [ ] Update record factories with enrollment/target defaults and proper current timestamps where callers request new records; keep deterministic fixture overrides. Verify lifecycle/schedule tests and existing date-boundary tests.
- [ ] Commit: `feat: track independent LP UP enrollments and paused progress`.

## Task 3: Transactional legacy migration and persistent commands

**Files:** create `src/storage/migrate.ts`; modify `src/storage/db.ts`, `backup.ts`, `src/app/store.ts`; test `tests/migration.test.ts`, `storage.test.ts`, `backup.test.ts`; create `tests/fixtures/v1-state.json` using synthetic data only.

**Interfaces:** produces `migrateState(input: unknown, catalog: Program): AthleteState`; `applyEnrollmentCommand(command: EnrollmentCommand): Promise<void>`; `saveActivity(activity: DailyActivity): Promise<void>`; `exportRawStoredBackup(): Promise<string>`. Keep existing `loadState/saveWorkout/saveMorning/saveSettings/exportBackup/previewBackup/replaceFromBackup` names. `previewBackup` reports original schema, migrated counts and validation result before replacement.

- [ ] Write migration/import tests asserting preserved IDs/dates/actual values/references/protocols/baselines, legacy LP schedule, null attribution for custom work, original mean metric retained, original prescriptions captured, idempotence for v2, corrupt/unknown-version no writes and raw export on failure.
- [ ] Include a frozen v1 fixture migration assertion:

```ts
it("preserves original measurement meaning and identities", () => {
  const migrated = migrateState(v1Fixture, program);
  expect(migrated.schemaVersion).toBe(2);
  expect(migrated.workouts[0].id).toBe(v1Fixture.workouts[0].id);
  expect(migrated.workouts[0].localDate).toBe(v1Fixture.workouts[0].localDate);
  expect(migrated.workouts[0].rows[0].velocity?.metric).toBe("mean");
});
```

- [ ] Run `npm test -- tests/migration.test.ts tests/storage.test.ts tests/backup.test.ts`; verify new cases fail.
- [ ] Parse stored snapshots as unknown with frozen legacy validation first. Compute/validate the full migration before a transaction replaces the state. Persist lifecycle commands/activities through current-state mutation; settings saves preserve fresh workout/morning/activity data. Validate cross-record links, at-most-one-active/queued invariants and contradictory activity annotations without silently fixing history.
- [ ] Preserve explicit import replacement confirmation/export. Make the read-failure UI's export path use raw stored data so a failed migration can be recovered. Add a storage-change notification API for refreshing other browser tabs; later device sync can use the same notification boundary.
- [ ] Run migration/storage/backup suites and typecheck; verify opening legacy data in a production browser can still export before resolving errors.
- [ ] Commit: `feat: migrate existing records without losing program history`.

## Task 4: Component-aware source velocity actions

**Files:** create `src/program/velocity-rules.ts`; modify `src/metrics/velocity.ts`, schema measurement types and `src/app/WorkoutLog.tsx`; test `tests/velocity-rules.test.ts`, existing velocity suites.

**Interfaces:** `evaluateVelocityRule(rule: VelocityRule, measurement: VelocityRecord): VelocityActionResult` returns supported actions, reasons, missing/ambiguous inputs and observed loss. Records include nullable componentId; MCV uses the distinct metric `meanConcentric`. Keep existing `compatibleVelocity/velocityLoss/compareVelocityTarget/velocityHistory`, extending compatibility to components.

- [ ] Write tests for MCV versus generic mean mismatch, clean/jerk component isolation, fastest-rep author reference, intermediate-rep floor, incomplete-series no action, overlapping boundary marked ambiguous, explicit no-autoregulation override, skill-level applicability and source reduction/rest/cancel instructions.
- [ ] Pin measurement-definition separation using the existing factory:

```ts
it("does not treat generic mean as mean concentric velocity", () => {
  const generic = createVelocity({ metric: "mean" });
  expect(compatibleVelocity(generic, { ...generic, metric: "meanConcentric" })).toBe(false);
});
```

- [ ] Run `npm test -- tests/velocity-rules.test.ts tests/velocity.test.ts tests/velocity-target.test.ts tests/velocity-history.test.ts`; verify new tests fail.
- [ ] Implement structured source-rule evaluation with explicit conditions and no implicit thresholds. Add metric/component/series inputs and the original-rule/action explanation to the logger. Actions suggest next work; acceptance creates a target revision and never overwrites confirmed rows. Preserve full measurement definition and existing history sort order.
- [ ] Run all velocity suites, typecheck and a browser logger case recording separate clean and jerk values.
- [ ] Commit: `feat: preserve exercise-specific UP velocity regulation`.

## Task 5: Reviewed movement alternatives and dose previews

**Files:** create `src/program/movement-library.json`, `movements.ts`, `substitutions.ts`, `src/app/SubstitutionPreview.tsx`; modify `alternatives.ts`, `targets.ts`, `WorkoutLog.tsx`, settings equipment fields; test `tests/substitutions.test.ts`, `targets.test.ts`, `alternatives.test.ts`.

**Interfaces:** `movementLibrary: Movement[]`; `rankSubstitutions(original: Prescription, context: SubstitutionContext): SubstitutionOption[]`; `previewSubstitution(original: Prescription, replacementId: string, context: SubstitutionContext): SubstitutionPreview`; `acceptSubstitution(workout: Workout, preview: SubstitutionPreview): Workout`. Context includes date, equipment, references, explicitly calibrated replacement profiles and familiarity. Preview returns original/revised prescription, reason, supported dose changes, target kg/velocity or null, required calibrations, and review status.

- [ ] Write tests for source-first ranking, unavailable/unconfirmed equipment, front-squat versus back-squat reference isolation, no profile from one rep, no automatic m/s copying, unchanged source after acceptance, historical performed rows retained, jump-demand mismatch and cardio effort/work-rest without distance/calorie equivalence.
- [ ] For a reviewed back-squat to front-squat fixture with only a back-squat reference/profile, assert:

```ts
expect(preview.targetKg).toBeNull();
expect(preview.targetVelocity).toBeNull();
expect(preview.requiredCalibrations).toContain("replacement-specific load reference");
expect(original).toEqual(originalBeforePreview);
```

- [ ] Run `npm test -- tests/substitutions.test.ts tests/targets.test.ts tests/alternatives.test.ts`; verify added tests fail.
- [ ] Curate source movements and reviewed practical replacements with explicit metadata/rationale/references. Use exact reviewed aliases for movement recognition; never rewrite legacy exercise IDs or treat partial text similarity as a load reference. A replacement-specific calibration records exercise/component, ROM, device/metric, dated reference and reviewed target range; absence gives null numeric guidance.
- [ ] Implement ranking and dose preview with explicit replacement sets/reps/rest/tempo/effort where reviewed. Mark manual alternatives unsuitable for automatic transfer dose calculation. Add equipment/familiarity selection and original-versus-revised preview/accept/undo controls; save target revisions through Task 3.
- [ ] Run relevant suites and browser cases for missing reference, supported alternative and undo. Verify no silent acceptance or source mutation.
- [ ] Commit: `feat: preview equipment-aware movement substitutions`.

## Task 6: Complete recovery and exposure timelines

**Files:** create `src/metrics/timeline.ts`, `exposure.ts`; modify `src/metrics/load.ts`, `recovery.ts`, `src/app/Today.tsx`; test `tests/timeline.test.ts`, `exposure.test.ts`, existing recovery/load suites.

**Interfaces:** `buildTimeline(state: AthleteState, range: {start: LocalDate; end: LocalDate}, filter?: {enrollmentId?: string; programId?: string}): DailyPoint[]`; `rollingLoad(points: DailyPoint[], days: 7 | 28): RollingLoadPoint[]`; `summarizeExposure(workouts: Workout[], library: Movement[]): ExposureSummary`. Daily points contain independent planned/actual totals and coverage, optional measurements with protocol/baseline IDs and lifecycle markers. Exposure uses separate categories/units and completeness, not a universal sum.

- [ ] Write tests for unknown-day gaps, confirmed-rest zeros, partial incomplete load, multiple-workout sum and missing component, rest/training conflict, inclusive local-date windows, global inclusion of cancelled/paused work, filtered coverage disclosure, incompatible HRV separation and baseline-version segmentation.
- [ ] With seven daily points containing one unknown day, and separately a complete seven-day fixture, assert:

```ts
expect(rollingLoad(incompletePoints, 7).at(-1)?.meanAu).toBeNull();
expect(rollingLoad(completePoints, 7).at(-1)?.meanAu).toBe(completePoints.reduce((sum, p) => sum + p.actualAu!, 0) / 7);
```

- [ ] Run `npm test -- tests/timeline.test.ts tests/exposure.test.ts tests/load.test.ts tests/recovery.test.ts`; verify new assertions fail.
- [ ] Implement daily assembly and rolling means with every day required for 7/28-day windows. Rest with actual training remains a contradiction, never overriding measurements. Strength exposure uses known pattern/relative references only; jump/sprint demand keeps category/distance/familiarity separate and reports unmapped rows. Reuse existing actual-row confirmation/convention calculations.
- [ ] Extend morning input for optional mass/resting HR/illness/HRV method and explicit activity status. Require HRV metric/unit/protocol before drawing comparable series; keep absent values null. Show CMJ calibration exclusions and concern rules without redefining the existing baseline.
- [ ] Run monitoring suites and typecheck; verify existing per-hand/per-side tests still pass.
- [ ] Commit: `feat: track complete load and recovery timelines`.

## Task 7: Explainable transfer decisions and bridge revisions

**Files:** create `src/metrics/transfer.ts`, `src/program/bridge.ts`, `src/app/TransferPreview.tsx`; modify storage for preview acceptance; test `tests/transfer.test.ts`, `bridge.test.ts`.

**Interfaces:** `adviseTransfer(state: AthleteState, destinationId: 'lp' | 'up', asOf: LocalDate, catalog: Program, library: Movement[]): TransferAdvice`; `buildTransferPreview(state: AthleteState, advice: TransferAdvice, entrySessionId: string, restartDate: LocalDate, useBridge: boolean): TransferPreview`; `acceptTransferPreview(preview: TransferPreview): Promise<void>`. Advice exposes defer/recoveryConcern/insufficient/reviewCandidate status, reasons, missing data, dimension comparisons and ranked entries. Preview includes a fingerprint of relevant validated state, proposed target revisions and lifecycle commands.

- [ ] Write tests for pain/illness priority, CMJ/check-in concerns, inclusive three-day recency, incomplete 7/28-day history, insufficient baseline, missing planned whole-session RPE, cancelled-program history, no ACWR safety rule, unfamiliar technical/impact work, competing exposure dimensions and earlier-entry tie-break.
- [ ] Construct complete synthetic history with a recent illness report; and a fresh preview followed by a stored morning edit. Assert the priority and stale acceptance separately:

```ts
expect(adviseTransfer(illnessState, "up", "2026-10-13", program, movementLibrary).status).toBe("defer");
await expect(acceptTransferPreview(stalePreview)).rejects.toThrow("Transfer preview is stale");
```

- [ ] Run `npm test -- tests/transfer.test.ts tests/bridge.test.ts`; verify new tests fail.
- [ ] Implement the spec's ordered decision table using Task 6 coverage and actual demand. Candidate comparisons retain ranges and unknown dimensions; any essential unknown prevents an unqualified ranking. Reviewed entry/familiarization metadata comes from Tasks 1/5. Show destination purpose/next-session demands and source limitations.
- [ ] Implement seven-calendar-day bridge previews with reviewed source/replacement bounds only. Optional work may be removed, lower supported range selected and rest extended; unsupported high-demand novelty is excluded for manual review. If no acceptable reviewed bridge exists, return an unavailable reason. Bridge completion does not mark source sessions completed; destination continuation remains the selected entry.
- [ ] Add stale-preview, cancellation/no-mutation and atomic-acceptance tests. Fingerprint training/recovery/settings/catalogue/schedule inputs; read current state inside acceptance transaction, reject mismatches, then pause the previous enrollment and activate the destination with its revisions. A bridge is stored as revised bridge sessions, not a fake source workout.
- [ ] Run transfer/bridge/storage tests and typecheck; verify UI acceptance/cancel explains affected programs and no rows are silently changed.
- [ ] Commit: `feat: compare LP UP transfers with recovery and exposure history`.

## Task 8: Program controls, charts and dark mobile interface

**Files:** create `src/app/EnrollmentPanel.tsx`, `src/app/charts/TimeSeries.tsx`, `RecoveryCharts.tsx`; modify `App.tsx`, `Program.tsx`, `Today.tsx`, `Progress.tsx`, `Settings.tsx`, `WorkoutLog.tsx`, `styles.css`, `public/icon.svg`, `vite.config.ts`; browser tests `tests/e2e/programs.spec.ts`, `dashboard.spec.ts`, `training.spec.ts`.

**Interfaces:** `TimeSeries({title, unit, points, markers}: TimeSeriesProps)` renders a responsive SVG with raw-point pointer/keyboard tooltip and accessible table. Points carry date/value or null, series identifier and protocol/baseline key; null and changed keys split line segments. `EnrollmentPanel` consumes state and Task 2 commands; views never duplicate domain calculations.

- [ ] Write browser scenarios for LP/UP selection/queue, pause/resume/cancel/repeat, historical reopening by workout+enrollment ID, partial training-day counts, five purpose labels and source access. Add chart tests for 7/28/84/all ranges, explicit gaps, filter disclosure, hover/keyboard units, phase/pause/transfer markers and no readiness/ACWR risk claims.
- [ ] Pin visible purpose naming and accessible chart data after following the suite's enrollment/logging setup:

```ts
await expect(page.getByText("Force–Power Development", { exact: true }).first()).toBeVisible();
await expect(page.getByRole("table", { name: "CMJ height data" })).toBeVisible();
```

- [ ] Run the new browser suites against v1 and confirm missing-control failures.
- [ ] Wire lifecycle/transfer/substitution controls with previews and preserved form state. Use enrollment IDs for matching existing workouts. Show actual progress separately from calendar elapsed time and incomplete entries; source labels stay in provenance only. Put methods/research links in Settings.
- [ ] Implement SVG panels and summary cards from Task 6 selectors. Use dark tokens: background `#090d1b`, cards `#131a2d`, main text `#f3f5ff`, secondary text `#b7c2df`, accent blue `#70a9ff`, purple `#b599ff`, concern red `#ff7d8e`. Verify contrast on each actual surface. Keep separate axes/panels for unlike units and text/icons for concern flags. Update manifest/icon colors, focus states, touch spacing and reduced-motion styles.
- [ ] Run browser scenarios, typecheck and build; visually inspect 390×844 and 1440×1000 screenshots, source viewer and keyboard navigation. Confirm baseline/unsaved-entry tests remain meaningful after UI labels change.
- [ ] Commit: `feat: add dark LP UP dashboard and program controls`.

## Task 9: Offline/source coverage and final release review

**Files:** modify `src/offline.ts`, `vite.config.ts`, `tests/e2e/offline.spec.ts`, `.github/workflows/checks.yml`, `README.md`; create `docs/superpowers/reviews/2026-10-13-lp-up-program-management-review.md`.

**Interfaces:** retain current explicit service-worker activation/readiness/retry/update API. Offline ready means all versioned programme source assets required by the build are cached, not one representative source request.

- [ ] Extend offline browser tests for LP/UP source viewing while offline, an August tall image, failed cache preparation/retry and actual waiting-worker update preserving an unsaved entry. Verify all catalogue asset paths occur in the build cache manifest and no size-limit omission occurs.
- [ ] In the production offline suite, after preparing the full cache and setting the context offline, fetch the known tall source:

```ts
const source = await page.evaluate(async () => {
  const response = await fetch("/program/August/Aug_W1D1.jpg");
  return { ok: response.ok, bytes: (await response.blob()).size };
});
expect(source.ok).toBe(true);
expect(source.bytes).toBeGreaterThan(0);
```

- [ ] Run failing offline checks before modifying cache/readiness code. Configure intentional source inclusion and complete readiness detection; do not raise arbitrary cache limits without inspecting actual files.
- [ ] Update README with phase/program use, pause/transfer/substitution limitations, recovery calculations, migration and device-local behavior. Record connectivity evidence and unresolved user-device diagnosis; do not claim PC/phone sync is available before the separate milestone ships.
- [ ] Run `npm test`, `npm run check:program`, `npm run typecheck`, `npm run build`, and `npm run test:e2e`. Run browser-serving checks with permitted socket access, installed Chromium and the project's existing Playwright configuration. Record exact results and limitations.
- [ ] Use native executing-plans workflow's one fresh whole-branch reviewer; resolve substantive findings and rerun affected checks. Commit reviewed fixes and review evidence. Push the existing feature branch, update/attach draft PR 1 with final behavior and validation, and inspect relevant CI. Do not merge or deploy.

## Separate milestone: shared access and PC–phone sync

The user added automatic device synchronization and reported that the local network URL fails on both devices. This is an independent backend/hosting subsystem beyond the approved browser-local specification. Its design will identify authentication, user ownership, offline queueing, conflict handling, first-device import and deployment configuration before its own implementation plan.

Prepare and review that design alongside this plan; do not implement an unapproved backend or let it erase the local-first migration requirements. Both devices must use the same stable HTTPS site and authenticated account for automatic sync. A reachable local IP alone does not synchronize IndexedDB.

## Plan self-review

Coverage maps the approved spec to Tasks 1–9: source/phase naming (1), enrollment/progress (2/8), migration/backups (3), velocity (4), substitutions (5), measurements/charts (6/8), transfer/bridge (7/8), offline/accessibility/docs/verification (8/9). Review Focus cases have explicit owning tests. Shared signatures are defined at producer tasks; no deployment/account assumptions are required for this core plan. The added sync requirement is intentionally a separate reviewable milestone rather than an implicit modification to the approved storage architecture.
