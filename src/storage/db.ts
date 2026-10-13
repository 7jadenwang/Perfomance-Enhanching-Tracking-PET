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
class TrainingDB extends Dexie {
  state!: Table<{ id: string; value: AthleteState }, string>;
  constructor() {
    super("pet-training-companion");
    this.version(1).stores({ state: "id" });
  }
}
export const db = new TrainingDB();
export async function loadState(): Promise<AthleteState> {
  const stored = await db.state.get("athlete");
  return stored ? parseState(stored.value) : initialState();
}
async function mutate(fn: (s: AthleteState) => AthleteState) {
  await db.transaction("rw", db.state, async () => {
    const s = await loadState();
    await db.state.put({ id: "athlete", value: parseState(fn(s)) });
  });
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
  }));
}
