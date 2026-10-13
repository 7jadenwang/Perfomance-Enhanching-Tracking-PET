import type { AthleteState } from "../../domain/schema";
import { buildTimeline, rollingLoad } from "../../metrics/timeline";
import { dailyCmj, baselineForDate } from "../../metrics/recovery";
import { velocityHistory, compatibleVelocity } from "../../metrics/velocity";
import TimeSeries, { type ChartPoint } from "./TimeSeries";
export default function RecoveryCharts({
  state,
  start,
  end,
}: {
  state: AthleteState;
  start: string;
  end: string;
}) {
  const timeline = buildTimeline(state, { start, end }),
    mornings = timeline.flatMap((p) => p.mornings),
    protocols = [...new Set(mornings.map((m) => m.protocolId))];
  const sleep = timeline.map((p) => ({
    label: p.date,
    value: p.mornings.at(-1)?.sleepHours ?? null,
    series: "Sleep",
  }));
  const cmj: ChartPoint[] = protocols.flatMap((protocol) =>
    timeline.map((p) => {
      const m = p.mornings.find((m) => m.protocolId === protocol);
      return {
        label: p.date,
        value: m ? dailyCmj(m).meanCm : null,
        series:
          state.protocols.find((x) => x.id === protocol)?.name ?? protocol,
        segment: protocol,
      };
    }),
  );
  const deviations: ChartPoint[] = protocols.flatMap((protocol) =>
    timeline.map((p) => {
      const m = p.mornings.find((m) => m.protocolId === protocol);
      const b = baselineForDate(state, protocol, p.date);
      return {
        label: p.date,
        value:
          m && b && dailyCmj(m).validTrials === 3 && b.meanCm > 0
            ? (100 * (dailyCmj(m).meanCm! - b.meanCm)) / b.meanCm
            : null,
        series:
          state.protocols.find((x) => x.id === protocol)?.name ?? protocol,
        segment: protocol + "|" + (b?.id ?? "none"),
        note: b ? "Baseline " + b.id.slice(0, 6) : "No matching baseline",
      };
    }),
  );
  const ratings = (key: "sleepQuality" | "fatigue" | "soreness" | "stress") =>
    timeline.map((p) => ({
      label: p.date,
      value: p.mornings.at(-1)?.[key] ?? null,
      series: key,
      note: p.mornings.at(-1)?.pain
        ? "Pain reported"
        : p.mornings.at(-1)?.illness
          ? "Illness reported"
          : "",
    }));
  const bodily = (key: "bodyMassKg" | "restingHeartRate") =>
    timeline.map((p) => ({
      label: p.date,
      value: p.mornings.at(-1)?.[key] ?? null,
      series: key,
    }));
  const hrvKeys = [
    ...new Set(
      mornings.flatMap((m) =>
        m.hrv
          ? [`${m.hrv.metric}|${m.hrv.method}|${m.hrv.protocol}|${m.hrv.unit}`]
          : [],
      ),
    ),
  ];
  const velocities = velocityHistory(
    state.workouts.filter((w) => w.localDate >= start && w.localDate <= end),
  );
  const cohorts: (typeof velocities)[] = [];
  for (const v of velocities) {
    const group = cohorts.find((g) =>
      compatibleVelocity(g[0].velocity, v.velocity),
    );
    if (group) group.push(v);
    else cohorts.push([v]);
  }
  return (
    <>
      <div className="chartgrid">
        <TimeSeries
          title="Planned versus actual session load"
          unit="AU"
          points={timeline.flatMap((p) => [
            { label: p.date, value: p.plannedAu, series: "Planned" },
            {
              label: p.date,
              value: p.actualAu,
              series: "Actual",
              note: p.conflict ? "Rest/training annotation conflict" : "",
            },
          ])}
        />
        <TimeSeries
          title="Recorded load trends"
          unit="AU/day"
          points={[
            ...rollingLoad(timeline, 7).map((p) => ({
              label: p.date,
              value: p.meanAu,
              series: "7-day mean",
            })),
            ...rollingLoad(timeline, 28).map((p) => ({
              label: p.date,
              value: p.meanAu,
              series: "28-day mean",
            })),
          ]}
        />
        <TimeSeries
          title="CMJ height"
          unit="cm"
          points={
            cmj.length
              ? cmj
              : timeline.map((p) => ({
                  label: p.date,
                  value: null,
                  series: "CMJ",
                }))
          }
        />
        <TimeSeries
          title="CMJ baseline deviation"
          unit="%"
          points={deviations}
          warning
        />
        <TimeSeries title="Sleep duration" unit="hours" points={sleep} />
        <TimeSeries
          title="Sleep quality"
          unit="1 poor – 5 good"
          points={ratings("sleepQuality")}
        />
        <TimeSeries
          title="Perceived fatigue"
          unit="1 low – 5 high"
          points={ratings("fatigue")}
          warning
        />
        <TimeSeries
          title="Soreness and stress"
          unit="1 low – 5 high"
          points={[...ratings("soreness"), ...ratings("stress")]}
          warning
        />
        {mornings.some((m) => m.bodyMassKg !== null) && (
          <TimeSeries
            title="Body mass"
            unit="kg"
            points={bodily("bodyMassKg")}
          />
        )}
        {mornings.some((m) => m.restingHeartRate !== null) && (
          <TimeSeries
            title="Resting heart rate"
            unit="bpm"
            points={bodily("restingHeartRate")}
          />
        )}
        {hrvKeys.map((key) => (
          <TimeSeries
            key={key}
            title={`HRV · ${key.split("|").slice(0, 3).join(" · ")}`}
            unit={key.split("|")[3]}
            points={timeline.map((p) => {
              const measurement = p.mornings.find(
                (m) =>
                  m.hrv &&
                  `${m.hrv.metric}|${m.hrv.method}|${m.hrv.protocol}|${m.hrv.unit}` ===
                    key,
              )?.hrv;
              return {
                label: p.date,
                value: measurement?.value ?? null,
                series: key,
                segment: key,
              };
            })}
          />
        ))}
        {cohorts.map((group, i) => (
          <TimeSeries
            key={i}
            title={`Measured velocity · ${group[0].row.name} · ${group[0].velocity.loadKg}kg · ${group[0].velocity.metric}`}
            unit="m/s"
            points={group.map((v) => ({
              label: v.date,
              value:
                v.velocity.setAverage ??
                (v.velocity.repVelocities.length
                  ? v.velocity.repVelocities.reduce((a, b) => a + b, 0) /
                    v.velocity.repVelocities.length
                  : null),
              series: "Compatible measurements",
              segment:
                group[0].velocity.method +
                "|" +
                group[0].velocity.rangeOfMotion,
              note: v.velocity.componentId ?? "",
            }))}
          />
        ))}
      </div>
      <div className="card">
        <h3>Timeline annotations</h3>
        {timeline
          .filter(
            (p) =>
              p.markers.length ||
              p.conflict ||
              p.mornings.some((m) => m.pain || m.illness),
          )
          .map((p) => (
            <p key={p.date}>
              {p.date} ·{" "}
              {[
                ...p.markers,
                ...(p.conflict ? ["Rest/training conflict"] : []),
                ...p.mornings.flatMap((m) => [
                  ...(m.pain
                    ? ["Pain: " + (m.painLocation || "location unspecified")]
                    : []),
                  ...(m.illness ? ["Illness reported"] : []),
                ]),
              ].join(" · ")}
            </p>
          ))}
        <p>
          Load trends are descriptive exposure estimates. CMJ deviation is
          performance change; perceived fatigue is your own check-in.
        </p>
      </div>
    </>
  );
}
