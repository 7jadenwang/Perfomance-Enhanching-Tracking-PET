-- Run once in the Supabase SQL editor (or supabase db push).
create table public.pet_documents (
 owner_id uuid not null, kind text not null check(kind in ('configuration','schedule','workout','morning','activity')),
 key text not null check(length(key) between 1 and 240), revision bigint not null check(revision>0),
 schema_version integer not null check(schema_version=2), catalogue_version text not null check(catalogue_version='lp-up-v2'),
 payload jsonb, deleted boolean not null default false, updated_at timestamptz not null default now(), primary key(owner_id,kind,key)
);
create table public.pet_requests(owner_id uuid not null,request_id uuid not null,changes jsonb not null,result jsonb not null,primary key(owner_id,request_id));
alter table public.pet_documents enable row level security;
alter table public.pet_requests enable row level security;
create policy pet_owner_read on public.pet_documents for select to authenticated using(owner_id=auth.uid());
revoke all on public.pet_documents, public.pet_requests from anon,authenticated;
grant select on public.pet_documents to authenticated;
create function public.pet_doc_json(d public.pet_documents) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('kind',d.kind,'key',d.key,'revision',d.revision,'schemaVersion',d.schema_version,'catalogueVersion',d.catalogue_version,'payload',d.payload,'deleted',d.deleted)
$$;
revoke all on function public.pet_doc_json(public.pet_documents) from public;
create function public.pet_sync_snapshot() returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();result jsonb;
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,0));
 select coalesce(jsonb_agg(public.pet_doc_json(d) order by d.kind,d.key),'[]'::jsonb) into result from public.pet_documents d where d.owner_id=uid;
 return result;
end$$;
create function public.pet_sync_commit(request_id uuid,changes jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();prior public.pet_requests; c jsonb; d public.pet_documents;conflicts jsonb:='[]';ack jsonb:='[]';result jsonb;seen text[]:='{}';identity text;expected bigint;active_count integer;queued_count integer;
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501';end if;
 if request_id is null or jsonb_typeof(changes) is distinct from 'array' or jsonb_array_length(changes) not between 1 and 2000 or octet_length(changes::text)>12000000 then raise exception 'Invalid batch';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,0));
 select * into prior from public.pet_requests r where r.owner_id=uid and r.request_id=pet_sync_commit.request_id;
 if found then
  if prior.changes<>changes then raise exception 'Request ID reused with different payload';end if;
  return prior.result;
 end if;
 for c in select value from jsonb_array_elements(changes) loop
  if not(c ?& array['kind','key','baseRevision','schemaVersion','catalogueVersion','payload','deleted']) or c->>'kind' not in ('configuration','schedule','workout','morning','activity') or length(c->>'key') not between 1 and 240 or c->>'schemaVersion'<>'2' or c->>'catalogueVersion'<>'lp-up-v2' or jsonb_typeof(c->'deleted') is distinct from 'boolean' or (c->>'baseRevision')!~'^[0-9]+$' or ((c->>'deleted')::boolean=false and jsonb_typeof(c->'payload') is distinct from 'object') then raise exception 'Invalid document';end if;
  if c->>'kind' in ('configuration','schedule') and c->>'key'<>c->>'kind' then raise exception 'Invalid aggregate key';end if;
  if c->>'kind' in ('configuration','schedule') and (c->>'deleted')::boolean then raise exception 'Required aggregate cannot be deleted';end if;
  identity:=(c->>'kind')||'|'||(c->>'key');if identity=any(seen) then raise exception 'Duplicate document in batch';end if;seen:=array_append(seen,identity);
  expected:=(c->>'baseRevision')::bigint;
  select * into d from public.pet_documents x where x.owner_id=uid and x.kind=c->>'kind' and x.key=c->>'key';
  if coalesce(d.revision,0)<>expected then conflicts:=conflicts||jsonb_build_array(jsonb_build_object('kind',c->>'kind','key',c->>'key','remote',case when d.revision is null then 'null'::jsonb else public.pet_doc_json(d) end));end if;
  if c->>'kind'='schedule' and not(c->>'deleted')::boolean then
   if jsonb_typeof(c->'payload'->'enrollments') is distinct from 'array' then raise exception 'Invalid schedule';end if;
   select count(*) filter(where e->>'status'='active'),count(*) filter(where e->>'status'='queued') into active_count,queued_count from jsonb_array_elements(c->'payload'->'enrollments') e;
   if active_count>1 or queued_count>1 then raise exception 'Only one active/queued enrollment allowed';end if;
  end if;
 end loop;
 if jsonb_array_length(conflicts)>0 then return jsonb_build_object('status','conflict','conflicts',conflicts);end if;
 for c in select value from jsonb_array_elements(changes) loop
  insert into public.pet_documents(owner_id,kind,key,revision,schema_version,catalogue_version,payload,deleted) values(uid,c->>'kind',c->>'key',(c->>'baseRevision')::bigint+1,2,'lp-up-v2',case when (c->>'deleted')::boolean then null else c->'payload' end,(c->>'deleted')::boolean)
  on conflict(owner_id,kind,key) do update set revision=excluded.revision,payload=excluded.payload,deleted=excluded.deleted,updated_at=now() returning * into d;
  ack:=ack||jsonb_build_array(public.pet_doc_json(d));
 end loop;
 result:=jsonb_build_object('status','acknowledged','documents',ack);
 insert into public.pet_requests values(uid,request_id,changes,result);
 return result;
end$$;
revoke all on function public.pet_sync_snapshot(),public.pet_sync_commit(uuid,jsonb) from public,anon;
grant execute on function public.pet_sync_snapshot(),public.pet_sync_commit(uuid,jsonb) to authenticated;
