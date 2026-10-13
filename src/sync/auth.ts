import {syncClient} from './client';
export async function authenticate(mode:'signIn'|'signUp'|'reset'|'password',email:string,password:string){
 if(!syncClient)throw Error('Supabase sync is not configured');
 const redirect=window.location.origin;
 const response=mode==='signIn'?await syncClient.auth.signInWithPassword({email,password}):mode==='signUp'?await syncClient.auth.signUp({email,password,options:{emailRedirectTo:redirect}}):mode==='reset'?await syncClient.auth.resetPasswordForEmail(email,{redirectTo:redirect}):await syncClient.auth.updateUser({password});
 if(response.error)throw response.error;
}
export async function signOut(){if(syncClient){const {error}=await syncClient.auth.signOut({scope:'local'});if(error)throw error;}}
