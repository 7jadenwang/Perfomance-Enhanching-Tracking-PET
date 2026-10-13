import {it,expect} from 'vitest';
import {initialState} from '../src/domain/schema';
import {createWorkout} from '../src/domain/records';
import {buildTimeline,rollingLoad} from '../src/metrics/timeline';
it('leaves unknown dates as gaps and requires full rolling-window coverage',()=>{
 const s=initialState();s.activities=[{localDate:'2026-10-13',status:'rest',notes:''}];
 const points=buildTimeline(s,{start:'2026-10-12',end:'2026-10-18'});
 expect(points[0].actualAu).toBeNull();expect(points[1].actualAu).toBe(0);
 expect(rollingLoad(points,7).at(-1)?.meanAu).toBeNull();
 s.activities=points.map(p=>({localDate:p.date,status:'rest' as const,notes:''}));
 expect(rollingLoad(buildTimeline(s,{start:'2026-10-12',end:'2026-10-18'}),7).at(-1)?.meanAu).toBe(0);
});
it('counts all physical work and refuses contradictory rest to hide missing load',()=>{
 const s=initialState();s.activities=[{localDate:'2026-10-13',status:'rest',notes:''}];
 s.workouts=[createWorkout({status:'partial',actualDuration:50,actualRpe:6}),createWorkout({status:'completed',actualDuration:30,actualRpe:null})];
 const [day]=buildTimeline(s,{start:'2026-10-13',end:'2026-10-13'});
 expect(day.knownActualAu).toBe(300);expect(day.actualAu).toBeNull();expect(day.conflict).toBe(true);
});
