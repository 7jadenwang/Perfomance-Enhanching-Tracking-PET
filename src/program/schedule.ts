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
  return addDays(firstWeekdayOnOrAfter(start,1), s.blockIndex * 28 + (s.week - 1) * 7 + s.day - 1);
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

export const weekdays = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"] as const;
export function firstWeekdayOnOrAfter(date:LocalDate, sourceDay:number):LocalDate {
 dateSchema.parse(date);
 if(!Number.isInteger(sourceDay)||sourceDay<1||sourceDay>7) throw Error("Invalid source day");
 const current=new Date(date+"T12:00:00Z").getUTCDay();
 return addDays(date, ((sourceDay%7)-current+7)%7);
}
export function weekMonday(date:LocalDate):LocalDate{
 dateSchema.parse(date);return addDays(date,-((new Date(date+"T12:00:00Z").getUTCDay()+6)%7));
}
