import {it,expect,beforeEach} from 'vitest';
import 'fake-indexeddb/auto';
import {initialState} from '../src/domain/schema';
import {createMorning} from '../src/domain/records';
import {program} from '../src/program/catalog';
import {movementLibrary} from '../src/program/movements';
import {adviseTransfer,buildTransferPreview,acceptTransferPreview} from '../src/metrics/transfer';
import {db,loadState,saveMorning} from '../src/storage/db';
beforeEach(async()=>{await db.state.clear()});
it('prioritizes pain or illness rather than certifying a safe workload band',()=>{
 const s=initialState();s.mornings=[createMorning({illness:true})];
 const advice=adviseTransfer(s,'up','2026-10-13',program,movementLibrary);
 expect(advice.status).toBe('defer');expect(advice.reasons.join(' ')).toContain('illness');
});
it('shows insufficiency for unlogged days and never matches source week numbers automatically',()=>{
 const advice=adviseTransfer(initialState(),'up','2026-10-13',program,movementLibrary);
 expect(advice.status).toBe('insufficient');expect(advice.missing).toContain('Complete 28-day actual load history');
 expect(advice.candidates[0].entrySessionId.startsWith('July')).toBe(true);
});
it('high fatigue generates a recovery concern with its actual signal',()=>{
 const s=initialState();s.mornings=[createMorning({fatigue:5})];
 expect(adviseTransfer(s,'lp','2026-10-13',program,movementLibrary).status).toBe('recoveryConcern');
});
it('rejects a stale preview after a new morning and leaves scheduling unchanged',async()=>{
 const s=await loadState();const advice=adviseTransfer(s,'up','2026-10-13',program,movementLibrary);
 const preview=buildTransferPreview(s,advice,'July-W1D1','2026-10-13',false);
 await saveMorning(createMorning());await expect(acceptTransferPreview(preview)).rejects.toThrow('Transfer preview is stale');
 expect((await loadState()).enrollments).toHaveLength(0);
});
