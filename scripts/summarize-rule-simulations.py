import json, hashlib
from pathlib import Path
from collections import Counter

rules=['basic','mega','dynamax','tera','chaos']
labels={'basic':'기본룰','mega':'메진룰','dynamax':'다맥룰','tera':'테라룰','chaos':'개판룰'}
stages=['fresh','mid','trained','collector']
reports={rule:json.loads(Path(f'artifacts/experiments/balance/simulation-rule-{rule}-balanced.json').read_text(encoding='utf-8')) for rule in rules}
source=Path('artifacts/experiments/balance/hundred-floor-six-z-courses.json')
source_hash=hashlib.sha256(source.read_bytes()).hexdigest()
source_ids={c['id'] for c in json.loads(source.read_text(encoding='utf-8'))['courses']}
summary={'source':str(source),'courseHash':source_hash,'samplesPerRuleStage':72,'totalClimbs':0,'totalBattles':0,'rows':[]}
chaos={s['stage']:s for s in reports['chaos']['stages']}
for rule,report in reports.items():
 assert report['rule']==rule and report['sourceCourseHash']==source_hash
 assert len(report['stages'])==4 and {s['stage'] for s in report['stages']}==set(stages)
 for stage in report['stages']:
  rows=stage['climbs']; assert len(rows)==72 and {c['id'] for c in rows}==source_ids
  for c in rows:
   assert c['battles']==c['cleared']+(0 if c['cleared']==100 else 1)
   assert c['coins']==c['earned']-c['spent'] and c['coins']>=0 and c['teraTickets']>=0
   assert all(v['floor']%10==0 for v in c['shops'])
   assert all(p['price']==0 for p in c['purchases'] if p['kind']=='reroll')
   if rule not in ['tera','chaos']:
    assert c['playerTera']==c['enemyTera']==c['teraTickets']==0
    assert all(p['kind']!='tera' for p in c['purchases'])
   if rule in ['basic','tera']:assert c['bossGimmickActivations']==c['playerGimmickActivations']==0
   if rule in ['basic','tera','dynamax']:assert all(not p['name'].endswith(('ite','ite X','ite Y')) for p in c['purchases'] if p['kind']=='item')
   if rule in ['basic','tera','mega']:assert all(p['name']!='Dynamax Band' for p in c['purchases'])
  reference={c['id']:c for c in chaos[stage['stage']]['climbs']}
  delta=[c['cleared']-reference[c['id']]['cleared'] for c in rows]
  result={'rule':rule,'stage':stage['stage'],'averageCleared':stage['averageCleared'],'passed10':stage['passed10'],'passed50':stage['passed50'],'finished':stage['finished'],'battleWinRate':stage['battleWinRate'],'battles':stage['battles'],'highestCleared':max(c['cleared'] for c in rows),'playerMegaDynamax':stage['playerGimmickActivations'] if 'playerGimmickActivations' in stage else sum(c['playerGimmickActivations'] for c in rows),'enemyMegaDynamax':sum(c['bossGimmickActivations'] for c in rows),'playerTera':stage['playerTera'],'enemyTera':stage['enemyTera'],'averageDeltaFromChaos':sum(delta)/72,'betterThanChaos':sum(d>0 for d in delta),'worseThanChaos':sum(d<0 for d in delta),'sameAsChaos':sum(d==0 for d in delta),'mostCommonFailureFloors':Counter(c.get('failedFloor') for c in rows if c.get('failedFloor')).most_common(5)}
  summary['rows'].append(result);summary['totalClimbs']+=72;summary['totalBattles']+=stage['battles']
old=json.loads(Path('artifacts/experiments/balance/simulation-current-six-z-balanced.json').read_text(encoding='utf-8'))
summary['chaosMatchesPrevious']={s['stage']:s['climbs']==chaos[s['stage']]['climbs'] for s in old['stages']}
assert all(summary['chaosMatchesPrevious'].values()),'Chaos comparison differs from previous baseline'
Path('artifacts/experiments/balance/rule-comparison-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(summary,ensure_ascii=False,indent=2))
