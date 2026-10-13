# Private PC–phone synchronization

Status: proposed written specification for review. The user selected Supabase with sign-in; this document defines the newly added subsystem. The LP/UP core specification remains approved and browser-local until this milestone is implemented and configured.

## Outcome and relationship to the core upgrade

The same athlete can open PET on a PC and phone, sign in to the same account, and see the same training dates, enrollments, workouts, CMJ/recovery records, equipment settings and reference measurements. Saved changes synchronize automatically when online. Offline logging continues, and concurrent edits never silently overwrite another device's records.

Use the existing React application, Supabase Auth and Postgres as a private synchronization service. Dexie remains the local working store. Bundle program sources/library with the app rather than uploading them as personal records. GitHub contains code, migrations and public configuration templates; it does not contain passwords, service credentials or athlete records.

This is a separate implementation milestone after the LP/UP version-2 storage foundation. It does not reopen the approved training methodology or add social sharing, coach access, attachments or unrestricted multi-user administration.

## Access and confirmed local connection issue

The reported address was `http://10.145.9.77:5173/`. The terminal error was npm ENOENT for `C:\Users\MelvinTheArch\package.json`, showing that this npm invocation ran outside the project and did not start Vite. The known project location is `D:\Perfomance-Enhanching-Tracking-PET`.

Run these commands in PowerShell and leave the process open:

```powershell
cd D:\Perfomance-Enhanching-Tracking-PET
npm.cmd run dev
```

Open the printed Local address on the PC and the newly printed Network address on the phone using the same Wi-Fi. Do not reuse a stale IP or omit its port. If npm reports missing dependencies in the project, run `npm.cmd ci` there first. A phone uses the PC's Network address, not its own localhost.

The current package script already binds to `0.0.0.0`. In the execution environment, localhost and a printed network address returned HTTP 200. This validates the existing server configuration but does not establish connectivity from the user's phone. If the app opens on PC localhost but not the phone, collect the new URL/browser error and PC network/firewall state before making a further change. Do not disable the firewall globally or expose the development server to the public internet.

A local HTTP network origin also differs from localhost and lacks the normal secure-context support for an installable offline app. The everyday solution is one stable HTTPS app address on both devices. Configure root-path static hosting; this can use a dedicated HTTPS hosting project or a GitHub Pages workflow with a custom-domain/root-path setup or explicitly tested base-path support. The implementation prepares deployment instructions/configuration; publication happens only after a concrete deployment target is available and approved. No external account or hosting project has been created for this milestone yet.

## Authentication and configuration

Use Supabase email/password sign-up, confirmation, sign-in, password reset and sign-out. The hosting origin is configured as the Auth site URL and allowed confirmation/reset redirect; development localhost is a separate allowed development redirect. Passwords are handled by Supabase Auth, never written to the athlete state or application logs. Confirmation/reset delivery requires a working email configuration; do not disable confirmation just to hide a setup issue.

Client configuration uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. A publishable key is intended for client applications and does not grant access to other users' records when ownership policies are correct. Never put a secret/service-role key in a Vite environment variable, browser bundle, README example or GitHub commit. Commit `.env.example` with placeholders; ignore real `.env` files and local credentials.

If configuration is absent, local mode still works and Settings says sync is not configured. Sync setup presents what will be uploaded: saved training/recovery/settings data to this user's Supabase account. The user enables syncing existing data through a first-link preview; signing in alone must not silently upload a preexisting local history.

The same account owns both devices. A signed-out application displays the signed-out state and local-mode choices; it does not keep rendering another account's cached records. Account-specific caches, pending mutations and conflicts are partitioned by Supabase user ID. Guest records are a separate namespace. On sign-out, retained account data remains isolated for later sign-in to that account. Do not clear unsynced data automatically or attach one account's queue to a different account.

## Data boundaries

Synchronize version-2 domain data, not one last-write-wins athlete snapshot:

