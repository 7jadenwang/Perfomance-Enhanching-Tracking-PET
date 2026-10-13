import raw from "./catalog.json";
import { parseProgram } from "../domain/schema";
export const program = parseProgram(raw);

export const programDefinitions = program.definitions;
export const getSession = (id: string) => program.sessions.find(s => s.id === id);
export function getPhase(id: string) {
 const phase = programDefinitions.flatMap(p=>p.phases).find(p=>p.id===id);
 if (!phase) throw Error("Unknown phase: "+id);
 return phase;
}
export function sessionLabel(s: typeof program.sessions[number]) {
 if(s.focus==="Custom saved work")return "Saved custom session";
 const phase = getPhase(s.phaseId);
 return `${s.focus==="Familiarization bridge"?"Bridge · ":""}${s.programId.toUpperCase()} · Phase ${phase.number} · W${s.week} D${s.day}`;
}
