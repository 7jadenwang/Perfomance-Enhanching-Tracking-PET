import json,re,pathlib
records=json.load(open('/tmp/pet-ocr.json')); sessions={}; manifest=[]
# Correct recurring OCR errors; remaining uncertain text stays visibly flagged.
replacements={'提中':'提踵','深足':'深蹲','前足':'前蹲','后足':'后蹲','1TRM':'1RM','IRM':'1RM','静足跳':'静蹲跳','杠铃潘德雷':'杠铃潘德雷','股二':'股二','雪要':'雪橇','雪概':'雪橇','和氧':'氧','体息':'休息','躁关节':'踝关节','髋骨':'胫骨','肩腥':'肩胛','哑铃卧扒':'哑铃卧推','负和荷':'负荷'}
for r in records:
 p=r['path']; month=pathlib.Path(p).parent.name; m=re.search(r'W(\d)D(\d)',p); key=f'{month}-W{m[1]}D{m[2]}'
 text=r['text']
 for a,b in replacements.items():text=text.replace(a,b)
 lines=text.splitlines(); lines=[l.strip() for l in lines if l.strip() and not re.search(r'次学习|铁牛|铁后|铁盾|训练计划|训练内容|^2026-|^详情|^[<>@三刹鲍借欠全]|^[—\s]+$',l)]
 text='\n'.join(lines)
 if p.endswith('April_W1D1.jpg'):text='膝上垫铃高抓\n6组 × 2次 85% 1RM\n目标 MV≥1.35 m/s\n\n1/4 深蹲\n1-5-1-5 共四组\n1次105% 1RM → 5次85% 1RM\n1次目标MV 0.25–0.35 m/s；5次目标MV≥0.65 m/s\n\n重负荷六角杠铃跳跃\n5组 × 5次 30%–40% 深蹲1RM\n目标MV 0.95–1.15 m/s\n\n克服性（单腿）等长提踵 4组 × 6秒极限发力\n弹力带快速髂腰肌提拉 3组 × 15次/侧\n杠铃片勾脚尖 3组 × 20次\n哑铃单腿RDL等长停顿 3组 × 8次\n\n能量系统\n10秒全速单车/冲刺 + 4次CMJ，执行10轮，间歇20秒'
 if p.endswith('May_W1D1.jpg'):text='90/90髋关节转换 2组 × 每侧8次\n死虫式带弹力带抗伸展 2组 × 每侧10次\n踝关节弹跳 3组 × 15次（触地时间越短越好）\n\n坐姿药球胸前推掷\n4组 × 5次（每次100%全力）\n\n侧向滑冰跳带落地稳定\n3组 × 每侧4次\n\n箱式深蹲\n4组 × 5次，70–75%深蹲1RM，RIR2\n节奏：3-1-X-1（3秒离心，箱上静止1秒，最快速度站起，顶端停顿1秒）'
 if key not in sessions:sessions[key]={'id':key,'month':month,'blockIndex':['April','May','June'].index(month),'week':int(m[1]),'day':int(m[2]),'optional':'Optional' in p,'sourceText':'','sources':[],'exercises':[]}
 s=sessions[key];s['sources'].append(p)
 supporting='_Sheet' in p
 if not supporting:s['sourceText']+=('\n\n' if s['sourceText'] else '')+text
 manifest.append({'path':p,'sessionId':key,'supporting':supporting,'review':'image-inspected; OCR uncertain fields flagged'})
for s in sessions.values():
 # Keep whole prescription blocks for complex waves/clusters; never invent their set totals.
 chunks=re.split(r'\n\s*\n',s['sourceText'])
 if len(chunks)==1:chunks=[s['sourceText']]
 for i,chunk in enumerate(chunks):
  lines=chunk.splitlines(); name=lines[0][:100]; sets=re.search(r'(\d+)\s*组\s*[x×X]\s*(\d+)(?:\s*[-–]\s*(\d+))?\s*次',chunk)
  kind='hold' if '等长' in name or '支撑' in name else 'conditioning' if any(x in name for x in ['划船机','自行车','能量系统','代谢','间歇']) else 'sprint' if '冲刺' in name or '加速跑' in name else 'jump' if any(x in name for x in ['跳','Pogo','CMJ']) else 'throw' if '抛' in name or '掷' in name else 'strength'
  s['exercises'].append({'id':s['id']+f'-{i+1}','name':name,'sourceText':chunk,'kind':kind,'sets':[int(sets[1]),int(sets[1])] if sets else None,'reps':[int(sets[2]),int(sets[3] or sets[2])] if sets else None,'perSide':bool(re.search(r'/侧|每侧|每一侧',chunk)),'loadPercent':None,'referenceExerciseId':None,'tempo':(re.search(r'\d[-:]\d[-:][xX\d][-:]\d',chunk) or [''])[0] or None,'velocityTarget':None,'velocityMetric':None,'restSeconds':None,'holdSeconds':None,'distanceMetres':None,'workSeconds':None,'rounds':None,'optional':'有条件' in chunk or '选做' in chunk,'groupId':None,'ambiguity':'Check original image before applying targets. Complex wave/cluster and OCR fields remain unconfirmed.','purpose':'conditioning' if kind=='conditioning' else 'other'})
sessions=sorted(sessions.values(),key=lambda s:(s['blockIndex'],s['week'],s['day']))
data={'version':'april-june-v1','sourceCommit':'6e89e968fffe011c76eccb2f697237572eacdf8a','sources':[r['path'] for r in records],'sessions':sessions}
pathlib.Path('src/program/catalog.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))
pathlib.Path('src/program/source-manifest.json').write_text(json.dumps({'sourceCommit':data['sourceCommit'],'entries':manifest},ensure_ascii=False,indent=2))
print(len(records),'source images;',len(sessions),'sessions')
