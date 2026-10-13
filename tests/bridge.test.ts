import {it,expect} from 'vitest';
import {initialState} from '../src/domain/schema';
import {program} from '../src/program/catalog';
import {movementLibrary} from '../src/program/movements';
import {adviseTransfer,buildTransferPreview} from '../src/metrics/transfer';
it('keeps bridge work distinct from source completion and never invents precise replacement velocity',()=>{
 const s=initialState();s.familiarity=movementLibrary.map(m=>m.id);
 const advice=adviseTransfer(s,'up','2026-10-13',program,movementLibrary);
 const preview=buildTransferPreview(s,advice,'July-W1D1','2026-10-13',true);
 expect(preview.enrollment.bridge?.sessions.length).toBeGreaterThan(0);
 expect(preview.enrollment.skippedSessionIds).toEqual([]);
 expect(preview.enrollment.entrySessionId).toBe('July-W1D1');
 expect(preview.enrollment.bridge?.sessions.every(s=>s.sessionId.startsWith('bridge-'))).toBe(true);
});
