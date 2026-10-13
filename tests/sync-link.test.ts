import { it, expect } from "vitest";
import { initialState } from "../src/domain/schema";
import { createMorning, createWorkout } from "../src/domain/records";
import { stateToDocuments } from "../src/sync/documents";
import { firstLinkPreview, resolveFirstLink } from "../src/sync/reconcile";
it("previews mixed histories and requires explicit choices for differing aggregates", () => {
  const guest = {
      ...initialState(),
      workouts: [createWorkout({ id: "guest" })],
    },
    cloud = {
      ...initialState(),
      familiarity: ["front-squat"],
      mornings: [createMorning({ id: "cloud" })],
    };
  const preview = firstLinkPreview(
    guest,
    stateToDocuments(cloud).map((d) => ({ ...d, revision: 1 })),
  );
  expect(
    preview.conflicts.some((c) => c.identity === "configuration|configuration"),
  ).toBe(true);
  expect(() => resolveFirstLink(preview, {})).toThrow("Choose");
  const choices = Object.fromEntries(
    preview.conflicts.map((c) => [c.identity, "remote" as const]),
  );
  const merged = resolveFirstLink(preview, choices);
  expect(merged.workouts[0].id).toBe("guest");
  expect(merged.mornings[0].id).toBe("cloud");
  expect(merged.familiarity).toEqual(["front-squat"]);
});
