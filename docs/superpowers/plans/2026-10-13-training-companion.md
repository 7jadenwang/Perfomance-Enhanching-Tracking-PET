# Training Companion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver an offline-capable phone-friendly training companion for the athlete's April–June program, with accurate logging, load comparisons, velocity measurements, recovery signals, and backups.

**Architecture:** A React application owns presentation; pure TypeScript modules own scheduling and calculations. Reviewed bundled program data is immutable, while IndexedDB stores athlete settings and records. A service worker caches the application and source images without requiring a backend.

**Tech Stack:** React, TypeScript, Vite, Zod, Dexie, vite-plugin-pwa; Vitest with fake-indexeddb for calculation/storage tests, and Playwright for user workflows. Use compatible stable releases at execution time and commit the npm lockfile; no additional runtime services.

**Spec:** `docs/superpowers/specs/2026-10-13-training-companion-design.md`

## Global Constraints

- Preserve Chinese exercise names and coaching instructions.
- Missing day images mean unspecified days, not inferred rest days.
- Planned values never automatically become completed work.
- Missing values are never treated as zero or as reassuring.
- Use separate internal and external measures; never add kilograms, metres, jump contacts, and session-RPE units into a fabricated universal score.
- Compare trends only within compatible exercise, load/range of motion, metric, and measurement method.
- Changes require an explicit user edit and retain the original prescription.
- No login, cloud synchronization, video analysis, device integration, injury prediction, validated fatigue percentage, autonomous plan changes, or long-term performance prediction.
- Browser storage is local to the browser/device; backup replacement requires explicit confirmation.
- Import and visually review every source image before claiming the complete program is available.

## Review Focus

- Locale/timezone transitions must not shift calendar-day records; Task 2 tests local dates across DST boundaries.
- A crash after copying prescriptions must not count drafts as completed work; Tasks 3 and 7 verify reload behavior.
- Sparse or constant CMJ data must not imply readiness; Task 5 tests calibration and zero variance.
- Changed equipment or incompatible velocity methods must not create false equivalent comparisons; Tasks 4 and 6 test these cases.
- Interrupted writes, corrupt backups, and old app caches must preserve existing records; Tasks 3 and 8 test failure paths.

## File map and shared contracts

- `src/domain/schema.ts`: Zod schemas, inferred types, unit/range validation, schema version 1.
- `src/domain/fixtures.ts`: deterministic typed factories used by tests; no production records.
- `src/program/catalog.json`: reviewed program with stable IDs and source references.
- `src/program/source-manifest.json`: source commit SHA, image inventory, mapping, and transcription review status.
- `public/program/{April,May,June}/`: original source images.
- `scripts/check-program.mjs`: catalogue/manifest/assets completeness check.
- `src/program/schedule.ts`: date mapping and rescheduling.
- `src/storage/db.ts`, `src/storage/backup.ts`: persistence and transactional backup replacement.
- `src/metrics/load.ts`, `velocity.ts`, `recovery.ts`: pure calculations.
- `src/program/alternatives.ts`: curated substitutions.
- `src/app/`: navigation, screens, reusable fields, application store, styles.
- `src/offline.ts`: cache state/update behavior.
- `tests/*.test.ts`, `tests/e2e/*.spec.ts`: meaningful validation.

Define these types in Task 1; downstream tasks must import them rather than invent variants:

