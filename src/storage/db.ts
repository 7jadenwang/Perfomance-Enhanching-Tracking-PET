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
import {stateToDocuments,documentsToState} from '../sync/documents';
import {identity,same,emptyMeta,type SyncMeta,type SyncDocument} from '../sync/types';
let namespace='guest';
export const storageNamespace=()=>namespace;
const stateKey=(ns:string)=>ns==='guest'?'athlete':ns;
const channel=typeof BroadcastChannel!=='undefined'&&typeof window!=='undefined'?new BroadcastChannel('pet-storage'):null;
channel?.addEventListener('message',()=>{if(typeof window!=='undefined')window.dispatchEvent(new Event('pet-storage-changed'))});
class TrainingDB extends Dexie {
  state!: Table<{ id: string; value: AthleteState }, string>;
  sync!:Table<SyncMeta,string>;
  constructor() {
    super("pet-training-companion");
    this.version(1).stores({ state: "id" });
    this.version(2).stores({state:"id",sync:"id"});
  }
}
export const db = new TrainingDB();
export async function loadState(): Promise<AthleteState> {
 const key=stateKey(namespace);
 return db.transaction("rw",db.state,async()=>{
  const stored=await db.state.get(key);
  if(!stored)return initialState();
  const validated=migrateState(stored.value,program);
  if((stored.value as {schemaVersion:number}).schemaVersion===1) await db.state.put({id:key,value:validated});
  return validated;
 });
}
export async function exportRawStoredBackup(){
 const stored=await db.state.get(stateKey(namespace));return JSON.stringify(stored?.value??initialState(),null,2);
}
export function notifyStorageChanged(){
 if(typeof window!=="undefined")window.dispatchEvent(new Event("pet-storage-changed"));channel?.postMessage(namespace);
}
export async function setStorageNamespace(ns:string){if(ns!=='guest'&&!ns.startsWith('account:'))throw Error('Invalid namespace');namespace=ns;notifyStorageChanged();}
export async function getSyncMeta(ns=namespace){return (await db.sync.get(ns))??emptyMeta(ns);}
export function queueState(meta:SyncMeta,state:AthleteState):SyncMeta{
 if(!meta.linked)return meta;
 const desired=stateToDocuments(state),ids=new Set(desired.map(identity)),pending=[...meta.pending];let generation=meta.generation;
 const all=[...desired,...meta.base.filter(d=>!d.deleted&&!ids.has(identity(d))).map(d=>({...d,payload:null,deleted:true}))];
 for(const d of all){const id=identity(d),base=meta.base.find(x=>identity(x)===id),existing=pending.find(x=>identity(x)===id);if(same(d,existing??base))continue;
  const frozen=meta.inflight?.changes.find(x=>identity(x)===id);
  const index=pending.findIndex(x=>identity(x)===id);if(index>=0)pending.splice(index,1);
  // Keep an edit that returns to the base while an older request is in flight.
  if(!same(d,base)||frozen)pending.push({...d,baseRevision:base?.revision??0,generation:++generation});
 }
 return {...meta,pending,generation};
}
export async function updateState(fn:(s:AthleteState)=>AthleteState){
 const ns=namespace;
 await db.transaction('rw',db.state,db.sync,async()=>{
  if(namespace!==ns)throw Error('Account changed; review before saving');
  const stored=await db.state.get(stateKey(ns)),s=stored?migrateState(stored.value,program):initialState(),next=parseState(fn(s));
  const meta=await getSyncMeta(ns);await db.state.put({id:stateKey(ns),value:next});if(ns!=='guest')await db.sync.put(queueState(meta,next));
 });notifyStorageChanged();
}
export async function linkAccount(remote:SyncDocument[],local:AthleteState|null){
 const ns=namespace;if(ns==='guest')throw Error('Sign in first');
 const next=local?parseState(local):remote.length?documentsToState(remote):await loadState();
 await db.transaction('rw',db.state,db.sync,async()=>{
  if(namespace!==ns)throw Error('Account changed');
  const old=await getSyncMeta(ns);if(old.linked)throw Error('Account already linked');
  const meta={...old,linked:true,base:local?[]:remote};
  await db.sync.put(queueState(meta,next));await db.state.put({id:stateKey(ns),value:next});
 });notifyStorageChanged();
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
