import type {AthleteState,Prescription,Workout,LocalDate} from '../domain/schema';
import {movementFor,movementLibrary,equipmentStatus,type Movement} from './movements';
export type SubstitutionContext={state:AthleteState;date:LocalDate;replacementLoadPercent?:[number,number];rangeOfMotion?:string;method?:string;metric?:'mean'|'meanConcentric'|'meanPropulsive'|'peak'};
export type SubstitutionOption={movement:Movement;sourceProvided:boolean;manualReview:boolean;reasons:string[]};
export function rankSubstitutions(p:Prescription,c:SubstitutionContext):SubstitutionOption[]{
 const original=movementFor(p)??(p.kind==='conditioning'&&p.purpose!=='other'?movementLibrary.find(m=>m.id==='rowing'):undefined);if(!original)return [];
 return movementLibrary.filter(m=>m.id!==original.id&&m.pattern===original.pattern&&m.intent===original.intent&&m.equipment.every(id=>equipmentStatus(id,c.state.equipment)!=='unavailable')&&(original.pattern!=='jump'||(m.direction===original.direction&&m.demand===original.demand&&m.unilateral===original.unilateral))).map(m=>({movement:m,sourceProvided:({"前蹲/SSB安全杠深蹲":["ssb-squat"],"单车/椭圆机":["easy-run"]} as Record<string,string[]>)[p.name]?.includes(m.id)??false,manualReview:m.skill==='technical'||m.equipment.some(id=>equipmentStatus(id,c.state.equipment)==='unconfirmed'),reasons:['Pattern match requires review of intent, technique and dose.']})).sort((a,b)=>Number(b.sourceProvided)-Number(a.sourceProvided)||Number(a.manualReview)-Number(b.manualReview)||a.movement.name.localeCompare(b.movement.name));
}
export type SubstitutionPreview={original:Prescription;revised:Prescription;replacement:Movement;targetKg:[number,number]|null;targetVelocity:[number,number]|null;requiredCalibrations:string[];reasons:string[];manualReview:boolean};
export function previewSubstitution(p:Prescription,replacementId:string,c:SubstitutionContext):SubstitutionPreview{
 const option=rankSubstitutions(p,c).find(o=>o.movement.id===replacementId);
 if(!option)throw Error('No reviewed movement match available');
 const m=option.movement,calibrations:string[]=[];
 const revised:Prescription={...p,name:m.name,movementId:m.id,sourceText:`Replacement: ${m.name}. Original: ${p.sourceText}`,referenceExerciseId:m.id,loadPercent:null,loadKg:null,velocityTarget:null,velocityMetric:null,velocityRules:[],velocityVariants:[],components:[],cluster:null,loadConvention:'unknown',ambiguity:'Conditional alternative; review dose and technique.',experience:'all'};
 const refs=c.state.reference1RMs.filter(r=>(r.exerciseId===m.id||r.exerciseId===m.name||m.aliases.includes(r.exerciseId))&&r.date<=c.date).sort((a,b)=>b.date.localeCompare(a.date));
 let kg:[number,number]|null=null,velocity:[number,number]|null=null;
 if(!refs.length)calibrations.push('replacement-specific load reference');
 if(p.kind==='strength'){
  revised.rir=[2,3];revised.tempo=null;
  if(!c.replacementLoadPercent)calibrations.push('choose replacement intensity (%1RM) or effort target');
  if(c.replacementLoadPercent){
   const [lo,hi]=c.replacementLoadPercent;if(!Number.isFinite(lo)||!Number.isFinite(hi)||lo<0||hi<lo||hi>150)throw Error('Invalid replacement intensity');
   revised.loadPercent=[lo,hi];if(refs.length){kg=[refs[0].kg*lo/100,refs[0].kg*hi/100];revised.referenceExerciseId=refs[0].exerciseId;}
  }
  const profile=c.state.velocityProfiles.filter(v=>v.exerciseId===m.id&&v.date<=c.date&&v.metric===c.metric&&!!c.method&&v.method===c.method&&!!c.rangeOfMotion&&v.rangeOfMotion===c.rangeOfMotion&&revised.loadPercent&&v.loadPercent[0]===revised.loadPercent[0]&&v.loadPercent[1]===revised.loadPercent[1]).sort((a,b)=>b.date.localeCompare(a.date))[0];
  if(profile){velocity=profile.target;revised.velocityTarget=profile.target;revised.velocityMetric=profile.metric;}else calibrations.push('matching replacement velocity calibration');
 }
 const reasons=[...option.reasons,'RIR 2–3 is a provisional effort starting point; review sets, reps, rest and intensity before acceptance.'];
 if(p.kind==='conditioning'){
  revised.loadPercent=null;revised.referenceExerciseId=null;revised.velocityTarget=null;revised.distanceMetres=null;revised.purpose=p.purpose;
  reasons.push('Preserve work/recovery and intended effort. No distance or calorie equivalence; running adds impact. Do not assume maximal sprint intensity.');
 }
 if(p.kind==='jump')reasons.push('Direction, unilateral and demand category match; contact counts still do not establish equivalent mechanical stress.');
 return {original:p,revised,replacement:m,targetKg:kg,targetVelocity:velocity,requiredCalibrations:calibrations,reasons,manualReview:option.manualReview};
}
export function acceptSubstitution(workout:Workout,preview:SubstitutionPreview):Workout{
 const current=workout.targetRevisions.at(-1)?.prescriptions??workout.targetSnapshot;
 if(!current.some(p=>p.id===preview.original.id))throw Error('Original prescription is absent from target snapshot');
 return {...workout,targetRevisions:[...workout.targetRevisions,{id:crypto.randomUUID(),sessionId:workout.sessionId??'custom',prescriptions:current.map(p=>p.id===preview.original.id?preview.revised:p),reason:preview.reasons.join(' '),kind:'substitution',createdAt:new Date().toISOString()}],substitutions:[...workout.substitutions,{exerciseId:preview.original.id,original:preview.original.name,actual:preview.replacement.name,reason:preview.reasons.join(' ')}]};
}
