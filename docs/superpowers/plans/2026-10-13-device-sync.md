# Private Device Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Synchronize private training dates, schedules, measurements and logs between the athlete's PC and phone with sign-in, offline writes and explicit conflict resolution.

**Architecture:** Supabase Auth owns account identities; Postgres revision-checked RPC batches and RLS own private server documents. Dexie partitions guest/account caches and commits local saves plus durable outbox changes atomically. A document reconciler merges distinct edits and preserves same-document conflicts.

**Tech Stack:** Existing React/TypeScript/Zod/Dexie app, `@supabase/supabase-js` v2, SQL migrations, Vitest/fake-indexeddb, Playwright and local Supabase/Postgres integration tests when available.

**Spec:** [Approved device-sync specification](../specs/2026-10-13-device-sync-design.md). Depends on the approved LP/UP version-2 storage foundation. Native execution preference is retained; this new plan awaits review.

## Global Constraints

- Saved changes synchronize automatically when online; offline logging continues.
- Concurrent edits never silently overwrite another device's records.
- Client configuration uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Never put a secret/service-role key in a Vite environment variable, browser bundle, README example or GitHub commit.
- Accounts, guest caches, pending edits and conflicts are isolated by owner namespace.
- Unsaved editor forms are not uploaded.
- Do not claim live sync based only on mocks or a local test service.
- Prepare migrations and configuration before deployment approval; do not create or publish external services during code implementation.
- D1–D7 mean Monday–Sunday. Synchronize calendar dates as `YYYY-MM-DD`, without timezone conversion or changing source weekday identity.

## Review Focus

1. A request committed on the server with a lost response must be idempotent on retry (Tasks 1/3).
2. A newer local edit made during an in-flight request must stay pending after the older acknowledgement (Task 3).
3. Signing into a second account must never expose or upload the first account's cache/outbox (Task 2).
4. Update-versus-delete and two independent morning creations for one date/protocol must conflict, not resurrect/duplicate records (Tasks 1/3).
5. Remote changes to a record being edited must preserve the unsaved form and invalidate a transfer preview (Task 4).

## File boundaries and types

Create `src/sync/types.ts`, `documents.ts`, `reconcile.ts`, `engine.ts`, `client.ts`, `auth.ts` and `src/app/SyncSettings.tsx`. Create `supabase/migrations/202610130001_private_sync.sql`, `supabase/config.toml`, `supabase/tests/private_sync.sql`, `.env.example`, `docs/device-sync-setup.md`. Modify storage/store and Settings/App only at their persistence/status boundaries. Keep unit fixtures under tests.

`SyncDocument` has kind (`configuration|schedule|workout|morning|activity`), key, integer revision, schemaVersion, catalogueVersion, payload and deleted. `OutboxMutation` includes stable requestId, namespace, document identity, baseRevision, desired document and monotonically increasing local generation. `SyncConflict` retains base/local/remote variants. `SyncTransport` supplies `snapshot(): Promise<SyncDocument[]>` and `commit(requestId: string, changes: OutboxMutation[]): Promise<CommitResult>`. `CommitResult` is acknowledged documents or revision conflicts. These interfaces keep domain reconciliation testable independently of Auth/network.

## Task 1: Atomic private server documents

**Files:** SQL migration/config/test files above; `src/sync/types.ts`.

**Interfaces:** SQL `pet_sync_snapshot()` reads a consistent authenticated account snapshot; `pet_sync_commit(request_id uuid, changes jsonb)` atomically checks expected revisions and commits an account batch or returns current conflicts. Ownership is derived from `auth.uid()`; no trusted owner argument. Documents are keyed by user/kind/key; requests are keyed by user/request ID. A per-user lock serializes snapshot/commit/idempotency checks. The entire schedule is one document with at most one active/queued enrollment.

- [ ] Write SQL integration assertions for denied unauthenticated/cross-account SELECT/RPC access, direct write revocation, two concurrent schedule edits, tombstones and replayed request ID returning the same acknowledgement without another revision increment. A forged owner in payload cannot change ownership.
- [ ] Run the tests against a local Supabase/Postgres instance before migration and observe missing-table/function failures. If unavailable, record the missing runtime; do not substitute a mock as proof of RLS behavior.
- [ ] Implement explicit RLS read policies, no direct browser write grants, bounded validated document kinds/schema, strict revisions, account locks, atomic batch checks, request deduplication and tombstones. Privileged RPCs set a safe search path and reject null authentication. Snapshot returns all account records consistently.
- [ ] Run real policy/transaction tests; inspect migrations for owner bypasses. Commit: `feat: add private revision-checked Supabase sync storage`.

## Task 2: Account isolation and durable local document mapping

**Files:** create `documents.ts`, `client.ts`, `auth.ts`; modify `src/storage/db.ts`, `backup.ts`, `.gitignore`; tests `tests/sync-documents.test.ts`, `sync-storage.test.ts`, `auth-isolation.test.ts`.

**Interfaces:** `stateToDocuments(state: AthleteState): SyncDocument[]`; `documentsToState(documents: SyncDocument[]): AthleteState`; `setStorageNamespace(namespace: 'guest' | string): Promise<void>`; `saveWithOutbox(state: AthleteState, changes: SyncDocument[]): Promise<void>`. Client returns null when public configuration is missing. Auth calls Supabase's email/password and recovery APIs; credentials never enter domain records.

