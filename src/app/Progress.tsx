import { useState } from "react";
import type { AthleteState, Workout } from "../domain/schema";
import { program } from "../program/catalog";
import { addDays, sessionDate } from "../program/schedule";
import {
  weeklyLoad,
  externalWork,
  sessionLoad,
  loadDifference,
} from "../metrics/load";
import { dailyCmj } from "../metrics/recovery";
import { velocityLoss, velocityHistory } from "../metrics/velocity";
import { Card, fmt } from "./fields";
export default function Progress({
  state,
  onOpen,
}: {
  state: AthleteState;
  onOpen: (workout: Workout) => void;
}) {
  const [week, setWeek] = useState(0),
    start = addDays(state.startDate, week * 7),
    end = addDays(start, 6),
    workouts = state.workouts.filter(
      (w) => w.localDate >= start && w.localDate <= end,
    ),
    prescribed = program.sessions.filter((s) => {
      const d = state.reschedules[s.id] ?? sessionDate(s, state.startDate);
      return d >= start && d <= end;
    }),
    load = weeklyLoad(workouts, prescribed.length),
    external = externalWork(workouts),
    velocities = velocityHistory(workouts);
  return (
    <>
      <div className="pagehead">
        <p className="eyebrow">YOUR TRAINING, IN CONTEXT</p>
        <h1>Progress over time.</h1>
        <p>Each measure keeps its own meaning and units.</p>
      </div>
      <div className="sectionhead">
        <button onClick={() => setWeek((w) => w - 1)}>← Previous week</button>
        <strong>
          {start} — {end}
        </strong>
        <button onClick={() => setWeek((w) => w + 1)}>Next week →</button>
      </div>
      <div className="stats">
        <Card>
          <p>Planned session load</p>
          <strong>
            {load.plannedComplete ? `${load.planned} AU` : "Not estimated"}
          </strong>
          <small>
            {load.plannedComplete} / {load.prescribedCount} scheduled sessions
            estimated
          </small>
        </Card>
        <Card>
          <p>Recorded actual load</p>
          <strong>
            {load.actualComplete ? `${load.actual} AU` : "No measured load"}
          </strong>
          <small>{load.actualComplete} measured sessions</small>
          <small>{load.confirmedCount} logged · totals may be incomplete</small>
        </Card>
        <Card>
          <p>Scheduled sessions</p>
          <strong>{prescribed.length}</strong>
          <small>Optional sessions remain optional</small>
        </Card>
      </div>
      <Card>
        <h2>Planned versus actual</h2>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Session / date</th>
                <th>Status</th>
                <th>Planned</th>
                <th>Actual</th>
                <th>Difference</th>
              </tr>
            </thead>
            <tbody>
              {workouts.map((w) => {
                const p = sessionLoad(w.plannedDuration, w.plannedRpe),
                  a =
                    w.status === "partial" || w.status === "completed"
                      ? sessionLoad(w.actualDuration, w.actualRpe)
                      : null,
                  d = loadDifference(p, a);
                return (
                  <tr key={w.id}>
                    <td>
                      {w.sessionId}
                      <small>{w.localDate}</small>
                    </td>
                    <td>{w.status}</td>
                    <td>{fmt(p)} AU</td>
                    <td>{fmt(a)} AU</td>
                    <td>
                      {fmt(d.absolute)} AU · {fmt(d.percent, 1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!workouts.length && <p>No workout logs in this week.</p>}
      </Card>
      <Card>
        <h2>Exercise-specific work</h2>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Exercise</th>
                <th>Reps / contacts</th>
                <th>Load-volume</th>
                <th>Hold / distance / conditioning</th>
              </tr>
            </thead>
            <tbody>
              {external.map((x, i) => (
                <tr key={i}>
                  <td>
                    {x.name}
                    <small>{x.convention}</small>
                  </td>
                  <td>
                    {fmt(x.reps)}
                    {x.kind === "jump" ? " jump contacts" : ""}
                  </td>
                  <td>{fmt(x.loadVolume)} kg·reps</td>
                  <td>
                    {fmt(x.holdSeconds)} s / {fmt(x.distanceMetres)} m /{" "}
                    {fmt(x.conditioningWorkSeconds)} work s
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint">
          These measures are not combined into one mechanical-load score.
          Per-side values count both sides only when you marked both done.
        </p>
      </Card>
      <Card>
        <h2>Saved workouts</h2>
        <p>
          Historical records keep their original dates when the program is
          rescheduled.
        </p>
        {state.workouts
          .slice()
          .sort((a, b) => b.localDate.localeCompare(a.localDate))
          .map((w) => (
            <div className="sectionhead" key={w.id}>
              <span>
                {w.localDate} · {w.sessionId ?? "Custom session"} · {w.status}
              </span>
              <button onClick={() => onOpen(w)}>Open saved workout</button>
            </div>
          ))}
        {!state.workouts.length && <p>No saved workouts yet.</p>}
      </Card>
      <Card>
        <h2>CMJ history</h2>
        {state.protocols.map((protocol) => {
          const records = state.mornings
            .filter((r) => r.protocolId === protocol.id)
            .sort((a, b) => a.localDate.localeCompare(b.localDate));
          return (
            <div key={protocol.id}>
              <h3>{protocol.name}</h3>
              <div className="cmjbars">
                {records.map((r) => {
                  const mean = dailyCmj(r).meanCm;
                  return (
                    <div key={r.id}>
                      <span>{r.localDate}</span>
                      <div
                        className="bar"
                        style={{
                          width: `${Math.min(100, ((mean ?? 0) / 80) * 100)}%`,
                        }}
                      />
                      <strong>{fmt(mean, 1)} cm</strong>
                      <small>
                        {dailyCmj(r).eligible
                          ? "3 valid trials"
                          : "Limited/excluded data"}
                      </small>
                    </div>
                  );
                })}
              </div>
              {!records.length && <p>No CMJ entries yet.</p>}
            </div>
          );
        })}
      </Card>
      <Card>
        <h2>Measured velocity</h2>
        {velocities.map((v, i) => {
          const previous = v.previous;
          return (
            <div className="prescription" key={v.row.id}>
              <strong>
                {v.row.name} · {v.date}
              </strong>
              <p>
                {v.velocity.metric} ·{" "}
                {v.velocity.method || "method unspecified"} ·{" "}
                {v.velocity.loadKg ?? "unknown"} kg ({v.velocity.loadConvention}
                {v.velocity.loadConvention === "perHand"
                  ? ` · ${v.velocity.loadedHands ?? "unknown"} loaded hands`
                  : ""}
                ) · {v.velocity.rangeOfMotion || "ROM unspecified"}
              </p>
              <p>
                Set average {fmt(v.velocity.setAverage, 2)} m/s; end-of-set loss{" "}
                {fmt(velocityLoss(v.velocity), 1)}%
              </p>
              <small>
                {previous
                  ? `Compatible previous entry: ${previous.date}, ${fmt(previous.velocity.setAverage, 2)} m/s`
                  : "No compatible previous measurement"}
              </small>
            </div>
          );
        })}
        {!velocities.length && (
          <p>No confirmed velocity measurements in this week.</p>
        )}
      </Card>
    </>
  );
}