| Document kind | Logical identity | Contents |
| --- | --- | --- |
| Athlete configuration | one per account | Equipment, protocols, baselines, dated references and other shared settings |
| Program schedule | one per account | All enrollments, lifecycle events, schedule overrides and accepted bridge/target revisions |
| Workout | stable workout ID | Enrollment link, saved target snapshot, actual rows, notes and dates |
| Morning | local date + protocol ID | CMJ trials and daily recovery/body measurements |
| Daily activity | local date | Explicit rest/training/unknown annotation |

Keep the entire enrollment set in one schedule document so concurrent program switches cannot create two active programs. Link protocol and baseline edits in one configuration document. Morning identity uses date/protocol to detect two devices independently creating the same morning rather than silently duplicating it. Retain the local morning record UUID in its payload; a conflict can choose either full record, and the discarded variant remains exportable. Baseline references must remain consistent when resolving such a conflict; never automatically recompute a frozen baseline.

Documents carry owner ID, schema/catalogue compatibility, integer revision, payload, and deleted flag. Deletion uses a tombstone, so an offline older edit cannot resurrect a removed document automatically. Date values remain the athlete-entered `YYYY-MM-DD`; server timestamps order synchronization, not training dates. Client clock differences do not select a conflict winner.

Validate downloaded documents and the reconstructed cross-document athlete state before changing the visible cache. Missing required configuration/enrollment/protocol links, unsupported schema or invalid payloads preserve the last valid local state and display a sync error. Upgrade incompatibility is shown as an update requirement rather than guessed conversion.

## Private server access

Database migrations enable row-level security and ownership policies using the authenticated user ID. Unauthenticated clients cannot read/write athlete documents. Another authenticated account cannot read, update or delete the first account's documents, including through RPCs.

Provide narrowly scoped database functions for reading a consistent account snapshot and committing a batch of mutations with expected revisions. Derive ownership from Auth inside the function, never from a trusted client owner parameter. Keep permissions/search paths explicit; privileged function code must perform ownership checks and must not offer unrestricted table access. Test direct table access and RPC access for cross-account attempts.

All writes route through revision-checking functions; browser users do not receive direct unrestricted INSERT/UPDATE/DELETE grants that bypass comparison. A batch locks the account's sync state, checks every expected revision, validates basic document kinds/shape, and either commits all related mutations or rejects the batch without partial writes. Return current revisions and conflicting documents. The server does not claim to interpret training safety.

Use a consistent full account snapshot for reconciliation in this initial personal-training app. A server transaction serializes account batch commits/snapshot reads so the client never downloads half a program transition. Snapshot reads include tombstones and server revisions. This deliberately avoids implementing a lossy change cursor or relying on Realtime for delivery; incremental pagination/history compaction can be a later scalability milestone.

## Offline queue and synchronization

Saving first commits the validated local change and a durable outbox mutation in one Dexie transaction. Show Saved on this device immediately; show Synced only after server acknowledgement. Each mutation records its account, logical document key, expected server revision, desired payload/deletion and stable request ID.

Sync runs after a local save, sign-in, reconnect, window focus and a 30-second foreground interval. Also provide Sync now. Run one sync loop per account/device, coalesce successive unacknowledged edits of the same document, retry transient failures with capped backoff, and pause on authentication errors/conflicts. Do not make background operation or `navigator.onLine` the only evidence of connectivity. Requests have timeouts and can be retried; idempotent request IDs prevent a response lost after commit from duplicating a mutation.

Pull a consistent snapshot before pushing pending changes, reconcile each document using its acknowledged base revision, then commit eligible batches. Distinct-document edits merge automatically. Incoming changes are applied only after full validation and preserve unacknowledged local edits. A local edit during an in-flight request stays queued; acknowledging an older mutation cannot mark the newer edit synced. Multi-tab coordination prevents two local loops claiming the same outbox operation; SQL revisions remain the final protection.

Unsaved editor forms are not uploaded. If another device changes the open record, retain the draft, show a remote-change notice and require review before saving against the newer revision. Closing/reloading follows the existing unsaved-entry safeguards. Offline failures leave all local measurements and pending changes accessible.

Program transfer acceptance remains fingerprinted. Before an online transfer or other multi-document schedule action, synchronize and recompute its preview. Offline accepted changes remain local/pending and may conflict when reconnecting; explain that status. The backend atomically checks document revisions and the complete schedule invariant before acknowledging. Never say both devices share a new schedule before it is acknowledged.

