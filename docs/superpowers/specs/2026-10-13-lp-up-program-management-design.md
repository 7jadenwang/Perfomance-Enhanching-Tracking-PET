# LP/UP program management and performance monitoring

Status: written specification for user review. Conversational design approved; implementation has not started.

## Goal and scope

Help the athlete develop jump height and explosive athletic performance while choosing, following, and moving between the supplied Linear Periodization (LP) and Undulating Periodization (UP) programs. Preserve source prescriptions and actual training history, explain changes in training demand, and make equipment substitutions practical without inventing equivalent weights or velocities.

The application remains the existing phone-friendly, browser-local React/TypeScript application. The athlete trains at one well-equipped gym, can always run, enters CMJ heights from a slow-motion jump app, and can enter measured lifting velocity. Rowing, SkiErg, and air-bike availability remain configurable. Native execution and pushing necessary project files to GitHub are existing user preferences. Personal athlete data stays in browser storage and exported backups.

This upgrade covers program definitions and enrollments, UP import, recovery/load charts, a curated movement library, transfer previews, and the dark theme. It does not introduce cloud athlete accounts, device integration, an unrestricted workout generator, or a trained injury-prediction model. Transfer advice cannot guarantee prevention of illness or injury.

## Sources and phase names

Import from repository main revision `27a9ac924647066eba52f782edbea4e269fe20b8`. Existing LP contains 78 images representing 57 session identities. New UP contains 41 images representing 37 session identities: July 22/19 and August 19/18. Verify these totals against the source manifest during implementation. An absent day is unspecified, not an invented rest session.

Use stable program IDs `lp` and `up`. Number phases from the beginning of the supplied track; unseen earlier training cannot justify starting at Phase 2. Ordinary navigation uses these names:

| Program | Phase | Purpose label | Original source folder |
| --- | --- | --- | --- |
| Linear Periodization | 1 | Force–Power Development | April |
| Linear Periodization | 2 | Strength Capacity & Landing Control | May |
| Linear Periodization | 3 | Acceleration & Power Expression | June |
| Undulating Periodization | 1 | Concurrent Strength, Power & Sprint Development | July |
| Undulating Periodization | 2 | Velocity-Regulated Strength & Reactive Power | August |

Purpose labels are editorial descriptions, not source-author titles or evidence that the LP source follows a mathematically pure linear progression. Preserve Chinese exercise/coaching text. Keep calendar names in source filenames, provenance, and legacy IDs only. Phase cards and week/session annotations describe changes in emphasis within each block; do not declare a full taper where only particular sessions reduce volume.

Preserve original image assets and link each prescription to its source pages. Classify Continued, Warmup, Supplement, and Optional pages by their actual instructions. Attach warmups and continuations to the parent session; conditional supplements require selection and must not silently double the workload. Optional sessions remain optional.

Resolve transcription by reviewing images at readable scale. Conflicting filename/day headings remain flagged with both original values; until resolved, use filename-derived session identity and ordering, disclose the conflict, and do not silently infer a new calendar day. Unreadable or ambiguous prescription fields remain unset with the original source available. Completeness checks verify coverage/provenance, not that OCR is accurate.

## Program enrollment and scheduling

A program definition describes reusable phases and source sessions. An enrollment describes an individual run: stable ID, program/version, chosen entry session, start date, status, future schedule overrides, lifecycle events, and workout links. Repeating a program creates another enrollment rather than overwriting the first.

Enrollment states are queued, active, paused, cancelled, and completed. At most one enrollment is active; one may be selected as the next queued program. The user can replace/cancel that queue. Starting or resuming a different enrollment previews what will be paused before accepting the change. Cancelling an active enrollment ends its future schedule and preserves all logs. A cancelled enrollment can be inspected or used as the basis of a new run; resuming uses the paused state. Completion is explicit after required source sessions have been resolved, not inferred from elapsed dates.

