import "fake-indexeddb/auto";
import { it, expect, beforeEach } from "vitest";
import { db, loadState, saveWorkout } from "../src/storage/db";
import { makeWorkout } from "../src/domain/fixtures";
beforeEach(async () => {
  await db.state.clear();
});
it("persists confirmed partial sessions and unconfirmed drafts", async () => {
  await saveWorkout(makeWorkout({ status: "partial" }));
  expect((await loadState()).workouts[0].status).toBe("partial");
  await saveWorkout(makeWorkout({ status: "draft" }));
  expect((await loadState()).workouts).toHaveLength(1);
  expect((await loadState()).workouts[0].status).toBe("draft");
});
it("rejects invalid write without damaging existing data", async () => {
  await saveWorkout(makeWorkout());
  await expect(saveWorkout(makeWorkout({ actualRpe: 11 }))).rejects.toThrow();
  expect((await loadState()).workouts[0].actualRpe).toBeNull();
});
