import {it,expect,beforeEach} from 'vitest';
import 'fake-indexeddb/auto';
import {initialState as legacyState} from '../src/domain/legacy-v1';
import {makeWorkout,makeRow,makeVelocity} from '../src/domain/fixtures';
import {program} from '../src/program/catalog';
import {migrateState} from '../src/storage/migrate';
import {db,loadState,exportRawStoredBackup} from '../src/storage/db';
import {previewBackup} from '../src/storage/backup';
beforeEach(async()=>{await db.state.clear()});
const legacy=()=>({...legacyState(),startDate:'2026-10-13',workouts:[makeWorkout({id:'old',localDate:'2026-10-13',status:'partial',rows:[makeRow({velocity:makeVelocity({metric:'mean'})})]})]});
it('migrates v1 preserving dates IDs measurements and source snapshots',()=>{
 const state=migrateState(legacy(),program);
 expect(state.schemaVersion).toBe(2);expect(state.workouts[0].id).toBe('old');expect(state.workouts[0].localDate).toBe('2026-10-13');
 expect(state.workouts[0].rows[0].velocity?.metric).toBe('mean');
 expect(state.workouts[0].enrollmentId).toBe('legacy-lp-v1');expect(state.workouts[0].targetSnapshot.length).toBeGreaterThan(0);
 expect(state.startDate).toBe('2026-10-13');expect(state.enrollments[0].startDate).toBe('2026-10-19');
 expect(migrateState(state,program)).toEqual(state);expect(previewBackup(JSON.stringify(legacy())).counts.workouts).toBe(1);
});
it('leaves custom work unattributed and keeps old explicit rescheduling',()=>{
 const input=legacy();input.workouts[0].sessionId='custom';input.reschedules={'April-W1D2':'2026-10-22'};
 const state=migrateState(input,program);expect(state.workouts[0].enrollmentId).toBeNull();expect(state.enrollments[0].reschedules['April-W1D2']).toBe('2026-10-22');
});
it('atomically migrates stored data but keeps invalid records raw-exportable',async()=>{
 await db.state.put({id:'athlete',value:legacy() as never});expect((await loadState()).schemaVersion).toBe(2);
 const invalid={...legacy(),schemaVersion:99};await db.state.put({id:'athlete',value:invalid as never});
 await expect(loadState()).rejects.toThrow();expect(JSON.parse(await exportRawStoredBackup())).toEqual(invalid);
 expect((await db.state.get('athlete'))?.value.schemaVersion).toBe(99);
});
