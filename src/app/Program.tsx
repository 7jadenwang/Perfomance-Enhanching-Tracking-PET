import { targetKilograms } from "../program/targets";
import { useState } from "react";
import { program } from "../program/catalog";
import { sessionDate } from "../program/schedule";
import type { AthleteState, Session } from "../domain/schema";
import { Card } from "./fields";
export function Sources({ session }: { session: Session }) {
  return (
    <details className="sources">
      <summary>Original plan images ({session.sources.length})</summary>
      {session.sources.map((p) => (
        <a key={p} href={"/" + p} target="_blank" rel="noreferrer">
          <img loading="lazy" src={"/" + p} alt={p.split("/").at(-1)} />
        </a>
      ))}
      <p>
        Open an image to zoom. Original instructions remain the authority for
        complex structures.
      </p>
    </details>
  );
}
export default function Program({
  state,
  onLog,
  onSchedule,
}: {
  state: AthleteState;
  onLog: (s: Session) => void;
  onSchedule: (id: string, date: string) => void;
}) {
  const [month, setMonth] = useState("April"),
    [selected, setSelected] = useState<Session | null>(null);
  return (
    <>
      <div className="pagehead">
        <p className="eyebrow">THE PROGRAM</p>
        <h1>Three months. One clear plan.</h1>
        <p>
          Browse the original April–June blocks. Your start date determines
          their calendar dates.
        </p>
      </div>
      <div className="tabs">
        {["April", "May", "June"].map((m) => (
          <button
            className={month === m ? "active" : ""}
            key={m}
            onClick={() => {
              setMonth(m);
              setSelected(null);
            }}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="sessiongrid">
        {program.sessions
          .filter((s) => s.month === month)
          .map((s) => (
            <button
              className="sessiontile"
              key={s.id}
              onClick={() => setSelected(s)}
              aria-label={`${s.month} W${s.week} D${s.day}`}
            >
              <span>
                WEEK {s.week} / DAY {s.day}
              </span>
              <strong>{s.exercises[0]?.name}</strong>
              <small>
                {state.reschedules[s.id] ?? sessionDate(s, state.startDate)}{" "}
                {s.optional ? "· Optional" : ""}
              </small>
            </button>
          ))}
      </div>
      {selected && (
        <Card>
          <div className="sectionhead">
            <h2>
              {selected.month} · W{selected.week} D{selected.day}
            </h2>
            <button className="primary" onClick={() => onLog(selected)}>
              Log this session
            </button>
          </div>
          <label className="field">
            Reschedule date
            <input
              type="date"
              value={
                state.reschedules[selected.id] ??
                sessionDate(selected, state.startDate)
              }
              onChange={(e) => {
                if (e.target.value) onSchedule(selected.id, e.target.value);
              }}
            />
          </label>
          <Sources session={selected} />
          {selected.exercises.map((p) => (
            <div className="prescription" key={p.id}>
              <h3>
                {p.name} {p.optional && <small>Optional</small>}
              </h3>
              <p className="sourceText">{p.sourceText}</p>
              {p.loadPercent && (
                <p className="hint">
                  Target external load:{" "}
                  {(() => {
                    const target = targetKilograms(
                      p,
                      state.reference1RMs,
                      state.reschedules[selected.id] ??
                        sessionDate(selected, state.startDate),
                    );
                    return target
                      ? `${target[0].toFixed(1)}–${target[1].toFixed(1)} kg (${p.referenceExerciseId} reference)`
                      : "Unknown — enter a dated matching 1RM reference in Settings; do not share references across exercises.";
                  })()}
                </p>
              )}
              {p.ambiguity && <p className="notice">{p.ambiguity}</p>}
            </div>
          ))}
        </Card>
      )}
    </>
  );
}
