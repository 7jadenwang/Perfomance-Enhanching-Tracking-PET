\set ON_ERROR_STOP on
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select public.pet_sync_commit('10000000-0000-0000-0000-000000000001', '[{"kind":"schedule","key":"schedule","baseRevision":0,"schemaVersion":2,"catalogueVersion":"lp-up-v2","payload":{"enrollments":[]},"deleted":false}]');
do $$begin
 if jsonb_array_length(public.pet_sync_snapshot())<>1 then raise exception 'snapshot missing own document';end if;
 if (public.pet_sync_commit('10000000-0000-0000-0000-000000000001', '[{"kind":"schedule","key":"schedule","baseRevision":0,"schemaVersion":2,"catalogueVersion":"lp-up-v2","payload":{"enrollments":[]},"deleted":false}]')->>'status')<>'acknowledged' then raise exception 'replay did not acknowledge';end if;
 if (public.pet_sync_snapshot()->0->>'revision')::int<>1 then raise exception 'replay incremented revision';end if;
 if (public.pet_sync_commit('10000000-0000-0000-0000-000000000002','[{"kind":"schedule","key":"schedule","baseRevision":0,"schemaVersion":2,"catalogueVersion":"lp-up-v2","payload":{"enrollments":[]},"deleted":false},{"kind":"activity","key":"2026-10-13","baseRevision":0,"schemaVersion":2,"catalogueVersion":"lp-up-v2","payload":{"localDate":"2026-10-13","status":"rest"},"deleted":false}]')->>'status')<>'conflict' then raise exception 'stale edit accepted';end if;
 if jsonb_array_length(public.pet_sync_snapshot())<>1 then raise exception 'batch partially committed';end if;
 begin insert into public.pet_documents(owner_id,kind,key,revision,schema_version,catalogue_version,payload,deleted) values(auth.uid(),'workout','forbidden',1,2,'lp-up-v2','{}',false);raise exception 'direct writes allowed';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$begin
 if jsonb_array_length(public.pet_sync_snapshot())<>0 then raise exception 'cross account RPC leak';end if;
 if exists(select from public.pet_documents) then raise exception 'cross account table leak';end if;
end$$;
select public.pet_sync_commit('20000000-0000-0000-0000-000000000001','[{"owner_id":"00000000-0000-0000-0000-000000000001","kind":"activity","key":"2026-10-13","baseRevision":0,"schemaVersion":2,"catalogueVersion":"lp-up-v2","payload":{"localDate":"2026-10-13","status":"rest"},"deleted":false}]');
select public.pet_sync_commit('20000000-0000-0000-0000-000000000002','[{"kind":"activity","key":"2026-10-13","baseRevision":1,"schemaVersion":2,"catalogueVersion":"lp-up-v2","payload":null,"deleted":true}]');
do $$begin if public.pet_sync_snapshot()->0->>'deleted'<>'true' then raise exception 'tombstone missing';end if;end$$;
select set_config('request.jwt.claim.sub','',true);
do $$begin
 begin perform public.pet_sync_snapshot();raise exception 'unauthenticated RPC allowed';exception when insufficient_privilege then null;end;
 if exists(select from public.pet_documents) then raise exception 'unauthenticated table leak';end if;
end$$;
rollback;
