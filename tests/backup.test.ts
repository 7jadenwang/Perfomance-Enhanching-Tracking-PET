import "fake-indexeddb/auto";
import { it, expect, beforeEach } from "vitest";
import { db, loadState, saveWorkout } from "../src/storage/db";
import {
  previewBackup,
  exportBackup,
  replaceFromBackup,
} from "../src/storage/backup";
import { makeWorkout } from "../src/domain/fixtures";
beforeEach(async () => {
  await db.state.clear();
});
it("round-trips drafts and rejects corrupt and incompatible backups", async () => {
  await saveWorkout(makeWorkout());
  const text = await exportBackup();
  const preview = previewBackup(text);
  expect(preview.counts.workouts).toBe(1);
  await replaceFromBackup(preview.state);
  expect((await loadState()).workouts[0].id).toBe("workout");
  for (const bad of [
    "{",
    text.replace('"schemaVersion": 2', '"schemaVersion": 99'),
    text.replace("lp-up-v2", "unknown"),
  ])
    expect(() => previewBackup(bad)).toThrow();
  expect((await loadState()).workouts).toHaveLength(1);
});
it("failed replacement rolls back atomically", async () => {
  await saveWorkout(makeWorkout());
  const previous = await loadState();
  await expect(
    replaceFromBackup({
      ...previous,
      workouts: [makeWorkout({ actualRpe: 11 })],
    }),
  ).rejects.toThrow();
  expect(await loadState()).toEqual(previous);
});
