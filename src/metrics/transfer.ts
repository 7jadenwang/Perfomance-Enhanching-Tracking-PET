import type {AthleteState,Program,LocalDate,Enrollment} from '../domain/schema';
import {createEnrollment,transitionEnrollment} from '../program/enrollments';
import {addDays} from '../program/schedule';
import {buildBridge} from '../program/bridge';
import {buildTimeline,rollingLoad} from './timeline';
import {dailyCmj,recoverySignals} from './recovery';
import {plannedDose,summarizeExposure,type DoseProfile} from './exposure';
import {movementFor,movementLibrary,type Movement} from '../program/movements';
import {loadState,updateState} from '../storage/db';
import {program} from '../program/catalog';
export type TransferCandidate={entrySessionId:string;phaseId:string;novelHighDemand:string[];increases:string[];unknown:number;dose:DoseProfile;provisional:boolean};
export type TransferAdvice={status:'defer'|'recoveryConcern'|'insufficient'|'reviewCandidate';destinationId:'lp'|'up';asOf:LocalDate;reasons:string[];missing:string[];candidates:TransferCandidate[];actual:ReturnType<typeof summarizeExposure>};
export function adviseTransfer(state:AthleteState,destinationId:'lp'|'up',asOf:LocalDate,catalog:Program,library:Movement[]=movementLibrary):TransferAdvice{
 const recent=state.workouts.filter(w=>w.localDate>=addDays(asOf,-6)&&w.localDate<=asOf),actual=summarizeExposure(recent,library);
 const timeline=buildTimeline(state,{start:addDays(asOf,-27),end:asOf}),window7=rollingLoad(timeline,7).at(-1),window28=rollingLoad(timeline,28).at(-1);
 const morning=state.mornings.filter(m=>m.localDate<=asOf).sort((a,b)=>b.localDate.localeCompare(a.localDate)||b.updatedAt.localeCompare(a.updatedAt))[0];
 const recentMorning=morning&&morning.localDate>=addDays(asOf,-3)?morning:null;
 const baseline=recentMorning?state.baselines.find(b=>b.protocolId===recentMorning.protocolId&&!b.archivedAt):undefined;
 const signals=recentMorning?recoverySignals(recentMorning,baseline??null):null;
 const missing:string[]=[];if(!recentMorning)missing.push('Check-in within three calendar days');
 if(!recentMorning||!baseline||dailyCmj(recentMorning).validTrials!==3||baseline.sampleSdCm===0)missing.push('Recent three-trial CMJ with matching usable baseline');
 if(window7?.meanAu===null)missing.push('Complete 7-day actual load history');if(window28?.meanAu===null)missing.push('Complete 28-day actual load history');
 const reasons:string[]=[];let status:TransferAdvice['status']='reviewCandidate';
 if(recentMorning&&(recentMorning.pain||recentMorning.illness)){status='defer';reasons.push(recentMorning.illness?'Reported illness — defer the transfer and review recovery':'Reported pain — defer and review the planned work');}
 else if(signals&&(signals.lowCmj||signals.reasons.length)){status='recoveryConcern';reasons.push(...signals.reasons,...(signals.lowCmj?['Low CMJ signal relative to matching baseline']:[]));}
 else if(missing.length){status='insufficient';reasons.push('Known exposures are shown; available history cannot establish a suitable transfer dose.');}
 const familiar=new Set([...state.familiarity,...summarizeExposure(state.workouts.filter(w=>w.localDate<=asOf),library).movements]);
 const definition=catalog.definitions.find(p=>p.id===destinationId);if(!definition)throw Error('Unknown destination program');
 const candidates=definition.phases.flatMap(phase=>phase.entrySessionIds.map(entrySessionId=>{
  const entry=catalog.sessions.find(s=>s.id===entrySessionId)!;
  const sessions=catalog.sessions.filter(s=>s.programId===destinationId&&s.phaseId===phase.id&&s.week===entry.week);
  const prescriptions=sessions.flatMap(s=>s.exercises),dose=plannedDose(prescriptions,state,asOf);
  const novel=[...new Set(prescriptions.flatMap(p=>{const m=movementFor(p);return m&&(m.skill==='technical'||m.demand==='high')&&!familiar.has(m.id)?[m.name]:[]}))];
  const increases:string[]=[];
  if(dose.strengthReps&&dose.strengthReps[1]>actual.strengthReps)increases.push('Strength repetitions');
  if(dose.sprintMetres&&dose.sprintMetres[1]>actual.sprintMetres)increases.push('Sprint distance');
  if(dose.conditioningWorkSeconds&&dose.conditioningWorkSeconds[1]>actual.conditioningWorkSeconds)increases.push('Conditioning work time');
  for(const [demand,contacts]of Object.entries(dose.jumpDemand))if(contacts[1]>(actual.jumpContacts[demand]??0))increases.push(`${demand} jump contacts`);
  return {entrySessionId,phaseId:phase.id,novelHighDemand:novel,increases,unknown:dose.unknown+actual.unknown,dose,provisional:status!=='reviewCandidate'||dose.unknown>0||actual.unknown>0};
 }));
 if(status==='reviewCandidate')candidates.sort((a,b)=>a.novelHighDemand.length-b.novelHighDemand.length||a.increases.length-b.increases.length||catalog.sessions.findIndex(s=>s.id===a.entrySessionId)-catalog.sessions.findIndex(s=>s.id===b.entrySessionId));
 if(status==='reviewCandidate'&&candidates.some(c=>c.unknown)){reasons.push('Dose comparisons have incomplete mechanical/calibration information; review every candidate.');}
 reasons.push('Compare weight/intensity, volume, rest/tempo, velocity and energy-system demands separately. No workload band guarantees injury prevention.');
 return {status,destinationId,asOf,reasons,missing,candidates,actual};
}
const fingerprint=(state:AthleteState)=>JSON.stringify(state);
export type TransferPreview={fingerprint:string;catalogVersion:string;advice:TransferAdvice;enrollment:Enrollment;date:LocalDate;changes:string[]};
export function buildTransferPreview(state:AthleteState,advice:TransferAdvice,entrySessionId:string,restartDate:LocalDate,useBridge:boolean):TransferPreview{
 if(advice.status==='defer')throw Error('Transfer deferred while pain/illness is reported');
 if(!advice.candidates.some(c=>c.entrySessionId===entrySessionId))throw Error('Entry was not reviewed in this comparison');
 const enrollment=createEnrollment(advice.destinationId,entrySessionId,restartDate);
 const changes=['Current active enrollment will pause; historical workouts are retained','D1–D7 remain Monday–Sunday'];
 if(useBridge){enrollment.bridge=buildBridge(state,enrollment,program);enrollment.startDate=addDays(enrollment.startDate,7);changes.push('Seven-calendar-day familiarization bridge uses lower source ranges and reviewed familiar movement demands; source sessions are not completed by bridge work');}
 return {fingerprint:fingerprint(state),catalogVersion:program.version,advice,enrollment,date:restartDate,changes};
}
export async function acceptTransferPreview(preview:TransferPreview){
 await updateState(state=>{
  if(fingerprint(state)!==preview.fingerprint||program.version!==preview.catalogVersion)throw Error('Transfer preview is stale');
  const queued=transitionEnrollment(state,{type:'queue',enrollment:preview.enrollment},program);
  const next=transitionEnrollment(queued,{type:'start',id:preview.enrollment.id,date:preview.enrollment.startDate},program);
  return next;
 });
}
