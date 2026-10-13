import { useEffect, useState } from "react";
import {
  localToday,
  type AthleteState,
  type MorningRecord,
  type Session,
} from "../domain/schema";
import { program } from "../program/catalog";
import { sessionsForDate } from "../program/schedule";
import {
  dailyCmj,
  calibrationCount,
  recoverySignals,
} from "../metrics/recovery";
import { Num, Card, Select, fmt } from "./fields";
const now = () => new Date().toISOString();
function fresh(date: string, protocolId: string): MorningRecord {
  return {
    id: crypto.randomUUID(),
    localDate: date,
    protocolId,
    trials: [],
    sleepHours: null,
    sleepQuality: null,
    fatigue: null,
    soreness: null,
    stress: null,
    pain: null,
    painLocation: "",
    baselineEligible: true,
    exclusionReason: "",
    createdAt: now(),
    updatedAt: now(),
  };
}
export default function Today({
  state,
  onSave,
  onLog,
}: {
  state: AthleteState;
  onSave: (r: MorningRecord) => Promise<boolean>;
  onLog: (s: Session, date: string) => void;
}) {
  const [date, setDate] = useState(localToday()),
    [protocol, setProtocol] = useState(state.protocols.at(-1)?.id ?? "default"),
    [entry, setEntry] = useState(
      () =>
        state.mornings.find(
          (r) => r.localDate === date && r.protocolId === protocol,
        ) ?? fresh(date, protocol),
    ),
    [trials, setTrials] = useState<(number | null)[]>(() =>
      [0, 1, 2].map((i) => entry.trials[i]?.heightCm ?? null),
    ),
    [excluded, setExcluded] = useState<boolean[]>(() =>
      [0, 1, 2].map((i) => entry.trials[i]?.excluded ?? false),
    );
  useEffect(() => {
    const r =
      state.mornings.find(
        (x) => x.localDate === date && x.protocolId === protocol,
      ) ?? fresh(date, protocol);
    setEntry(r);
    setTrials([0, 1, 2].map((i) => r.trials[i]?.heightCm ?? null));
    setExcluded([0, 1, 2].map((i) => r.trials[i]?.excluded ?? false));
  }, [date, protocol]);
  const saved = state.mornings.find(
      (r) => r.localDate === date && r.protocolId === protocol,
    ),
    baseline = state.baselines.find(
      (b) => b.protocolId === protocol && !b.archivedAt,
    ),
    signals = saved ? recoverySignals(saved, baseline ?? null) : null,
    cmj = saved ? dailyCmj(saved).meanCm : null,
    count = calibrationCount(state.mornings, protocol),
    sessions = sessionsForDate(
      program,
      date,
      state.startDate,
      state.reschedules,
    );
  function patch(k: keyof MorningRecord, v: unknown) {
    setEntry((r) => ({ ...r, [k]: v }));
  }
  return (
    <>
      <div className="pagehead">
        <p className="eyebrow">YOUR DAILY CHECK-IN</p>
        <h1>Show up. Measure. Adapt.</h1>
        <p>A little context for today's training.</p>
        <label className="datefield">
          Training date
          <input
            aria-label="Training date"
            type="date"
            value={date}
            onChange={(e) => {
              if (e.target.value) setDate(e.target.value);
            }}
          />
        </label>
      </div>
      <div className="stats">
        <Card>
          <p>Morning CMJ average</p>
          <strong>{cmj === null ? "—" : fmt(cmj, 1) + " cm"}</strong>
          <small>
            {signals?.percentageChange != null
              ? `${signals.percentageChange.toFixed(1)}% from baseline`
              : "Three consistent trials"}
          </small>
        </Card>
        <Card>
          <p>Personal baseline</p>
          <strong>
            {baseline
              ? fmt(baseline.meanCm, 1) + " cm"
              : `${Math.min(count, 14)} / 14 days`}
          </strong>
          <small>
            {baseline
              ? "Frozen reference · recalibrate in Settings"
              : "Building baseline"}
          </small>
        </Card>
        <Card>
          <p>Recovery signals</p>
          <strong className="smallstat">
            {signals?.pain
              ? "Pain reported"
              : signals?.multipleConcerns
                ? "Multiple concerns"
                : signals?.lowCmj
                  ? "Low CMJ"
                  : signals?.reasons.length
                    ? "Check-in concern"
                    : signals
                      ? "No flag detected"
                      : "Awaiting entry"}
          </strong>
          <small>
            {!signals || signals.limitedData
              ? "Limited data"
              : "Review measured context"}
          </small>
        </Card>
      </div>
      {signals &&
        (signals.lowCmj ||
          signals.reasons.length > 0 ||
          signals.pain ||
          signals.zeroVariance) && (
          <Card className="signal">
            <h3>Review today's session</h3>
            {signals.lowCmj && (
              <p>
                CMJ is below your baseline mean minus two standard deviations.
              </p>
            )}
            {signals.reasons.map((r) => (
              <p key={r}>{r}</p>
            ))}
            {signals.pain && (
              <p>
                Pain reported: {signals.painLocation || "location unspecified"}.
                Review the session with your coach.
              </p>
            )}
            {signals.zeroVariance && (
              <p>
                Baseline variability is zero; collect more representative
                calibration data.
              </p>
            )}
            <p>
              These are provisional signals, not a fatigue percentage or a
              guarantee of readiness.
            </p>
          </Card>
        )}
      <div className="twocol">
        <Card>
          <h2>Morning check-in</h2>
          <p>
            Use the same warm-up, arm position, surface, footwear, and
            measurement method.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await onSave({
                ...entry,
                localDate: date,
                protocolId: protocol,
                trials: trials.flatMap((heightCm, i) =>
                  heightCm === null
                    ? []
                    : [
                        {
                          heightCm,
                          excluded: excluded[i],
                          reason: excluded[i]
                            ? "Marked invalid by athlete"
                            : "",
                        },
                      ],
                ),
                updatedAt: now(),
              });
            }}
          >
            <Select
              label="CMJ protocol"
              value={protocol}
              options={state.protocols.map((p) => [p.id, p.name])}
              onChange={setProtocol}
            />
            <div className="threecols">
              {trials.map((v, i) => (
                <div key={i}>
                  <Num
                    label={`CMJ trial ${i + 1} (cm)`}
                    value={v}
                    min={0.01}
                    onChange={(n) =>
                      setTrials((t) => t.map((x, j) => (i === j ? n : x)))
                    }
                  />
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={excluded[i]}
                      onChange={(e) =>
                        setExcluded((t) =>
                          t.map((x, j) => (i === j ? e.target.checked : x)),
                        )
                      }
                    />
                    Exclude invalid trial
                  </label>
                </div>
              ))}
            </div>
            <div className="threecols">
              <Num
                label="Sleep hours"
                value={entry.sleepHours}
                max={24}
                onChange={(v) => patch("sleepHours", v)}
              />
              {(["sleepQuality", "fatigue", "soreness", "stress"] as const).map(
                (k) => (
                  <Num
                    key={k}
                    label={
                      k === "sleepQuality"
                        ? "Sleep quality (1 poor–5 good)"
                        : `${k[0].toUpperCase() + k.slice(1)} (1 low–5 high)`
                    }
                    value={entry[k]}
                    min={1}
                    max={5}
                    step="1"
                    onChange={(v) => patch(k, v)}
                  />
                ),
              )}
            </div>
            <Select
              label="Pain today"
              value={
                entry.pain === null ? "unknown" : entry.pain ? "yes" : "no"
              }
              options={["unknown", "no", "yes"]}
              onChange={(v) =>
                patch("pain", v === "unknown" ? null : v === "yes")
              }
            />
            {entry.pain && (
              <label className="field">
                Pain location
                <input
                  value={entry.painLocation}
                  onChange={(e) => patch("painLocation", e.target.value)}
                />
              </label>
            )}
            <label className="check">
              <input
                type="checkbox"
                checked={entry.baselineEligible}
                onChange={(e) => patch("baselineEligible", e.target.checked)}
              />
              Suitable for baseline calibration
            </label>
            <label className="field">
              Illness / technique change / exclusion reason
              <input
                value={entry.exclusionReason}
                onChange={(e) => patch("exclusionReason", e.target.value)}
              />
            </label>
            <button className="primary" type="submit">
              Save morning
            </button>
          </form>
        </Card>
        <div>
          <Card>
            <p className="eyebrow">SCHEDULED WORK</p>
            <h2>Today's training</h2>
            {sessions.length ? (
              sessions.map((s) => (
                <div className="sessionpreview" key={s.id}>
                  <span>
                    {s.month} · Week {s.week} / Day {s.day}
                  </span>
                  <h3>{s.exercises[0]?.name}</h3>
                  <p>
                    {s.exercises.length} prescription blocks{" "}
                    {s.optional ? "· Optional" : ""}
                  </p>
                  <button className="primary" onClick={() => onLog(s, date)}>
                    Log this session
                  </button>
                </div>
              ))
            ) : (
              <p>
                Unspecified day. Browse Program to choose a session; no rest day
                has been inferred.
              </p>
            )}
          </Card>
          <Card className="muted">
            <h3>Read the signals in context</h3>
            <p>
              CMJ height is a useful measure of explosive performance. Technique
              and measurement variation also affect it. No flag detected does
              not guarantee readiness.
            </p>
            <p>Morning tests are stored separately from training jumps.</p>
          </Card>
        </div>
      </div>
    </>
  );
}
