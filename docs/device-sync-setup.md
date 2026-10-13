# Set up private PC–phone sync

The app code is ready for configuration. A Supabase project and one HTTPS app address are required before real devices can synchronize. GitHub stores the app and SQL, not personal training logs.

## 1. Create Supabase

Create a project at https://supabase.com/dashboard. In its SQL Editor, run the complete contents of `supabase/migrations/202610130001_private_sync.sql` **once**. This creates private documents and revision-checked RPC functions. Browser accounts receive no direct write permissions. Do not run `supabase/tests/bootstrap.sql` on your hosted project: it is a local PostgreSQL test fixture.

In Project Settings → API, copy the Project URL and **publishable** key beginning `sb_publishable_`. Never put `sb_secret_`, a service-role key, database password or personal password into the app/GitHub.

## 2. Configure the app

In PowerShell, open your actual repository folder:

```powershell
cd D:\Perfomance-Enhanching-Tracking-PET
Copy-Item .env.example .env.local
notepad .env.local
```

Replace the two placeholders with your Project URL and publishable key. Real `.env` files are ignored by Git. Install and verify:

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run check:program
npm.cmd run typecheck
npm.cmd run build
npm.cmd run dev
```

Vite embeds public settings at build time. Restart the dev server after changing them; rebuild/redeploy when changing hosted settings. With missing/invalid settings PET remains usable in local mode. Only publishable keys are accepted.

The earlier ENOENT error pointed to `C:\Users\MelvinTheArch\package.json`: the server command was run outside the repository. Keep the running terminal open. Use the newly printed localhost URL on your PC; use the newly printed Network URL on your phone on the same Wi-Fi. A phone's localhost is the phone itself. This local-network connection does not by itself synchronize browser databases.

## 3. Use one root-path HTTPS site

Create a static site on your preferred host (for example Netlify or Cloudflare Pages), using build command `npm run build` and output directory `dist`. Set the two public `VITE_SUPABASE_*` environment variables in that host, then rebuild. Serve the app at the domain root with valid HTTPS and SPA fallback to `index.html`; assets, `/sw.js`, `/manifest.webmanifest`, and `/program/...` must retain their paths. Do not cache `sw.js` indefinitely.

This version uses root-relative paths. A GitHub Pages project subdirectory is not a tested hosting target; use a dedicated root domain or add and test base-path support before choosing that deployment. No hosted project or deployment was created by the implementation.

In Supabase Authentication → URL Configuration set **Site URL** to that HTTPS origin and add that same origin to allowed redirect URLs. Add `http://localhost:5173` for local development. Keep email confirmation enabled. Configure working email delivery/SMTP as needed; confirmation/reset email delivery is a service setup step.

## 4. Link devices deliberately

1. Export your current device backup in Settings.
2. Open the same HTTPS site on PC and phone.
3. Create an account, confirm its email, and sign in on both devices.
4. On the device with your history, choose **Preview account link**. For an empty cloud account, choose **Upload this device history**. This uploads saved training/recovery/settings to your private account.
5. On the other device, preview the link and choose **Use cloud history**. Its guest history stays separate and can be exported before linking.
6. If both cloud and guest histories exist, export both backups and open **Merge guest and cloud histories**. Distinct records combine; choose a version for every conflicting settings/schedule/morning/workout document before accepting. Invalid protocol, enrollment or baseline references block acceptance. To replace the entire account later, use the explicit backup import preview; replacement changes and deletions synchronize to other devices.

Saved edits synchronize after saving, reconnect/focus, and every 30 seconds while the app is visible. **Saved on this device** is different from **Synced**. Offline edits remain in an account-specific durable queue. Sign-out stops that account's synchronization and shows guest records; it retains isolated unsynced account data for the next sign-in.

Concurrent changes to different records merge. Concurrent changes to the same workout, morning date/protocol, settings or schedule require review in Settings. Export both variants, choose one or supply a reviewed merged document. A deleted record is a tombstone; it cannot silently return from an older offline device. Invalid downloads leave the last valid local state intact. Incoming changes retain dirty editor drafts and require review before saving them.

## 5. Verify your real setup

- On PC, save a morning measurement with an explicit training date; wait for **Synced**.
- On phone, use **Sync now** and confirm that exact date and value.
- Save a different record on phone; confirm it on PC.
- Take phone offline, save a record, then reconnect; verify its value on PC.
- Edit the same record on both devices while one is offline; reconnect and verify conflict review preserves both versions.
- Check confirmation and password-reset emails redirect to your site and the password-update control appears.
- Check signed-out and second-account views contain none of the first account's records.

These hosted checks have not been run because no Supabase project or hosting target was supplied. Local PostgreSQL policy/transaction tests and simulated two-browser transport tests are separate evidence; they do not certify hosted email delivery or your actual Wi-Fi/devices.

## Local database test

With Docker available, use `scripts/test-sync-sql.sh`. It creates an isolated PostgreSQL 17 container, supplies test-only Auth roles/`auth.uid()`, applies the migration, runs real ownership/revision/atomicity/replay/tombstone assertions, and removes the container. A full local Supabase stack can instead apply the migration and run `supabase/tests/private_sync.sql` using its database connection; its real Auth provides the roles and function.

## Data and recovery

Browser/phone caches contain private account data; use devices you control. Export domain backups and conflict originals regularly. Supabase project deletion, browser-data clearing, or a failed hosting setup are not repaired by GitHub code backups. No account passwords or service credentials are written to athlete records.
