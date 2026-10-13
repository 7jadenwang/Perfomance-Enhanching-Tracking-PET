import Dexie, { type Table } from "dexie";
import {
  initialState,
  parseState,
  workoutSchema,
  morningSchema,
  type AthleteState,
  type Workout,
  type MorningRecord,
} from "../domain/schema";
import {program} from "../program/catalog";
import {migrateState} from "./migrate";
import {transitionEnrollment,type EnrollmentCommand} from "../program/enrollments";
class TrainingDB extends Dexie {
  state!: Table<{ id: string; value: AthleteState }, string>;
  constructor() {
    super("pet-training-companion");
    this.version(1).stores({ state: "id" });
  }
}
export const db = new TrainingDB();
export async function loadState(): Promise<AthleteState> {
 return db.transaction("rw",db.state,async()=>{
  const stored=await db.state.get("athlete");
  if(!stored)return initialState();
  const validated=migrateState(stored.value,program);
  if((stored.value as {schemaVersion:number}).schemaVersion===1) await db.state.put({id:"athlete",value:validated});
  return validated;
 });
}
export async function exportRawStoredBackup(){
 const stored=await db.state.get("athlete");return JSON.stringify(stored?.value??initialState(),null,2);
}
export function notifyStorageChanged(){
 if(typeof window!=="undefined")window.dispatchEvent(new Event("pet-storage-changed"));
}
export async function updateState(fn:(s:AthleteState)=>AthleteState){
 await db.transaction("rw",db.state,async()=>{const s=await loadState();await db.state.put({id:"athlete",value:parseState(fn(s))});});
 notifyStorageChanged();
}
const mutate=updateState;
export async function applyEnrollmentCommand(command:EnrollmentCommand){await mutate(s=>transitionEnrollment(s,command,program));}
export async function saveActivity(activity:AthleteState["activities"][number]){
 await mutate(s=>({...s,activities:[...s.activities.filter(a=>a.localDate!==activity.localDate),activity]}));
}
export async function saveWorkout(w: Workout) {
  workoutSchema.parse(w);
  await mutate((s) => ({
    ...s,
    workouts: [...s.workouts.filter((x) => x.id !== w.id), w],
  }));
}
export async function saveMorning(r: MorningRecord) {
  morningSchema.parse(r);
  await mutate((s) => ({
    ...s,
    mornings: [
      ...s.mornings.filter(
        (x) => !(x.localDate === r.localDate && x.protocolId === r.protocolId),
      ),
      r,
    ],
  }));
}
export async function saveSettings(state: AthleteState) {
  parseState(state);
  await mutate((s) => ({
    ...state,
    workouts: s.workouts,
    mornings: s.mornings,
    activities:s.activities,
  }));
}
