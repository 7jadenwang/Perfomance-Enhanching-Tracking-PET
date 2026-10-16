import type { ChartPoint } from "../app/charts/TimeSeries";
import { addDays } from "../program/schedule";
export type Period = "day" | "week" | "month";
export function periodStart(date: string, period: Period) {
  if (period === "month") return date.slice(0, 7) + "-01";
  if (period === "week") {
    const day = new Date(date + "T12:00:00Z").getUTCDay();
    return addDays(date, -((day + 6) % 7));
  }
  return date;
}
export function aggregatePoints(
  points: ChartPoint[],
  period: Period,
  method: "sum" | "mean",
): ChartPoint[] {
  if (period === "day") return points;
  const firstDate = points.reduce(
    (first, p) => (!first || p.label < first ? p.label : first),
    "",
  );
  const groups = new Map<string, ChartPoint[]>();
  for (const p of points) {
    const key = JSON.stringify([
      periodStart(p.label, period),
      p.series,
      p.segment,
    ]);
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  return [...groups.values()].map((group) => {
    const known = group.filter((p) => p.value !== null),
      total = known.reduce((s, p) => s + p.value!, 0);
    const notes = [...new Set(group.map((p) => p.note).filter(Boolean))];
    return {
      label:
        periodStart(group[0].label, period) < firstDate
          ? firstDate
          : periodStart(group[0].label, period),
      series: group[0].series,
      segment: group[0].segment,
      value: known.length
        ? total / (method === "mean" ? known.length : 1)
        : null,
      note: `${known.length}/${group.length} observations in displayed range · ${method === "sum" ? "known total" : "mean of known values"}${notes.length ? " · " + notes.join("; ") : ""}`,
    };
  });
}
