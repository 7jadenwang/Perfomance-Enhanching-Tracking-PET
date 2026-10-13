import {createClient} from '@supabase/supabase-js';
import type {SyncTransport,CommitResult} from './types';
import {validateDocuments} from './documents';
export function validClientConfig(url:string|undefined,key:string|undefined):boolean{
 if(!url||!key||!key.startsWith('sb_publishable_'))return false;
 try{const u=new URL(url);return u.protocol==='https:'||(u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname));}catch{return false;}
}
const env=(import.meta as ImportMeta & {env?:Record<string,string|undefined>}).env;
export const syncClient=validClientConfig(env?.VITE_SUPABASE_URL,env?.VITE_SUPABASE_PUBLISHABLE_KEY)?createClient(env!.VITE_SUPABASE_URL!,env!.VITE_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
export function supabaseTransport():SyncTransport{
 if(!syncClient)throw Error('Supabase sync is not configured');const client=syncClient;
 const rpc=async(name:string,args?:Record<string,unknown>)=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const {data,error}=await client.rpc(name,args).abortSignal(controller.signal);if(error){const e=new Error(error.message);e.name=error.code==='42501'||error.code==='PGRST301'?'AuthRequired':'SyncError';throw e;}return data;}finally{clearTimeout(timer)}};
 return {async snapshot(){const docs=await rpc('pet_sync_snapshot');if(!Array.isArray(docs))throw Error('Invalid server snapshot');validateDocuments(docs);return docs},async commit(requestId,changes){return await rpc('pet_sync_commit',{request_id:requestId,changes:changes.map(({generation,revision,...d})=>d)}) as CommitResult}};
}
