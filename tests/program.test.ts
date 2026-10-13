import { it, expect } from "vitest";
import { program } from "../src/program/catalog";
import { parseState, initialState } from "../src/domain/schema";
it("imports all 78 original images without duplicating continuation sessions", () => {
  expect(program.sources.length).toBe(78);
  expect(new Set(program.sessions.map((s) => s.id)).size).toBe(
    program.sessions.length,
  );
  expect(
    program.sessions.find((s) => s.id === "April-W1D1")?.sourceText,
  ).toContain("1.35");
});
it("preserves coaching prescriptions from three months", () => {
  expect(
    program.sessions.find((s) => s.id === "May-W1D1")?.sourceText,
  ).toContain("3-1-X-1");
  expect(
    program.sessions.find((s) => s.id === "June-W1D1")?.sourceText,
  ).toContain("5");
});
it("rejects invalid records instead of accepting corrupt backup data", () => {
  expect(() => parseState({ ...initialState(), schemaVersion: 99 })).toThrow();
  expect(() =>
    parseState({ ...initialState(), startDate: "2026-02-30" }),
  ).toThrow();
});
