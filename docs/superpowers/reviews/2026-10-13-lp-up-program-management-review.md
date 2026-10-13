# LP/UP and private sync release review

Reviewed on 2026-10-13. One fresh gpt-6-astra reviewer examined the combined branch and reproduced adverse persistence paths. The reviewer initially requested changes. The implementer addressed the Critical and Important findings in one regression-driven fix pass; no second review was dispatched.

## Resulting behavior

LP and UP have separate enrollments, purpose-labelled phases and Monday–Sunday source identities. Source weeks can be compared before logging, and selected runs show accepted targets versus confirmed actual training. Weight volume, intensity, rest, velocity, jump demand, sprint distance and interval work/recovery remain separate. Entirely unmeasured actual dimensions are gaps; partial known totals carry per-dimension coverage and cannot be ranked as complete transfer exposure.

Private Supabase sync is prepared with account-separated caches, explicit first linking/merging, durable offline changes, pinned-account transport, revision-checked atomic RPCs, idempotent retries, tombstones, conflict version export and batch conflict resolution. Account sync can pause while the isolated cache remains available. No Supabase project or HTTPS deployment was created.

## Findings and dispositions

| Finding | Disposition and regression |
| --- | --- |
| C1: delayed first link could install another account's snapshot | Expected namespace and preview generation checked across awaits and inside persistence. Deferred-response/account-bound tests detect the original behavior. |
| I1: reviewed merge choices ignored | The UI calls the tested merge/link orchestration with selected documents and reviewed remote base. Two-device browser test checks both dates/values; deliberately restoring ignored-merge behavior makes it fail. |
| I2: unsent/in-flight creations could resurrect after deletion | Queue considers base, pending and frozen requests. Unsent creations cancel; in-flight/lost-ack deletions retain a newer generation rebased on acknowledgement. |
| I3: conflict refresh overwrote newer outbox changes | Fresh transactional metadata update preserves independent pending saves and concurrent resolutions. Blocked-snapshot regression verifies this. |
| I4: stale conflict review could discard a newer local edit | Review compares current pending/device values and remote revisions. Stale choices reject; earlier conflict variants remain exportable. |
| I5: linked baseline/morning conflicts could not resolve | Reviewed conflict groups reconstruct and validate once, then persist/outbox atomically. A changed morning UUID and matching frozen-baseline reference resolve together. |
| I6: invalid catalogue references could crash rendering | Catalogue-bound enrollment, schedule, target, bridge and enrolled-workout references validate before migration/import/download/local persistence. Invalid remote state leaves the valid cache intact. |
| I7: unmeasured exposure appeared as zero | Nullable dimension totals and measured/expected coverage preserve missingness and label known partial totals. Transfer comparison requires complete dimensions. |
| I8: explicit pause-sync/local-account mode absent | Regraded from Minor to Important. Pause keeps the account cache and pending edits; resume synchronizes. Unit and two-device browser tests cover it. |

Regression files: `tests/sync-review-regressions.test.ts`, `tests/sync-engine.test.ts`, `tests/exposure.test.ts`, and `tests/e2e/sync.spec.ts`.

## Verification

Final release checks passed:87/87 unit tests;17/17 local-mode production browser cases and1/1 configured two-device case (each build intentionally skips the other mode);real PostgreSQL integration checks;typecheck,source check and build. Commands: `npm test`, `npm run check:program`, `npm run typecheck`, `npm run build`, `npm run test:e2e`, the public-test-config two-device browser case, and `scripts/test-sync-sql.sh`. Source coverage is 119 images/94 sessions. Source assets occupy approximately 27 MB in the first production offline cache.

Browser tests cover source viewing offline, all 119 source fetches, a missing cached August page, failed cache preparation, waiting-worker draft preservation, lifecycle controls, saved dates/history, backup failure, velocity metrics, charts/keyboard values, equipment/calibration controls, and private sync values/conflicts. Real PostgreSQL tests cover ownership, direct-write denial, atomic stale batches, replay, tombstones, malformed aggregates and concurrent schedule changes. Mobile 390×844 and desktop 1440×1000 screenshots were inspected; tested text/accent contrast across dark surfaces is at least 6.6:1.

Hosted Auth, confirmation/reset email delivery, redirects, HTTPS hosting and actual user PC/phone smoke tests remain unrun because no project/site was supplied. Simulated transport tests do not certify those prerequisites. The setup guide is `docs/device-sync-setup.md`.

