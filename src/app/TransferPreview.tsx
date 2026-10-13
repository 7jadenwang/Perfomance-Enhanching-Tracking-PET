import { useState } from "react";
import type { AthleteState } from "../domain/schema";
import { localToday } from "../domain/schema";
import {
  adviseTransfer,
  buildTransferPreview,
  acceptTransferPreview,
  type TransferPreview as Preview,
} from "../metrics/transfer";
import {
  program,
  getPhase,
  sessionLabel,
  getSession,
} from "../program/catalog";
import { movementLibrary } from "../program/movements";
import { Card, Select } from "./fields";
export default function TransferPreview({
  state,
  perform,
  onCancel,
  beforeAccept,
}: {
  state: AthleteState;
  perform: (a: () => Promise<void>) => Promise<boolean>;
  onCancel: () => void;
  beforeAccept?: () => Promise<void>;
}) {
  const [destination, setDestination] = useState<"lp" | "up">(
      state.enrollments.find((e) => e.status === "active")?.programId === "lp"
        ? "up"
        : "lp",
    ),
    [entry, setEntry] = useState(""),
    [date, setDate] = useState(localToday()),
    [bridge, setBridge] = useState(true),
    [preview, setPreview] = useState<Preview | null>(null),
    [error, setError] = useState("");
  const advice = adviseTransfer(
    state,
    destination,
    localToday(),
    program,
    movementLibrary,
  );
  return (
    <Card>
      <h2>Review a periodization transfer</h2>
      <Select
        label="Destination program"
        value={destination}
        options={[
          ["lp", "Linear Periodization"],
          ["up", "Undulating Periodization"],
        ]}
        onChange={(v) => {
          setDestination(v as typeof destination);
          setEntry("");
          setPreview(null);
        }}
      />
      <p
        className={
          advice.status === "defer" || advice.status === "recoveryConcern"
            ? "notice"
            : "hint"
        }
      >
        Comparison: {advice.status} · candidates are review aids, not injury
        forecasts.
      </p>
      {advice.reasons.map((r) => (
        <p key={r}>{r}</p>
      ))}
      {advice.missing.length > 0 && (
        <p className="notice">Missing: {advice.missing.join("; ")}</p>
      )}
      <Select
        label="Reviewed destination entry"
        value={entry}
        options={[
          ["", "Choose an entry"],
          ...advice.candidates.map(
            (c) =>
              [
                c.entrySessionId,
                `${sessionLabel(getSession(c.entrySessionId)!)} · ${getPhase(c.phaseId).purpose}${c.provisional ? " · provisional" : ""}`,
              ] as [string, string],
          ),
        ]}
        onChange={(v) => {
          setEntry(v);
          setPreview(null);
        }}
      />
      {advice.candidates
        .filter((c) => c.entrySessionId === entry)
        .map((c) => (
          <div key={c.entrySessionId}>
            <p>
              Compared with your last seven days:{" "}
              {c.increases.join(", ") ||
                "No increase detected in the supplied dimensions"}
            </p>
            <p>
              Unfamiliar technical/high-demand movements:{" "}
              {c.novelHighDemand.join(", ") || "None identified"}
            </p>
            <p>Incomplete source/measurement fields: {c.unknown}</p>
          </div>
        ))}
      <label className="field">
        Requested transfer date
        <input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setPreview(null);
          }}
        />
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={bridge}
          onChange={(e) => {
            setBridge(e.target.checked);
            setPreview(null);
          }}
        />
        Preview a seven-day familiarization bridge
      </label>
      <button
        type="button"
        disabled={!entry || advice.status === "defer"}
        onClick={() => {
          try {
            setPreview(
              buildTransferPreview(state, advice, entry, date, bridge),
            );
            setError("");
          } catch (e) {
            setError(String(e));
          }
        }}
      >
        Generate transfer preview
      </button>
      {preview && (
        <div className="notice">
          <h3>Proposed calendar</h3>
          <p>
            Offline changes are pending device changes until synchronization is
            acknowledged. Online acceptance synchronizes first and requires a
            current preview.
          </p>
          {preview.changes.map((c) => (
            <p key={c}>{c}</p>
          ))}
          <p>
            Destination source entry: {preview.enrollment.startDate}. Current
            program pauses.
          </p>
          {preview.enrollment.bridge?.sessions.map((s) => (
            <div className="prescription" key={s.sessionId}>
              <strong>{s.date}</strong>
              {s.prescriptions.map((p) => (
                <p key={p.id}>
                  {p.name} · {p.sets?.join("–") ?? "review"} sets ×{" "}
                  {p.reps?.join("–") ?? "review"} ·{" "}
                  {p.loadPercent?.join("–") ?? "reference/calibration needed"}{" "}
                  %1RM · rest {p.restSeconds?.join("–") ?? "source"} s
                </p>
              ))}
            </div>
          ))}
          <p>
            All values come from source-supported ranges. Review equipment,
            weight references, velocity and original coaching instructions
            before accepting.
          </p>
          <button
            type="button"
            onClick={async () => {
              if (
                await perform(async () => {
                  await beforeAccept?.();
                  await acceptTransferPreview(preview);
                })
              )
                onCancel();
            }}
          >
            Accept transfer preview
          </button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      <button type="button" onClick={onCancel}>
        Cancel transfer
      </button>
    </Card>
  );
}
