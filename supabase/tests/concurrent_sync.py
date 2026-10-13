"""Real concurrent PostgreSQL schedule commits; invoked by test-sync-sql.sh."""
import json, subprocess, sys
container=sys.argv[1]
uid='00000000-0000-0000-0000-000000000004'
def query(request,revision,enrollments):
 changes=json.dumps([dict(kind='schedule',key='schedule',baseRevision=revision,schemaVersion=2,catalogueVersion='lp-up-v2',payload=dict(enrollments=enrollments),deleted=False)])
 return f"set role authenticated;select set_config('request.jwt.claim.sub','{uid}',false);select public.pet_sync_commit('{request}','{changes}'::jsonb);"
def start(sql):
 return subprocess.Popen(['docker','exec','-i',container,'psql','-U','postgres','-tA','-v','ON_ERROR_STOP=1'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
def call(sql):
 p=start(sql);out,err=p.communicate(sql);assert p.returncode==0,err;return json.loads(out.strip().splitlines()[-1])
call(query('40000000-0000-0000-0000-000000000001',0,[]))
p1=start('');p2=start('')
p1.stdin.write(query('40000000-0000-0000-0000-000000000002',1,[dict(id='a',status='active')]));p1.stdin.close();p1.stdin=None
p2.stdin.write(query('40000000-0000-0000-0000-000000000003',1,[dict(id='b',status='active')]));p2.stdin.close();p2.stdin=None
results=[]
for p in [p1,p2]:
 out,err=p.communicate();assert p.returncode==0,err;results.append(json.loads(out.strip().splitlines()[-1])['status'])
assert sorted(results)==['acknowledged','conflict'],results
print('Concurrent schedule edits: one acknowledged, one conflict; no partial overwrite')
