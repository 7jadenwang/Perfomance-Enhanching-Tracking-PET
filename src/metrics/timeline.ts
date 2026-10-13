import type {AthleteState,LocalDate,MorningRecord} from '../domain/schema';
import {addDays} from '../program/schedule';
import {scheduledSessions} from '../program/enrollments';
import {program} from '../program/catalog';
import {sessionLoad} from './load';
export type DailyPoint={date:LocalDate;actualAu:number|null;plannedAu:number|null;knownActualAu:number;actualCoverage:number;actualCount:number;conflict:boolean;filtered:boolean;mornings:MorningRecord[];markers:string[]};
export function buildTimeline(state:AthleteState,range:{start:LocalDate;end:LocalDate},filter?:{enrollmentId?:string;programId?:string}):DailyPoint[]{
 const points:DailyPoint[]=[];
 for(let date=range.start;date<=range.end;date=addDays(date,1)){
  const all=state.workouts.filter(w=>w.localDate===date&&['completed','partial'].includes(w.status));
  const own=all.filter(w=>(!filter?.enrollmentId||w.enrollmentId===filter.enrollmentId)&&(!filter?.programId||state.enrollments.some(e=>e.id===w.enrollmentId&&e.programId===filter.programId)));
  const loads=own.map(w=>sessionLoad(w.actualDuration,w.actualRpe));
  const activity=state.activities.find(a=>a.localDate===date),conflict=activity?.status==='rest'&&all.length>0;
  const scheduled=state.enrollments.filter(e=>e.status==='active'&&(!filter?.enrollmentId||e.id===filter.enrollmentId)&&(!filter?.programId||e.programId===filter.programId)).flatMap(e=>scheduledSessions(e,program).filter(p=>p.date===date).map(p=>({e,session:p.session})));
  const planned=scheduled.map(({e,session})=>state.workouts.find(w=>w.enrollmentId===e.id&&w.sessionId===session.id&&w.localDate===date)).map(w=>w?sessionLoad(w.plannedDuration,w.plannedRpe):null);
  const restKnown=activity?.status==='rest'&&all.length===0;
  points.push({date,actualAu:own.length&&loads.every(v=>v!==null)?loads.reduce<number>((a,v)=>a+v!,0):restKnown?0:null,plannedAu:planned.length&&planned.every(v=>v!==null)?planned.reduce<number>((a,v)=>a+v!,0):null,knownActualAu:loads.reduce<number>((a,v)=>a+(v??0),0),actualCoverage:loads.filter(v=>v!==null).length,actualCount:own.length,conflict:!!conflict,filtered:!!filter,mornings:state.mornings.filter(m=>m.localDate===date),markers:state.enrollments.flatMap(e=>e.events.filter(ev=>ev.date===date).map(ev=>`${e.programId.toUpperCase()} ${ev.type}`))});
 }
 return points;
}
export function rollingLoad(points:DailyPoint[],days:7|28){return points.map((p,i)=>{const window=points.slice(Math.max(0,i-days+1),i+1),complete=window.length===days&&window.every((v,index)=>v.actualAu!==null&&!v.conflict&&(index===0||v.date===addDays(window[index-1].date,1)));return {date:p.date,meanAu:complete?window.reduce((a,v)=>a+v.actualAu!,0)/days:null,knownDays:window.filter(v=>v.actualAu!==null&&!v.conflict).length};});}
