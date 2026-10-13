import {it,expect} from 'vitest';
import {reconcile} from '../src/sync/reconcile';
import {stateToDocuments} from '../src/sync/documents';
import {initialState} from '../src/domain/schema';
import {createMorning,createWorkout} from '../src/domain/records';
import {identity} from '../src/sync/types';
it('merges independent records while detecting two creations for one morning',()=>{
 const s=initialState(),base=stateToDocuments(s).map(d=>({...d,revision:1}));const l=stateToDocuments({...s,workouts:[createWorkout({id:'local'})]}),r=stateToDocuments({...s,mornings:[createMorning({id:'remote'})]}).map(d=>({...d,revision:1}));
 const pending=l.filter(d=>!base.some(b=>identity(b)===identity(d))).map(d=>({...d,baseRevision:0,generation:1}));const result=reconcile(base,l,r,pending);expect(result.conflicts).toHaveLength(0);expect(result.documents.filter(d=>['morning','workout'].includes(d.kind))).toHaveLength(2);
 const localMorning=stateToDocuments({...s,mornings:[createMorning({id:'independent-local'})]}).find(d=>d.kind==='morning')!;
 expect(reconcile(base,[...base,localMorning],r,[{...localMorning,baseRevision:0,generation:1}]).conflicts).toHaveLength(1);
});
it('preserves update versus deletion instead of resurrecting a tombstone',()=>{
 const s={...initialState(),workouts:[createWorkout({id:'x'})]},base=stateToDocuments(s).map(d=>({...d,revision:1})),work=base.find(d=>d.kind==='workout')!;
 const local={...work,payload:{...s.workouts[0],notes:'offline edit'}},remote={...work,revision:2,payload:null,deleted:true};
 const result=reconcile(base,[...base.filter(d=>d.kind!=='workout'),local],[...base.filter(d=>d.kind!=='workout'),remote],[{...local,baseRevision:1,generation:1}]);expect(result.conflicts[0].remote?.deleted).toBe(true);expect(result.conflicts[0].local.payload).toEqual(local.payload);
});
