import {identity,same,type SyncDocument,type OutboxMutation,type SyncConflict} from './types';
export function reconcile(base:SyncDocument[],local:SyncDocument[],remote:SyncDocument[],pending:OutboxMutation[]){
 const documents:SyncDocument[]=[],pushes:OutboxMutation[]=[],conflicts:SyncConflict[]=[];
 const ids=new Set([...base,...local,...remote,...pending].map(identity));
 for(const id of ids){
  const b=base.find(d=>identity(d)===id)??null,r=remote.find(d=>identity(d)===id)??null,p=pending.find(d=>identity(d)===id),l=p??local.find(d=>identity(d)===id)??null;
  const changedRemote=(r?.revision??0)!==(b?.revision??0)||!same(r,b);
  if(p&&changedRemote&&!same(l,r)){
   conflicts.push({identity:id,base:b,local:p,remote:r});documents.push(p);
  }else if(p&&!same(p,r)){
   pushes.push({...p,baseRevision:r?.revision??0});documents.push(p);
  }else if(r)documents.push(r);
 }
 return {documents,pushes,conflicts};
}
