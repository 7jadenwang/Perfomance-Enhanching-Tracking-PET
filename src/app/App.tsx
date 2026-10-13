import { useOffline } from "../offline";
import { useEffect, useState } from "react";
import { useAthleteStore } from "./store";
import Today from "./Today";
import Program from "./Program";
import Progress from "./Progress";
import Settings from "./Settings";
import WorkoutLog from "./WorkoutLog";
import { saveWorkout, saveMorning, saveSettings,saveActivity,exportRawStoredBackup } from "../storage/db";
import { replaceFromBackup, exportBackup } from "../storage/backup";
import { program } from "../program/catalog";
import type { Session } from "../domain/schema";
import { sessionDate } from "../program/schedule";
import { download } from "./fields";
export default function App() {
  const offline = useOffline(),
    store = useAthleteStore(),
    [tab, setTab] = useState("Today"),
    [log, setLog] = useState<{
      session: Session;
      date: string;
      workoutId?: string;
    } | null>(null);
  const s = store.state;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab, log]);
  if (!s)
    return (
      <main className="loading">
        <h1>PET</h1>
        <p>{store.error || "Loading your training companion…"}</p>
        <button onClick={() => store.refresh()}>Retry</button>
      </main>
    );
  return (
    <div className="app">
      <aside className="sidebar">
        <a className="brand" href="/">
          PET<span>PERFORMANCE / EVERY DAY</span>
        </a>
        <nav>
          {["Today", "Program", "Progress", "Settings"].map((t) => (
            <button
              className={tab === t && !log ? "active" : ""}
              key={t}
              onClick={() => {
                setTab(t);
                setLog(null);
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
          <span className="dot" /> Local to this device
          <p>Train with intention.</p>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <span>YOUR TRAINING COMPANION</span>
          <span>April → June · 12 weeks</span>
        </header>
        {store.error && (
          <div className="error" role="alert">
            {store.error}
            <button
              onClick={async () => {
                try {
                  download(await exportRawStoredBackup());
                } catch (e) {
                  store.setError(String(e));
                }
              }}
            >
              Export stored backup
            </button>
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
            key={log.session.id + log.date + (log.workoutId ?? "")}
            session={log.session}
            workoutId={log.workoutId}
            date={log.date}
            state={s}
            onBack={() => setLog(null)}
            onSave={(w) => store.perform(() => saveWorkout(w))}
          />
        ) : tab === "Today" ? (
          <Today
            state={s}
            onSave={(r) => store.perform(() => saveMorning(r))}
            onLog={(session, date) => setLog({ session, date })}
            onActivity={activity=>store.perform(()=>saveActivity(activity))}
          />
        ) : tab === "Program" ? (
          <Program
            state={s}
            onLog={(session) =>
              setLog({
                session,
                date:
                  s.reschedules[session.id] ??
                  sessionDate(session, s.startDate),
              })
            }
            onSchedule={(id, date) => {
              void store.perform(() =>
                saveSettings({
                  ...s,
                  reschedules: { ...s.reschedules, [id]: date },
                }),
              );
            }}
          />
        ) : tab === "Progress" ? (
          <Progress
            state={s}
            onOpen={(w) => {
              const session = program.sessions.find(
                (x) => x.id === w.sessionId,
              ) ?? {
                id: w.sessionId ?? "custom",
                month: "Saved",
                programId: "lp" as const, phaseId:"lp-1", focus:"Saved session", sourceConflict:null, conditionalSources:[], alternativePlans:[], autoregulation:"source" as const,
                blockIndex: 0,
                week: 1,
                day: 1,
                optional: false,
                sourceText: "No bundled source for this saved session.",
                sources: [],
                exercises: [],
              };
              setLog({ session, date: w.localDate, workoutId: w.id });
            }}
          />
        ) : (
          <Settings
            state={s}
            onSave={(state) => store.perform(() => saveSettings(state))}
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
