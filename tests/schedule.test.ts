import { it, expect } from "vitest";
import { sessionDate, sessionsForDate } from "../src/program/schedule";
import { program } from "../src/program/catalog";
it("maps month blocks to four-week local dates including DST", () => {
  const a = program.sessions.find((s) => s.id === "April-W1D1")!,
    b = program.sessions.find((s) => s.id === "May-W1D1")!;
  expect(sessionDate(a, "2026-10-12")).toBe("2026-10-12");
  expect(sessionDate(b, "2026-10-12")).toBe("2026-11-09");
  expect(sessionsForDate(program, "2026-10-15", "2026-10-12", {})).toEqual([]);
});
it("allows rescheduled sessions together without changing history", () => {
  expect(
    sessionsForDate(program, "2026-10-12", "2026-10-12", {
      "April-W1D2": "2026-10-12",
    }),
  ).toHaveLength(2);
});