- `LocalDate`: validated `YYYY-MM-DD` string, without UTC timestamp conversion.
- `Program`: version, sourceCommit, ordered blocks, sessions, exercises, sources.
- `Prescription`: sourceText, sets/reps/load/rest ranges, perSide, referenceExerciseId, tempo, velocityMetric/target, holdSeconds, distanceMetres, intervals, optional, groupId, ambiguity notes. Unknown fields are null; preserve original text.
- `Session`: id, blockIndex (0–2), week/day (1–4/1–7), optional, ordered exercise blocks, sources.
- `Workout`: id, sessionId or null, localDate, status (`draft|partial|completed|skipped`), plannedDuration/wholeSessionRpe, actualDuration/wholeSessionRpe, actual rows, substitution records, timestamps.
- `ActualRow`: id, exerciseId, confirmed, count/unit/load convention, perSide, holdSeconds, distance/time, interval rounds/work/rest, tempo compliance, setRpe/rir, velocity readings. Unavailable fields are null.
- `VelocityRecord`: exerciseId, loadKg, rangeOfMotion, metric (`mean|meanPropulsive|peak`), method, setAverage or ordered rep velocities, completeSeries.
- `MorningRecord`: id, localDate, protocolId, trials (heightCm, excluded/reason), check-in, baselineEligible/exclusionReason, timestamps.
- `Baseline`: id, protocolId, eligibleRecordIds, meanCm, sampleSdCm, createdAt, archivedAt.
- `EquipmentProfile`: running is always true; ordinary gym equipment is available by default; rowing, SkiErg, and air bike each have `available|unavailable|unconfirmed` states. Only confirmed available equipment satisfies a specialized-machine requirement.
- `AthleteState`: schemaVersion, programVersion, startDate, reschedules, equipment, dated reference 1RMs, protocols, baselines, workouts, morning records, settings.

Create test factories `makeWorkout(overrides)`, `makeRow(overrides)`, `makeMorning(overrides)`, and `makeVelocity(overrides)` returning valid types with deterministic IDs. Use factories only for setup; assertions below define behavior.

---

### Task 1: Typed program catalogue and source provenance

**Files:** package/build/test configuration; `src/domain/schema.ts`, `fixtures.ts`; catalogue/manifest/source images; `scripts/check-program.mjs`; `tests/program.test.ts`.

**Interfaces:** Produce the shared types above, `parseProgram(input: unknown): Program`, `parseState(input: unknown): AthleteState`, and `program: Program`. npm scripts: `test`, `typecheck`, `build`, `dev`, `test:e2e`, `check:program`.

- [ ] Retrieve the current GitHub main revision into a temporary checkout, inspect applicable repository instructions, and record its SHA. Keep the working branch intact. Inventory all images before transcription.
- [ ] Configure the minimal TypeScript/Vitest runner and write failing `program.test.ts` cases: every image has exactly one source mapping; every session retains source text; April W1D1 has the six-by-two prescription, 85% target, and MV ≥ 1.35 m/s; May W1D1 retains `3-1-X-1` and RIR 2; June W1D1 retains the 5 m sprint and cluster squat structure. These assertions verify source fidelity, not training validity.
- [ ] Run `npm test -- tests/program.test.ts`; expect failure because catalogue/schema exports are absent or incomplete.
- [ ] Implement schemas and fixtures, transcribe every image, numerically order continuations, preserve ambiguities, and package sources. Track a visual-review result for every manifest entry. Do not assume absent days are rest days or screenshot dates are session dates.
- [ ] Run `npm test -- tests/program.test.ts` and `npm run check:program`; require passing assertions, zero missing/unmapped images, and every entry reviewed. Inspect all images against the catalogue; scripts cannot prove OCR accuracy.
- [ ] Commit the independently reviewable catalogue and source assets: `git add package.json package-lock.json tsconfig*.json vite.config.* src/domain src/program public/program scripts tests/program.test.ts && git commit -m "feat: import reviewed three-month training catalogue"` (include any other configuration files created for this task).

### Task 2: Calendar schedule and source-preserving rescheduling

**Files:** `src/program/schedule.ts`, `tests/schedule.test.ts`.

**Interfaces:** Consume `Program`, `LocalDate`; produce `sessionDate(session: Session, start: LocalDate): LocalDate`, `sessionsForDate(program: Program, date: LocalDate, start: LocalDate, reschedules: Record<string, LocalDate>): Session[]`. Multiple rescheduled sessions may share a date.

