import {beforeEach,it,expect} from 'vitest';
import 'fake-indexeddb/auto';
import {db,setStorageNamespace,linkAccount,getSyncMeta,loadState,saveMorning} from '../src/storage/db';
import {createMorning} from '../src/domain/records';
import {syncOnce} from '../src/sync/engine';
import {identity,type SyncDocument,type SyncTransport,type OutboxMutation,type CommitResult} from '../src/sync/types';
class Server implements SyncTransport{
 docs:SyncDocument[]=[];requests=new Map<string,CommitResult>();drop=false;during:(()=>Promise<void>)|null=null;
 async snapshot(){return structuredClone(this.docs)}
 async commit(id:string,changes:OutboxMutation[]):Promise<CommitResult>{
  const previous=this.requests.get(id);if(previous)return previous;
  const conflicts=changes.filter(d=>(this.docs.find(x=>identity(x)===identity(d))?.revision??0)!==d.baseRevision).map(d=>({kind:d.kind,key:d.key,remote:this.docs.find(x=>identity(x)===identity(d))??null}));if(conflicts.length)return {status:'conflict',conflicts};
  const documents=changes.map(d=>({...d,revision:d.baseRevision+1}));this.docs=[...this.docs.filter(d=>!documents.some(x=>identity(x)===identity(d))),...documents];const result:CommitResult={status:'acknowledged',documents};this.requests.set(id,result);if(this.during){const callback=this.during;this.during=null;await callback()}if(this.drop){this.drop=false;throw Error('lost acknowledgement')}return result;
 }
}
beforeEach(async()=>{await db.state.clear();await db.sync.clear();await setStorageNamespace('account:a');await linkAccount([],null)});
it('retries the identical lost acknowledgement without another server revision',async()=>{
 const server=new Server();server.drop=true;expect(await syncOnce('account:a',server)).toBe('failed');expect((await getSyncMeta()).inflight).not.toBeNull();expect(await syncOnce('account:a',server)).toBe('synced');expect(server.docs.every(d=>d.revision===1)).toBe(true);expect((await getSyncMeta()).pending).toHaveLength(0);
});
it('keeps an edit during an older acknowledgement pending',async()=>{
 const server=new Server(),r=createMorning({id:'m',sleepHours:6});await saveMorning(r);server.during=()=>saveMorning({...r,sleepHours:8});await syncOnce('account:a',server);expect((await getSyncMeta()).pending.find(d=>d.kind==='morning')?.payload).toMatchObject({sleepHours:8});expect(await syncOnce('account:a',server)).toBe('synced');expect(server.docs.find(d=>d.kind==='morning')?.payload).toMatchObject({sleepHours:8});
});
it('invalid snapshots preserve the validated cache and pending queue',async()=>{
 const before=await loadState(),pending=(await getSyncMeta()).pending;const server=new Server();server.docs=[{kind:'configuration',key:'configuration',revision:1,payload:{bad:true},deleted:false,schemaVersion:2,catalogueVersion:'lp-up-v2'}];expect(await syncOnce('account:a',server)).toBe('failed');expect(await loadState()).toEqual(before);expect((await getSyncMeta()).pending).toEqual(pending);
});
it('requires explicit same-record resolution and exports both variants',async()=>{
 const server=new Server();const r=createMorning({id:'m',sleepHours:6});await saveMorning(r);await syncOnce('account:a',server);
 const d=server.docs.find(d=>d.kind==='morning')!;server.docs=server.docs.map(x=>x===d?{...d,revision:2,payload:{...r,sleepHours:7}}:x);await saveMorning({...r,sleepHours:8});
 expect(await syncOnce('account:a',server)).toBe('conflict');const meta=await getSyncMeta();expect(meta.conflicts[0].local.payload).toMatchObject({sleepHours:8});expect(meta.conflicts[0].remote?.payload).toMatchObject({sleepHours:7});
 const {resolveConflict}=await import('../src/sync/engine');await resolveConflict('account:a',meta.conflicts[0].identity,'remote',server);expect((await loadState()).mornings[0].sleepHours).toBe(7);expect((await getSyncMeta()).resolvedConflicts).toHaveLength(1);
});
it('coordinates simultaneous sync requests and reports authentication failure',async()=>{
 const server=new Server();const statuses=await Promise.all([syncOnce('account:a',server),syncOnce('account:a',server)]);expect(statuses).toContain('syncing');expect(statuses).toContain('synced');
 const failure={snapshot:async()=>{const e=new Error('expired');e.name='AuthRequired';throw e},commit:server.commit.bind(server)};expect(await syncOnce('account:a',failure)).toBe('authRequired');
});
