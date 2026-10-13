import type { AthleteState, Program } from "./schema";
export function validateCatalogState(
  state: AthleteState,
  catalog: Program,
): AthleteState {
  const bridges = new Set<string>();
  for (const e of state.enrollments) {
    const belongs = (id: string) =>
      catalog.sessions.some((s) => s.id === id && s.programId === e.programId);
    if (e.programVersion !== catalog.version || !belongs(e.entrySessionId))
      throw Error("Invalid enrollment entry/catalogue");
    for (const id of [
      ...Object.keys(e.reschedules),
      ...e.skippedSessionIds,
      ...(e.continuationSessionId ? [e.continuationSessionId] : []),
    ])
      if (!belongs(id)) throw Error("Invalid enrollment schedule reference");
    if (e.bridge) {
      if (e.bridge.startDate > e.bridge.endDate)
        throw Error("Invalid bridge range");
      for (const b of e.bridge.sessions) {
        if (
          !belongs(b.sourceSessionId) ||
          !b.sessionId.startsWith("bridge-") ||
          bridges.has(b.sessionId) ||
          b.date < e.bridge.startDate ||
          b.date > e.bridge.endDate
        )
          throw Error("Invalid bridge reference");
        bridges.add(b.sessionId);
      }
    }
    const enrolled = (id: string) =>
      belongs(id) || !!e.bridge?.sessions.some((b) => b.sessionId === id);
    for (const r of e.targetRevisions)
      if (!enrolled(r.sessionId))
        throw Error("Invalid enrollment target reference");
    for (const w of state.workouts.filter((w) => w.enrollmentId === e.id)) {
      if (!w.sessionId || !enrolled(w.sessionId))
        throw Error("Invalid enrolled workout reference");
      if (w.targetRevisions.some((r) => r.sessionId !== w.sessionId))
        throw Error("Invalid workout target reference");
    }
  }
  return state;
}
