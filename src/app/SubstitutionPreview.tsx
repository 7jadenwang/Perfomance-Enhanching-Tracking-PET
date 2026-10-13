import { useState } from "react";
import type { AthleteState, Prescription, LocalDate } from "../domain/schema";
import {
  previewSubstitution,
  rankSubstitutions,
  type SubstitutionPreview as Preview,
} from "../program/substitutions";
import { Num, Select } from "./fields";
export default function SubstitutionPreview({
  prescription,
  state,
  date,
  onAccept,
}: {
  prescription: Prescription;
  state: AthleteState;
  date: LocalDate;
  onAccept: (preview: Preview) => void;
}) {
  const [replacement, setReplacement] = useState(""),
    [lo, setLo] = useState<number | null>(null),
    [hi, setHi] = useState<number | null>(null),
    [rom, setRom] = useState(""),
    [method, setMethod] = useState(""),
    [metric, setMetric] = useState<
      "mean" | "meanConcentric" | "meanPropulsive" | "peak"
    >("meanConcentric"),
    [error, setError] = useState("");
  const context = {
    state,
    date,
    replacementLoadPercent:
      lo !== null && hi !== null ? ([lo, hi] as [number, number]) : undefined,
    rangeOfMotion: rom,
    method,
    metric,
  };
  const options = rankSubstitutions(prescription, context);
  if (!options.length)
    return (
      <p className="hint">
        No reviewed alternative for this movement. Use the original source or
        record a custom movement with a reviewed prescription.
      </p>
    );
  let preview: Preview | null = null;
  try {
    if (replacement)
      preview = previewSubstitution(prescription, replacement, context);
  } catch (e) {
    error || void e;
  }
  return (
    <details>
      <summary>Review movement substitution</summary>
      <Select
        label={`Replacement for ${prescription.name}`}
        value={replacement}
        options={[
          ["", "Choose movement"],
          ...options.map(
            (o) =>
              [
                o.movement.id,
                `${o.movement.name} · ${o.movement.english}${o.manualReview ? " · review equipment/skill" : ""}`,
              ] as [string, string],
          ),
        ]}
        onChange={(v) => {
          setReplacement(v);
          setError("");
        }}
      />
      <div className="twocol">
        <Num
          label="Replacement %1RM minimum (optional)"
          value={lo}
          onChange={setLo}
        />
        <Num
          label="Replacement %1RM maximum (optional)"
          value={hi}
          onChange={setHi}
        />
      </div>
      <label className="field">
        Replacement range of motion
        <input value={rom} onChange={(e) => setRom(e.target.value)} />
      </label>
      <label className="field">
        Replacement velocity method
        <input value={method} onChange={(e) => setMethod(e.target.value)} />
      </label>
      <Select
        label="Replacement velocity metric"
        value={metric}
        options={["mean", "meanConcentric", "meanPropulsive", "peak"]}
        onChange={(v) => setMetric(v as typeof metric)}
      />
      {preview && (
        <>
          <div className="twocol">
            <p>Original: {prescription.sourceText}</p>
            <p>
              Replacement: {preview.revised.name} · sets{" "}
              {preview.revised.sets?.join("–") ?? "review"} · reps{" "}
              {preview.revised.reps?.join("–") ?? "review"} · rest{" "}
              {preview.revised.restSeconds?.join("–") ?? "review"} s · effort
              RIR {preview.revised.rir?.join("–") ?? "source intent"} · weight{" "}
              {preview.targetKg?.join("–") ?? "choose after calibration"} kg ·
              velocity{" "}
              {preview.targetVelocity?.join("–") ??
                "explosive intent / numeric target unavailable"}{" "}
              m/s
            </p>
          </div>
          {[...preview.reasons, ...preview.requiredCalibrations].map(
            (reason) => (
              <p key={reason} className="hint">
                {reason}
              </p>
            ),
          )}
          <button
            type="button"
            onClick={() => {
              try {
                onAccept(preview!);
              } catch (e) {
                setError(String(e));
              }
            }}
          >
            Accept reviewed substitution
          </button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </details>
  );
}
