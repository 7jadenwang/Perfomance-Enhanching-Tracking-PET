import { useState } from "react";
import type { AthleteState } from "../domain/schema";
import { localToday } from "../domain/schema";
import {
  program,
  programDefinitions,
  getSession,
  sessionLabel,
} from "../program/catalog";
import {
  createEnrollment,
  enrollmentProgress,
  type EnrollmentCommand,
} from "../program/enrollments";
import { Card, Select } from "./fields";
export default function EnrollmentPanel({
  state,
  onCommand,
  onTransfer,
}: {
  state: AthleteState;
  onCommand: (command: EnrollmentCommand) => Promise<boolean>;
  onTransfer: () => void;
}) {
  const [track, setTrack] = useState<"lp" | "up">(
      state.enrollments.find((e) => e.status === "active")?.programId ?? "lp",
    ),
    [entry, setEntry] = useState(""),
    [date, setDate] = useState(state.startDate || localToday()),
    [error, setError] = useState("");
  const definition = programDefinitions.find((p) => p.id === track)!;
  return (
    <Card>
      <h2>Your program runs</h2>
      <p>
        D1 Monday · D2 Tuesday · D3 Wednesday · D4 Thursday · D5 Friday · D6
        Saturday · D7 Sunday. Midweek starts align to the selected source
        weekday.
      </p>
      <div className="threecols">
        <Select
          label="Enrollment program"
          value={track}
          options={programDefinitions.map((p) => [p.id, p.name])}
          onChange={(v) => {
            setTrack(v as typeof track);
            setEntry("");
          }}
        />
        <Select
          label="Enrollment entry"
          value={entry || definition.phases[0].entrySessionIds[0]}
          options={definition.phases.flatMap((phase) =>
            phase.entrySessionIds.map(
              (id) =>
                [id, `${phase.purpose} · ${sessionLabel(getSession(id)!)}`] as [
                  string,
                  string,
                ],
            ),
          )}
          onChange={setEntry}
        />
        <label className="field">
          Requested program start
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>
      <button
        type="button"
        onClick={async () => {
          try {
            await onCommand({
              type: "queue",
              enrollment: createEnrollment(
                track,
                entry || definition.phases[0].entrySessionIds[0],
                date,
              ),
            });
            setError("");
          } catch (e) {
            setError(String(e));
          }
        }}
      >
        Queue selected program
      </button>
      <button type="button" onClick={onTransfer}>
        Review LP ↔ UP transfer
      </button>
      {error && <p role="alert">{error}</p>}
      {state.enrollments.map((run) => {
        const progress = enrollmentProgress(run, state.workouts, program);
        return (
          <div className="enrollment-row" key={run.id}>
            <div>
              <strong>
                {programDefinitions.find((p) => p.id === run.programId)?.name}
              </strong>{" "}
              <span className="badge">{run.status}</span>
              <p>
                {run.startDate} · {progress.trainingDays} training days ·{" "}
                {progress.completed} completed · {progress.partial} partial ·{" "}
                {progress.skipped} skipped · {progress.requiredRemaining}{" "}
                required remaining
              </p>
              <small>
                {progress.nextSessionId
                  ? `Continuation: ${sessionLabel(getSession(progress.nextSessionId)!)}`
                  : "Required source sessions resolved"}
              </small>
            </div>
            <div className="actions">
              {run.status === "queued" && (
                <button
                  type="button"
                  onClick={() =>
                    onCommand({
                      type: "start",
                      id: run.id,
                      date: run.startDate,
                    })
                  }
                >
                  Start queued program
                </button>
              )}
              {run.status === "active" && (
                <button
                  type="button"
                  onClick={() =>
                    onCommand({ type: "pause", id: run.id, date: localToday() })
                  }
                >
                  Pause program
                </button>
              )}
              {run.status === "paused" && (
                <>
                  <label className="field">
                    Resume date
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      onCommand({ type: "resume", id: run.id, date })
                    }
                  >
                    Resume program
                  </button>
                </>
              )}
              {["active", "paused", "queued"].includes(run.status) && (
                <button
                  type="button"
                  onClick={() => {
                    if (
                      confirm(
                        "Cancel future scheduling for this run? Existing logs remain.",
                      )
                    )
                      void onCommand({
                        type: "cancel",
                        id: run.id,
                        date: localToday(),
                      });
                  }}
                >
                  Cancel program
                </button>
              )}
              {run.status === "active" && progress.requiredRemaining === 0 && (
                <button
                  type="button"
                  onClick={() =>
                    onCommand({
                      type: "complete",
                      id: run.id,
                      date: localToday(),
                    })
                  }
                >
                  Complete program
                </button>
              )}
            </div>
          </div>
        );
      })}
    </Card>
  );
}
