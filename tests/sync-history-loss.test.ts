import "fake-indexeddb/auto";
import Dexie from "dexie";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import {
  db,
  getSyncMeta,
  linkAccount,
  loadState,
  saveWorkout,
  setStorageNamespace,
} from "../src/storage/db";
import { makeWorkout } from "../src/domain/fixtures";
import { syncOnce } from "../src/sync/engine";
import {
  identity,
  type SyncDocument,
  type SyncTransport,
  type CommitResult,
} from "../src/sync/types";
class Server implements SyncTransport {
  docs: SyncDocument[] = [];
  requests = new Map<string, CommitResult>();
  async snapshot() {
    return structuredClone(this.docs);
  }
  async commit(
    id: string,
    changes: Parameters<SyncTransport["commit"]>[1],
  ): Promise<CommitResult> {
    const old = this.requests.get(id);
    if (old) return old;
    if (
      changes.some(
        (d) =>
          (this.docs.find((x) => identity(x) === identity(d))?.revision ??
            0) !== d.baseRevision,
      )
    )
      return { status: "conflict", conflicts: [] };
    const documents = changes.map(({ baseRevision, generation, ...d }) => ({
      ...d,
      revision: baseRevision + 1,
    }));
    this.docs = [
      ...this.docs.filter(
        (d) => !documents.some((x) => identity(x) === identity(d)),
      ),
      ...documents,
    ];
    const result: CommitResult = { status: "acknowledged", documents };
    this.requests.set(id, result);
    return result;
  }
}
beforeEach(async () => {
  await db.state.clear();
  await db.sync.clear();
  await setStorageNamespace("account:a");
  await linkAccount([], null);
});
afterEach(() => vi.restoreAllMocks());
it("retains two saved workouts when saving overlaps the completion status write", async () => {
  const server = new Server();
  const get = db.sync.get.bind(db.sync);
  let injected = false;
  let saves: Promise<void> | undefined;
  vi.spyOn(db.sync, "get").mockImplementation((key: any) =>
    Dexie.Promise.resolve(get(key)).then(async (snapshot) => {
      if (
        !injected &&
        snapshot?.lastSuccess &&
        !snapshot.pending.length &&
        !snapshot.inflight
      ) {
        injected = true;
        const save = async () => {
          await saveWorkout(
            makeWorkout({
              id: "day-one",
              localDate: "2026-10-12",
              status: "completed",
            }),
          );
          await saveWorkout(
            makeWorkout({
              id: "day-two",
              localDate: "2026-10-13",
              status: "completed",
            }),
          );
        };
        if (Dexie.currentTransaction) {
          Dexie.ignoreTransaction(() => {
            saves = save();
          });
        } else {
          saves = save();
          await saves;
        }
      }
      return snapshot;
    }),
  );
  await syncOnce("account:a", server);
  await saves;
  expect(injected).toBe(true);
  expect(
    (await getSyncMeta()).pending.filter((d) => d.kind === "workout"),
  ).toHaveLength(2);
  await syncOnce("account:a", server);
  db.close();
  await db.open();
  await syncOnce("account:a", server);
  expect((await loadState()).workouts.map((w) => w.id).sort()).toEqual([
    "day-one",
    "day-two",
  ]);
  expect(
    server.docs.filter((d) => d.kind === "workout" && !d.deleted),
  ).toHaveLength(2);
});
it("recovers saved local workouts with missing queue entries before applying a cloud snapshot", async () => {
  const server = new Server();
  await syncOnce("account:a", server);
  const state = await loadState();
  await db.state.put({
    id: "account:a",
    value: {
      ...state,
      workouts: [makeWorkout({ id: "orphan", status: "completed" })],
    },
  });
  expect((await getSyncMeta()).pending).toHaveLength(0);
  await syncOnce("account:a", server);
  expect((await loadState()).workouts[0]?.id).toBe("orphan");
  expect(server.docs.find((d) => d.kind === "workout")?.key).toBe("orphan");
});
it("keeps remote deletion when local cache still matches the acknowledged base", async () => {
  const server = new Server();
  await saveWorkout(makeWorkout({ id: "deleted" }));
  await syncOnce("account:a", server);
  server.docs = server.docs.map((d) =>
    d.kind === "workout"
      ? { ...d, revision: d.revision + 1, deleted: true, payload: null }
      : d,
  );
  expect(await syncOnce("account:a", server)).toBe("synced");
  expect((await loadState()).workouts).toHaveLength(0);
});
it("does not turn a missing cache into deletion of acknowledged cloud history", async () => {
  const server = new Server();
  await saveWorkout(makeWorkout({ id: "cloud" }));
  await syncOnce("account:a", server);
  await db.state.delete("account:a");
  expect(await syncOnce("account:a", server)).toBe("synced");
  expect((await loadState()).workouts[0]?.id).toBe("cloud");
});
