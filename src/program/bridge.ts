import type {AthleteState,Enrollment,Program,Prescription} from '../domain/schema';
import {scheduledSessions} from './enrollments';
import {movementFor} from './movements';
import {addDays} from './schedule';
import {summarizeExposure} from '../metrics/exposure';
export function buildBridge(state:AthleteState,enrollment:Enrollment,catalog:Program):NonNullable<Enrollment['bridge']>{
 const start=enrollment.startDate,end=addDays(start,6),id=crypto.randomUUID();
 const familiar=new Set([...state.familiarity,...summarizeExposure(state.workouts).movements]);
 const sessions=scheduledSessions(enrollment,catalog).filter(p=>p.date<=end).flatMap(({session,date})=>{
  const prescriptions=session.exercises.filter(p=>{const m=movementFor(p);return !p.optional&&!p.conditionalGroup&&p.kind!=='other'&&(!!m&&((m.skill!=='technical'&&m.demand!=='high')||familiar.has(m.id)));}).map((p):Prescription=>({...p,sets:p.sets?[p.sets[0],p.sets[0]]:null,loadPercent:p.loadPercent?[p.loadPercent[0],p.loadPercent[0]]:null,restSeconds:p.restSeconds?[p.restSeconds[1],p.restSeconds[1]]:null}));
  return prescriptions.length?[{sessionId:`bridge-${id}-${session.id}`,sourceSessionId:session.id,date,prescriptions}]:[];
 });
 if(!sessions.length)throw Error('No reviewed bridge available; collect data or plan with your coach');
 return {id,startDate:start,endDate:end,sessions};
}