Calendar progress and training progress are separate. Show elapsed calendar days, distinct dates with confirmed actual training, completed sessions, partial sessions, skipped sessions, and remaining required sessions. Draft/skipped sessions do not count as actual training days. A partial session counts as an actual training day only if it contains confirmed performed work or valid actual duration and session-RPE; show partial status. Multiple workouts on the same date count as one training day within that enrollment. Unattributed workouts remain in global physical history.

Elapsed dates never mark workouts completed. A passed unlogged session remains unresolved. Pausing freezes the continuation position and unscheduled future work. Resume asks for a restart date and shifts only unresolved future sessions; past logs retain their IDs, dates, enrollment, and prescriptions. If overdue unresolved work remains, preview explicit reschedule or skip choices. Skipping resolves the schedule position without claiming work occurred. Optional sessions do not block completion.

Enrollment scheduling uses source day offsets from the chosen entry, preserving prescribed spacing. The active training position is the first unresolved required session, not a count of calendar days. Existing logs can still be reopened/edited by stable workout ID after scheduling changes. All physical training remains relevant to global recovery regardless of enrollment status.

## Prescriptions and measured velocity

Separate immutable source prescriptions, accepted target revisions, and actual rows. An accepted revision records its reason, original prescription, changed fields, and timestamp; reopening a historical workout uses its saved target snapshot. Catalogue upgrades cannot retroactively change that snapshot.

Extend prescription structures for clusters and exercise components, source conditional instructions, experience applicability, velocity metric, floor, loss definition, and next-set actions. Numeric exercise-RPE is not whole-session RPE. Preserve rest, tempo, per-side work, load reference, accommodating resistance, optional status, and exercise-specific exceptions.

Mean concentric velocity (MCV), mean propulsive velocity, peak velocity, generic unspecified mean, and unspecified source metric remain distinct. Comparison also requires matching exercise/component, ROM, method/device, load convention, loaded hands, and recorded load. No conversion across those measurement definitions is implied.

Represent clean and jerk component measurements separately even when the source combines them in one repetition. Preserve the author's qualification/floor rules and the fastest-repetition reference where specified. Existing fastest-to-final loss remains available only for a complete valid rep series; if a rule depends on intermediate reps, it requires those reps too. Missing measurements cannot trigger an invented stop instruction.

Source velocity bands can prescribe load/repetition reduction, extra rest, stopping the current set, or cancelling remaining sets. Display the original rule and an explainable suggestion after user-entered measurements; do not silently change logged work. If endpoints overlap, retain source wording and mark the boundary ambiguous instead of selecting an action automatically. August W2D1's explicit absence of velocity autoregulation overrides any program-level convention. These are author prescriptions, not universal fatigue thresholds.

## Movement library and substitutions

Build a reviewed library covering squat, hinge, horizontal/vertical push and pull, ankle/calf, unilateral strength, trunk/anti-rotation, carries, throws, vertical/horizontal/lateral jumps, acceleration, change of direction, and conditioning. Store Chinese/English names, pattern, training intent, direction, unilateral status, tempo/contraction, equipment, skill requirements, landing/reactive demand, and references. Include source movements and a practical set of gym/running alternatives; do not pad the library with unreviewed automated variations.

Equipment filters show available, unavailable, and unconfirmed equipment. Source-specified alternatives have first priority. A pattern match alone is not sufficient: rank alternatives by intended adaptation, movement demands, familiarity, and measurement applicability. Distinguish direct source alternatives, reviewed conditional alternatives, and custom manual substitutions.

Every substitution preview shows original and replacement sets/reps, rest, tempo, load basis, velocity instructions, and affected exposure estimates. Acceptance saves the revised target without overwriting the source. The athlete can undo before performing work; already recorded rows retain their actual exercise.

For resistance work, use a dated replacement-specific 1RM with compatible ROM to calculate percentage targets. A reviewed alternative may supply a justified percentage/effort range, but it cannot inherit the original exercise's kilograms or percentage reference by default. Without a suitable reference, show an effort/technique target and require the user to choose kilograms. Numeric replacement velocity targets require compatible replacement-specific calibration or explicit source targets; one isolated rep or another exercise's profile cannot establish them. Preserve explosive intent when appropriate while clearly marking unavailable numeric guidance.

