import { db, loadState, updateState } from "./db";
import { parseState, type AthleteState } from "../domain/schema";
export async function exportBackup(): Promise<string> {
  return JSON.stringify(await loadState(), null, 2);
}
export function previewBackup(text: string) {
  const state = migrateState(JSON.parse(text),program);
  return {
    state,
    counts: {
      workouts: state.workouts.length,
      enrollments:state.enrollments.length,
      mornings: state.mornings.length,
    },
    compatible: true,
  };
}
export async function replaceFromBackup(input: AthleteState) {
  const state = migrateState(input,program);
  await updateState(()=>state);
}

import {migrateState} from "./migrate";
import {program} from "../program/catalog";
