# Training companion: version one design

Date: 2026-10-13
Status: written specification awaiting user review. The conversational design was approved; implementation is not yet started.

## Purpose and agreed constraints

Build a phone-friendly web app for one athlete to follow the April–June three-month program, compare prescribed and completed training, and monitor changes in recovery. Success means the athlete can see a session's original prescription, record what actually happened without retyping the plan, and understand the evidence behind a recovery flag.

The athlete uses one well-equipped gym, can always run, measures CMJ height with an existing slow-motion/flight-time app, and can enter measured lifting velocity. Rowing, SkiErg, and air bike availability is optional. Preserve Chinese exercise names and coaching instructions.

Version one uses manual entry, automatic calculations, browser-local persistence, and export/import. No login, cloud synchronization, video analysis, device integration, injury prediction, validated fatigue percentage, autonomous plan changes, or long-term performance prediction.

## Source program and import

Source repository: https://github.com/7jadenwang/Perfomance-Enhanching-Tracking-PET

The GitHub main branch contains April, May, and June session images. The initial workspace checkout is older and contains only an introductory README. Implementation must retrieve the source revision explicitly and record its commit SHA before importing data; it must not overwrite the working branch with the remote branch.

Import all session images into reviewed structured program data. Retain source paths and package the original images with the app so the athlete can inspect them without relying on GitHub availability. Inspect and comply with any repository instructions discovered when retrieving the revision.

- A session is keyed by month block, week number, and day number, not the screenshot publication date.
- Merge Continued, Continued_2, and further continuation images into their parent session in numerical order. Attach Sheet images as supporting material; do not duplicate exercises merely because they appear in two images.
- Preserve Optional sessions as optional. Missing day images mean unspecified days, not inferred rest days.
- Keep ranges, per-side quantities, percent-1RM reference exercise, tempo, velocity bounds, rest periods, supersets, cluster sets, equipment alternatives, and optional exercises.
- Do not guess unclear units, exercise names, 1RM references, or set structures. Retain the original wording and mark the affected field as needing confirmation. Other unambiguous fields remain usable.
- Review transcription against every original image before claiming the full program is imported. Discovery of inconsistent set counts or instructions requires preserving the source and flagging the ambiguity.

Provide a selectable program start date. Treat April, May, and June as three sequential four-week blocks, preserving the original labels. Week 1 day 1 maps to the selected date and each subsequent day advances by one calendar day. A date without a prescribed session displays Unspecified. The user can reschedule an individual session without changing its identity or original prescription.

## Screens and daily workflow

### Today

Show the scheduled session, original prescription, recovery status, and actions to log morning measurements or begin recording training. Outside the program range, explain that no session is scheduled and allow browsing the program.

Morning entry accepts individual CMJ heights in centimetres and a short check-in: sleep hours, sleep quality, fatigue, soreness, stress, and pain present/location. Quality uses 1 = very poor through 5 = very good; fatigue, soreness, and stress use 1 = very low through 5 = very high. All fields are optional; missing values are never treated as zero or as reassuring.

### Program

Browse month/week/day, inspect instructions and source images, choose a start date, reschedule sessions, and edit optional equipment availability. Suggested equipment defaults include ordinary gym strength equipment and running. Specialized cardio machines start unconfirmed and can be marked available or unavailable.

### Log session

Display target values alongside initially empty actual values. Offer an explicit Copy planned sets action for convenience, but copied rows remain drafts until the athlete confirms the completed work. Save drafts without counting them in actual load totals.

Support completed, partial, skipped, and draft states; actual totals include confirmed work in completed or partial sessions. Skipped sessions have zero confirmed work; unlogged sessions remain unknown. Record session duration in minutes, whole-session RPE on a 0–10 scale, and optional notes. Capture whole-session RPE separately from exercise/set RPE.

Exercise-specific rows support repetitions, kilograms, bodyweight, per-side work, isometric seconds, jump/throw repetitions, sprint distance/time, interval work/rest, rounds, measured velocity, and whether prescribed tempo was followed. Show only relevant inputs. Record warm-up work separately but include it in the defined whole-session duration.

### Progress

Show planned versus actual weekly session load with measurement completeness, confirmed session counts, exercise-specific volume, CMJ history, and compatible velocity trends. All views distinguish prescribed ranges, estimated session load, recorded measurements, and missing values. Include export/import and a link to the methods and research notes.

## Load calculations

Use separate internal and external measures; never add kilograms, metres, jump contacts, and session-RPE units into a fabricated universal score.

Internal session load in arbitrary units is whole-session duration in minutes multiplied by whole-session RPE. Define duration consistently as warm-up start to session finish, including prescribed rest and excluding unrelated interruptions.

