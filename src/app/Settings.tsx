import { useEffect, useState } from "react";
import type { AthleteState } from "../domain/schema";
import { calibrate, calibrationCount } from "../metrics/recovery";
import {
  previewBackup,
  exportBackup,
  replaceFromBackup,
} from "../storage/backup";
import { movementLibrary, equipmentStatus } from "../program/movements";
import { Card, Num, Select, download } from "./fields";
export default function Settings({
  state,
  onSave,
  onImport,
}: {
  state: AthleteState;
  onSave: (s: AthleteState) => Promise<boolean>;
  onImport: (s: AthleteState) => Promise<boolean>;
}) {
  const [s, setS] = useState(state),
    [preview, setPreview] = useState<ReturnType<typeof previewBackup> | null>(
      null,
    ),
    [error, setError] = useState(""),
    [name, setName] = useState(""),
    [reference, setReference] = useState(""),
    [kg, setKg] = useState<number | null>(null),
    [refDate, setRefDate] = useState(state.startDate);
  useEffect(() => setS(state), [state]);
  async function backup() {
    try {
      download(await exportBackup());
      setError("");
    } catch (e) {
      setError(String(e));
    }
  }
  return (
    <>
      <div className="pagehead">
        <p className="eyebrow">MAKE IT YOURS</p>
        <h1>Your setup.</h1>
        <p>One gym. Running available. Your own measurements.</p>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await onSave(s);
        }}
      >
        <Card>
          <h2>Program and equipment</h2>
          <Select
            label="Velocity training experience"
            value={s.velocityExperience}
            options={["unconfirmed", "beginner", "experienced"]}
            onChange={(v) =>
              setS({
                ...s,
                velocityExperience: v as AthleteState["velocityExperience"],
              })
            }
          />
          <label className="field">
            Program start date
            <input
              type="date"
              required
              value={s.startDate}
              onChange={(e) => setS({ ...s, startDate: e.target.value })}
            />
          </label>
          <p>
            D1 is Monday and D7 is Sunday. New enrollments use this default
            date. Rescheduling never moves historical records.
          </p>
          <div className="threecols">
            {(["rowing", "skiErg", "airBike"] as const).map((key) => (
              <Select
                key={key}
                label={
                  key === "skiErg"
                    ? "SkiErg"
                    : key === "airBike"
                      ? "Air bike"
                      : "Rowing machine"
                }
                value={s.equipment[key]}
                options={["available", "unavailable", "unconfirmed"]}
                onChange={(v) =>
                  setS({ ...s, equipment: { ...s.equipment, [key]: v } })
                }
              />
            ))}
          </div>
          <p>
            Running is always available. Ordinary strength equipment is assumed
            available.
          </p>
          <details>
            <summary>Gym equipment and movement familiarity</summary>
            <div className="threecols">
              {[...new Set(movementLibrary.flatMap((m) => m.equipment))]
                .filter(
                  (id) =>
                    !["running", "rowing", "skiErg", "airBike"].includes(id),
                )
                .map((id) => (
                  <Select
                    key={id}
                    label={"Equipment: " + id}
                    value={equipmentStatus(id, s.equipment)}
                    options={["available", "unavailable", "unconfirmed"]}
                    onChange={(v) =>
                      setS({
                        ...s,
                        equipment: {
                          ...s.equipment,
                          extra: {
                            ...s.equipment.extra,
                            [id]: v as
                              "available" | "unavailable" | "unconfirmed",
                          },
                        },
                      })
                    }
                  />
                ))}
            </div>
            {movementLibrary.map((m) => (
              <label className="check" key={m.id}>
                <input
                  aria-label={"Familiar: " + m.name + " · " + m.english}
                  type="checkbox"
                  checked={s.familiarity.includes(m.id)}
                  onChange={(e) =>
                    setS({
                      ...s,
                      familiarity: e.target.checked
                        ? [...s.familiarity, m.id]
                        : s.familiarity.filter((id) => id !== m.id),
                    })
                  }
                />
                {m.name} · {m.english}
              </label>
            ))}
          </details>
          <button className="primary" type="submit">
            Save settings
          </button>
        </Card>
      </form>
      <Card>
        <h2>CMJ protocols and calibration</h2>
        {state.protocols.map((p) => {
          const count = calibrationCount(state.mornings, p.id),
            current = state.baselines.find(
              (b) => b.protocolId === p.id && !b.archivedAt,
            );
          return (
            <div className="prescription" key={p.id}>
              <h3>{p.name}</h3>
              <p>
                {count} eligible days ·{" "}
                {current
                  ? `Baseline ${current.meanCm.toFixed(1)} cm, SD ${current.sampleSdCm.toFixed(2)} cm`
                  : "Building baseline (14 eligible days required)"}
              </p>
              <button
                disabled={count < 14}
                onClick={async () => {
                  if (
                    current &&
                    !confirm(
                      "Archive the current baseline and recalibrate from the first 14 eligible days? Exclude unsuitable records before recalibrating.",
                    )
                  )
                    return;
                  const b = calibrate(state.mornings, p.id);
                  if (b)
                    await onSave({
                      ...state,
                      baselines: [
                        ...state.baselines.map((x) =>
                          x.protocolId === p.id && !x.archivedAt
                            ? { ...x, archivedAt: new Date().toISOString() }
                            : x,
                        ),
                        b,
                      ],
                    });
                }}
              >
                {current ? "Recalibrate baseline" : "Establish baseline"}
              </button>
            </div>
          );
        })}
        <label className="field">
          New measurement protocol
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Method, arm position, warm-up, surface"
          />
        </label>
        <button
          onClick={async () => {
            if (name.trim()) {
              const next = {
                ...state,
                protocols: [
                  ...state.protocols,
                  { id: crypto.randomUUID(), name: name.trim() },
                ],
              };
              if (await onSave(next)) {
                setS(next);
                setName("");
              }
            }
          }}
        >
          Add protocol
        </button>
        <p className="hint">
          New methods start a separate comparison series. Calibration uses the
          first 14 eligible daily averages. Two-SD flags are provisional
          heuristics; day-to-day variability includes biological and measurement
          variation.
        </p>
      </Card>
      <Card>
        <h2>Dated 1RM references</h2>
        <label className="field">
          Reference exercise (exact name / range of motion)
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </label>
        <div className="twocol">
          <Num label="1RM (kg)" value={kg} min={0.01} onChange={setKg} />
          <label className="field">
            1RM measurement date
            <input
              type="date"
              value={refDate}
              onChange={(e) => setRefDate(e.target.value)}
            />
          </label>
        </div>
        <button
          onClick={async () => {
            if (reference.trim() && kg !== null && kg > 0) {
              const next = {
                ...state,
                reference1RMs: [
                  ...state.reference1RMs,
                  { exerciseId: reference.trim(), kg, date: refDate },
                ],
              };
              if (await onSave(next)) {
                setS(next);
                setReference("");
                setKg(null);
              }
            }
          }}
        >
          Add 1RM reference
        </button>
        {state.reference1RMs.map((r, i) => (
          <p key={i}>
            {r.exerciseId} · {r.kg} kg · {r.date}
          </p>
        ))}
        <p>
          Different exercises or ranges of motion do not share a 1RM
          automatically. Source references that are unclear remain unconfirmed.
        </p>
      </Card>
      <Card>
        <h2>Backups</h2>
        <p>
          Your records stay in this browser. Clearing browser data or using
          another device can remove access to them. Export regularly; GitHub
          stores app code, not your personal logs.
        </p>
        <button className="primary" onClick={backup}>
          Export backup
        </button>
        <label className="field">
          Import backup
          <input
            type="file"
            accept=".json,application/json"
            onChange={async (e) => {
              setPreview(null);
              setError("");
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                setPreview(previewBackup(await f.text()));
              } catch (err) {
                setError(
                  "Backup rejected. Existing records are unchanged. " +
                    String(err),
                );
              }
            }}
          />
        </label>
        {preview && (
          <div className="notice">
            <p>
              Compatible backup: {preview.counts.workouts} workouts,{" "}
              {preview.counts.mornings} morning records. This replaces your
              current records and settings.
            </p>
            <button onClick={backup}>Export current data first</button>
            <button
              onClick={async () => {
                if (
                  confirm(
                    "Replace all current records and settings with this backup?",
                  )
                ) {
                  if (await onImport(preview.state)) {
                    setS(preview.state);
                    setPreview(null);
                  }
                }
              }}
            >
              Confirm replacement
            </button>
            <button onClick={() => setPreview(null)}>Cancel</button>
          </div>
        )}
        {error && <p role="alert">{error}</p>}
      </Card>
      <Card>
        <h2>Methods and research</h2>
        <p>
          Session load = whole-session minutes × session RPE (0–10). Planned
          load is an estimate. Sets, kilograms, sprint distance, jumps, holds,
          and velocity retain separate units.
        </p>
        <p>
          CMJ means use three valid trials. Technique and landing posture
          influence flight-time height. Check-in concerns use
          fatigue/soreness/stress 4–5 or sleep quality 1–2. No flag is a
          guarantee of readiness, and the app never changes your plan
          automatically.
        </p>
        <p>
          Transfer comparisons use actual global exposure and recovery coverage.
          Program labels describe the supplied source emphasis. They do not
          prove that one track is superior for jump height.
        </p>
        <ul>
          <li>
            <a href="https://pubmed.ncbi.nlm.nih.gov/35044672/">
              Moesgaard (2022): periodization review
            </a>
          </li>
          <li>
            <a href="https://pubmed.ncbi.nlm.nih.gov/25200666/">
              Halson (2014): internal/external load and recovery
            </a>
          </li>
          <li>
            <a href="https://pubmed.ncbi.nlm.nih.gov/32502973/">
              Impellizzeri (2020): ACWR limitations
            </a>
          </li>
          <li>
            <a href="https://www.mdpi.com/2075-4663/9/4/47">
              Weakley (2021): velocity-based training
            </a>
          </li>
          <li>
            <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC10432349/">
              Load–velocity prediction review (2023)
            </a>
          </li>
          <li>
            <a href="https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2023.1181781/full">
              Drop-jump volume and intensity review (2023)
            </a>
          </li>
          <li>
            <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/">
              ACSM (2026): resistance training overview
            </a>
          </li>
          <li>
            <a href="https://pubmed.ncbi.nlm.nih.gov/11708692/">
              Foster (2001): session RPE load
            </a>
          </li>
          <li>
            <a href="https://ro.ecu.edu.au/ecuworkspost2013/2538/">
              Claudino (2017): CMJ meta-analysis
            </a>
          </li>
          <li>
            <a href="https://pubmed.ncbi.nlm.nih.gov/24912201/">
              Gathercole (2015): limitations of jump height alone
            </a>
          </li>
          <li>
            <a href="https://pubmed.ncbi.nlm.nih.gov/26423706/">
              Saw (2016): subjective monitoring
            </a>
          </li>
          <li>
            <a href="https://pubmed.ncbi.nlm.nih.gov/21311352/">
              Sánchez-Medina (2011): measured velocity loss
            </a>
          </li>
        </ul>
        <p>
          Program revision: <code>{state.programVersion}</code>. Original images
          are available in Program.
        </p>
      </Card>
    </>
  );
}
