import {
  db,
  getSyncMeta,
  notifyStorageChanged,
  storageNamespace,
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
  if (meta.conflicts.length) {
    current(ns);
    const latest = await transport.snapshot();
    current(ns);
    validateDocuments(latest);
    if (latest.length) documentsToState(latest);
    await db.sync.put({
      ...meta,
      conflicts: meta.conflicts.map((c) => ({
        ...c,
        remote: latest.find((d) => identity(d) === c.identity) ?? null,
      })),
    });
    return "conflict";
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
    const m = await getSyncMeta(ns),
      stored = await db.state.get(key(ns));
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
  meta = await getSyncMeta(ns);
  if (!meta.pending.length && !meta.inflight)
    await db.sync.put({ ...meta, lastSuccess: new Date().toISOString() });
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
export async function resolveConflict(
  ns: string,
  id: string,
  choice: "local" | "remote" | SyncDocument,
  transport: SyncTransport,
) {
  current(ns);
  const remote = await transport.snapshot();
  current(ns);
  validateDocuments(remote);
  if (remote.length) documentsToState(remote);
  await db.transaction("rw", db.state, db.sync, async () => {
    current(ns);
    const m = await getSyncMeta(ns),
      c = m.conflicts.find((c) => c.identity === id);
    if (!c) throw Error("Conflict already changed");
    const latest = remote.find((d) => identity(d) === id) ?? null;
    if ((latest?.revision ?? 0) !== (c.remote?.revision ?? 0))
      throw Error(
        "Remote changed again; sync conflict review needs refreshing",
      );
    const selected =
      choice === "local" ? c.local : choice === "remote" ? latest : choice;
    if (selected && identity(selected) !== id)
      throw Error("Conflict identity mismatch");
    const stored = (await db.state.get(key(ns)))!.value;
    let docs = stateToDocuments(stored).filter((d) => identity(d) !== id);
    if (selected) docs.push(selected);
    const next = documentsToState(docs),
      base = [
        ...m.base.filter((d) => identity(d) !== id),
        ...(latest ? [latest] : []),
      ];
    const generation = m.generation + 1,
      pending = m.pending.filter((d) => identity(d) !== id);
    if (selected && !same(selected, latest))
      pending.push({
        ...selected,
        baseRevision: latest?.revision ?? 0,
        generation,
      });
    await db.state.put({ id: key(ns), value: next });
    await db.sync.put({
      ...m,
      base,
      pending,
      generation,
      conflicts: m.conflicts.filter((x) => x.identity !== id),
      resolvedConflicts: [...(m.resolvedConflicts ?? []), c],
    });
  });
  notifyStorageChanged();
}