- [ ] Write failing tests asserting block 0/week 1/day 1 maps to `2026-10-13`, block 1/week 1/day 1 to `2026-11-10`, and a missing source day returns `[]`. Assert dates spanning US DST remain consecutive calendar days; rescheduling one session leaves workout history unchanged and permits two sessions on one date.
- [ ] Run `npm test -- tests/schedule.test.ts`; require a behavior-related failure before implementation.
- [ ] Implement calendar arithmetic with explicit year/month/day values and immutable source identities. Out-of-range dates return no session; reschedule overrides only the chosen session's scheduled date.
- [ ] Run `npm test -- tests/schedule.test.ts`; require all cases passing.
- [ ] Commit: `git add src/program/schedule.ts tests/schedule.test.ts && git commit -m "feat: schedule program by local calendar date"`.

### Task 3: Durable records and validated backup transactions

**Files:** `src/storage/db.ts`, `backup.ts`, `tests/storage.test.ts`, `tests/backup.test.ts`.

**Interfaces:** Produce `loadState(): Promise<AthleteState>`, `saveWorkout(workout: Workout): Promise<void>`, `saveMorning(record: MorningRecord): Promise<void>`, `saveSettings(state: AthleteState): Promise<void>` (updates settings/reference/protocol/baseline fields only), `exportBackup(): Promise<string>`, `previewBackup(text: string): {state: AthleteState; counts: {workouts:number; mornings:number}; compatible:boolean}`, `replaceFromBackup(state: AthleteState): Promise<void>`.

- [ ] Write failing tests with fake-indexeddb: save/reload a partial session and a draft; source catalogue never changes; failed transaction preserves previous records; backup round trip preserves IDs, dates, drafts, baseline versions, and settings. Assert malformed JSON, unsupported schema/program version, and non-finite/out-of-bound measurements are rejected without mutation.
- [ ] Run `npm test -- tests/storage.test.ts tests/backup.test.ts`; expect failures before persistence implementation.
- [ ] Implement Dexie tables and transactional replacement. Validate before writing; reject incompatible versions in version one. Surface errors to callers. Keep draft confirmation flags, not merely status, intact. An absent database produces documented default settings and no measured records.
- [ ] Run those two test files; require pass with simulated write failure and rejected imports leaving the original database intact.
- [ ] Commit storage and its tests with `feat: persist records and validate backups`.

### Task 4: Load and compatible velocity calculations

**Files:** `src/metrics/load.ts`, `velocity.ts`, `tests/load.test.ts`, `tests/velocity.test.ts`.

**Interfaces:** Produce `sessionLoad(duration: number|null, rpe: number|null): number|null`, `weeklyLoad(workouts: Workout[]): {planned:number; actual:number; plannedComplete:number; actualComplete:number; prescribedCount:number; confirmedCount:number}`, `loadDifference(planned:number|null, actual:number|null): {absolute:number|null; percent:number|null}`, `externalWork(workouts: Workout[]): ExternalWork[]`, `compatibleVelocity(a: VelocityRecord,b: VelocityRecord): boolean`, `velocityLoss(record: VelocityRecord): number|null`, `compareVelocityTarget(target: Prescription,record: VelocityRecord): 'below'|'within'|'above'|'unknown'`. Define `ExternalWork` as exercise/convention-specific totals with units and completeness.

- [ ] Write failing assertions: `sessionLoad(60,6) === 360`; `sessionLoad(null,6) === null`; missing exercise RPE never populates session RPE; planned zero gives null percentage. Confirm draft/unconfirmed rows contribute no actual work, partial confirmed work counts, per-side quantities expand consistently, and bodyweight/isometrics do not invent kilogram volume. Weekly totals expose completeness.
- [ ] Write velocity assertions: complete rep series `[1,0.8]` gives 20%; set average alone, incomplete series, or zero fastest velocity gives null. Different metrics/methods/load/range of motion return incompatible; ambiguous MV target gives unknown. Tempo X never becomes a numeric speed.
- [ ] Run `npm test -- tests/load.test.ts tests/velocity.test.ts`; expect missing behavior failures.
- [ ] Implement pure modules using confirmed records only. Define compatible series by exact exercise, load, metric, method, and range-of-motion match. Keep target range versus actual measurements explicit and reject invalid numeric inputs through schemas.
- [ ] Run both test files and `npm run typecheck`; require pass.
- [ ] Commit calculations/tests with `feat: calculate transparent load and velocity metrics`.

