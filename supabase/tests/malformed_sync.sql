\set ON_ERROR_STOP on
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
do $$begin
 begin
  perform public.pet_sync_commit('30000000-0000-0000-0000-000000000001','[{"kind":"schedule","key":"schedule","baseRevision":0,"schemaVersion":2,"catalogueVersion":"lp-up-v2","payload":{},"deleted":false}]');
 exception when others then return;end;
 raise exception 'Malformed schedule was accepted';
end$$;
rollback;
