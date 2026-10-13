import { it, expect } from "vitest";
import { selectConditionalTarget } from "../src/program/conditional-targets";
import { program } from "../src/program/catalog";
it("chooses one source alternative without adding every mutually exclusive prescription", () => {
  const ps = program.sessions.find((s) => s.id === "August-W3D5")!.exercises,
    group = ps.find((p) => p.conditionalGroup)!.conditionalGroup!;
  const chosen = ps.find((p) => p.conditionalGroup === group)!;
  const result = selectConditionalTarget(ps, group, chosen.id);
  expect(
    result.filter((p) => p.id === chosen.id)[0].conditionalGroup,
  ).toBeNull();
  expect(result.filter((p) => p.conditionalGroup === group)).toHaveLength(0);
  expect(ps.find((p) => p.id === chosen.id)?.conditionalGroup).toBe(group);
});
