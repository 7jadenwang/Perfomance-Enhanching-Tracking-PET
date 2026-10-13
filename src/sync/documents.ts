import { parseState, type AthleteState } from "../domain/schema";
import type { SyncDocument, DocumentKind } from "./types";
export function stateToDocuments(state: AthleteState): SyncDocument[] {
  const { workouts, mornings, activities, enrollments, ...configuration } =
    state;
  const document = (
    kind: DocumentKind,
    key: string,
    payload: unknown,
  ): SyncDocument => ({
    kind,
    key,
    payload,
    revision: 0,
    schemaVersion: 2,
    catalogueVersion: "lp-up-v2",
    deleted: false,
  });
  return [
    document("configuration", "configuration", configuration),
    document("schedule", "schedule", { enrollments }),
    ...workouts.map((w) => document("workout", w.id, w)),
    ...mornings.map((m) =>
      document("morning", m.localDate + "|" + m.protocolId, m),
    ),
    ...activities.map((a) => document("activity", a.localDate, a)),
  ];
}
export function validateDocuments(docs: SyncDocument[]) {
  const identities = new Set<string>();
  for (const d of docs) {
    const id = d.kind + "|" + d.key;
    if (identities.has(id)) throw Error("Duplicate sync document");
    identities.add(id);
    if (
      !["configuration", "schedule", "workout", "morning", "activity"].includes(
        d.kind,
      ) ||
      !d.key ||
      !Number.isSafeInteger(d.revision) ||
      d.revision < 0 ||
      d.schemaVersion !== 2 ||
      d.catalogueVersion !== "lp-up-v2" ||
      typeof d.deleted !== "boolean" ||
      (!d.deleted &&
        (!d.payload ||
          typeof d.payload !== "object" ||
          Array.isArray(d.payload)))
    )
      throw Error("Unsupported or invalid sync document");
  }
}
export function documentsToState(docs: SyncDocument[]): AthleteState {
  validateDocuments(docs);
  const alive = docs.filter((d) => !d.deleted);
  const config = alive.find(
      (d) => d.kind === "configuration" && d.key === "configuration",
    ),
    schedule = alive.find((d) => d.kind === "schedule" && d.key === "schedule");
  if (!config || !schedule)
    throw Error("Required sync configuration/schedule missing");
  const state = parseState({
    ...(config.payload as object),
    ...(schedule.payload as object),
    workouts: alive.filter((d) => d.kind === "workout").map((d) => d.payload),
    mornings: alive.filter((d) => d.kind === "morning").map((d) => d.payload),
    activities: alive
      .filter((d) => d.kind === "activity")
      .map((d) => d.payload),
  });
  for (const d of alive) {
    const p = d.payload as {
      id?: string;
      localDate?: string;
      protocolId?: string;
    };
    if (
      (d.kind === "workout" && d.key !== p.id) ||
      (d.kind === "morning" && d.key !== p.localDate + "|" + p.protocolId) ||
      (d.kind === "activity" && d.key !== p.localDate)
    )
      throw Error("Sync document identity mismatch");
  }
  return state;
}
