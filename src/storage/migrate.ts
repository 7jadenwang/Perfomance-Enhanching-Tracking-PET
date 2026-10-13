import {parseState as parseLegacy} from '../domain/legacy-v1';
import {parseState,type AthleteState,type Program} from '../domain/schema';
import {createEnrollment} from '../program/enrollments';
export function migrateState(input:unknown,catalog:Program):AthleteState{
 if(input&&typeof input==='object'&&'schemaVersion' in input&&input.schemaVersion===1){
  const old=parseLegacy(input);
  const enrollment=createEnrollment('lp','April-W1D1',old.startDate);
  enrollment.id='legacy-lp-v1';enrollment.status='active';enrollment.reschedules={...old.reschedules};
  return parseState({...old,schemaVersion:2,programVersion:'lp-up-v2',enrollments:[enrollment],activities:[],familiarity:[],velocityProfiles:[],workouts:old.workouts.map(w=>{
   const source=catalog.sessions.find(s=>s.id===w.sessionId&&s.programId==='lp');
   return {...w,enrollmentId:source?enrollment.id:null,targetSnapshot:source?.exercises??[],targetRevisions:[]};
  })});
 }
 return parseState(input);
}
