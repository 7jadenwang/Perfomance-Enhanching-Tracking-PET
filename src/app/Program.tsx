import { useState, useEffect } from "react";
import {
  program,
  programDefinitions,
  getPhase,
  sessionLabel,
} from "../program/catalog";
import { sessionDate, weekdays } from "../program/schedule";
import { scheduledSessions } from "../program/enrollments";
import { targetKilograms } from "../program/targets";
import type { AthleteState, Session, Prescription } from "../domain/schema";
import { Card, Select } from "./fields";
export function Sources({ session }: { session: Session }) {
  return (
    <details className="sources">
      <summary>Original plan images ({session.sources.length})</summary>
      {session.sources.map((path) => (
        <a key={path} href={"/" + path} target="_blank" rel="noreferrer">
          <img loading="lazy" src={"/" + path} alt={path.split("/").at(-1)} />
        </a>
      ))}
      <p>
        Open to zoom. Original instructions remain authoritative; calendar
        filenames identify sources.
      </p>
    </details>
  );
}
export default function Program({
  state,
  onLog,
  onSchedule,
  onTarget,
  onSkip,
}: {
  state: AthleteState;
  onLog: (s: Session, enrollmentId: string) => void;
  onSchedule: (id: string, date: string, enrollmentId: string) => void;
  onTarget: (
    enrollmentId: string,
    sessionId: string,
    prescriptions: Prescription[],
    reason: string,
  ) => Promise<boolean>;
  onSkip: (enrollmentId: string, sessionId: string) => void;
}) {
  const [track, setTrack] = useState<"lp" | "up">(
      state.enrollments.find((e) => e.status === "active")?.programId ?? "lp",
    ),
    [phaseId, setPhaseId] = useState(""),
    [selectedId, setSelectedId] = useState(""),
    [runId, setRunId] = useState(""),
    [alternative, setAlternative] = useState("");
  const activeId = state.enrollments.find((e) => e.status === "active")?.id;
  useEffect(() => {
    const active = state.enrollments.find((e) => e.id === activeId);
    if (active) {
      setTrack(active.programId);
      setPhaseId("");
      setSelectedId("");
      setRunId(active.id);
    }
  }, [activeId]);
  const definition = programDefinitions.find((p) => p.id === track)!,
    phase = getPhase(
      phaseId && definition.phases.some((p) => p.id === phaseId)
        ? phaseId
        : definition.phases[0].id,
    );
  const runs = state.enrollments.filter((e) => e.programId === track),
    run =
      runs.find((e) => e.id === runId) ??
      runs.find((e) => e.status === "active") ??
      runs.at(-1);
  const source = program.sessions.find(
      (s) => s.id === selectedId && s.programId === track,
    ),
    revision = source
      ? run?.targetRevisions.filter((r) => r.sessionId === source.id).at(-1)
      : null;
  const selected = source
    ? { ...source, exercises: revision?.prescriptions ?? source.exercises }
    : null;
  const dateFor = (s: Session) =>
    run
      ? scheduledSessions(run, program).find((p) => p.session.id === s.id)?.date
      : sessionDate(s, state.startDate);
  return (
    <>
      <div className="pagehead">
        <p className="eyebrow">PERIODIZATION LIBRARY</p>
        <h1>Build strength. Express power.</h1>
        <p>
          Choose a track, inspect its source prescription and follow your own
          program run.
        </p>
      </div>
      <div className="threecols">
        <Select
          label="Browse program"
          value={track}
          options={programDefinitions.map((p) => [p.id, p.name])}
          onChange={(v) => {
            setTrack(v as typeof track);
            setPhaseId("");
            setSelectedId("");
            setRunId("");
          }}
        />
        <Select
          label="Training phase"
          value={phase.id}
          options={definition.phases.map((p) => [
            p.id,
            `Phase ${p.number} · ${p.purpose}`,
          ])}
          onChange={(v) => {
            setPhaseId(v);
            setSelectedId("");
          }}
        />
        <Select
          label="Displayed enrollment"
          value={run?.id ?? ""}
          options={
            runs.length
              ? runs.map((e) => [
                  e.id,
                  `${e.startDate} · ${e.status} · ${e.id.slice(0, 6)}`,
                ])
              : [["", "No run selected"]]
          }
          onChange={setRunId}
        />
      </div>
      <h2>{phase.purpose}</h2>
      <p className="hint">
        Purpose labels describe source emphasis. Original calendar names stay in
        provenance.
      </p>
      <div className="sessiongrid">
        {program.sessions
          .filter((s) => s.phaseId === phase.id)
          .map((s) => (
            <button
              type="button"
              className="sessiontile"
              key={s.id}
              aria-label={`${sessionLabel(s)} · ${weekdays[s.day - 1]}`}
              onClick={() => {
                setSelectedId(s.id);
                setAlternative("");
              }}
            >
              <span>
                WEEK {s.week} · D{s.day} / {weekdays[s.day - 1]}
              </span>
              <strong>
                {s.exercises.find((p) => p.kind !== "other")?.name}
              </strong>
              <small>
                {dateFor(s) ?? "Before selected entry"}
                {run?.reschedules[s.id] ? " · rescheduled" : ""}
                {s.optional ? " · optional" : ""}
              </small>
              <small>{s.focus}</small>
            </button>
          ))}
      </div>
      {selected && (
        <Card>
          <div className="sectionhead">
            <h2>
              {sessionLabel(selected)} · {weekdays[selected.day - 1]}
            </h2>
            <button
              type="button"
              className="primary"
              disabled={!run || !dateFor(selected)}
              onClick={() => run && onLog(selected, run.id)}
            >
              Log this session
            </button>
          </div>
          {!run && <p>Queue/start a run above before logging this program.</p>}
          {selected.sourceConflict && (
            <p className="notice">{selected.sourceConflict}</p>
          )}
          {run && dateFor(selected) && (
            <div className="twocol">
              <label className="field">
                Reschedule date
                <input
                  type="date"
                  value={dateFor(selected)}
                  onChange={(e) =>
                    e.target.value &&
                    onSchedule(selected.id, e.target.value, run.id)
                  }
                />
              </label>
              <button type="button" onClick={() => onSkip(run.id, selected.id)}>
                Skip this session explicitly
              </button>
            </div>
          )}
          <Sources session={selected} />
          {selected.alternativePlans.length > 0 && (
            <>
              <Select
                label="Source session alternative"
                value={alternative}
                options={[
                  ["", "Original primary plan"],
                  ...selected.alternativePlans.map(
                    (a) => [a.id, a.name] as [string, string],
                  ),
                ]}
                onChange={setAlternative}
              />
              {alternative && (
                <div className="notice">
                  {selected.alternativePlans
                    .find((a) => a.id === alternative)!
                    .exercises.map((p) => (
                      <p key={p.id}>{p.sourceText}</p>
                    ))}
                  <button
                    type="button"
                    disabled={!run}
                    onClick={() =>
                      run &&
                      onTarget(
                        run.id,
                        selected.id,
                        selected.alternativePlans.find(
                          (a) => a.id === alternative,
                        )!.exercises,
                        "Explicitly chose full source alternative; original plan is not additive",
                      )
                    }
                  >
                    Use reviewed source alternative
                  </button>
                </div>
              )}
            </>
          )}
          {selected.exercises.map((p) => (
            <div className="prescription" key={p.id}>
              <h3>
                {p.name}
                {p.optional && <small> · optional</small>}
              </h3>
              <p className="sourceText">{p.sourceText}</p>
              {p.conditionalGroup && (
                <p className="notice">
                  Conditional choice: {p.conditionalGroup}. Do not complete all
                  alternatives automatically.
                </p>
              )}
              {p.loadPercent && (
                <p className="hint">
                  Target weight:{" "}
                  {targetKilograms(
                    p,
                    state.reference1RMs,
                    dateFor(selected) ?? state.startDate,
                  )
                    ?.map((v) => v.toFixed(1))
                    .join("–") ??
                    "Unknown — dated matching reference required"}{" "}
                  kg
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
