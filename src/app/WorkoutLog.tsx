import { useState } from "react";
import type {
  AthleteState,
  Workout,
  Session,
  ActualRow,
  VelocityRecord,
  Prescription,
} from "../domain/schema";
import { createRow, createVelocity, createWorkout } from "../domain/records";
import { sessionLoad } from "../metrics/load";
import { velocityLoss, compareVelocityTarget } from "../metrics/velocity";
import { suggestAlternatives } from "../program/alternatives";
import { Card, Num, Select, fmt, download } from "./fields";
import SubstitutionPreview from "./SubstitutionPreview";
import {acceptSubstitution} from "../program/substitutions";
import VelocityGuidance from "./VelocityGuidance";
import { Sources } from "./Program";
export default function WorkoutLog({
  session,
  date,
  state,
  onSave,
  onBack,
  workoutId,
}: {
  workoutId?: string;
  session: Session;
  date: string;
  state: AthleteState;
  onSave: (w: Workout) => Promise<boolean>;
  onBack: () => void;
}) {
  const existing = state.workouts.find((w) =>
    workoutId
      ? w.id === workoutId
      : w.sessionId === session.id && w.localDate === date,
  );
  const [w, setW] = useState<Workout>(
    () =>
      existing ??
      createWorkout({
        id: crypto.randomUUID(),
        sessionId: session.id,
        targetSnapshot:session.exercises,
        localDate: date,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
  );
  const prescriptions = w.targetRevisions.at(-1)?.prescriptions ?? (w.targetSnapshot.length ? w.targetSnapshot : session.exercises);
  const [saved, setSaved] = useState(false);
  function update(v: Partial<Workout>) {
    setSaved(false);
    setW((w) => ({ ...w, ...v }));
  }
  function updateRow(id: string, v: Partial<ActualRow>) {
    setSaved(false);
    setW((w) => ({
      ...w,
      rows: w.rows.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...v };
        if (next.velocity)
          next.velocity = {
            ...next.velocity,
            loadKg: next.loadKg,
            loadConvention: next.loadConvention,
            loadedHands: next.loadedHands,
            exerciseId: next.exerciseId,
          };
        return next;
      }),
    }));
  }
  function add(p?: Prescription) {
    const row = createRow({
      id: crypto.randomUUID(),
      exerciseId: p?.name ?? "custom",
      prescriptionId:p?.id??null, movementId:p?.movementId??null,
      name: p?.name ?? "Custom exercise",
      kind: p?.kind ?? "strength",
      perSide: p?.perSide ?? false,
      reps: p?.reps?.[0] ?? null,
      tempo: p?.tempo ?? "",
    });
    update({ rows: [...w.rows, row] });
  }
  function copy() {
    const rows = prescriptions
      .filter((p) => p.sets && p.kind !== "other")
      .flatMap((p) =>
        Array.from({ length: Math.min(p.sets![0], 50) }, () =>
          createRow({
            id: crypto.randomUUID(),
            exerciseId: p.name,
            prescriptionId:p.id, movementId:p.movementId,
            name: p.name,
            kind: p.kind,
            reps: p.reps?.[0] ?? null,
            perSide: p.perSide,
            holdSeconds: p.holdSeconds?.[0] ?? null,
            distanceMetres: p.distanceMetres?.[0] ?? null,
            restSeconds: p.restSeconds?.[0] ?? null,
            workSeconds: p.workSeconds?.[0] ?? null,
            rounds: p.rounds?.[0] ?? null,
            tempo: p.tempo ?? "",
          }),
        ),
      );
    update({ rows: [...w.rows, ...rows] });
  }
  function velocity(r: ActualRow, v: Partial<VelocityRecord>) {
    updateRow(r.id, {
      velocity: {
        ...(r.velocity ??
          createVelocity({
            exerciseId: r.exerciseId,
            loadKg: r.loadKg,
            method: "",
            rangeOfMotion: "",
          })),
        ...v,
      },
    });
  }
  return (
    <>
      <button className="back" onClick={onBack}>
        ← Back to program
      </button>
      <div className="pagehead">
        <p className="eyebrow">TRAINING LOG · {w.localDate}</p>
        <h1>
          {session.month} · Week {session.week} / Day {session.day}
        </h1>
        <p>Keep the prescription. Record the work you actually did.</p>
      </div>
      <Card>
        <Sources session={session} />
        {prescriptions.map(p=><SubstitutionPreview key={p.id} prescription={p} state={state} date={date} onAccept={preview=>update(acceptSubstitution(w,preview))}/>)}
        {w.targetRevisions.length>0&&<button type="button" onClick={()=>update({targetRevisions:w.targetRevisions.slice(0,-1)})}>Undo last target change</button>}
        <details>
          <summary>All original prescriptions</summary>
          <p className="sourceText">{session.sourceText}</p>
        </details>
      </Card>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSaved(await onSave({ ...w, updatedAt: new Date().toISOString() }));
        }}
      >
        <Card>
          <div className="sectionhead">
            <h2>Session overview</h2>
            <Select
              label="Session status"
              value={w.status}
              onChange={(v) => update({ status: v as Workout["status"] })}
              options={["draft", "partial", "completed", "skipped"]}
            />
          </div>
          <div className="twocol">
            <div>
              <p className="eyebrow">PLANNED · ESTIMATE</p>
              <Num
                label="Planned duration (minutes)"
                value={w.plannedDuration}
                onChange={(v) => update({ plannedDuration: v })}
              />
              <Num
                label="Target session RPE"
                value={w.plannedRpe}
                max={10}
                onChange={(v) => update({ plannedRpe: v })}
              />
              <p>
                {w.plannedDuration === null || w.plannedRpe === null
                  ? "Not estimated"
                  : fmt(sessionLoad(w.plannedDuration, w.plannedRpe)) + " AU"}
              </p>
            </div>
            <div>
              <p className="eyebrow">ACTUAL · YOUR EXPERIENCE</p>
              <Num
                label="Actual duration (minutes)"
                value={w.actualDuration}
                onChange={(v) => update({ actualDuration: v })}
              />
              <Num
                label="Actual session RPE"
                value={w.actualRpe}
                max={10}
                onChange={(v) => update({ actualRpe: v })}
              />
              <p>
                {w.status === "draft" || w.status === "skipped"
                  ? "Not counted as completed load"
                  : fmt(sessionLoad(w.actualDuration, w.actualRpe)) + " AU"}
              </p>
            </div>
          </div>
          <p className="hint">
            Whole-session RPE is separate from set RPE. Duration includes
            warm-up and prescribed rest; exclude unrelated interruptions.
          </p>
        </Card>
        <Card>
          <div className="sectionhead">
            <h2>Actual sets</h2>
            <button type="button" onClick={copy}>
              Copy planned sets
            </button>
          </div>
          <p>
            Copied values remain drafts. Confirm each completed set and choose
            partial/completed status before it counts.
          </p>
          <div className="addbuttons">
            {prescriptions.map((p) => (
              <button type="button" key={p.id} onClick={() => add(p)}>
                + {p.name}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => add()}>
            + Custom exercise
          </button>
        </Card>
        {w.rows.map((r, i) => (
          <Card key={r.id} className="setcard">
            <div className="sectionhead">
              <h3>
                Set {i + 1} · {r.name}
              </h3>
              <button
                type="button"
                className="subtle"
                onClick={() => {
                  if (confirm("Remove this set?"))
                    update({ rows: w.rows.filter((x) => x.id !== r.id) });
                }}
              >
                Remove
              </button>
            </div>
            <div className="threecols">
              <label className="field">
                Exercise name
                <input
                  value={r.name}
                  onChange={(e) =>
                    updateRow(r.id, {
                      name: e.target.value,
                      exerciseId: e.target.value,
                      velocity: r.velocity
                        ? { ...r.velocity, exerciseId: e.target.value }
                        : null,
                    })
                  }
                />
              </label>
              <Select
                label="Work type"
                value={r.kind}
                options={[
                  "strength",
                  "jump",
                  "throw",
                  "hold",
                  "sprint",
                  "conditioning",
                  "other",
                ]}
                onChange={(v) =>
                  updateRow(r.id, { kind: v as ActualRow["kind"] })
                }
              />
              <label className="check">
                <input
                  type="checkbox"
                  aria-label="Completed set"
                  checked={r.confirmed}
                  onChange={(e) =>
                    updateRow(r.id, { confirmed: e.target.checked })
                  }
                />
                Completed set
              </label>
            </div>
            <div className="threecols">
              {["strength", "jump", "throw", "other", "sprint"].includes(
                r.kind,
              ) && (
                <Num
                  label={
                    r.kind === "sprint" ? "Efforts completed" : "Repetitions"
                  }
                  value={r.reps}
                  onChange={(v) => updateRow(r.id, { reps: v })}
                />
              )}
              <Num
                label="External load (kg)"
                value={r.loadKg}
                onChange={(v) =>
                  updateRow(r.id, {
                    loadKg: v,
                    velocity: r.velocity ? { ...r.velocity, loadKg: v } : null,
                  })
                }
              />
              <Select
                label="Load convention"
                value={r.loadConvention}
                options={["totalExternal", "perHand", "bodyweight", "unknown"]}
                onChange={(v) =>
                  updateRow(r.id, {
                    loadConvention: v as ActualRow["loadConvention"],
                  })
                }
              />
              {r.loadConvention === "perHand" && (
                <Select
                  label="Loaded hands per repetition"
                  value={
                    r.loadedHands === null ? "unknown" : String(r.loadedHands)
                  }
                  options={[
                    ["unknown", "Unconfirmed"],
                    ["1", "One loaded hand"],
                    ["2", "Two loaded hands"],
                  ]}
                  onChange={(v) =>
                    updateRow(r.id, {
                      loadedHands: v === "unknown" ? null : Number(v),
                    })
                  }
                />
              )}
              {r.kind === "hold" && (
                <Num
                  label="Hold duration (seconds)"
                  value={r.holdSeconds}
                  onChange={(v) => updateRow(r.id, { holdSeconds: v })}
                />
              )}
              <label className="check">
                <input
                  type="checkbox"
                  checked={r.perSide}
                  onChange={(e) =>
                    updateRow(r.id, { perSide: e.target.checked })
                  }
                />
                Entered per side (both sides done)
              </label>
              {r.kind === "sprint" && (
                <>
                  <Num
                    label="Distance per effort (metres)"
                    value={r.distanceMetres}
                    onChange={(v) => updateRow(r.id, { distanceMetres: v })}
                  />
                  <Num
                    label="Time per effort (seconds)"
                    value={r.timeSeconds}
                    onChange={(v) => updateRow(r.id, { timeSeconds: v })}
                  />
                </>
              )}
              {r.kind === "conditioning" && (
                <>
                  <Num
                    label="Rounds completed"
                    value={r.rounds}
                    onChange={(v) => updateRow(r.id, { rounds: v })}
                  />
                  <Num
                    label="Work duration (seconds)"
                    value={r.workSeconds}
                    onChange={(v) => updateRow(r.id, { workSeconds: v })}
                  />
                </>
              )}
              <Num
                label="Rest duration (seconds)"
                value={r.restSeconds}
                onChange={(v) => updateRow(r.id, { restSeconds: v })}
              />
              <Num
                label="Set RPE"
                value={r.setRpe}
                max={10}
                onChange={(v) => updateRow(r.id, { setRpe: v })}
              />
              <Num
                label="Reps in reserve"
                value={r.rir}
                onChange={(v) => updateRow(r.id, { rir: v })}
              />
            </div>
            <details>
              <summary>Tempo and measured velocity</summary>
              <p className="sourceText">
                {
                  prescriptions.find((p) => p.name === r.exerciseId)
                    ?.sourceText
                }
              </p>
              <Select
                label="Source target velocity metric"
                value={r.sourceVelocityMetric ?? "unknown"}
                options={[
                  ["unknown", "Unconfirmed"],
                  "mean",
                  "meanConcentric",
                  "meanPropulsive",
                  "peak",
                ]}
                onChange={(v) =>
                  updateRow(r.id, {
                    sourceVelocityMetric:
                      v === "unknown" ? null : (v as VelocityRecord["metric"]),
                  })
                }
              />
              {r.velocity && (
                <p>
                  Target comparison:{" "}
                  {(() => {
                    const p = prescriptions.find(
                      (p) => p.name === r.exerciseId,
                    );
                    return p
                      ? compareVelocityTarget(
                          { ...p, velocityMetric: r.sourceVelocityMetric },
                          r.velocity!,
                        )
                      : "unknown";
                  })()}
                </p>
              )}
              <VelocityGuidance prescription={prescriptions.find(p=>p.id===r.prescriptionId||p.name===r.exerciseId)} row={r} state={state} enabled={session.autoregulation!=="none"} onAccept={(p,reason)=>{
                const targets=prescriptions.map(x=>x.id===p.id?p:x);
                update({targetRevisions:[...w.targetRevisions,{id:crypto.randomUUID(),sessionId:session.id,prescriptions:targets,reason,createdAt:new Date().toISOString(),kind:"velocity"}]});
              }}/>
              {(prescriptions.find(p=>p.id===r.prescriptionId||p.name===r.exerciseId)?.components.length??0)>0&&<Select label="Velocity component" value={r.velocity?.componentId??"unknown"} options={[["unknown","Choose component"],...(prescriptions.find(p=>p.id===r.prescriptionId||p.name===r.exerciseId)?.components??[]).map(c=>[c.id,c.name] as [string,string])]} onChange={v=>velocity(r,{componentId:v==="unknown"?null:v})}/>}
              <div className="threecols">
                <label className="field">
                  Tempo instruction
                  <input
                    value={r.tempo}
                    onChange={(e) => updateRow(r.id, { tempo: e.target.value })}
                  />
                </label>
                <Select
                  label="Followed prescribed tempo"
                  value={
                    r.tempoFollowed === null
                      ? "unknown"
                      : r.tempoFollowed
                        ? "yes"
                        : "no"
                  }
                  options={["unknown", "yes", "no"]}
                  onChange={(v) =>
                    updateRow(r.id, {
                      tempoFollowed: v === "unknown" ? null : v === "yes",
                    })
                  }
                />
                <Select
                  label="Velocity metric"
                  value={r.velocity?.metric ?? "mean"}
                  options={["mean", "meanConcentric", "meanPropulsive", "peak"]}
                  onChange={(v) =>
                    velocity(r, { metric: v as VelocityRecord["metric"] })
                  }
                />
                <label className="field">
                  Velocity device / method
                  <input
                    value={r.velocity?.method ?? ""}
                    onChange={(e) => velocity(r, { method: e.target.value })}
                  />
                </label>
                <label className="field">
                  Range of motion
                  <input
                    value={r.velocity?.rangeOfMotion ?? ""}
                    onChange={(e) =>
                      velocity(r, { rangeOfMotion: e.target.value })
                    }
                  />
                </label>
                <Num
                  label="Set-average velocity (m/s)"
                  value={r.velocity?.setAverage ?? null}
                  onChange={(v) => velocity(r, { setAverage: v })}
                />
              </div>
              <label className="field">
                Per-repetition velocity (comma separated m/s)
                <input
                  defaultValue={r.velocity?.repVelocities.join(", ") ?? ""}
                  onBlur={(e) => {
                    const values = e.target.value.trim()
                      ? e.target.value.split(",").map((x) => Number(x.trim()))
                      : [];
                    velocity(r, { repVelocities: values });
                  }}
                />
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={r.velocity?.completeSeries ?? false}
                  onChange={(e) =>
                    velocity(r, { completeSeries: e.target.checked })
                  }
                />
                Complete series for this set
              </label>
              {r.velocity && (
                <p>
                  End-of-set velocity loss: {fmt(velocityLoss(r.velocity), 1)}
                  {velocityLoss(r.velocity) !== null ? "%" : ""}. Fastest rep
                  compared with final rep. A set average cannot produce this
                  value.
                </p>
              )}
              <p className="hint">
                MV in the source is not automatically assumed to match your
                device's metric. Match measurement definitions before comparing
                targets.
              </p>
            </details>
            <label className="field">
              Set notes
              <input
                value={r.notes}
                onChange={(e) => updateRow(r.id, { notes: e.target.value })}
              />
            </label>
          </Card>
        ))}
        <Card>
          <h2>Equipment alternatives</h2>
          {session.exercises
            .filter((p) => p.kind === "conditioning")
            .map((p) => (
              <div key={p.id} className="prescription">
                <h3>{p.name}</h3>
                <p>{p.sourceText}</p>
                {suggestAlternatives(p, state.equipment).map((a) => (
                  <div key={a.modality}>
                    <p>
                      {a.reason} {a.changes}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        update({
                          substitutions: [
                            ...w.substitutions.filter(
                              (x) => x.exerciseId !== p.id,
                            ),
                            {
                              exerciseId: p.id,
                              original: p.name,
                              actual: a.modality,
                              reason: a.reason,
                            },
                          ],
                        })
                      }
                    >
                      Record running substitution
                    </button>
                  </div>
                ))}
              </div>
            ))}
          {w.substitutions.map((s) => (
            <p key={s.exerciseId}>
              {s.original} → {s.actual}{" "}
              <button
                type="button"
                onClick={() =>
                  update({
                    substitutions: w.substitutions.filter(
                      (x) => x.exerciseId !== s.exerciseId,
                    ),
                  })
                }
              >
                Undo
              </button>
            </p>
          ))}
          <label className="field">
            Session notes
            <textarea
              value={w.notes}
              onChange={(e) => update({ notes: e.target.value })}
            />
          </label>
          <div className="sectionhead">
            <button className="primary" type="submit">
              Save workout
            </button>
            <button
              type="button"
              onClick={() =>
                download(JSON.stringify(w, null, 2), "pet-unsaved-workout.json")
              }
            >
              Export this entry
            </button>
          </div>
          {saved && <p role="status">Saved on this device</p>}
        </Card>
      </form>
    </>
  );
}
