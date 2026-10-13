import { useState } from "react";
import { authenticate, signOut } from "../sync/auth";
import type { DeviceSync } from "../sync/useDeviceSync";
import { storageNamespace } from "../storage/db";
import { Select, Card, download } from "./fields";
export default function SyncSettings({ sync }: { sync: DeviceSync }) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [manual, setManual] = useState<Record<string, string>>({});
  const [linkChoices, setLinkChoices] = useState<
    Record<string, "local" | "remote">
  >({});
  const [batchChoices, setBatchChoices] = useState<
    Record<string, "local" | "remote" | "manual">
  >({});
  async function action(fn: () => Promise<unknown>, success = "") {
    setBusy(true);
    setError("");
    try {
      await fn();
      setMessage(success);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <h2>Private PC–phone sync</h2>
      {!sync.configured ? (
        <>
          <p>Sync is not configured. Your records are saved in this browser.</p>
          <p>
            Follow docs/device-sync-setup.md to create Supabase and configure
            the same HTTPS site on both devices.
          </p>
        </>
      ) : (
        <>
          <p role="status">{sync.label}</p>
          {sync.user ? (
            <>
              <p>Signed in as {sync.user.email ?? sync.user.id}</p>
              <p>
                Saved training dates, measurements and settings synchronize
                privately with this account. Unsaved drafts stay on the device.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void action(() => signOut())}
              >
                Sign out
              </button>
              {sync.recovery && (
                <>
                  <label className="field">
                    New account password
                    <input
                      type="password"
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </label>
                  <button
                    disabled={busy || password.length < 8}
                    onClick={() =>
                      void action(async () => {
                        await authenticate("password", email, password);
                        sync.setRecovery(false);
                        setPassword("");
                      }, "Password updated")
                    }
                  >
                    Update password
                  </button>
                </>
              )}
              {sync.meta?.linked ? (
                <>
                  <button
                    disabled={busy || sync.meta?.paused}
                    onClick={() => void action(() => sync.now())}
                  >
                    Sync now
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      void action(() => sync.setPaused(!sync.meta?.paused))
                    }
                  >
                    {sync.meta?.paused
                      ? "Resume account sync"
                      : "Pause account sync"}
                  </button>
                  <p>
                    Pausing sync keeps this account cache available for local
                    training and queues saved edits. An upload already in
                    progress may finish.
                  </p>
                  <p>
                    {sync.meta.pending.length} pending documents · Last
                    successful sync: {sync.meta.lastSuccess ?? "not yet"}
                  </p>
                  <p>
                    Sign-out stops syncing and retains this account’s isolated
                    offline records. Re-sign in to resume.
                  </p>
                </>
              ) : (
                <button
                  disabled={busy}
                  onClick={() => void action(() => sync.previewLink())}
                >
                  Preview account link
                </button>
              )}
              {sync.preview && (
                <div className="notice">
                  <h3>Review first link</h3>
                  <p>
                    Cloud:{" "}
                    {sync.preview.remote.filter((d) => !d.deleted).length}{" "}
                    documents. This device guest history:{" "}
                    {sync.preview.guest.workouts.length} workouts and{" "}
                    {sync.preview.guest.mornings.length} mornings.
                  </p>
                  <p>
                    Guest records remain separate. Using cloud history does not
                    upload guest history. Export guest history before linking if
                    you want a backup.
                  </p>
                  <button
                    onClick={() =>
                      download(
                        JSON.stringify(sync.preview!.guest, null, 2),
                        "pet-guest-backup.json",
                      )
                    }
                  >
                    Export guest history
                  </button>
                  {sync.preview.remote.length > 0 ? (
                    <>
                      <button
                        disabled={busy}
                        onClick={() => void action(() => sync.connect("cloud"))}
                      >
                        Use cloud history
                      </button>
                      <details>
                        <summary>Merge guest and cloud histories</summary>
                        <p>
                          Distinct records are combined. Review every
                          conflicting aggregate/record. Configuration and
                          baseline references must remain consistent; invalid
                          choices do not change any records.
                        </p>
                        {sync.mergePreview?.conflicts.map((c) => (
                          <div key={c.identity}>
                            <h4>{c.identity}</h4>
                            <details>
                              <summary>Compare link versions</summary>
                              <pre>{JSON.stringify(c, null, 2)}</pre>
                            </details>
                            <Select
                              label={"Link choice " + c.identity}
                              value={linkChoices[c.identity] ?? ""}
                              options={[
                                ["", "Choose after reviewing"],
                                ["local", "Guest device version"],
                                ["remote", "Cloud version"],
                              ]}
                              onChange={(v) =>
                                setLinkChoices({
                                  ...linkChoices,
                                  [c.identity]: v as "local" | "remote",
                                })
                              }
                            />
                          </div>
                        ))}
                        <button
                          disabled={
                            busy ||
                            sync.mergePreview?.conflicts.some(
                              (c) => !linkChoices[c.identity],
                            )
                          }
                          onClick={() =>
                            void action(() =>
                              sync.connect("merge", linkChoices),
                            )
                          }
                        >
                          Accept reviewed history merge
                        </button>
                      </details>
                      <p>
                        To replace cloud history with another reviewed backup,
                        link the cloud first and use the explicit backup import
                        preview below. That replacement synchronizes to other
                        devices.
                      </p>
                    </>
                  ) : (
                    <>
                      <button
                        disabled={busy}
                        onClick={() =>
                          void action(() => sync.connect("device"))
                        }
                      >
                        Upload this device history
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => void action(() => sync.connect("cloud"))}
                      >
                        Start empty account history
                      </button>
                    </>
                  )}
                </div>
              )}
              {sync.meta?.conflicts.map((c) => (
                <div className="notice" key={c.identity}>
                  <h3>Conflict: {c.identity}</h3>
                  <p>
                    Both versions are retained. Review them before choosing. A
                    deletion stays a tombstone.
                  </p>
                  <details>
                    <summary>Base, device and cloud values</summary>
                    <pre>{JSON.stringify(c, null, 2)}</pre>
                  </details>
                  <button
                    onClick={() =>
                      download(
                        JSON.stringify(c, null, 2),
                        "pet-sync-conflict.json",
                      )
                    }
                  >
                    Export conflict versions
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      void action(() => sync.resolve(c.identity, "local", c))
                    }
                  >
                    Keep device version
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      void action(() => sync.resolve(c.identity, "remote", c))
                    }
                  >
                    Keep cloud version
                  </button>
                  <details>
                    <summary>Manual merged document</summary>
                    <textarea
                      aria-label={"Merged document " + c.identity}
                      value={manual[c.identity] ?? ""}
                      onChange={(e) =>
                        setManual({ ...manual, [c.identity]: e.target.value })
                      }
                    />
                    <button
                      disabled={busy || !manual[c.identity]}
                      onClick={() =>
                        void action(() =>
                          sync.resolve(
                            c.identity,
                            JSON.parse(manual[c.identity]),
                            c,
                          ),
                        )
                      }
                    >
                      Use reviewed merge
                    </button>
                  </details>
                </div>
              ))}
              {(sync.meta?.conflicts.length ?? 0) > 1 && (
                <div className="notice">
                  <h3>Resolve related conflicts together</h3>
                  <p>
                    Choose each version, then validate and apply the whole group
                    atomically. Baselines and their linked morning records must
                    remain consistent.
                  </p>
                  {sync.meta!.conflicts.map((c) => (
                    <Select
                      key={c.identity}
                      label={"Conflict batch choice " + c.identity}
                      value={batchChoices[c.identity] ?? ""}
                      options={[
                        ["", "Choose after reviewing"],
                        ["local", "Device version"],
                        ["remote", "Cloud version"],
                        ["manual", "Manual document above"],
                      ]}
                      onChange={(v) =>
                        setBatchChoices({
                          ...batchChoices,
                          [c.identity]: v as "local" | "remote" | "manual",
                        })
                      }
                    />
                  ))}
                  <button
                    disabled={
                      busy ||
                      sync.meta!.conflicts.some(
                        (c) =>
                          !batchChoices[c.identity] ||
                          (batchChoices[c.identity] === "manual" &&
                            !manual[c.identity]),
                      )
                    }
                    onClick={() =>
                      void action(() =>
                        sync.resolveBatch(
                          sync.meta!.conflicts.map((c) => ({
                            conflict: c,
                            choice:
                              batchChoices[c.identity] === "manual"
                                ? JSON.parse(manual[c.identity])
                                : (batchChoices[c.identity] as
                                    "local" | "remote"),
                          })),
                        ),
                      )
                    }
                  >
                    Apply reviewed conflict batch
                  </button>
                </div>
              )}
              {(sync.meta?.conflictArchive?.length ?? 0) > 0 && (
                <button
                  onClick={() =>
                    download(
                      JSON.stringify(sync.meta?.conflictArchive, null, 2),
                      "pet-conflict-version-history.json",
                    )
                  }
                >
                  Export conflict version history
                </button>
              )}
              {(sync.meta?.resolvedConflicts?.length ?? 0) > 0 && (
                <button
                  onClick={() =>
                    download(
                      JSON.stringify(sync.meta?.resolvedConflicts, null, 2),
                      "pet-resolved-conflicts.json",
                    )
                  }
                >
                  Export resolved conflict originals
                </button>
              )}
            </>
          ) : (
            <>
              <label className="field">
                Account email
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="field">
                Account password
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <div className="actions">
                <button
                  disabled={busy || !email || !password}
                  onClick={() =>
                    void action(async () => {
                      await authenticate("signIn", email, password);
                      setPassword("");
                    })
                  }
                >
                  Sign in
                </button>
                <button
                  disabled={busy || !email || password.length < 8}
                  onClick={() =>
                    void action(
                      () => authenticate("signUp", email, password),
                      "Check your email to confirm the account",
                    )
                  }
                >
                  Create account
                </button>
                <button
                  disabled={busy || !email}
                  onClick={() =>
                    void action(
                      () => authenticate("reset", email, ""),
                      "Check your email for the reset link",
                    )
                  }
                >
                  Reset password
                </button>
              </div>
            </>
          )}
        </>
      )}
      {message && <p role="status">{message}</p>}
      {(error || sync.error) && <p role="alert">{error || sync.error}</p>}
    </Card>
  );
}