- [ ] Write tests for validated round trips, morning logical date/protocol keys, schedule aggregate, invalid/missing references, guest-to-account link preview, guest/account/account isolation and local-state/outbox rollback on storage failure.

```ts
expect(stateToDocuments(state).filter(d => d.kind === "morning")[0].key).toBe("2026-10-13|default");
expect(documentsToState(stateToDocuments(state)).workouts).toEqual(state.workouts);
```

- [ ] Run new unit/storage tests and observe failures before implementation.
- [ ] Implement namespace-specific state, acknowledged documents, outbox and conflicts in Dexie. Add account lifecycle handling and first-link preview rather than immediate upload. Sign-out switches visibility to guest state, retains isolated unsynced account history and cancels its active loop. Export/import retains explicit replacement effects under sync.
- [ ] Add public environment placeholders; ignore real environment files and validate that the configured client key is publishable rather than privileged. Run tests/typecheck/build and inspect emitted configuration behavior. Commit: `feat: isolate account caches and persist offline sync edits`.

## Task 3: Reconciliation, retries and conflict resolution

**Files:** create `reconcile.ts`, `engine.ts`; tests `tests/sync-reconcile.test.ts`, `sync-engine.test.ts`.

**Interfaces:** `reconcile(base: SyncDocument[], local: SyncDocument[], remote: SyncDocument[], pending: OutboxMutation[]): ReconcileResult`; `syncOnce(namespace: string, transport: SyncTransport): Promise<SyncStatus>`; `resolveConflict(key: string, choice: 'local' | 'remote' | SyncDocument): Promise<void>`. ReconcileResult exposes merged documents, eligible pushes and conflicts; full reconstructed state must validate before applying. SyncStatus distinguishes localOnly/syncing/synced/pending/authRequired/conflict/failed.

- [ ] Write real in-memory transport tests for distinct-document convergence, same-workout/same-morning conflicts, schedule conflicts, update/delete preservation, idempotent retry after dropped acknowledgement, edit-during-flight generation, malformed snapshot, expired auth, batch conflict/no partial writes and multi-tab queue claim.

```ts
expect(distinctEditResult.conflicts).toHaveLength(0);
expect(sameMorningResult.conflicts).toHaveLength(1);
expect(afterOlderAcknowledgement.pending[0].generation).toBe(newerGeneration);
```

- [ ] Run tests to see the missing behavior fail; implement local-first queue coalescing, acknowledged-base comparison and consistent snapshot pull before push. Do not use timestamps to decide conflicts. Keep stable request payloads for retries, so a coalesced later edit cannot reuse an earlier request ID with different content.
- [ ] Add timeouts, capped retry backoff, foreground 30-second interval, save/focus/reconnect triggers, Sync now and one-loop coordination. Stop auth-failed/conflicting batches until user resolution. Resolution keeps exportable originals and checks the latest remote revision again.
- [ ] Run unit/storage suites with deterministic fake timers around scheduling only; transport data behavior stays real. Commit: `feat: synchronize offline records without silent conflict overwrites`.

## Task 4: Sign-in/status UI, two-device tests and deployment preparation

**Files:** create `SyncSettings.tsx`, `tests/e2e/sync.spec.ts`, `docs/device-sync-setup.md`; modify App/store/Settings/WorkoutLog/transfer acceptance, README and relevant CI.

**Interfaces:** Settings exposes first-link/auth/conflict/retry/disable controls and last successful sync/pending status. Incoming validated state refreshes views via storage notifications; dirty editors retain drafts and require review of remote changes. Transfer acceptance synchronizes/recomputes online and rejects stale previews; offline transitions stay explicitly pending.

- [ ] Write browser tests with two independent storage contexts for initial linking, distinct concurrent edits, same-record resolution, account switching, offline reconnect, open-draft remote updates, stale transfer preview and missing configuration/local-only mode. Assert actual values converge, not just a Synced label.
- [ ] Run failing browser cases, implement accessible sign-in/reset/first-link/conflict UI and honest global statuses. Preserve save/update draft behavior. Warn about cloud effects in import previews without adding automatic replacements.
- [ ] Prepare exact Supabase SQL/Auth email/redirect/public-key setup instructions and root-path HTTPS hosting configuration. Configure deployment only for a supplied target; publication needs final reviewable approval. Record unavailable external prerequisites and distinguish prepared code from a live service.
- [ ] Run all unit tests, source checks, typecheck, build and browser checks. Run local real RLS integration where available, then a configured real two-device smoke test when project/hosting credentials exist. Report any unrun real-service checks explicitly.
- [ ] Use the native workflow's one fresh final reviewer across core and sync changes; fix substantive findings with failing regressions, record evidence and push/update the draft PR. Do not merge/deploy. Commit: `feat: add private PC phone sync controls and setup guide`.

## Self-review and handoff

The four tasks cover access/auth, server ownership, local mapping/queueing, conflict/linking/import, UI/status, real device verification and hosting preparation. Review Focus cases have explicit owners. Server ownership and revision checks are real SQL tests; mocked browser tests cannot certify those guarantees. Core version-2 migration is the dependency. Native execution continues after review of this plan; approved core work proceeds while that review is pending.