## Conflicts and initial linking

A conflict occurs when local and remote both changed the same document since the last acknowledged base, including update-versus-delete. Do not choose a winner by latest client timestamp. Pause that document/batch and show both versions with date, measurements, status and revision. Offer keep local, keep remote, or edit a reviewed combined version; preserve both originals for export. Resolution submits a new mutation against the latest remote revision, which may conflict again if another edit arrives.

For the configuration/schedule documents, validate baseline/protocol/enrollment links and one-active invariant after resolution. Do not automatically combine two frozen baselines or merge unrelated program start dates. Related mutations are resolved as a batch when independent selection would break references.

First linking cases:

- Empty cloud and local history: preview upload counts and enable sync explicitly.
- Existing cloud and empty local state: preview/download the cloud state without claiming it was already stored locally.
- History on both devices: merge distinct workout IDs and different morning dates; report matching logical identities/configuration/schedule differences for review. Do not blindly replace either full history.

Export a complete local backup before first-link replacement or bulk import. Under sync, backup import previews remote effects and enqueues an explicit versioned batch; it is never implemented as an unchecked cloud overwrite. The user can disable sync and keep using the local account cache after signing in; pending data is retained and the app clearly reports it is device-local.

## UI and operation

Settings provides account setup/sign-in/reset/sign-out, first-link review, sync enable/disable, Sync now, last successful synchronization, pending changes, conflict resolution and backup export. Global status distinguishes local only, syncing, synced, offline/pending, authentication required, conflict and failed. A synced status requires no unacknowledged edits and a successful reconciliation, not just an open network socket.

Hosted use: open the same HTTPS address on PC and phone, sign in with the same account, and confirm both show the same enrollment/calendar and last-sync state. The PC server need not remain running once hosting is live. Publishing code does not publish private athlete records; Supabase ownership rules control their access. Hosted app updates preserve the service-worker prompt and local drafts.

Prepare SQL migrations, `.env.example`, local test configuration and an exact hosting/Supabase setup guide before requesting deployment approval. Project creation, configured keys, working email redirects and hosting access are external prerequisites; report them clearly if unavailable. Do not claim live sync based only on mocks or a local test service.

## Acceptance and verification

1. PC and phone browser contexts signed into the same account converge on enrollment dates, workouts, morning/body measurements, settings and revisions.
2. Different-document offline edits merge on reconnect. Same-morning, same-workout, schedule and update/delete conflicts preserve both versions until explicit resolution.
3. A lost acknowledgement/retry does not duplicate a mutation; an edit during an in-flight save stays pending. Account and multi-tab isolation hold.
4. Two concurrent program switches cannot yield two active programs. Stale transfer previews fail and recompute after remote changes.
5. Cross-account and unauthenticated table/RPC access is denied in a real local Supabase/Postgres policy test, including forged ownership parameters.
6. Failed requests, expired sessions, unsupported schema and invalid downloads leave the validated local state and queue intact. An open draft survives incoming remote updates.
7. First-device import, mixed-history linking and v1-to-v2 backup migration work without an unreviewed full overwrite. Confirmation/reset redirects are tested with configured Auth.
8. Missing configuration leaves local mode usable. Production bundles contain no service-role/secret key or athlete data. Real environment files are ignored.
9. The configured HTTPS site serves mobile/PC routes, assets and offline source images; a real configured two-device smoke test is reported separately from mocked browser tests.

## References

Official documentation reviewed for implementation constraints:

- [Supabase password authentication](https://supabase.com/docs/guides/auth/passwords): email sign-up/sign-in, confirmation and reset redirects; deployment needs working email delivery.
- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys): client publishable keys versus privileged server secrets.
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security): authenticated ownership policies.
- [Supabase database functions](https://supabase.com/docs/guides/database/functions): transaction functions and explicit execution/security configuration.

Revision comparison, offline queues, conflict handling and account snapshots are application design choices; Supabase does not automatically provide them for this app.