## Rulings I made

- Ruling: use current clean feature checkout on codex/training-companion as the authorized isolated feature workspace — main is untouched and this is the user's ongoing branch — cost if wrong: concurrent local edits require care. No other implementers are active.
- Ruling: cloud skill helper scripts/resources are unavailable as local files (referenced resource read failed); use the equivalent brief/read, RED/GREEN commands, task commits and ledger updates directly — avoids stalling on tooling — cost if wrong: less automated bookkeeping.
- Ruling: apply weekday amendment by Monday anchoring on/after requested program start; resumed entry uses its next prescribed weekday; never rewrite recorded local dates. Explicit reschedules are labelled exceptions — avoids past-dating new training — cost if wrong: a chosen midweek start delays D1 to next Monday.
- Task 1: Ruling: retain legacy schema.ts state until migration task and implement schema splits incrementally — keeps current app functioning during source upgrade — cost if wrong: imports must be checked per task. Freeze exact v1 schema in legacy-v1.ts.
- Task 1: Ruling: add program filter to legacy sessionsForDate default LP — combined catalogue otherwise mixed schedules across tracks — cost if wrong: UP callers must supply UP or use enrollment schedule.
- Task 1: Ruling: August W2D1 Warmup is a complete conflicting energy-system session, offer full alternative with attribution warning rather than add as warmup — source reviewed — cost if wrong: user must confirm intended source day.
- Task 5: Ruling: replacement intensity is explicitly selected rather than inferred from unrelated source % — avoids fabricated equivalence — cost if wrong: user supplies desired percent/RIR before numeric kg guidance. Preserve reviewed source options first, generic uncertain circuit conversion excluded.
- Task 6: Ruling: velocity averages only exist for a single exercise/metric definition; cross-exercise mixed source velocities stay separate raw target lists — avoids averaging MCV/peak — cost if wrong: users select a movement for a comparable velocity plot. Program intensity averages are descriptive %1RM summaries with coverage, not universal mechanical stress.
- Task 7: Ruling: under missing history, show chronological provisional entry options rather than claim an evidence-backed ranking — matches insufficiency spec — cost if wrong: manual review required before start. No ACWR scoring.
- Task 8: Ruling: original plan mode uses unchanged source prescriptions; accepted revisions appear in a selected enrollment — mixed historical runs otherwise make the planned line arbitrary — cost if wrong: select a run to see personalized planned dose.
- Ruling: use isolated local Postgres17 with auth.uid/roles bootstrap for real ownership/revision tests — local Supabase stack is not installed but SQL policies/functions execute in actual PostgreSQL — cost if wrong: hosted Auth/email/redirect behavior remains untested until project setup.
- Task4: Ruling: configure root-path HTTPS hosting via setup instructions and public placeholders; do not publish/create accounts without a target — satisfies requested setup guide and keeps real credentials out of Git — cost if wrong: live sync waits for the user's project and HTTPS hosting.
- Final: Ruling: hosted Auth/email/redirect/device checks are unavailable and cannot be certified by simulated tests — setup guide distinguishes these prerequisites — cost if wrong: hosted setup may reveal additional integration issues.
- Final: Ruling: fresh reviewer did not re-transcribe119images; retain reviewed curator data and original source authority/ambiguity flags — independent code review is not a source certification — cost if wrong: original coaching source must resolve transcription/interpretation ambiguity.
- Final: Ruling: transfer/bridge output is heuristic comparison, never medically validated injury prevention — user-facing reasons and limitations stand — cost if wrong: athlete needs qualified coaching/recovery review beyond the app.
- Final: Ruling: intentional Monday anchoring on migration stands per approved weekday amendment; actual historical dates stay fixed — cost if wrong: legacy default future D1 changes to next Monday.
- Final: Ruling: reviewer independently ran adverse unit paths; retain parent browser/SQL evidence and rerun whole suites after fixes, rather than claim reviewer reran them — cost if wrong: remaining production-only cases may require further verification.
- Final: Ruling: existing user authorization selects feature-branch push and draft PR; do not reopen the integration menu or merge/deploy — approval persists across turns — cost if wrong: a reversible unmerged draft is created.

## Deferred minors

- Final: minor (deferred): computed velocity guidance omits numeric result.changes in compact message; source instructions remain expandable.
- Final: minor (deferred): heavyLowerSets unused summary field remains zero; do not surface it as a measured quantity.