### Task 5: CMJ calibration and explainable recovery signals

**Files:** `src/metrics/recovery.ts`, `tests/recovery.test.ts`.

**Interfaces:** Produce `dailyCmj(record: MorningRecord): {meanCm:number|null; validTrials:number; eligible:boolean}`, `calibrate(records: MorningRecord[], protocolId:string): Baseline|null`, `recoverySignals(record: MorningRecord, baseline:Baseline|null): RecoveryResult`. Define `RecoveryResult` with calibration count/state, percentage change, low-CMJ flag, check-in reasons, pain information, multiple-concerns flag, limited-data flag, and human-readable reasons.

- [ ] Write failing tests: three valid trials `[30,31,32]` average to 31; two trials display their mean but remain baseline-ineligible; excluded trials are retained but omitted. Thirteen eligible days cannot calibrate, fourteen can; use the first fourteen, sample SD, and a frozen baseline. Changed protocol cannot reuse it. Zero SD cannot produce low-CMJ statistical flags.
- [ ] Add assertions for strict below-mean-minus-two-SD threshold, fatigue/soreness/stress 4–5 and sleep quality 1–2 concerns, separate pain, both signal types yielding multiple concerns, and missing fields producing limited data rather than readiness. Recalibration produces a new baseline ID and retains the prior version.
- [ ] Run `npm test -- tests/recovery.test.ts`; expect failures before implementation.
- [ ] Implement the spec's provisional heuristics and distinct statuses. Sort eligible daily records by local date and allow one morning record per date/protocol; edits replace that record rather than counting a day twice. Baseline updates require explicit settings action; calculations must not edit prescriptions or historical records. Put research links and clear heuristic explanations in exported display metadata for Task 7.
- [ ] Run `npm test -- tests/recovery.test.ts`; require pass.
- [ ] Commit with `feat: monitor CMJ trends with explained recovery signals`.

### Task 6: Equipment-aware alternatives

**Files:** `src/program/alternatives.ts`, `tests/alternatives.test.ts`.

**Interfaces:** Produce `suggestAlternatives(prescription: Prescription, equipment: EquipmentProfile): Alternative[]`; define `Alternative` with modality, preserved work/rest/rounds/effort, changes, reason, and sourceProvided flag. Add exercise purpose tags during catalogue review where the source supports them.

- [ ] Write failing assertions: April's explicit bike/sprint alternative is preserved; unavailable general aerobic machines may offer running; rowing/SkiErg technique blocks never receive an automatic running substitute; machine calories/distance are never converted; machine intervals do not default to maximal sprints. Unavailable goal-preserving alternatives return an empty list with the UI able to show manual edit/skip.
- [ ] Run `npm test -- tests/alternatives.test.ts`; expect failure.
- [ ] Implement a curated purpose-based mapping with duration/rest/effort and concrete impact/muscle-involvement differences. Running stays available. A suggestion is not a completed substitution; Task 7 records explicit selection.
- [ ] Run `npm test -- tests/alternatives.test.ts`; require pass.
- [ ] Commit with `feat: offer equipment alternatives without false equivalence`.

### Task 7: Mobile daily workflow and progress UI

**Files:** `src/main.tsx`, `src/app/App.tsx`, `store.ts`, `Today.tsx`, `Program.tsx`, `WorkoutLog.tsx`, `Progress.tsx`, `Settings.tsx`, `fields.tsx`, `styles.css`; `tests/e2e/training.spec.ts`; Playwright configuration.

**Interfaces:** Screens consume the preceding public interfaces. `useAthleteStore()` exposes loaded state, save pending/error states, draft edits, explicit row confirmation, settings updates, and refresh after transactional replacement. No formulas in screen components. Use Today/Program/Progress/Settings navigation; the workout editor opens from Today or Program.

