import { describe, expect, it } from "vitest";
import { createRow, createVelocity } from "../src/domain/records";
import { program } from "../src/program/catalog";
import * as log from "../src/domain/movement-log";
describe("progressive movement logging", () => {
  it("starts one set per required movement and preserves existing rows", () => {
    const prescriptions = program.sessions[0].exercises;
    const rows = log.startMovements([], prescriptions);
    expect(rows.length).toBe(
      prescriptions.filter(
        (p) =>
          p.sets && p.kind !== "other" && !p.optional && !p.conditionalGroup,
      ).length,
    );
    expect(log.startMovements(rows, prescriptions)).toEqual(rows);
  });
  it("copies reusable inputs but never previous effort or measured performance", () => {
    const first = createRow({
      confirmed: true,
      loadKg: 80,
      reps: 5,
      setRpe: 8,
      rir: 2,
      velocity: createVelocity({ setAverage: 0.6 }),
      notes: "previous",
    });
    const next = log.nextSet(first);
    expect(next.loadKg).toBe(80);
    expect(next.reps).toBe(5);
    expect(next.id).not.toBe(first.id);
    expect(next.confirmed).toBe(false);
    expect(next.velocity?.setAverage ?? null).toBeNull();
    expect(next.setRpe).toBeNull();
    expect(next.rir).toBeNull();
    expect(next.notes).toBe("");
  });
});

it("groups legacy sets by their existing movement name without rewriting them", () => {
  const p = program.sessions[0].exercises.find((p) => p.sets)!;
  const rows = [
    createRow({
      name: p.name,
      exerciseId: p.name,
      prescriptionId: null,
      movementId: null,
      confirmed: true,
    }),
  ];
  const before = JSON.stringify(rows);
  expect(log.movementGroups(rows, [p])).toHaveLength(1);
  expect(log.movementGroups(rows, [p])[0].rows).toEqual(rows);
  expect(log.startMovements(rows, [p])).toEqual(rows);
  expect(JSON.stringify(rows)).toBe(before);
});