- Planned load requires an explicitly entered planned duration and target whole-session RPE. The images' exercise RPE values do not supply whole-session RPE. Where these inputs are missing, show Not estimated and show the available planned exercise work instead.
- Actual load requires confirmed duration and whole-session RPE. Missing either means Unknown, not zero.
- Show absolute and percentage differences only when both comparable values exist; percentage difference is unavailable when planned load is zero.
- Weekly sums must label how many prescribed and confirmed sessions have complete load inputs. Do not present a partial sum as a complete weekly total.

External work includes sets/reps/load for strength, per-side repetitions for unilateral work, hold seconds for isometrics, jump contacts by exercise type, throws, sprint repetitions/metres/time, and conditioning work/rest/rounds. Calculate load-volume as the sum of actual kilograms times repetitions only where load conventions are known; compare within the same exercise and convention. A bilateral jump is one repetition/contact event, not two contacts unless the source explicitly uses another convention. Do not infer mechanical work or force from isometric duration alone.

Percent-1RM targets require a dated athlete 1RM record with the source prescription's reference exercise. Different ranges of motion and exercises must not share a 1RM automatically. Preserve unusual or ambiguous prescriptions for confirmation. Actual kilograms remain directly loggable even without a 1RM record.

## Velocity and tempo

Preserve prescribed m/s targets and inequalities/ranges exactly. Each measurement identifies the metric (mean, mean propulsive, or peak), device/method label, exercise, load, and repetitions covered. Source notation MV is preserved; only compare a target with an actual metric after its meaning is confirmed.

Offer set-average entry and optional per-repetition entry. A set average supports a target comparison but cannot determine within-set velocity loss. For a complete per-repetition series, define end-of-set velocity loss as 100 × (fastest recorded rep velocity − final rep velocity) / fastest recorded rep velocity. Label the definition in the UI; do not claim it is a universal fatigue measure. Require at least two readings and a positive fastest reading. Partial series cannot produce a whole-set velocity-loss value.

Compare trends only within compatible exercise, load/range of motion, metric, and measurement method. Retain incompatible measurements but do not merge them into one comparable trend. Velocity is an additional measure, not a multiplier invented to alter load-volume.

Store tempo instructions separately: for example, 3-1-X-1 includes explosive concentric intent, not a measured velocity or one-second concentric duration. Where a source tempo is ambiguous, keep its text. Actual tempo compliance and measured velocity remain independent.

## CMJ and recovery interpretation

Morning testing is distinct from training jumps. Recommend three trials under consistent time-of-day, warm-up, arm use, footwear, surface, and measurement method. Store all trials and compute their arithmetic mean. Invalid/excluded trials remain stored with an exclusion reason. A mean from fewer than three valid trials is visible but does not contribute to baseline or automated flags.

Record the protocol and measurement method. A method/protocol change starts a new comparison series. Flight-time-derived height is sensitive to posture and technique; preserve the jump app's reported height rather than promising to correct it.

Initial baseline is the mean of the first 14 eligible daily CMJ averages, with their sample standard deviation. This is a provisional product calibration rule, not a clinically or individually validated fatigue threshold. Eligible records have three valid trials and consistent protocol; exclude records explicitly marked unsuitable for baseline because of illness, pain, changed technique, or measurement problems. Exclusions remain visible. The baseline is frozen until the user explicitly recalibrates; keep historical baseline versions and dates. Daily variability includes biological and measurement variation and is not labelled device error.

Before calibration is complete, display Building baseline and the number of eligible days collected. After calibration, show percentage change from baseline and a Low CMJ signal when the daily mean is below baseline mean minus two baseline standard deviations. If standard deviation is zero, do not produce this statistical flag; request more representative calibration data. These rules may miss fatigue or flag non-fatigue variation.

Use separate transparent signals rather than a numeric fatigue score:

- Check-in concern: fatigue, soreness, or stress is 4–5, or sleep quality is 1–2. These are configurable product heuristics, not validated diagnostic cutoffs.
- Low CMJ: the provisional baseline rule above is met.
- Multiple concerns: both CMJ and check-in concerns occur; explain each contributing measurement.
- Pain reported: display it prominently and suggest reviewing the session; do not prescribe a treatment or diagnose its cause.
- No flag detected: explicitly means no concern detected in the supplied measurements, not guaranteed readiness. Incomplete data shows Limited data alongside any available signals.

Suggestions invite the athlete to review the session, repeat a questionable measurement, or discuss adjustments with their coach. They never silently lower sets, replace exercises, or certify training safety. Changes require an explicit user edit and retain the original prescription.

## Equipment alternatives

Keep original exercises and selected substitutions side by side with a reason. Running is available; other specialized machines are optional. For conditioning, propose modality changes matched approximately by work duration, recovery duration, rounds, and intended effort, not a machine calorie/distance equivalence.

Easy jogs can be offered for general aerobic warm-ups when suitable. Running intervals may be suggested for conditioning but must identify increased impact and different muscle involvement. Do not automatically replace low-impact intervals with maximal sprints or replace rowing/SkiErg technique work with running. Where no reasonable substitute preserves the goal, state that and let the user edit or skip the block. The original April session already allows bike/sprint; preserve explicit source alternatives before adding new ones.