- [ ] Write a failing Playwright workflow at 390 px: set start date, inspect source prescription/image, log partial work plus whole-session duration/RPE, select a substitution, confirm completed rows, reload, and see correct progress and original targets. Add a crash/reload after Copy planned sets assertion: rows persist as unconfirmed drafts and actual total stays unchanged.
- [ ] Add user-facing assertions for multiple sessions on a date, an unspecified day, incompatible velocity target comparison, calibration/limited data, explicit baseline recalibration, and invalid input correction. Backup preview shows counts and compatibility; replacement needs confirmation and offers export. A persistence error must not display Saved and must retain the in-memory draft with retry/export actions.
- [ ] Run `npm run test:e2e -- tests/e2e/training.spec.ts`; expect application/behavior failure before UI implementation.
- [ ] Implement the shell and focused screens. Default to retained Chinese names with concise English field labels. Use accessible labels, keyboard focus, large touch controls, and readable source images. Session editor supports range prescriptions, cluster/superset grouping, optional blocks, per-side data, holds, sprint/interval rows, measurement metric/method, 1RM reference/date, tempo, and pain/check-in fields. No charts may connect incompatible series.
- [ ] Implement explicit export/download, preview import, cancel, replacement confirmation, write success/error states, and source ambiguity badges. Use actual device local dates and user-selected dates for historic entries; preserve dates when settings change. Keep navigation usable offline and without records.
- [ ] Run `npm run test:e2e -- tests/e2e/training.spec.ts`, `npm run typecheck`, and `npm run build`; require pass. Inspect phone/desktop layout, keyboard focus, long Chinese instructions, source-image zoom, and empty progress states.
- [ ] Commit UI/e2e files with `feat: add mobile training and recovery workflows`.

### Task 8: Offline delivery, update handling, and final acceptance

**Files:** `src/offline.ts`, service-worker/PWA configuration, `public/manifest` assets as required, `tests/e2e/offline.spec.ts`, README updates.

**Interfaces:** Produce `offlineStatus(): Promise<'preparing'|'ready'|'failed'>` and update-ready notification. No automatic reload while drafts are open. Durable IndexedDB data is independent of cached program/assets.

- [ ] Write failing production-preview Playwright cases: after successful cache preparation, go offline, reload, view a source image, save a workout, reload, and export a backup. Simulate incomplete cache preparation and require failed/preparing status rather than Ready. Verify an app update does not delete logs and an open draft is not discarded by forced reload.
- [ ] Run `npm run test:e2e -- tests/e2e/offline.spec.ts`; require failures before offline implementation.
- [ ] Configure service-worker caching of build assets/catalogue/source images with completion-aware status and an explicit user-controlled update action. On caching failure allow normal online use and retry. Keep mutable records outside cache eviction/update logic.
- [ ] Run `npm test`, `npm run check:program`, `npm run typecheck`, `npm run build`, and `npm run test:e2e`; require all pass. Recheck transcription inventory against all original images and each acceptance item in the spec. Stop to resolve any failure rather than broaden scope.
- [ ] Document install/run/test/export/import steps, browser-local data limitations, program revision, and provisional recovery rules in README. Commit with `feat: deliver offline training companion with backup guidance`.
- [ ] Complete an independent whole-branch review using the selected execution workflow, resolve material findings, and report verification results. Do not publish, deploy, or merge as part of this plan. Provide the local preview instructions and reviewable branch/changes.

## Self-review and coverage

Source import and prescription fidelity: Task 1. Scheduling and historical dates: Task 2. Persistence, validation, backups: Task 3. Load/velocity/1RM conventions: Tasks 1, 4, 7. CMJ/check-ins/baseline versions: Tasks 5, 7. Equipment alternatives: Task 6. All four screens, logging, source inspection, and error states: Task 7. Offline caching, update behavior, final verification, and user instructions: Task 8.

The five Review Focus cases each have explicit tests in their owning tasks. Shared types and public signatures are defined before consumers. No implementation starts until the user reviews this plan and chooses the execution method.
