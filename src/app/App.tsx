import { useEffect, useState } from "react";
import { stateToDocuments } from "../sync/documents";
import { useDeviceSync } from "../sync/useDeviceSync";
import { storageNamespace } from "../storage/db";
import { useOffline } from "../offline";
import { useAthleteStore } from "./store";
import Today from "./Today";
import Program from "./Program";
import Progress from "./Progress";
import Settings from "./Settings";
import WorkoutLog from "./WorkoutLog";
import EnrollmentPanel from "./EnrollmentPanel";
import TransferPreview from "./TransferPreview";
import {
  saveWorkout,
  saveMorning,
  saveSettings,
  saveActivity,
  exportRawStoredBackup,
  applyEnrollmentCommand,
  updateState,
} from "../storage/db";
import { replaceFromBackup } from "../storage/backup";
import { program, programDefinitions, getSession } from "../program/catalog";
import { scheduledSessions } from "../program/enrollments";
import {
  localToday,
  sessionSchema,
  type Session,
  type Workout,
} from "../domain/schema";
import { download } from "./fields";
export default function App() {
  const sync = useDeviceSync();
  const offline = useOffline(),
    store = useAthleteStore(),
    [tab, setTab] = useState("Today"),
    [transfer, setTransfer] = useState(false),
    [log, setLogState] = useState<{
      session: Session;
      date: string;
      enrollmentId: string | null;
      workoutId?: string;
    } | null>(null);
  const s = store.state;
  function setLog(next: typeof log) {
    setLogState(next);
    try {
      if (next)
        sessionStorage.setItem(
          "pet-open-log:" + storageNamespace(),
          JSON.stringify(next),
        );
      else sessionStorage.removeItem("pet-open-log:" + storageNamespace());
    } catch {
      /* Draft persistence reports storage errors separately. */
    }
  }
  useEffect(() => {
    setLogState(null);
    try {
      const raw = sessionStorage.getItem("pet-open-log:" + storageNamespace());
      if (raw) {
        const saved = JSON.parse(raw);
        setLogState({ ...saved, session: sessionSchema.parse(saved.session) });
      }
    } catch {
      /* Invalid navigation state never replaces athlete records. */
    }
    setTransfer(false);
  }, [sync.user?.id]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab, log]);
  async function rawBackup() {
    try {
      download(await exportRawStoredBackup());
    } catch (e) {
      store.setError(String(e));
    }
  }
  if (!s)
    return (
      <main className="loading">
        <h1>PET</h1>
        <p>{store.error || "Loading your training companion…"}</p>
        <button onClick={() => store.refresh()}>Retry</button>
        {store.error && (
          <button onClick={rawBackup}>Export stored backup</button>
        )}
      </main>
    );
  const active = s.enrollments.find((e) => e.status === "active");
  function openSaved(w: Workout) {
    const bridge = s!.enrollments
      .flatMap((e) => e.bridge?.sessions ?? [])
      .find((p) => p.sessionId === w.sessionId);
    const source =
      getSession(w.sessionId ?? "") ??
      (bridge ? getSession(bridge.sourceSessionId) : undefined);
    const session = source
      ? bridge
        ? {
            ...source,
            id: bridge.sessionId,
            focus: "Familiarization bridge",
            exercises: bridge.prescriptions,
          }
        : source
      : sessionSchema.parse({
          id: "custom",
          programId: "lp",
          phaseId: "lp-1",
          month: "Saved",
          blockIndex: 0,
          week: 1,
          day: 1,
          optional: false,
          focus: "Custom saved work",
          sourceText:
            "Saved custom session. Targets remain in this workout snapshot.",
          sources: [],
          exercises: w.targetSnapshot,
        });
    setLog({
      session,
      date: w.localDate,
      enrollmentId: w.enrollmentId,
      workoutId: w.id,
    });
  }
  return (
    <div className="app">
      <aside className="sidebar">
        <a className="brand" href="/">
          PET<span>PERFORMANCE / EVERY DAY</span>
        </a>
        <nav>
          {["Today", "Program", "Progress", "Settings"].map((t) => (
            <button
              key={t}
              className={tab === t && !log ? "active" : ""}
              onClick={() => {
                setTab(t);
                setLog(null);
                setTransfer(false);
              }}
            >
              <span aria-hidden="true">
                {t === "Today"
                  ? "◉"
                  : t === "Program"
                    ? "▤"
                    : t === "Progress"
                      ? "↗"
                      : "⚙"}
              </span>
              {t}
            </button>
          ))}
        </nav>
        <div className="sidebarfoot">
          <span className="dot" />
          {sync.label}
          <p>Train with intention.</p>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <span>YOUR TRAINING COMPANION</span>
          <span>
            {active
              ? programDefinitions.find((p) => p.id === active.programId)?.name
              : "Choose LP or UP"}
          </span>
        </header>
        {store.error && (
          <div className="error" role="alert">
            {store.error}
            <button onClick={rawBackup}>Export stored backup</button>
          </div>
        )}
        {store.saving && <p role="status">Saving…</p>}
        {store.message && (
          <p className="savestatus" role="status">
            {store.message}
          </p>
        )}
        {log ? (
          <WorkoutLog
            key={
              storageNamespace() +
              log.session.id +
              log.date +
              (log.workoutId ?? "") +
              (log.enrollmentId ?? "")
            }
            session={log.session}
            enrollmentId={log.enrollmentId}
            workoutId={log.workoutId}
            date={log.date}
            state={s}
            onBack={() => setLog(null)}
            onSave={(w, expected) => {
              // Preserve identity through a date edit and refresh without remounting this editor.
              try {
                const key = "pet-open-log:" + storageNamespace();
                const raw = sessionStorage.getItem(key);
                const open = raw ? JSON.parse(raw) : null;
                if (
                  open?.session.id === log.session.id &&
                  open?.date === log.date &&
                  open?.enrollmentId === log.enrollmentId
                )
                  sessionStorage.setItem(
                    key,
                    JSON.stringify({ ...log, workoutId: w.id }),
                  );
              } catch {
                /* Draft reports persistence failures. */
              }
              return store.perform(() => saveWorkout(w, expected));
            }}
          />
        ) : tab === "Today" ? (
          <Today
            key={storageNamespace()}
            state={s}
            onSave={(r, expected) =>
              store.perform(() => saveMorning(r, expected))
            }
            onActivity={(a) => store.perform(() => saveActivity(a))}
            onLog={(session, date) =>
              setLog({ session, date, enrollmentId: active?.id ?? null })
            }
          />
        ) : tab === "Program" ? (
          <>
            <EnrollmentPanel
              state={s}
              onCommand={(command) =>
                store.perform(() => applyEnrollmentCommand(command))
              }
              onTransfer={() => setTransfer(true)}
            />
            {transfer && (
              <TransferPreview
                state={s}
                beforeAccept={async () => {
                  if (sync.user && sync.meta?.linked && navigator.onLine) {
                    if ((await sync.now()) !== "synced")
                      throw Error(
                        "Sync must finish and conflicts must be resolved before an online transfer. Recompute the preview after syncing.",
                      );
                  }
                }}
                perform={store.perform}
                onCancel={() => setTransfer(false)}
              />
            )}
            <Program
              state={s}
              onLog={(session, enrollmentId) => {
                const run = s.enrollments.find((e) => e.id === enrollmentId)!;
                const date = scheduledSessions(run, program).find(
                  (p) => p.session.id === session.id,
                )!.date;
                setLog({ session, date, enrollmentId });
              }}
              onSchedule={(sessionId, date, enrollmentId) =>
                void store.perform(() =>
                  applyEnrollmentCommand({
                    type: "reschedule",
                    id: enrollmentId,
                    sessionId,
                    date,
                  }),
                )
              }
              onSkip={(enrollmentId, sessionId) =>
                void store.perform(() =>
                  applyEnrollmentCommand({
                    type: "skip",
                    id: enrollmentId,
                    sessionId,
                    date: localToday(),
                  }),
                )
              }
              onTarget={(enrollmentId, sessionId, prescriptions, reason) =>
                store.perform(() =>
                  updateState((current) => ({
                    ...current,
                    enrollments: current.enrollments.map((e) =>
                      e.id === enrollmentId
                        ? {
                            ...e,
                            targetRevisions: [
                              ...e.targetRevisions,
                              {
                                id: crypto.randomUUID(),
                                sessionId,
                                prescriptions,
                                reason,
                                kind: "alternative",
                                createdAt: new Date().toISOString(),
                              },
                            ],
                          }
                        : e,
                    ),
                  })),
                )
              }
            />
          </>
        ) : tab === "Progress" ? (
          <Progress
            state={s}
            onOpen={openSaved}
            onActivity={(a) => store.perform(() => saveActivity(a))}
          />
        ) : (
          <Settings
            key={storageNamespace()}
            sync={sync}
            state={s}
            onSave={(state, expected) =>
              store.perform(() =>
                saveSettings(
                  state,
                  expected ??
                    JSON.stringify(
                      stateToDocuments(s).filter((d) =>
                        ["configuration", "schedule"].includes(d.kind),
                      ),
                    ),
                ),
              )
            }
            onImport={(state) => store.perform(() => replaceFromBackup(state))}
          />
        )}
        <div className="offline-status">
          {offline.status === "ready" ? (
            <small>Offline ready</small>
          ) : offline.status === "failed" ? (
            <button onClick={offline.retry}>Offline unavailable · retry</button>
          ) : (
            <small>Preparing offline access…</small>
          )}
          {offline.updateReady && (
            <button onClick={offline.update}>
              Update ready · save entries before reload
            </button>
          )}
        </div>
        <footer>Measured work. Honest signals. Your decisions.</footer>
      </main>
    </div>
  );
}
