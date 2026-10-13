import { useState } from "react";
import type { Prescription, ActualRow, AthleteState } from "../domain/schema";
import {
  evaluateVelocityRule,
  variantPrescription,
} from "../program/velocity-rules";
import { Select } from "./fields";
export default function VelocityGuidance({
  prescription: p,
  row,
  state,
  enabled,
  onAccept,
}: {
  prescription: Prescription | undefined;
  row: ActualRow;
  state: AthleteState;
  enabled: boolean;
  onAccept: (p: Prescription, reason: string) => void;
}) {
  const [variant, setVariant] = useState("0");
  if (!p) return null;
  const selected = p.velocityVariants.length
    ? variantPrescription(p, Number(variant))
    : p;
  const results = row.velocity
    ? selected.velocityRules.map((rule) =>
        evaluateVelocityRule(rule, row.velocity!, {
          experience: state.velocityExperience,
          enabled,
        }),
      )
    : [];
  return (
    <div className="velocity-guidance">
      {p.velocityVariants.length > 0 && (
        <>
          <Select
            label="Source load / velocity variant"
            value={variant}
            options={p.velocityVariants.map((v, i) => [
              String(i),
              `${v.loadPercent[0]}%1RM · ${v.target.join("–")} m/s · floor ${v.floor}`,
            ])}
            onChange={setVariant}
          />
          <button
            type="button"
            onClick={() =>
              onAccept(selected, "Accepted source load/velocity variant")
            }
          >
            Use this load/velocity variant
          </button>
        </>
      )}
      {!enabled && <p>No source velocity autoregulation on this session.</p>}
      {p.velocityRules.map((rule, i) => (
        <details key={i}>
          <summary>Source velocity rule</summary>
          <p className="sourceText">{rule.sourceText}</p>
        </details>
      ))}
      {results.map((result, i) => (
        <div
          key={i}
          className={
            result.actions.some((a) => a.startsWith("stop")) ? "notice" : "hint"
          }
        >
          <p>
            Source-rule suggestion:{" "}
            {result.ambiguous
              ? "Ambiguous boundary — review"
              : result.actions.join(", ") || "Unavailable"}
          </p>
          {result.observedLoss !== null && (
            <p>
              Source-defined velocity loss: {result.observedLoss.toFixed(1)}%
            </p>
          )}
          {[...result.reasons, ...result.missing].map((reason) => (
            <p key={reason}>{reason}</p>
          ))}
          <p>
            Review before editing future work. Confirmed actual rows stay
            recorded.
          </p>
        </div>
      ))}
    </div>
  );
}
