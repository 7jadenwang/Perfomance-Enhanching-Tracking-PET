import { beforeEach, it, expect } from "vitest";
import "fake-indexeddb/auto";
import {
  db,
  loadState,
  saveMorning,
  setStorageNamespace,
  linkAccount,
  getSyncMeta,
} from "../src/storage/db";
import { createMorning } from "../src/domain/records";
beforeEach(async () => {
  await setStorageNamespace("guest");
  await db.state.clear();
  await db.sync.clear();
});
it("keeps guest and both accounts isolated without uploading before linking", async () => {
  await saveMorning(createMorning({ id: "guest" }));
  await setStorageNamespace("account:a");
  expect((await loadState()).mornings).toHaveLength(0);
  await saveMorning(createMorning({ id: "a" }));
  expect((await getSyncMeta()).pending).toHaveLength(0);
  await linkAccount([], null);
  expect((await getSyncMeta()).pending.some((d) => d.kind === "morning")).toBe(
    true,
  );
  await setStorageNamespace("account:b");
  expect((await loadState()).mornings).toHaveLength(0);
  await setStorageNamespace("account:a");
  expect((await loadState()).mornings[0].id).toBe("a");
  await setStorageNamespace("guest");
  expect((await loadState()).mornings[0].id).toBe("guest");
});
it("commits a valid local save with durable coalesced pending generation", async () => {
  await setStorageNamespace("account:a");
  await linkAccount([], null);
  const r = createMorning({ id: "one" });
  await saveMorning(r);
  const first = (await getSyncMeta()).pending.find(
    (d) => d.kind === "morning",
  )!;
  await saveMorning({ ...r, sleepHours: 8 });
  const latest = (await getSyncMeta()).pending.filter(
    (d) => d.kind === "morning",
  );
  expect(latest).toHaveLength(1);
  expect(latest[0].generation).toBeGreaterThan(first.generation);
  const before = await loadState();
  await expect(saveMorning({ ...r, sleepHours: 100 })).rejects.toThrow();
  expect(await loadState()).toEqual(before);
});
it("rejects stale editor saves against a newer locally received morning", async () => {
  await setStorageNamespace("guest");
  const r = createMorning({ id: "morning", sleepHours: 6 });
  await saveMorning(r);
  await saveMorning({ ...r, sleepHours: 8 });
  await expect(
    saveMorning({ ...r, sleepHours: 7 }, JSON.stringify(r)),
  ).rejects.toThrow("changed");
  expect((await loadState()).mornings[0].sleepHours).toBe(8);
});
it("rejects stale settings instead of resurrecting an older schedule or calibration", async () => {
  const { saveSettings } = await import("../src/storage/db");
  const { stateToDocuments } = await import("../src/sync/documents");
  await setStorageNamespace("guest");
  const original = await loadState(),
    signature = JSON.stringify(
      stateToDocuments(original).filter((d) =>
        ["configuration", "schedule"].includes(d.kind),
      ),
    );
  await saveSettings({ ...original, familiarity: ["front-squat"] });
  await expect(
    saveSettings({ ...original, velocityExperience: "experienced" }, signature),
  ).rejects.toThrow("changed");
  expect((await loadState()).familiarity).toEqual(["front-squat"]);
});
