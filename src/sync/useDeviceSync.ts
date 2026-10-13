import { useEffect, useRef, useState } from "react";
import { syncClient, supabaseTransport } from "./client";
import { syncOnce, resolveConflict, lastSyncError } from "./engine";
import {
  db,
  loadState,
  storageNamespace,
  setStorageNamespace,
  getSyncMeta,
  linkAccount,
} from "../storage/db";
import { initialState, type AthleteState } from "../domain/schema";
import { firstLinkPreview, resolveFirstLink } from "./reconcile";
import { stateToDocuments } from "./documents";
import type { SyncStatus, SyncDocument, SyncMeta } from "./types";
export const statusLabels: Record<SyncStatus, string> = {
  localOnly: "Local only",
  syncing: "Syncing",
  synced: "Synced",
  pending: "Pending sync",
  authRequired: "Sign in required",
  conflict: "Conflict needs review",
  failed: "Sync failed",
  linkRequired: "Link review required",
};
export function useDeviceSync() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null),
    [status, setStatus] = useState<SyncStatus>("localOnly"),
    [error, setError] = useState(""),
    [meta, setMeta] = useState<SyncMeta | null>(null),
    [preview, setPreview] = useState<{
      remote: SyncDocument[];
      guest: AthleteState;
    } | null>(null),
    [recovery, setRecovery] = useState(false);
  const userRef = useRef<typeof user>(null),
    busy = useRef(false),
    retry = useRef(1000),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    generation = useRef(0);
  async function refresh() {
    const ns = storageNamespace(),
      m = await getSyncMeta(ns);
    if (ns === storageNamespace()) setMeta(m);
  }
  async function now() {
    const u = userRef.current;
    if (!u || busy.current) return status;
    const ns = "account:" + u.id;
    if (storageNamespace() !== ns) return status;
    busy.current = true;
    setStatus("syncing");
    let result: SyncStatus = "failed";
    try {
      result = await syncOnce(ns, supabaseTransport(u.id));
      if (storageNamespace() !== ns) return result;
      setStatus(result);
      setError(
        result === "failed" || result === "authRequired" ? lastSyncError : "",
      );
      await refresh();
      if (result === "failed" || result === "pending") {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => void now(), retry.current);
        retry.current = Math.min(30000, retry.current * 2);
      } else retry.current = 1000;
    } finally {
      busy.current = false;
    }
    return result;
  }
  const runRef = useRef(now);
  runRef.current = now;
  useEffect(() => {
    if (!syncClient) return;
    let alive = true;
    async function account(
      session: { user: { id: string; email?: string } } | null,
    ) {
      const token = ++generation.current;
      if (timer.current) clearTimeout(timer.current);
      const next = session?.user ?? null;
      userRef.current = next;
      setUser(next);
      setPreview(null);
      setError("");
      setMeta(null);
      await setStorageNamespace(next ? "account:" + next.id : "guest");
      if (!alive || token !== generation.current) return;
      if (next) {
        const m = await getSyncMeta("account:" + next.id);
        if (token !== generation.current) return;
        setMeta(m);
        setStatus(m.linked ? "pending" : "linkRequired");
        if (m.linked) void runRef.current();
      } else setStatus("localOnly");
    }
    void syncClient.auth.getSession().then(({ data }) => account(data.session));
    const { data } = syncClient.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (
        event === "SIGNED_OUT" ||
        event === "SIGNED_IN" ||
        event === "INITIAL_SESSION"
      )
        setTimeout(() => {
          if (alive) void account(session);
        }, 0);
    });
    const local = () => {
      if (storageNamespace() === "guest") return;
      setStatus("pending");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void runRef.current(), 300);
    };
    const foreground = () => {
      if (document.visibilityState === "visible") void runRef.current();
    };
    window.addEventListener("pet-local-save", local);
    window.addEventListener("focus", foreground);
    window.addEventListener("online", foreground);
    document.addEventListener("visibilitychange", foreground);
    const interval = setInterval(foreground, 30000);
    return () => {
      alive = false;
      generation.current++;
      data.subscription.unsubscribe();
      window.removeEventListener("pet-local-save", local);
      window.removeEventListener("focus", foreground);
      window.removeEventListener("online", foreground);
      document.removeEventListener("visibilitychange", foreground);
      clearInterval(interval);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  async function previewLink() {
    const u = userRef.current;
    if (!u) throw Error("Sign in first");
    const remote = await supabaseTransport(u.id).snapshot();
    const guest = (await db.state.get("athlete"))?.value ?? initialState();
    if (userRef.current?.id !== u.id) throw Error("Account changed");
    setPreview({ remote, guest });
  }
  async function connect(
    choice: "cloud" | "device" | "merge",
    choices: Record<string, "local" | "remote" | SyncDocument> = {},
  ) {
    const u = userRef.current;
    if (!u || !preview) throw Error("Preview link first");
    const latest = await supabaseTransport(u.id).snapshot();
    if (JSON.stringify(latest) !== JSON.stringify(preview.remote))
      throw Error("Cloud changed; preview the link again");
    if (choice === "device" && latest.length)
      throw Error(
        "Cloud already has records. Use cloud history, then explicitly import a backup to review its replacement effects.",
      );
    await linkAccount(latest, choice === "device" ? preview.guest : null);
    setPreview(null);
    await now();
  }
  async function resolve(
    id: string,
    choice: "local" | "remote" | SyncDocument,
  ) {
    const u = userRef.current;
    if (!u) throw Error("Sign in first");
    await resolveConflict(
      "account:" + u.id,
      id,
      choice,
      supabaseTransport(u.id),
    );
    await now();
  }
  return {
    configured: !!syncClient,
    user,
    status,
    label: statusLabels[status],
    error,
    meta,
    preview,
    mergePreview: preview
      ? firstLinkPreview(preview.guest, preview.remote)
      : null,
    recovery,
    now,
    previewLink,
    connect,
    resolve,
    refresh,
    setRecovery,
  };
}
export type DeviceSync = ReturnType<typeof useDeviceSync>;
