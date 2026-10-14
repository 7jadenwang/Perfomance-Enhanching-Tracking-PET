import {
  db,
  getSyncMeta,
  notifyStorageChanged,
  storageNamespace,
  queueState,
} from "../storage/db";
import { initialState } from "../domain/schema";
import {
  stateToDocuments,
  documentsToState,
  validateDocuments,
} from "./documents";
import {
  identity,
  same,
  type SyncTransport,
  type SyncStatus,
  type SyncMeta,
  type SyncDocument,
  type SyncConflict,
} from "./types";
import { reconcile } from "./reconcile";
const key = (ns: string) => (ns === "guest" ? "athlete" : ns);
const running = new Set<string>();
export let lastSyncError = "";
function current(ns: string) {
  if (storageNamespace() !== ns) throw Error("Account changed during sync");
}
async function acknowledge(
  ns: string,
  meta: SyncMeta,
  transport: SyncTransport,
) {
  const frozen = meta.inflight;
  if (!frozen) return;
  current(ns);
  const result = await transport.commit(frozen.requestId, frozen.changes);
  current(ns);
  if (result.status === "conflict") {
    await db.transaction("rw", db.sync, async () => {
      const m = await getSyncMeta(ns);
      if (m.inflight?.requestId === frozen.requestId)
        await db.sync.put({ ...m, inflight: null });
    });
    return;
  }
  if (result.status !== "acknowledged" || !Array.isArray(result.documents))
    throw Error("Invalid acknowledgement");
  validateDocuments(result.documents);
  if (
    result.documents.length !== frozen.changes.length ||
    result.documents.some((d) => {
      const sent = frozen.changes.find((x) => identity(x) === identity(d));
      return !sent || d.revision !== sent.baseRevision + 1 || !same(d, sent);
    })
  )
    throw Error("Acknowledgement does not match request");
  await db.transaction("rw", db.sync, async () => {
    const m = await getSyncMeta(ns);
    if (m.inflight?.requestId !== frozen.requestId)
      throw Error("Sync request changed");
    const base = [
      ...m.base.filter(
        (d) => !result.documents.some((x) => identity(x) === identity(d)),
      ),
      ...result.documents,
    ];
    const pending = m.pending.flatMap((p) => {
      const sent = frozen.changes.find((x) => identity(x) === identity(p));
      if (!sent) return [p];
      const ack = result.documents.find((x) => identity(x) === identity(p))!;
      return p.generation === sent.generation
        ? []
        : [{ ...p, baseRevision: ack.revision }];
    });
    await db.sync.put({
      ...m,
      base,
      pending,
      inflight: null,
      lastSuccess: new Date().toISOString(),
    });
  });
}
async function run(ns: string, transport: SyncTransport): Promise<SyncStatus> {
  current(ns);
  let meta = await getSyncMeta(ns);
  if (!meta.linked) return "linkRequired";
  if (meta.paused) return "paused";
  if (meta.conflicts.length) {
    current(ns);
    const latest = await transport.snapshot();
    current(ns);
    validateDocuments(latest);
    if (latest.length) documentsToState(latest);
    await db.transaction("rw", db.sync, async () => {
      const m = await getSyncMeta(ns);
      current(ns);
      const changed = m.conflicts.filter(
        (c) =>
          !same(
            c.local,
            m.pending.find((d) => identity(d) === c.identity) ?? c.local,
          ) ||
          (c.remote?.revision ?? 0) !==
            (latest.find((d) => identity(d) === c.identity)?.revision ?? 0),
      );
      await db.sync.put({
        ...m,
        conflictArchive: [...(m.conflictArchive ?? []), ...changed],
        conflicts: m.conflicts.map((c) => ({
          ...c,
          local: m.pending.find((d) => identity(d) === c.identity) ?? c.local,
          remote: latest.find((d) => identity(d) === c.identity) ?? null,
        })),
      });
    });
    const fresh = await getSyncMeta(ns);
    return fresh.conflicts.length
      ? "conflict"
      : fresh.pending.length
        ? "pending"
        : "synced";
  }
  // Replay frozen requests BEFORE pulling: the server may have committed a lost response.
  if (meta.inflight) {
    await acknowledge(ns, meta, transport);
    meta = await getSyncMeta(ns);
    if (meta.inflight) return "pending";
  }
  current(ns);
  const remote = await transport.snapshot();
  current(ns);
  validateDocuments(remote);
  if (remote.length) documentsToState(remote);
  await db.transaction("rw", db.state, db.sync, async () => {
    current(ns);
    const meta = await getSyncMeta(ns),
      stored = await db.state.get(key(ns));
    // Recover saved edits whose queue entry was lost before replacing the cache.
    // An absent cache is not a request to delete acknowledged cloud records.
    const m = stored ? queueState(meta, stored.value) : meta;
    const local = stateToDocuments(stored?.value ?? initialState()),
      r = reconcile(m.base, local, remote, m.pending);
    const next = documentsToState(r.documents); // Full cross-record validation BEFORE writes.
    await db.state.put({ id: key(ns), value: next });
    const pending = [
      ...r.pushes,
      ...m.pending.filter((p) =>
        r.conflicts.some((c) => c.identity === identity(p)),
      ),
    ];
    await db.sync.put({ ...m, base: remote, pending, conflicts: r.conflicts });
  });
  notifyStorageChanged();
  meta = await getSyncMeta(ns);
  if (meta.conflicts.length) return "conflict";
  if (meta.paused) return "paused";
  if (meta.pending.length) {
    await db.transaction("rw", db.sync, async () => {
      const m = await getSyncMeta(ns);
      if (!m.inflight)
        await db.sync.put({
          ...m,
          inflight: {
            requestId: crypto.randomUUID(),
            changes: structuredClone(m.pending),
          },
        });
    });
    await acknowledge(ns, await getSyncMeta(ns), transport);
  }
  // Read and update completion metadata atomically with local saves.
  meta = await db.transaction("rw", db.sync, async () => {
    current(ns);
    const latest = await getSyncMeta(ns);
    if (latest.paused || latest.pending.length || latest.inflight)
      return latest;
    const completed = { ...latest, lastSuccess: new Date().toISOString() };
    await db.sync.put(completed);
    return completed;
  });
  if (meta.paused) return "paused";
  notifyStorageChanged();
  return meta.pending.length || meta.inflight ? "pending" : "synced";
}
export async function syncOnce(
  ns: string,
  transport: SyncTransport,
): Promise<SyncStatus> {
  if (ns === "guest") return "localOnly";
  if (running.has(ns)) return "syncing";
  running.add(ns);
  const owner = crypto.randomUUID();
  let claimed = false;
  try {
    // Durable lease coordinates tabs even on browsers without Web Locks. RPC timeout is 15s.
    claimed = await db.transaction("rw", db.sync, async () => {
      const m = (await getSyncMeta(ns)) as SyncMeta & {
        lease?: { owner: string; until: number };
      };
      if (m.lease && m.lease.until > Date.now()) return false;
      await db.sync.put({
        ...m,
        lease: { owner, until: Date.now() + 60000 },
      } as SyncMeta);
      return true;
    });
    if (!claimed) return "syncing";
    lastSyncError = "";
    return await run(ns, transport);
  } catch (e) {
    lastSyncError = String(e);
    return e instanceof Error && e.name === "AuthRequired"
      ? "authRequired"
      : "failed";
  } finally {
    running.delete(ns);
    if (claimed)
      await db.transaction("rw", db.sync, async () => {
        const m = (await getSyncMeta(ns)) as SyncMeta & {
          lease?: { owner: string; until: number };
        };
        if (m.lease?.owner === owner) {
          const { lease, ...rest } = m;
          await db.sync.put(rest);
        }
      });
  }
}
export type ConflictSelection = {
  conflict: SyncConflict;
  choice: "local" | "remote" | SyncDocument;
};
export async function resolveConflict(
  ns: string,
  id: string,
  choice: "local" | "remote" | SyncDocument,
  transport: SyncTransport,
  reviewed?: SyncConflict,
) {
  const c =
    reviewed ??
    (await getSyncMeta(ns)).conflicts.find((c) => c.identity === id);
  if (!c) throw Error("Conflict already changed");
  return resolveConflicts(
    ns,
    [{ conflict: structuredClone(c), choice }],
    transport,
  );
}
export async function resolveConflicts(
  ns: string,
  selections: ConflictSelection[],
  transport: SyncTransport,
) {
  if (!selections.length) throw Error("Choose conflicts to resolve");
  current(ns);
  const remote = await transport.snapshot();
  current(ns);
  validateDocuments(remote);
  if (remote.length) documentsToState(remote);
  await db.transaction("rw", db.state, db.sync, async () => {
    current(ns);
    const m = await getSyncMeta(ns),
      stored = (await db.state.get(key(ns)))!.value;
    if (m.inflight)
      throw Error("Wait for the current sync request before resolving");
    let docs = stateToDocuments(stored),
      base = [...m.base],
      pending = [...m.pending],
      generation = m.generation;
    const resolved: SyncConflict[] = [],
      ids = new Set<string>();
    for (const { conflict: reviewed, choice } of selections) {
      const id = reviewed.identity;
      if (ids.has(id)) throw Error("Duplicate conflict choice");
      ids.add(id);
      const c = m.conflicts.find((c) => c.identity === id),
        latest = remote.find((d) => identity(d) === id) ?? null;
      if (!c) throw Error("Conflict review is stale");
      const local =
        m.pending.find((d) => identity(d) === id) ??
        docs.find((d) => identity(d) === id) ??
        null;
      if (
        !same(reviewed.local, local) ||
        !same(c.local, local) ||
        JSON.stringify(c) !== JSON.stringify(reviewed)
      )
        throw Error(
          "Conflict review is stale; review the current device version",
        );
      if (
        (latest?.revision ?? 0) !== (reviewed.remote?.revision ?? 0) ||
        !same(latest, reviewed.remote)
      )
        throw Error(
          "Remote changed again; sync conflict review needs refreshing",
        );
      const selected =
        choice === "local" ? local : choice === "remote" ? latest : choice;
      if (selected && identity(selected) !== id)
        throw Error("Conflict identity mismatch");
      docs = docs.filter((d) => identity(d) !== id);
      if (selected) docs.push(selected);
      base = base.filter((d) => identity(d) !== id);
      if (latest) base.push(latest);
      pending = pending.filter((d) => identity(d) !== id);
      if (selected && !same(selected, latest))
        pending.push({
          ...selected,
          baseRevision: latest?.revision ?? 0,
          generation: ++generation,
        });
      resolved.push(c);
    }
    const next = documentsToState(docs);
    current(ns);
    await db.state.put({ id: key(ns), value: next });
    await db.sync.put({
      ...m,
      base,
      pending,
      generation,
      conflicts: m.conflicts.filter((c) => !ids.has(c.identity)),
      resolvedConflicts: [...(m.resolvedConflicts ?? []), ...resolved],
    });
  });
  notifyStorageChanged();
}
