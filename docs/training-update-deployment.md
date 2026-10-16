# Install the movement-log and progress update

This is a frontend update. The existing IndexedDB database, workout schema (v2), Supabase tables/RPCs, account settings, and sync documents remain compatible. **Do not run a new SQL migration, reset Supabase, clear browser site data, or replace your history to install this update.**

## What happens to existing saved data

Opening the new Progress panel or an existing workout does not edit its saved fields, set rows, IDs, completion status, targets, notes, or timestamps. Old sets are grouped for display; no sets are deleted or renumbered in storage. Demand scores and chart aggregation are calculated when displayed and are not written back to historical records. Existing completed sets remain available even when they exceed the prescribed target.

When you deliberately change a field in an open workout, that workout now saves automatically. This also applies to historical workouts you choose to edit. Merely opening or expanding one does not save it. The regression suite checks that viewing Progress and a 20-set saved workout leaves the complete stored state unchanged.

Before updating, export a normal backup from Settings on the device that has your latest data. This is a precaution; installing this update does not require importing or replacing anything.

## Update the frontend

Obtain this change's source through its Git branch/PR, or apply the supplied patch to a clean copy of the repository at the matching base revision. Keep your existing `.env.local` and hosting environment variables. If there are local code changes, preserve them before checking out or applying the update.

In PowerShell, from your actual PET repository folder:

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run check:program
npm.cmd run typecheck
npm.cmd run build
```

For a local development session, restart with `npm.cmd run dev`. For the installed/hosted app, redeploy the rebuilt `dist` directory to **the same HTTPS origin and root path** you already use. A different domain or port has a separate browser database and can look like empty history. Keep the existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` values in the build environment.

If your host builds from Git, merge the reviewed change and trigger its normal deployment (`npm run build`, output `dist`). If it uses manual uploads, upload the new `dist` output. Do not upload source `.env.local` files.

On each device, open the existing site. If the app offers an update, finish any active save (or export the current entry), then apply the update and reload. A normal reload preserves browser records; clearing site data does not. Confirm your previous history is visible before continuing training.

## Backend and cross-device sync

No backend code or SQL changes are required for this update. Existing Supabase sign-in and synchronization continue using the same revision-checked workout documents. No new tables, secrets, environment variables, or policies are needed.

Edits are written immediately to a local recovery draft, scoped to the account, session, and browser tab. After a short typing pause, valid workout records save through the existing IndexedDB/sync queue. The open editor and draft are restored after refresh. Navigating away flushes pending saves; a stale editor cannot overwrite a newer draft when an earlier save finishes. Unsaved recovery drafts remain local; **Saved on this device** and **Synced** still mean different things. Existing conflicts require review.

## Verify after deployment

1. Confirm previous workouts, morning records, and notes remain visible.
2. In a current session, enter a value and refresh immediately; the editor should restore it.
3. Complete the first set, then add a next set. Reusable inputs copy, while completion, effort ratings, measured velocity, and set notes clear.
4. Open Progress. Demand and recovery appear first; Day is the default, with Week and Month available. Detailed prescription charts remain expandable.
5. If using account sync, wait for Synced, then confirm the saved workout on the other signed-in device.

## Meaning of the new scores

Overall load remains duration × whole-session RPE. Force, Explosive/power, and Metabolic are overlapping **estimated exposure** dimensions, calculated from session load and the average emphasis of confirmed sets/blocks. Every classified session can contribute to multiple trends. The UI discloses the coefficients and measurement coverage under “How scores work and what is covered.”

These are model v1 estimates, not measured force/power, direct RFD, calories, or a validated stress index. Do not sum the dimensions. Work-type estimates cover missing measurements; matching dated relative load and compatible measured velocity refine emphasis where available. Technical/control movements retain a practice-set count, not a fabricated learning score. Unclassified work and missing session load remain unknown. Explicit rest is zero.

Week/month views sum known load and average comparable recovery observations, retaining protocol/baseline separation and coverage notes. The rolling seven-day demand view shows known totals with known-day coverage so incomplete logging is visible. Historical raw data remains unchanged if the scoring model is later revised.