For jumps, account for direction, unilateral use, drop height, landing/reactive demand, and experience. Different contact counts do not establish mechanical equivalence. Avoid introducing depth jumps or unfamiliar high-demand unilateral work as an automatic replacement. For conditioning, preserve purpose, work/rest structure and effort when appropriate; do not equate machine distance/calories with running distance or convert low-impact aerobic work to maximal sprints. Skill-heavy substitutions and uncertain dose mappings require manual review rather than a falsely precise recommendation.

Each curated substitution includes the rationale and fields that must be recalibrated. Uncertain equivalence is visible in the preview and transfer comparison.

## Recovery data and dashboard

Retain the current three-trial CMJ protocol, frozen 14-eligible-day baseline, baseline versions, and provisional low-CMJ rule. Changed technique/device/protocol receives a separate baseline. Valid measurements excluded from baseline because of pain or illness can still appear in recovery history. Percentage deviation is performance deviation, not a measured fatigue percentage. Height alone can miss changes in jump strategy.

Keep sleep hours, sleep quality, perceived fatigue, soreness, stress, and pain/location. Add optional body mass (kg), resting heart rate (bpm), illness flag/notes, and HRV value with metric, unit, measurement method, and protocol. HRV methods/metrics cannot be pooled into a trend without matching definitions; no standalone HRV readiness algorithm is introduced. Preserve existing scale directions and show them beside inputs.

Add an explicit daily activity annotation: rest confirmed, training confirmed, or unknown. Confirmed rest can contribute zero load; an unlogged day stays unknown. Incomplete workout load on a training day remains incomplete. Multiple workouts sum their valid session loads while exposing missing components.

The dashboard follows the supplied visual structure with summary cards and readable time-series panels:

- Planned versus actual session load (duration × whole-session RPE, AU), with completeness.
- Descriptive 7-day and 28-day mean daily actual load, only when all dates in the respective window have known complete load or confirmed rest. Partial-window totals/counts remain available but are not shown as complete rolling estimates.
- CMJ mean height and baseline deviation, separated by protocol and baseline version.
- Sleep duration/quality and perceived fatigue/soreness/stress, using explicit units/scales.
- Optional body mass, resting heart rate, and compatible HRV series.
- Jump exposure by demand category, sprint exposure, and compatible exercise velocity trends.

Provide 7/28/84-day and all-history ranges, program/enrollment filters, phase/pause/transfer markers, raw-point tooltips, and a tabular accessible fallback. Default physical-load/recovery views include all enrollments and custom work. A filtered view clearly says it omits other training. Missing data creates gaps rather than zero-filled reassuring lines. Prescribed ranges remain ranges, and unsupported aggregate calculations stay unavailable.

Do not label rolling load as measured fitness or fatigue. ACWR is not included in the initial dashboard or transfer ranking; the screenshot's presentation is inspiration, not endorsement of its risk labels. Do not add an injury probability, a safe workload band, or a synthetic readiness score.

## LP ↔ UP transfer preview

Transfers are an explainable decision aid, not an automatic program replacement. The user selects a destination and requests comparison. Candidate entries are reviewed phase/microcycle starts, ranked for jump/explosive-performance intent and compatibility with recorded history. Do not match week numbers across tracks automatically or treat UP as universally superior.

The comparison reads global actual training over the last 7 and 28 calendar days, current recovery and CMJ protocol, dated exercise references, movement familiarity, equipment, and the next destination microcycle's targets. It compares separate dimensions rather than adding incompatible units: session load when planned duration/RPE exist, heavy lower-body work, pattern/relative-load exposure, plyometric demand, sprint/COD exposure, velocity compatibility, and new skill/impact demands. Completed and partial confirmed work from paused/cancelled programs still contributes. Missing planned session duration/RPE is disclosed; exercise RPE must not be substituted.

Use deterministic outcomes in this order:

