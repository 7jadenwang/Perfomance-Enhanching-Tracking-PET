export type DocumentKind =
  "configuration" | "schedule" | "workout" | "morning" | "activity";
export type SyncDocument = {
  kind: DocumentKind;
  key: string;
  revision: number;
  schemaVersion: 2;
  catalogueVersion: "lp-up-v2";
  payload: unknown;
  deleted: boolean;
};
export type OutboxMutation = SyncDocument & {
  baseRevision: number;
  generation: number;
};
export type SyncConflict = {
  identity: string;
  base: SyncDocument | null;
  local: SyncDocument;
  remote: SyncDocument | null;
};
export type CommitResult =
  | { status: "acknowledged"; documents: SyncDocument[] }
  | {
      status: "conflict";
      conflicts: {
        kind: DocumentKind;
        key: string;
        remote: SyncDocument | null;
      }[];
    };
export type SyncTransport = {
  snapshot(): Promise<SyncDocument[]>;
  commit(requestId: string, changes: OutboxMutation[]): Promise<CommitResult>;
};
export type SyncStatus =
  | "localOnly"
  | "syncing"
  | "synced"
  | "pending"
  | "authRequired"
  | "conflict"
  | "failed"
  | "linkRequired";
export const identity = (d: Pick<SyncDocument, "kind" | "key">) =>
  d.kind + "|" + d.key;
export const same = (
  a: SyncDocument | null | undefined,
  b: SyncDocument | null | undefined,
) =>
  !!a && !!b
    ? a.deleted === b.deleted &&
      JSON.stringify(a.payload) === JSON.stringify(b.payload)
    : !a && !b;

export type SyncMeta = {
  id: string;
  linked: boolean;
  base: SyncDocument[];
  pending: OutboxMutation[];
  inflight: { requestId: string; changes: OutboxMutation[] } | null;
  conflicts: SyncConflict[];
  resolvedConflicts?: SyncConflict[];
  generation: number;
  lastSuccess: string | null;
};
export const emptyMeta = (id: string): SyncMeta => ({
  id,
  linked: false,
  base: [],
  pending: [],
  inflight: null,
  conflicts: [],
  generation: 0,
  lastSuccess: null,
});
