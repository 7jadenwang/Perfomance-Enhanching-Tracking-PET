import {
  dateSchema,
  type Session,
  type Program,
  type LocalDate,
} from "../domain/schema";
export function addDays(date: LocalDate, days: number): LocalDate {
  dateSchema.parse(date);
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function sessionDate(s: Session, start: LocalDate): LocalDate {
  return addDays(start, s.blockIndex * 28 + (s.week - 1) * 7 + s.day - 1);
}
export function sessionsForDate(
  p: Program,
  date: LocalDate,
  start: LocalDate,
  reschedules: Record<string, LocalDate>,
  programId: "lp" | "up" = "lp",
): Session[] {
  return p.sessions.filter(
    (s) => s.programId === programId && (reschedules[s.id] ?? sessionDate(s, start)) === date,
  );
}