1. **Defer and review:** current reported pain/illness, or unresolved source/substitution instructions essential to the proposed work. Explain the specific concern and suggest recovery or professional review as appropriate; this is not a diagnosis.
2. **Recovery concern — consider a bridge:** latest available check-in within three calendar days shows the existing low-CMJ rule, fatigue/soreness/stress at 4–5, or sleep quality at 1–2. Display measurement age and contributing signals. Compatible velocity changes are additional descriptive context, not an automatic fatigue classification. A single signal cannot prove fatigue.
3. **Insufficient information:** the latest check-in is older than three days, there is no valid three-trial CMJ measurement within three calendar days with a usable matching baseline, or one of the 7/28-day windows lacks complete daily load coverage. Still show known exposures, but do not issue an unqualified entry ranking. Explain which data would improve the comparison. The three-day recency choice is a product heuristic, not a validated safety threshold.
4. **Review candidate/bridge:** with sufficient information, rank reviewed entry points by fewer unfamiliar high-demand movements, fewer increases across measured exposure dimensions, then suitability for explosive performance. If competing dimensions disagree or all candidates increase demand, show the trade-off and prefer a familiarization/bridge preview. No fixed percentage increase is certified safe.

Numeric comparison uses measured/source-supported quantities only. Show increases relative to recent observed exposure without converting them into injury probabilities. Tie-breaking favors the earlier destination entry. End-of-microcycle switching may simplify scheduling, but does not itself prove suitability. Explain each ranking reason and calculation coverage in the UI.

A bridge is an optional seven-calendar-day target revision, preserving recovery spacing and familiar movements. Its eligible dose changes are removing optional work, reducing set counts within reviewed bounds, using the lower end of a supported source range, and extending rest where compatible. Unfamiliar impact/technical work requires a reviewed lower-demand alternative or remains excluded pending manual review. Do not invent replacement kg/m/s targets, exceed source intensity to compensate for lower volume, or cut sprint rest in a way that changes its intent. If no reviewed bridge satisfies those constraints, offer postponement/manual planning rather than generating arbitrary work.

Preview original destination week versus bridge, target changes, equipment/calibration gaps, and next continuation point. The continuation point is the selected destination entry following the bridge; the bridge does not falsely count source sessions as completed. The athlete explicitly accepts the preview to pause the old enrollment and activate the destination, or cancels with no schedule mutation. Pausing the previous program retains its continuation position. Changing data invalidates a stale preview and requires recalculation before acceptance. Subsequent mornings/logs may produce further suggestions, never silent prescription changes.

All recovery cutoffs inherited from v1, the three-day recency rule, candidate ranking, and bridge rules are transparent product heuristics. Research informs the dimensions and limitations, not validation of this particular algorithm.

## Storage, migration, and offline behavior

Introduce schema version 2 with separate program/enrollment identities, lifecycle events, target snapshots/revisions, extended morning data, activity annotations, and component-aware velocity. Catalogue version identifies the reviewed combined LP/UP sources. Keep domain validation and pure calculation modules separate from UI and persistence.

Migrate v1 browser data and backups transactionally before v2 validation. Create a legacy LP enrollment using the original start date/schedule overrides; preserve workout IDs, local dates, actual values, references, protocols and baseline versions. Existing LP session IDs remain unchanged. Custom workouts remain unattributed unless explicitly linked. Old mean velocity values retain their original metric; do not relabel them as MCV. Capture existing planned prescriptions as migration target snapshots without rewriting actual work.

Validate the entire migrated result before replacing persisted state. A migration or import failure leaves the original data untouched and offers an actionable error/export path. Export v2 backups with all mutable enrollment/target/history data. Continue importing supported v1 backups through migration. Unknown versions and invalid numeric/structural data produce no writes. Keep the existing explicit replace confirmation and export-before-replace affordance.

Keep the offline/update workflow and unsaved-draft protection. Include all reviewed sources in the versioned offline asset manifest and verify complete readiness before saying the program is available offline. If expanded image size causes precache limits, configure inclusion deliberately and surface caching failure/retry; do not silently omit tall source images. Personal records and backups remain outside Git commits.

## Appearance and accessibility

