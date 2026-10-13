# LP/UP upgrade: source inspection and research findings

Status: research and proposed design directions only. This document is not an approved implementation specification. No application behavior has been changed for this upgrade.

## User goal

Prioritize jump height and explosive athletic performance. Support choosing between LP and UP, meaningful phase names instead of calendar months, separate program progress, cancellation/pause/resume, history-aware transfer suggestions, body/recovery charts, a broader movement library with suitable substitutions, and a dark blue/purple interface with red concern indicators.

## Source inspection

Repository main revision inspected: `27a9ac924647066eba52f782edbea4e269fe20b8`.

- Existing LP source folders: April, May, June; 78 images and 57 sessions already imported in version one.
- New UP source folders: July has 22 images and 19 session identities; August has 19 images and 18 session identities. Total: 41 images and 37 sessions. Counts reflect available sources, not an inferred five-day-per-week schedule.
- July screenshots explicitly identify 波动周期A组1; August screenshots identify 波动周期A组2. Warmup, Supplement, Continued, and Optional files must be classified as attached instructions, continuation, conditional alternatives, or optional sessions; file suffix alone cannot prove that work is additive.
- Representative weeks were inspected in all new folders. The tall August images were additionally inspected at readable scale at their headers. Full exercise-by-exercise transcription and source review remains implementation work, not a completed claim here.

Observed UP examples:

- July W1D1 combines jumps/throws, 4×5 back squats at 80–83%1RM, trap-bar work, unilateral/accessory work, and optional measured-velocity instructions for experienced athletes.
- July W1D2 prescribes front squats at 80–85%1RM with an average-velocity target, velocity floor, ≥20% velocity-loss stop instruction, and specific weight-adjustment rules. Continued pages contain other exercises and conditioning, not independent sessions.
- July includes cluster sets, accommodating resistance, repeated sprint work, a conditional sprint supplement, and an optional jump/sprint/change-of-direction test day.
- August W1D1/W1D2/W1D4 contain warm-up qualification rules, exercise-specific MCV targets and floors, and velocity-loss adjustment bands. They include instructions to reduce load/repetitions, extend rest, stop a set, or cancel remaining exercise sets. Preserve these as source-author rules applicable to their stated exercises and experience levels; they are not universal research thresholds.
- August W2D1 explicitly says the session has no velocity autoregulation. A program-level default must not overwrite this exception.
- August W2D4 measures clean and jerk portions of a combined repetition separately. Do not flatten two segment targets/floors into one velocity value.
- Across both UP blocks, strength, ballistic/reactive work, unilateral work, conditioning, and sprint/COD sessions coexist. Purpose labels should describe emphasis; neither program name nor a month implies one exclusive stimulus.

## Naming directions to validate in the specification

Number phases from the beginning of the supplied track. Earlier unseen phases cannot justify calling the first imported LP block Phase 2. Retain original source paths/IDs for provenance and migration, but replace calendar labels in ordinary UI.

Proposed overall LP track labels:

1. Linear Periodization — Phase 1: Force–Power Development.
2. Linear Periodization — Phase 2: Strength Capacity & Landing Control.
3. Linear Periodization — Phase 3: Acceleration & Power Expression.

Proposed UP labels:

1. Undulating Periodization — Phase 1: Concurrent Strength, Power & Sprint Development.
2. Undulating Periodization — Phase 2: Velocity-Regulated Strength & Reactive Power.

These are editorial interpretations of imported work, not source-author phase titles or evidence that the existing LP source is a mathematically pure linear progression. Show within-phase emphasis changes by session/week; do not force every stimulus change to a source-month boundary. Reduced late-block sessions can be marked preparation/reduced volume where the source supports it; do not call the whole final week a taper without evidence.

## Research and implications

### Periodization

Moesgaard et al. (2022), *Effects of Periodization on Strength and Muscle Hypertrophy in Volume-Equated Resistance Training Programs: A Systematic Review and Meta-analysis*.
https://pubmed.ncbi.nlm.nih.gov/35044672/

The review compares periodized/nonperiodized and linear/undulating resistance training while equating volume. Its strength findings do not establish that UP universally improves CMJ more than LP or that a particular mid-program switch is safer. App recommendations should prioritize the athlete's goal, actual prescription, training history, and recovery context rather than declaring a universally superior program.

Currier et al., ACSM (2026), *Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews*.
https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/

Updates the 2009 position stand. The overview supports progressive resistance training and goal-specific manipulation of load, volume, and fast concentric/power work. It does not consistently find periodization or equipment type decisive across its healthy-adult outcomes. Healthy-adult findings cannot simply prescribe advanced athletic jump training. Use it as background for movement-library rationale, not as a blanket substitute conversion table.

### Load and recovery

Halson (2014), *Monitoring Training Load to Understand Fatigue in Athletes*.
https://pubmed.ncbi.nlm.nih.gov/25200666/

Supports interpreting internal and external load together and considering neuromuscular measures, subjective reports, and sleep quality/quantity. The combined framework informs transfer previews; a single scalar does not capture every kind of stress.

Impellizzeri et al. (2020), *Acute:Chronic Workload Ratio: Conceptual Issues and Fundamental Pitfalls*.
https://pubmed.ncbi.nlm.nih.gov/32502973/

