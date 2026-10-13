# Training companion final review

Native implementation received an independent read-only whole-branch review. The reviewer independently reran the 24-test unit suite and identified five material issues. All five were reproduced with regression tests and fixed in one pass:

1. Baseline suitability is separate from valid daily CMJ comparison: excluded illness days with three valid trials still show CMJ changes.
2. Velocity compatibility includes load convention and the number of loaded hands, preventing raw kilogram values with different meanings from matching.
3. Working sides and loaded hands are independent; one- and two-dumbbell unilateral work produce the correct load-volume.
4. Progress reopens saved workouts by stable identity/date, even after changing the schedule.
5. Velocity history sorts by training date before selecting previous compatible measurements, independent of last-edit storage order.

Regression tests were observed failing before their fixes. Additional browser coverage verifies that failed IndexedDB writes retain the current entry and offer export, and a real waiting service-worker update does not reload an open entry. The full production browser suite passes 10 workflows. The final unit suite passes 28 tests; typecheck, production build, source inventory, and whitespace checks pass.

No minor review findings were deferred. Recovery heuristics remain provisional; detailed original coaching instructions remain available alongside readable summaries. The reviewer could not run browser tests in its restricted environment; the native executor ran the full production suite with installed Chromium.

## Implementation rulings

- Used the dedicated cloud checkout on a feature branch rather than another worktree. This preserves the stated workspace path; the tradeoff is no separate filesystem copy.
- Maintained the execution ledger manually because the cloud skill scripts had no executable local path. The tradeoff is less automated bookkeeping.
- Used explicit typed row measurements rather than a generic count/unit pair. This simplifies validation; a new modality may need a schema migration.
- Kept reviewed readable summaries with original detailed images rather than guessing editable fields for every complex instruction. Detailed coaching guidance sometimes requires opening the image.
- Used installed system Chromium because the browser-download destination was blocked. The tradeoff is browser-version variation; CI can use Playwright's bundled Chromium.

The app, source assets, tests, specifications, and setup instructions are pushed to `codex/training-companion`. Personal records remain browser-local and are excluded from GitHub synchronization.
