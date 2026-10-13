import {createClient} from '@supabase/supabase-js';
import type {SyncTransport,CommitResult} from './types';
import {validateDocuments} from './documents';
export function validClientConfig(url:string|undefined,key:string|undefined):boolean{
 if(!url||!key||!key.startsWith('sb_publishable_'))return false;
 try{const u=new URL(url);return u.protocol==='https:'||(u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname));}catch{return false;}
}
const env=(import.meta as ImportMeta & {env?:Record<string,string|undefined>}).env;
export const syncClient=validClientConfig(env?.VITE_SUPABASE_URL,env?.VITE_SUPABASE_PUBLISHABLE_KEY)?createClient(env!.VITE_SUPABASE_URL!,env!.VITE_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
export function supabaseTransport(expectedUserId:string):SyncTransport{
 if(!syncClient)throw Error('Supabase sync is not configured');
 // Pin the identity/token to this transport. Account switches cannot retarget an old outbox.
 const session=syncClient.auth.getSession().then(({data,error})=>{if(error||!data.session||data.session.user.id!==expectedUserId){const e=new Error('Sign in again');e.name='AuthRequired';throw e;}return data.session;});
 const rpc=async(name:string,args:Record<string,unknown>={})=>{
  const pinned=await session,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{
   const response=await fetch(env!.VITE_SUPABASE_URL+'/rest/v1/rpc/'+name,{method:'POST',headers:{'Content-Type':'application/json',apikey:env!.VITE_SUPABASE_PUBLISHABLE_KEY!,Authorization:'Bearer '+pinned.access_token},body:JSON.stringify(args),signal:controller.signal});
   if(!response.ok){const e=new Error('Sync request failed ('+response.status+')');e.name=[401,403].includes(response.status)?'AuthRequired':'SyncError';throw e;}
   return await response.json();
  }finally{clearTimeout(timer)}
 };
 return {async snapshot(){const docs=await rpc('pet_sync_snapshot');if(!Array.isArray(docs))throw Error('Invalid server snapshot');validateDocuments(docs);return docs},async commit(requestId,changes){return await rpc('pet_sync_commit',{request_id:requestId,changes:changes.map(({generation,revision,...d})=>d)}) as CommitResult}};
}