Use a dark navy/near-black background, differentiated dark cards, blue-to-purple accents for navigation/actions/charts, and red for fatigue/recovery concern indicators. Concern cards include text and icons; color alone never carries meaning. Update relevant application/manifest theme colors and icons consistently.

Maintain readable contrast, keyboard focus, labelled fields, touch-friendly controls, mobile chart sizing, and reduced-motion preferences. Separate multiple chart units/scales instead of implying that kg, CMJ cm, and sleep hours share an axis. Preserve Chinese text legibility and the source-image viewer.

## Acceptance and verification

1. All five phases have meaningful names in ordinary UI; source provenance and legacy IDs remain available. The manifest covers the 119 supplied images/94 session identities, with conditional/optional source handling reviewed.
2. Users can queue/select LP or UP, pause/resume/cancel, repeat runs, and inspect progress without losing historical records or automatically completing elapsed sessions. Only one enrollment is active.
3. Migration and v1/v2 import round trips preserve dates, IDs, baselines, actual work and velocity meaning. Invalid imports/migrations leave stored data unchanged.
4. Source autoregulation exceptions, overlapping band ambiguity, complete-series requirements, and clean/jerk component measurements behave as specified.
5. Substitution previews retain source prescriptions and expose recalibration. No cross-exercise kg/m/s copying or machine-to-running equivalence appears without reviewed support.
6. Charts distinguish actual/planned/range/missing values, segment protocols, use appropriate units, and preserve unknown-day gaps. Rolling estimates require coverage.
7. Transfer tests exercise pain/illness, recovery concerns, stale/missing data, conflicting exposure dimensions, unfamiliar movements, cancellation, stale previews, accepted bridges, and continued inclusion of ended enrollments in physical history.
8. Production browser checks cover mobile navigation, program lifecycle, source viewing, logs/mornings, substitution/transfer previews, backup migration, charts, persistence, offline sources and update draft retention. Verify dark-theme contrast/focus visually.
9. Run appropriate unit/domain tests, source checks, type checking, production build and browser tests before reporting implementation complete. Use installed Chromium in this environment when bundled browser download is unavailable.

Implementation milestones remain one integrated upgrade: program/source/migration foundation; movement/velocity and monitoring calculations; transfer previews and lifecycle UI; dashboard/theme; independent review and production verification. The written implementation plan will turn these boundaries into executable tasks after specification approval.

## Evidence and limitations

The [v1 design](2026-10-13-training-companion-design.md) retains the CMJ, session-RPE and subjective-monitoring evidence and the exact existing calibration/alert behavior. Additional inspected sources:

- [Moesgaard et al., 2022: periodization meta-analysis](https://pubmed.ncbi.nlm.nih.gov/35044672/) — informs LP/UP context; does not establish universal CMJ superiority or safe transfers.
- [Currier et al./ACSM, 2026: resistance training overview of reviews](https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/) — supports goal-specific strength/power prescription; healthy-adult findings are not an exact advanced-athlete substitution table.
- [Halson, 2014: monitoring load and fatigue](https://pubmed.ncbi.nlm.nih.gov/25200666/) — supports combining external/internal load, neuromuscular and subjective measures.
- [Impellizzeri et al., 2020: ACWR conceptual pitfalls](https://pubmed.ncbi.nlm.nih.gov/32502973/) — supports excluding safe-zone/injury-risk claims and avoiding ACWR-driven transfer decisions.
- [Weakley et al., 2021: practical VBT framework](https://www.mdpi.com/2075-4663/9/4/47) — informs exercise/metric/device specificity and velocity implementation.
- [2023 individual load–velocity predictive-validity review](https://pmc.ncbi.nlm.nih.gov/articles/PMC10432349/) — supports exposing calibration uncertainty rather than fabricating replacement targets.
- [2023 drop-jump volume/intensity review](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2023.1181781/full) — supports tracking reactive/landing demands beyond contact counts.

Source inspection and research findings are recorded in [research notes](../../research/2026-10-13-lp-up-upgrade-findings.md). Full UP transcription is implementation work, not a completed research-stage claim.
