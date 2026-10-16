import { useEffect, useState, useRef } from "react";
import { stateToDocuments } from "../sync/documents";
import SyncSettings from "./SyncSettings";
import type { DeviceSync } from "../sync/useDeviceSync";
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
  sync,
  onSave,
  onImport,
}: {
  state: AthleteState;
  sync: DeviceSync;
  onSave: (s: AthleteState, expected?: string) => Promise<boolean>;
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
  const dirty = useRef(false),
    base = useRef(
      JSON.stringify(
        stateToDocuments(state).filter((d) =>
          ["configuration", "schedule"].includes(d.kind),
        ),
      ),
    ),
    [remoteChanged, setRemoteChanged] = useState(false);
  const signature = JSON.stringify(
    stateToDocuments(state).filter((d) =>
      ["configuration", "schedule"].includes(d.kind),
    ),
  );
  useEffect(() => {
    if (dirty.current) {
      if (signature !== base.current) setRemoteChanged(true);
      return;
    }
    base.current = signature;
    setS(state);
  }, [state, signature]);
  const [cal, setCal] = useState({
    exerciseId: "front-squat",
    date: state.startDate,
    rangeOfMotion: "",
    method: "",
    metric:
      "meanConcentric" as AthleteState["velocityProfiles"][number]["metric"],
    lo: null as number | null,
    hi: null as number | null,
    vlo: null as number | null,
    vhi: null as number | null,
  });
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
      <SyncSettings sync={sync} />
      {remoteChanged && (
        <div className="notice">
          <p>Settings changed on another device. Your draft is retained.</p>
          <details>
            <summary>Review incoming configuration</summary>
            <pre>{signature}</pre>
          </details>
          <button
            onClick={() => {
              base.current = signature;
              setRemoteChanged(false);
            }}
          >
            Keep settings draft after reviewing
          </button>
          <button
            onClick={() => {
              dirty.current = false;
              base.current = signature;
              setRemoteChanged(false);
              setS(state);
            }}
          >
            Use incoming settings
          </button>
        </div>
      )}
      <form
        onChangeCapture={() => {
          dirty.current = true;
        }}
        onSubmit={async (e) => {
          e.preventDefault();
          if (remoteChanged) return;
          const previous = base.current;
          base.current = JSON.stringify(
            stateToDocuments(s).filter((d) =>
              ["configuration", "schedule"].includes(d.kind),
            ),
          );
          if (await onSave(s, previous)) {
            dirty.current = false;
          } else base.current = previous;
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
          <button className="primary" type="submit" disabled={remoteChanged}>
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
        <h2>Reviewed movement velocity calibration</h2>
        <p>
          Enter a replacement-specific reviewed target range at the stated
          intensity, ROM and measurement method. An isolated rep or another
          exercise cannot establish this calibration.
        </p>
        <Select
          label="Calibration movement"
          value={cal.exerciseId}
          options={movementLibrary.map((m) => [
            m.id,
            m.name + " · " + m.english,
          ])}
          onChange={(v) => setCal({ ...cal, exerciseId: v })}
        />
        <div className="twocol">
          <Num
            label="Calibration %1RM minimum"
            value={cal.lo}
            onChange={(v) => setCal({ ...cal, lo: v })}
          />
          <Num
            label="Calibration %1RM maximum"
            value={cal.hi}
            onChange={(v) => setCal({ ...cal, hi: v })}
          />
          <Num
            label="Calibration velocity minimum (m/s)"
            value={cal.vlo}
            onChange={(v) => setCal({ ...cal, vlo: v })}
          />
          <Num
            label="Calibration velocity maximum (m/s)"
            value={cal.vhi}
            onChange={(v) => setCal({ ...cal, vhi: v })}
          />
          <label className="field">
            Calibration range of motion
            <input
              value={cal.rangeOfMotion}
              onChange={(e) =>
                setCal({ ...cal, rangeOfMotion: e.target.value })
              }
            />
          </label>
          <label className="field">
            Calibration device / method
            <input
              value={cal.method}
              onChange={(e) => setCal({ ...cal, method: e.target.value })}
            />
          </label>
          <Select
            label="Calibration velocity metric"
            value={cal.metric}
            options={["mean", "meanConcentric", "meanPropulsive", "peak"]}
            onChange={(v) => setCal({ ...cal, metric: v as typeof cal.metric })}
          />
          <label className="field">
            Calibration date
            <input
              type="date"
              value={cal.date}
              onChange={(e) => setCal({ ...cal, date: e.target.value })}
            />
          </label>
        </div>
        <button
          disabled={
            cal.lo === null ||
            cal.hi === null ||
            cal.vlo === null ||
            cal.vhi === null ||
            cal.lo > cal.hi ||
            cal.vlo > cal.vhi ||
            !cal.rangeOfMotion.trim() ||
            !cal.method.trim()
          }
          onClick={async () => {
            if (
              cal.lo !== null &&
              cal.hi !== null &&
              cal.vlo !== null &&
              cal.vhi !== null
            )
              await onSave({
                ...state,
                velocityProfiles: [
                  ...state.velocityProfiles,
                  {
                    exerciseId: cal.exerciseId,
                    date: cal.date,
                    rangeOfMotion: cal.rangeOfMotion.trim(),
                    method: cal.method.trim(),
                    metric: cal.metric,
                    loadPercent: [cal.lo, cal.hi],
                    target: [cal.vlo, cal.vhi],
                  },
                ],
              });
          }}
        >
          Save reviewed velocity calibration
        </button>
        {state.velocityProfiles.map((v, i) => (
          <p key={i}>
            {v.exerciseId} · {v.loadPercent.join("–")}%1RM ·{" "}
            {v.target.join("–")} {v.metric} m/s · {v.rangeOfMotion} · {v.method}{" "}
            · {v.date}
          </p>
        ))}
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
              current records and settings.{" "}
              {sync.meta?.linked
                ? "This replacement will synchronize to the signed-in account and its other devices."
                : ""}
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
          fatigue/soreness/stress 8–10 or sleep quality 1–4 (on the 10-point
          scale). No flag is a guarantee of readiness, and the app never changes
          your plan automatically.
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
