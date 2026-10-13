import {it,expect} from 'vitest';
import {program} from '../src/program/catalog';
import {initialState} from '../src/domain/schema';
import {createWorkout,createRow} from '../src/domain/records';
import {plannedDose,programDoseSeries,summarizeExposure} from '../src/metrics/exposure';
it('visualizes all source weeks before logging without inventing session RPE',()=>{
 const weeks=programDoseSeries('lp',initialState(),program);expect(weeks).toHaveLength(12);
 expect(weeks[0].planned.strengthReps![0]).toBeGreaterThan(0);expect(weeks[0].actual).toBeNull();
 expect(programDoseSeries('up',initialState(),program)).toHaveLength(8);
});
it('retains weight sets rest cluster velocity and energy work as separate dose dimensions',()=>{
 const cluster=program.sessions.find(s=>s.id==='July-W2D2')!.exercises[3];
 const d=plannedDose([cluster],initialState(),'2026-10-13');expect(d.strengthReps).toEqual([30,30]);expect(d.relativeIntensity).toEqual([82,85]);
 expect(d.restSeconds).toEqual([180,180]);expect(d.clusterRestSeconds).toEqual([20,20]);expect(d.kgReps).toBeNull();
 const cardio=program.sessions.find(s=>s.id==='July-W1D2')!.exercises.find(p=>p.kind==='conditioning')!;
 const conditioning=plannedDose([cardio],initialState(),'2026-10-13');expect(conditioning.conditioningWorkSeconds).toEqual([200,240]);expect(conditioning.workRestRatio).toEqual([.5,.5]);
});
it('excludes drafts and keeps jump demand and lift load distinct',()=>{
 const work=createWorkout({status:'completed',rows:[createRow({exerciseId:'Pogo Jump',name:'Pogo Jump',kind:'jump',reps:10,confirmed:true}),createRow({exerciseId:'后蹲',name:'后蹲',kind:'strength',reps:5,loadKg:100,confirmed:true})]});
 const e=summarizeExposure([work,createWorkout({rows:[createRow({confirmed:true,reps:999})]})]);
 expect(e.jumpContacts.low).toBe(10);expect(e.kgReps).toBe(500);expect(e.strengthReps).toBe(5);
});
