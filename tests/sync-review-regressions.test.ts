import { beforeEach, it, expect } from "vitest";
import "fake-indexeddb/auto";
import {
  db,
  setStorageNamespace,
  linkAccount,
  getSyncMeta,
  saveMorning,
  loadState,
  updateState,
} from "../src/storage/db";
import { initialState } from "../src/domain/schema";
import { createMorning } from "../src/domain/records";
import {
  syncOnce,
  resolveConflict,
  resolveConflicts,
} from "../src/sync/engine";
import { stateToDocuments } from "../src/sync/documents";
import { completeAccountLink } from "../src/sync/link";
import {
  identity,
  type SyncDocument,
  type SyncTransport,
} from "../src/sync/types";
beforeEach(async () => {
  await db.state.clear();
  await db.sync.clear();
  await setStorageNamespace("account:a");
});
it("rejects a deferred first-link response after the intended account changes", async () => {
  const remote = stateToDocuments({
    ...initialState(),
    mornings: [createMorning({ id: "private-a" })],
  }).map((d) => ({ ...d, revision: 1 }));
  let release!: (d: SyncDocument[]) => void;
  const snapshot = new Promise<SyncDocument[]>((r) => (release = r)),
    transport = {
      snapshot: () => snapshot,
      commit: async () => {
        throw Error("unused");
      },
    };
  const operation = completeAccountLink(
    {
      namespace: "account:a",
      preview: { remote, guest: initialState() },
      choice: "cloud",
      choices: {},
      isCurrent: () => true,
    },
    transport,
  );
  await setStorageNamespace("account:b");
  release(remote);
  await expect(operation).rejects.toThrow("Account changed");
  expect((await loadState()).mornings).toHaveLength(0);
  expect((await getSyncMeta()).linked).toBe(false);
});
it("links the actual reviewed merge with both distinct histories and selected settings", async () => {
  const guest = {
      ...initialState(),
      mornings: [createMorning({ id: "guest", localDate: "2026-10-12" })],
    },
    cloud = {
      ...initialState(),
      familiarity: ["front-squat"],
      mornings: [createMorning({ id: "cloud", localDate: "2026-10-13" })],
    },
    remote = stateToDocuments(cloud).map((d) => ({ ...d, revision: 1 }));
  const { firstLinkPreview } = await import("../src/sync/reconcile");
  const choices = Object.fromEntries(
    firstLinkPreview(guest, remote).conflicts.map((c) => [
      c.identity,
      "remote" as const,
    ]),
  );
  await completeAccountLink(
    {
      namespace: "account:a",
      preview: { guest, remote },
      choice: "merge",
      choices,
      isCurrent: () => true,
    },
    {
      snapshot: async () => remote,
      commit: async () => {
        throw Error("unused");
      },
    },
  );
  expect((await loadState()).mornings).toHaveLength(2);
  expect((await loadState()).familiarity).toEqual(["front-squat"]);
  expect(
    (await getSyncMeta()).pending.filter((d) => d.kind === "morning"),
  ).toHaveLength(1);
});
it("cancels a never-sent creation when a reviewed replacement removes it", async () => {
  await linkAccount([], null);
  await db.sync.put({
    ...(await getSyncMeta()),
    base: stateToDocuments(initialState()).map((d) => ({ ...d, revision: 1 })),
    pending: [],
  });
  await saveMorning(createMorning({ id: "new" }));
  await updateState((s) => ({ ...s, mornings: [] }));
  expect(
    (await getSyncMeta()).pending.filter((d) => d.kind === "morning"),
  ).toHaveLength(0);
});
it("refreshes conflicts without overwriting a distinct newer pending record", async () => {
  await linkAccount([], null);
  const r = createMorning({ id: "m", sleepHours: 6 }),
    s = { ...initialState(), mornings: [r] },
    base = stateToDocuments(s).map((d) => ({ ...d, revision: 1 }));
  await db.state.put({ id: "account:a", value: s });
  await db.sync.put({ ...(await getSyncMeta()), base, pending: [] });
  await saveMorning({ ...r, sleepHours: 7 });
  const remote = base.map((d) =>
    d.kind === "morning"
      ? { ...d, revision: 2, payload: { ...r, sleepHours: 8 } }
      : d,
  );
  const t: SyncTransport = {
    snapshot: async () => remote,
    commit: async () => {
      throw Error("unused");
    },
  };
  expect(await syncOnce("account:a", t)).toBe("conflict");
  expect(
    await syncOnce("account:a", {
      ...t,
      snapshot: async () => {
        await saveMorning(
          createMorning({ id: "new", localDate: "2026-10-14" }),
        );
        return remote;
      },
    }),
  ).toBe("conflict");
  expect(
    (await getSyncMeta()).pending.some((d) => d.key === "2026-10-14|default"),
  ).toBe(true);
});
it("rejects a stale conflict review instead of discarding a newer device edit", async () => {
  await linkAccount([], null);
  const r = createMorning({ id: "m", sleepHours: 6 }),
    s = { ...initialState(), mornings: [r] },
    base = stateToDocuments(s).map((d) => ({ ...d, revision: 1 }));
  await db.state.put({ id: "account:a", value: s });
  await db.sync.put({ ...(await getSyncMeta()), base, pending: [] });
  await saveMorning({ ...r, sleepHours: 7 });
  const remote = base.map((d) =>
      d.kind === "morning"
        ? { ...d, revision: 2, payload: { ...r, sleepHours: 8 } }
        : d,
    ),
    t: SyncTransport = {
      snapshot: async () => remote,
      commit: async () => {
        throw Error("unused");
      },
    };
  expect(await syncOnce("account:a", t)).toBe("conflict");
  const reviewed = structuredClone((await getSyncMeta()).conflicts[0]);
  await saveMorning({ ...r, sleepHours: 9 });
  await expect(
    resolveConflicts("account:a", [{ conflict: reviewed, choice: "local" }], t),
  ).rejects.toThrow("Conflict review is stale");
  expect((await loadState()).mornings[0].sleepHours).toBe(9);
  await syncOnce("account:a", t);
  expect(
    (await getSyncMeta()).conflictArchive?.some(
      (c) => (c.local.payload as { sleepHours: number }).sleepHours === 7,
    ),
  ).toBe(true);
});
it("resolves related configuration and morning identities in one validated batch", async () => {
  await linkAccount([], null);
  const s = initialState();
  s.mornings = Array.from({ length: 14 }, (_, i) =>
    createMorning({
      id: "m" + i,
      localDate: "2026-09-" + String(i + 1).padStart(2, "0"),
    }),
  );
  s.baselines = [
    {
      id: "b",
      protocolId: "default",
      eligibleRecordIds: s.mornings.map((m) => m.id),
      meanCm: 30,
      sampleSdCm: 1,
      createdAt: "2026-09-15",
      archivedAt: null,
    },
  ];
  const base = stateToDocuments(s).map((d) => ({ ...d, revision: 1 }));
  await db.state.put({ id: "account:a", value: s });
  await db.sync.put({ ...(await getSyncMeta()), base, pending: [] });
  await updateState((v) => ({
    ...v,
    familiarity: ["front-squat"],
    mornings: v.mornings.map((m, i) => (i === 0 ? { ...m, sleepHours: 7 } : m)),
  }));
  const remoteState = structuredClone(s);
  remoteState.mornings[0].id = "remote-id";
  remoteState.baselines[0].eligibleRecordIds[0] = "remote-id";
  const remote = stateToDocuments(remoteState).map((d) => ({
      ...d,
      revision:
        d.kind === "configuration" ||
        (d.kind === "morning" && d.key.startsWith("2026-09-01"))
          ? 2
          : 1,
    })),
    t: SyncTransport = {
      snapshot: async () => remote,
      commit: async () => {
        throw Error("unused");
      },
    };
  expect(await syncOnce("account:a", t)).toBe("conflict");
  await resolveConflicts(
    "account:a",
    (await getSyncMeta()).conflicts.map((c) => ({
      conflict: structuredClone(c),
      choice: "remote" as const,
    })),
    t,
  );
  expect((await loadState()).baselines[0].eligibleRecordIds[0]).toBe(
    "remote-id",
  );
  expect(
    (await loadState()).mornings.find((m) => m.localDate === "2026-09-01")?.id,
  ).toBe("remote-id");
  expect((await getSyncMeta()).conflicts).toHaveLength(0);
});
it("rejects invalid remote program references without replacing the valid cache", async () => {
  await linkAccount([], null);
  const { createEnrollment } = await import("../src/program/enrollments");
  const s = initialState(),
    e = createEnrollment("lp", "April-W1D1", "2026-10-19");
  e.status = "active";
  e.entrySessionId = "not-in-catalog";
  s.enrollments = [e];
  const before = await loadState();
  await db.sync.put({ ...(await getSyncMeta()), pending: [] });
  expect(
    await syncOnce("account:a", {
      snapshot: async () =>
        stateToDocuments(s).map((d) => ({ ...d, revision: 1 })),
      commit: async () => {
        throw Error("unused");
      },
    }),
  ).toBe("failed");
  expect(await loadState()).toEqual(before);
});
it("pauses account sync while retaining account records and pending edits", async () => {
  await linkAccount([], null);
  await db.sync.put({ ...(await getSyncMeta()), paused: true });
  await saveMorning(createMorning({ id: "offline" }));
  let calls = 0;
  expect(
    await syncOnce("account:a", {
      snapshot: async () => {
        calls++;
        return [];
      },
      commit: async () => {
        throw Error("unused");
      },
    }),
  ).toBe("paused");
  expect(calls).toBe(0);
  expect((await loadState()).mornings[0].id).toBe("offline");
  expect((await getSyncMeta()).pending.some((d) => d.kind === "morning")).toBe(
    true,
  );
});
it("rejects invalid backup references before any records are replaced", async () => {
  const { previewBackup } = await import("../src/storage/backup");
  const { createEnrollment } = await import("../src/program/enrollments");
  const s = initialState(),
    e = createEnrollment("up", "July-W1D1", "2026-10-19");
  e.reschedules = { "April-W1D1": "2026-10-20" };
  s.enrollments = [e];
  expect(() => previewBackup(JSON.stringify(s))).toThrow("schedule reference");
});
it("binds linking persistence to the account whose preview was captured", async () => {
  const remote = stateToDocuments({
    ...initialState(),
    mornings: [createMorning({ id: "account-a-private" })],
  }).map((d) => ({ ...d, revision: 1 }));
  await setStorageNamespace("account:b");
  await expect(linkAccount(remote, null, false, "account:a")).rejects.toThrow(
    "Account changed",
  );
  expect((await loadState()).mornings).toHaveLength(0);
});
