import { expect, it } from "vitest";
import { createWorkout } from "../src/domain/records";
import {
  readDraft,
  writeDraft,
  clearDraft,
} from "../src/storage/workout-draft";
it("restores every edit and its original conflict baseline after reload", () => {
  const data = new Map<string, string>();
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
    removeItem: (k: string) => {
      data.delete(k);
    },
  };
  const w = createWorkout({ notes: "ongoing session" });
  writeDraft(storage, "guest:session", w, "null");
  expect(readDraft(storage, "guest:session")?.workout.notes).toBe(
    "ongoing session",
  );
  expect(readDraft(storage, "account:session")).toBeNull();
  expect(readDraft(storage, "guest:session")?.base).toBe("null");
  clearDraft(storage, "guest:session", createWorkout());
  expect(readDraft(storage, "guest:session")).not.toBeNull();
  clearDraft(storage, "guest:session", w);
  expect(readDraft(storage, "guest:session")).toBeNull();
});

it("does not overwrite newer edits when an older editor advances its save baseline", async () => {
  const { advanceDraftBase } = await import("../src/storage/workout-draft");
  const data = new Map<string, string>();
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
    removeItem: (k: string) => {
      data.delete(k);
    },
  };
  const older = createWorkout({ notes: "B" }),
    newer = { ...older, notes: "C" };
  writeDraft(storage, "session", newer, "null");
  expect(advanceDraftBase(storage, "session", older, "null", "saved A")).toBe(
    false,
  );
  expect(readDraft(storage, "session")?.workout.notes).toBe("C");
  expect(advanceDraftBase(storage, "session", newer, "null", "saved A")).toBe(
    true,
  );
  expect(readDraft(storage, "session")?.base).toBe("saved A");
});