Identifies causal and statistical problems with ACWR-based injury recommendations. Therefore do not label an ACWR band as safe, training insufficient, or an injury probability. Do not treat chronic load as measured fitness or acute load as measured fatigue. Optional ratios may be presented descriptively with explicit calculation/coverage, not used as a safety certificate or sole transfer rule.

Retain existing CMJ, session-RPE, and subjective-monitoring evidence from the version-one specification. CMJ percentage change is performance deviation, not a validated fatigue percentage. A changed test method/protocol must not share its baseline by default.

### Velocity and movement substitutions

Weakley et al. (2021), *The Implementation of Velocity-Based Training Paradigm for Team Sports: Framework, Technologies, Practical Recommendations and Challenges*.
https://www.mdpi.com/2075-4663/9/4/47

Explains exercise-dependent load–velocity relationships and practical measurement considerations. Source mean-concentric, mean-propulsive, and peak targets must retain their measurement definitions. Replacing back squat with front squat, goblet squat, or a machine does not justify copying the same kg, percentage reference, or m/s target.

*The Predictive Validity of Individualised Load–Velocity Relationships for Predicting 1RM: A Systematic Review and Individual Participant Data Meta-analysis* (2023).
https://pmc.ncbi.nlm.nih.gov/articles/PMC10432349/

Individual load–velocity estimates have limitations. Do not infer a substitute's reliable 1RM/velocity profile from another exercise or an isolated recorded rep. Where calibration is absent, show provisional effort/explosive-intent guidance and missing calibration instead of fabricated precise targets.

*Methodological considerations for determining the volume and intensity of drop jump training. A systematic, critical and prepositive review* (2023).
https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2023.1181781/full

Discusses how drop-jump intensity/volume and monitoring depend on more than contact count. Separate low-intensity pogo work from depth/reactive jumps; track landing/reactive demands, direction, unilateral/bilateral work, surface/height, and novelty when available. Do not claim equal counts make different plyometrics equivalent.

## Recommended application direction

### Program identities and progress

Create stable program IDs and individual enrollment IDs with phase/session progress. Keep one actively scheduled program, preserve paused/cancelled/completed enrollments, and offer queue/start/pause/resume/end/cancel-transfer actions. Completed, partial, skipped, and unspecified sessions remain distinct. Track actual training dates and elapsed calendar time separately; pausing must not advance the training cursor or erase records. Repeated program runs need separate enrollment identities.

Migrate version-one records transactionally into a legacy LP enrollment without changing record IDs, dates, or CMJ protocols. Preserve old session IDs internally and old backup import via explicit migration. Phase renaming must not rewrite historical work.

### Transfer advice

Recommend a transparent candidate comparison and optional bridge preview, rather than either an unrestricted switch with no context or an unvalidated learned injury model.

Compare the proposed destination's next sessions with recent actual training across both programs: session duration/RPE where supplied, strength work by pattern, heavy lower-body exposure, jumps by demand category, sprint exposure, exercise-specific velocity trends, CMJ, sleep, soreness, stress, pain, illness, and data completeness. Cancelled/paused programs remain in recent physical-load history.

Prefer an appropriate entry/familiarization block when a late destination phase introduces unfamiliar loading or complex movements. Show why a candidate is recommended, why a switch should be deferred/reviewed, or why available data cannot support ranking. Do not automatically jump to the same week number in another program. Preview any proposed volume/rest/intensity edits and require acceptance before scheduling them. No claim can guarantee prevention of injury or illness.

Do not invent whole-session planned RPE from exercise RPE. Missing target duration/RPE or movement calibration limits transfer confidence. Confirmed rest days can be zero load; unlogged days must stay unknown. Phase selection may favor end-of-microcycle transitions, but that alone cannot establish suitability.

### Dashboard

Match the attached visual structure with dark panels, blue/purple primary accents, and red concern indicators with text labels. Proposed plots:

- Planned/actual daily session load and descriptive short-/longer-term load trends.
- CMJ height and baseline deviation, segmented by protocol/baseline version.
- Sleep duration and quality, perceived fatigue, soreness, and stress.
- Optional body mass, resting heart rate, pain/illness annotations, and HRV only when measurement method is supplied.
- Jump contacts by demand category, sprint distance/exposure, and compatible velocity performance.

Provide day/week/month range controls, phase/program-switch/pause markers, and gaps for missing data. Use a shared global recovery timeline and optional program/enrollment filters. Body mass changes are not fatigue or moral quality indicators. Do not fabricate a 0–100 readiness score from incompatible scales.

### Movement library

Curate movements by pattern, training intent, force direction, contraction/tempo, unilateral/bilateral use, equipment, reactive/contact demand, required skill, and source references. Include squat, hinge, push/pull, calf/ankle, trunk/anti-rotation, carries, throws, vertical/horizontal/lateral jumps, acceleration/COD, and conditioning.

A substitution preview must show the original and replacement prescription. Match intent and movement demands before adapting sets/reps/rest/effort; use the replacement's dated 1RM and compatible velocity profile for numeric kg/m/s targets. Keep uncertainty visible. Source-provided alternatives take priority. Never turn a low-impact cardio replacement into maximal running automatically or present a generic movement-pattern match as full equivalence.

## Next decision

The conversational design has been approved. The written [specification](../superpowers/specs/2026-10-13-lp-up-program-management-design.md) is ready for user review before implementation planning. Native execution and GitHub pushing remain the user's stated preferences; they do not need to be requested again.
