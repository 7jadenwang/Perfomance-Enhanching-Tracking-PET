import {it,expect} from 'vitest';
import {velocityRuleSchema} from '../src/domain/schema';
import {createVelocity} from '../src/domain/records';
import {evaluateVelocityRule} from '../src/program/velocity-rules';
import {compatibleVelocity} from '../src/metrics/velocity';
const rule=velocityRuleSchema.parse({sourceText:'source bands',metric:'meanConcentric',lossReference:'fastestAny',floor:[.4,.4],bands:[{loss:[10,15],action:'reduce',reduceKg:2.5},{loss:[15,20],action:'stopSet',reduceKg:5,extraRestSeconds:30},{loss:[20,100],action:'stopExercise',lowerInclusive:false}]});
const measurement=(reps:number[])=>createVelocity({metric:'meanConcentric',repVelocities:reps,completeSeries:true});
it('evaluates an intermediate floor even when the final rep recovered',()=>{
 const result=evaluateVelocityRule(rule,measurement([.5,.35,.48]));expect(result.actions).toContain('stopSet');
});
it('requires a complete series for loss and marks the overlapping 15% band ambiguous',()=>{
 expect(evaluateVelocityRule(rule,{...measurement([1,.85]),completeSeries:false}).observedLoss).toBeNull();
 expect(evaluateVelocityRule(rule,measurement([1,.85])).ambiguous).toBe(true);
 expect(evaluateVelocityRule(rule,measurement([1,.83])).actions).toContain('stopSet');
});
it('does not pool component or metric definitions',()=>{
 expect(compatibleVelocity(measurement([1]),{...measurement([1]),componentId:'jerk'})).toBe(false);
 expect(evaluateVelocityRule({...rule,componentId:'clean'}, {...measurement([1,.8]),componentId:'jerk'}).actions).toEqual([]);
 expect(evaluateVelocityRule(rule,createVelocity({metric:'mean',repVelocities:[1,.7],completeSeries:true})).actions).toEqual([]);
});