Record the actual modality and its work separately. Session load uses the actual duration/RPE regardless of substitution. Future weekly/monthly planning uses the saved equipment profile, but generative plan creation is outside version one.

## Data and application boundaries

Separate modules for source program/catalogue, schedule, workout records, morning measurements, athlete reference values/protocols, pure calculations, and persistence. Calculation modules depend on validated data, not UI state. UI components must not duplicate formulas.

Use an installable responsive web app with locally bundled program data and IndexedDB for mutable records. The first successful visit caches the app and program assets for offline use; indicate offline availability only after caching succeeds. No external service is required for routine use. Framework selection belongs to the implementation plan.

Give every session/record a stable ID, creation/update timestamps, an explicit local calendar date, and a schema version. Store measurements with units and their original values. Changing a program start date or rescheduling must not move historical workout or morning records. Local-date handling must avoid UTC conversion shifting records to a different day.

Export one versioned JSON backup containing schedule, settings, reference values, protocol/baseline versions, drafts, measurements, and confirmed logs. Bundled source data is identified by its version. Import validates schema and numeric bounds, previews counts and compatibility, then requires explicit confirmation to replace existing mutable data. Offer an export before replacement. Unsupported versions and corrupt files leave existing data untouched. Export/import is the supported cross-device transfer method.

Browser data can be cleared or evicted. Explain this in settings and encourage backup; never claim browser storage guarantees permanence. Show Saved only after the persistence operation succeeds. A storage failure preserves the current in-memory draft and offers export/retry.

## Validation and error handling

Accept decimal values where appropriate; reject non-finite and negative measurements, inconsistent ranges, RPE outside 0–10, and check-in values outside 1–5. Zero external load is valid for bodyweight/unloaded work; zero CMJ height is not a valid trial. Missing data remains null. Warn about implausible positive measurements without silently changing them.

Retain raw source instructions when structured data is incomplete. Do not let one ambiguous exercise block the rest of the session. Explicitly flag changed measurement protocols and incompatible velocity comparisons. Destructive record deletion and backup replacement require an explicit UI action and confirmation.

## Verification and acceptance

1. Every source image is inventoried and visually checked against imported data. Continuations, optional sessions, source alternatives, and missing days are handled as specified.
2. An athlete can set a start date, see the correct source session, log partial work and a substitution, reload, and recover the same confirmed records.
3. Planned values alone never contribute to actual load. Missing duration/RPE produces incomplete totals; exercise RPE never substitutes for session RPE.
4. Meaningful calculation tests cover ranges, unilateral quantities, missing inputs, zero denominators, compatible velocity metrics, partial rep series, and CMJ calibration/protocol changes.
5. Recovery outputs distinguish calibration, missing data, individual signals, and multiple concerns. They never produce a fatigue percentage or mutate prescriptions.
6. A backup round trip preserves records and baseline versions. Invalid imports and failed writes do not destroy existing records.
7. Verify core workflows at phone width, keyboard-accessible input, readable bilingual exercise labels, and offline use after successful caching.

## Research basis and limits

- Foster et al. (2001), A new approach to monitoring exercise training: https://pubmed.ncbi.nlm.nih.gov/11708692/ — basis for duration × session-RPE internal load, not proof that it captures all mechanical or neuromuscular stress.
- Claudino et al. (2017), The countermovement jump to monitor neuromuscular status: A meta-analysis: https://ro.ecu.edu.au/ecuworkspost2013/2538/ — supports CMJ monitoring and the sensitivity of average height compared with highest height.
- Gathercole et al. (2015), Alternative countermovement-jump analysis to quantify acute neuromuscular fatigue: https://pubmed.ncbi.nlm.nih.gov/24912201/ — supports the limitation that output height alone can miss changes in movement strategy.
- Saw et al. (2016), Monitoring the athlete training response: subjective self-reported measures trump commonly used objective measures: https://pubmed.ncbi.nlm.nih.gov/26423706/ — supports subjective monitoring; it does not validate this app's particular questionnaire or alert thresholds.
- Sánchez-Medina and González-Badillo (2011), Velocity loss as an indicator of neuromuscular fatigue during resistance training: https://pubmed.ncbi.nlm.nih.gov/21311352/ — supports measured velocity loss as an additional signal in the studied resistance-training context; it is not a universal model across exercises or sports.

CMJ calibration counts, alert rules, and questionnaire cutoffs above are explicit version-one heuristics. Validation of personal fatigue prediction requires a later study with sufficient consistent data and defined outcomes.

## Next stage

After the user reviews and approves this written specification, create the implementation plan using the Superpowers writing-plans workflow. Implementation begins only after the plan is reviewed and the execution method selected, as required by the invoked brainstorming skill.
