import { it, expect } from "vitest";
import { initialState, parseState } from "../src/domain/schema";
import { createMorning, createWorkout } from "../src/domain/records";
import { stateToDocuments, documentsToState } from "../src/sync/documents";
it("round trips validated records using logical morning and aggregate schedule keys", () => {
  const s = initialState();
  s.mornings = [createMorning({ localDate: "2026-10-13" })];
  s.workouts = [createWorkout({ localDate: "2026-10-13" })];
  const docs = stateToDocuments(s);
  expect(docs.find((d) => d.kind === "morning")?.key).toBe(
    "2026-10-13|default",
  );
  expect(documentsToState(docs)).toEqual(parseState(s));
});
it("rejects missing configuration and dangling baseline/protocol references", () => {
  expect(() => documentsToState([])).toThrow();
  const s = initialState();
  s.mornings = [createMorning({ protocolId: "missing" })];
  expect(() => documentsToState(stateToDocuments(s))).toThrow();
});
