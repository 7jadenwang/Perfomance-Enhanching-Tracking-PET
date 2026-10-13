import {db,loadState} from './db';import {parseState,type AthleteState} from '../domain/schema';
export async function exportBackup():Promise<string>{return JSON.stringify(await loadState(),null,2);}
export function previewBackup(text:string){const state=parseState(JSON.parse(text));return {state,counts:{workouts:state.workouts.length,mornings:state.mornings.length},compatible:true};}
export async function replaceFromBackup(input:AthleteState){const state=parseState(input);await db.transaction('rw',db.state,async()=>{await db.state.put({id:'athlete',value:state});});}
