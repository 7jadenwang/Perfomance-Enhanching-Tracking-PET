import {it,expect} from 'vitest';
import {program} from '../src/program/catalog';
import {initialState} from '../src/domain/schema';
import {createWorkout} from '../src/domain/records';
import {rankSubstitutions,previewSubstitution,acceptSubstitution} from '../src/program/substitutions';
const original={...program.sessions.find(s=>s.id==='July-W1D1')!.exercises[3],movementId:'back-squat'};
const context=()=>({state:initialState(),date:'2026-10-13',replacementLoadPercent:[65,75] as [number,number],rangeOfMotion:'full',method:'device',metric:'meanConcentric' as const});
it('does not copy weight or velocity references to another exercise',()=>{
 const c=context();c.state.reference1RMs=[{exerciseId:'back-squat',date:'2026-10-12',kg:150}];
 const p=previewSubstitution(original,'front-squat',c);expect(p.targetKg).toBeNull();expect(p.targetVelocity).toBeNull();
 expect(p.requiredCalibrations).toContain('replacement-specific load reference');
 expect(original.name).toBe('杠铃后蹲');
});
it('uses only a dated replacement reference and explicit matching velocity calibration',()=>{
 const c=context();c.state.reference1RMs=[{exerciseId:'front-squat',date:'2026-10-12',kg:100}];
 const p=previewSubstitution(original,'front-squat',c);expect(p.targetKg).toEqual([65,75]);
 c.state.velocityProfiles=[{exerciseId:'front-squat',date:'2026-10-12',rangeOfMotion:'full',method:'device',metric:'meanConcentric',loadPercent:[65,75],target:[.6,.7]}];
 expect(previewSubstitution(original,'front-squat',c).targetVelocity).toEqual([.6,.7]);
});
it('retains original snapshots and performed rows after accepting a substitution',()=>{
 const workout=createWorkout({targetSnapshot:[original]});
 const next=acceptSubstitution(workout,previewSubstitution(original,'front-squat',context()));
 expect(next.targetSnapshot).toEqual(workout.targetSnapshot);expect(next.rows).toEqual(workout.rows);
 expect(next.targetRevisions.at(-1)?.prescriptions[0].name).toBe('前蹲');
});
it('filters unavailable equipment and does not replace jumps with novel depth work or cardio with maximal sprinting',()=>{
 const c=context();c.state.equipment.extra={barbell:'unavailable'};
 expect(rankSubstitutions(original,c).some(x=>x.movement.id==='front-squat')).toBe(false);
 const aerobic={...original,kind:'conditioning' as const,purpose:'generalAerobic' as const,movementId:'rowing'};
 const running=previewSubstitution(aerobic,'easy-run',c);
 expect(running.revised.distanceMetres).toBeNull();expect(running.revised.purpose).toBe('generalAerobic');
 expect(running.reasons.join(' ')).toContain('No distance');
});
