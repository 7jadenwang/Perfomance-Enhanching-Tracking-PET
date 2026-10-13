# PET — Training companion

A phone-friendly web app for following the April–June training program, comparing planned and actual training, logging measured lifting velocity, and monitoring morning CMJ trends.

The repository’s original longer-term goals—creating monthly/quarterly plans and evaluating performance—remain future work. This version establishes the logging and measurement foundation needed to assess those features.

## Run locally

Use Node.js 24 or later.

```sh
npm ci
npm run dev
```

Open the address printed by Vite. For a production preview with offline caching:

```sh
npm run build
npm run preview
```

The app is a static client application with no backend or account. A deployed static host must use HTTPS; localhost also supports service workers. `npm run dev` is for development and does not generate the production service worker. Install from the browser's Add to Home Screen / Install app option where supported. The original images add about 11 MB to the first offline cache preparation; wait for **Offline ready** before disconnecting.

## Daily use

1. Set your program start date and equipment availability in Settings. Running is always available. The three month labels map to sequential four-week blocks. Missing days are unspecified, not automatically rest days.
2. Enter three CMJ heights from your existing jump app, using a consistent protocol, and complete the optional recovery check-in. Invalid trials and unsuitable baseline days can be excluded. A changed protocol starts a separate comparison series.
3. Open the scheduled session or browse Program. Original Chinese plan images are bundled for inspection, including continuation pages.
4. Record actual sets. Copy planned sets creates **unconfirmed drafts**; confirm completed sets and choose partial/completed status to count their work. Record whole-session minutes and session RPE separately from exercise RPE.
5. Enter measured velocity, metric, device/method, and range of motion. Confirm what the source's MV target means before comparing it to your measurement. Per-repetition velocity loss needs a complete series; a set average alone cannot produce it.
6. Check Progress for load completeness and separate exercise-specific measures. Record an equipment substitution explicitly; running is not mechanically equivalent to rowing, skiing, or cycling.

## Records and backups

Personal workout, CMJ, recovery, and settings records are stored in IndexedDB **in your browser on your device**. They are not sent to GitHub or any server. Changing device/browser, clearing site data, or browser storage eviction can remove access to them.

Export a versioned JSON backup in Settings regularly. Import previews record counts and asks before replacing current records; export the current data first. Corrupt or incompatible imports leave existing data intact. Export/import is the supported way to transfer records between devices. The session editor can also export an unsaved entry if persistence fails; this single-entry recovery file is not a full-state backup.

GitHub stores the source code, lockfile, tests, specifications, and original program assets. Dependencies, build output, test output, execution scratch files, and personal backups are not intended for source control.

## Calculations and limits

- Internal session load: minutes × whole-session RPE (0–10), in arbitrary units. Planned duration/RPE must be entered explicitly. Missing measurements remain unknown and totals show completeness.
- External work retains its units: kilograms/repetitions, jumps, holds, sprint distances, interval work, and velocity are not added into a fictional universal score. Confirm per-hand versus total external load and per-side conventions. For per-hand weights, enter whether one or two hands carry a weight per repetition; this is independent of doing both working sides.
- A matching dated 1RM can produce target kilograms only where the source specifies its reference exercise. Different exercises and ranges of motion do not automatically share references. Saved historical workouts can be reopened from Progress even after rescheduling.
- CMJ baseline: first 14 eligible daily averages of three valid trials, mean and sample standard deviation. Establish it in Settings; it remains frozen until explicitly recalibrated. Prior baseline versions are retained.
- Low-CMJ signal: below baseline mean minus two SD. Zero variance suppresses the statistical flag. Questionnaire concern: fatigue/soreness/stress 4–5 or sleep quality 1–2. These are provisional product heuristics, not validated fatigue predictions. No flag detected does not guarantee readiness.
- Technique and take-off/landing posture affect flight-time-derived jump height. Height alone can miss fatigue-related changes in movement strategy.
- The app explains signals and preserves your original plan. It never silently changes prescribed work.

Research links and method descriptions are available in Settings and in the [design specification](docs/superpowers/specs/2026-10-13-training-companion-design.md).

## Program provenance

78 source images, 57 sessions, 441 readable prescription blocks from repository revision `6e89e968fffe011c76eccb2f697237572eacdf8a`. Reviewed readable summaries live in `scripts/reviewed-prescriptions.json`; regenerate bundled data with `python scripts/import-program.py`. Source mappings and review notes are in `src/program/source-manifest.json`.

Summaries retain the principal prescriptions; original images retain detailed coaching instructions and are the authority. Complex wave/cluster/circuit structures and source contradictions remain explicitly flagged rather than guessed. Source MV notation and unclear 1RM references require confirmation. Each completed set can be logged separately even when the original block cannot be safely flattened.

## Verify

```sh
npm test
npm run check:program
npm run typecheck
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

Browser tests use installed system Chromium when available, otherwise Playwright's bundled Chromium. Override with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` if needed. GitHub Actions runs the checks on feature-branch pushes and pull requests; no deployment is configured.
