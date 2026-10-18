import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';

const root=process.env.THEME_BALANCE_OUTPUT??'artifacts/experiments/balance/named-selection-20261018';
const json=path=>JSON.parse(readFileSync(path,'utf8'));
const jsonl=path=>readFileSync(path,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const before=json(`${root}/before-report.json`),after=json(`${root}/after-report.json`);
const rows={before:jsonl(`${root}/before-battles.jsonl`),after:jsonl(`${root}/after-battles.jsonl`)};
const outcomes=new Map(jsonl(`${root}/outcomes.jsonl`).map(r=>[r.key,r]));
const manifests={before:json(`${root}/before-manifest.json`),after:json(`${root}/after-manifest.json`)};
const source=json('scripts/data/npc/normal-npc-samples.json'),baseline=json(`${root}/before-source.json`);
assert.deepEqual(source.samples.map(({selectionRules,...rest})=>rest),baseline.samples,'Only selection metadata may change reviewed builds.');
assert.equal(before.total.errors+after.total.errors,0);
const rowKey=r=>[r.theme,r.floor,r.kind,r.caseId,r.rule,r.n].join(':');
const previous=new Map(jsonl('artifacts/experiments/balance/johto-expansion-20261018/after-battles.jsonl').map(r=>[rowKey(r),r]));
for(const r of rows.before){const old=previous.get(rowKey(r));assert.ok(old);assert.equal(r.key,old.key);assert.equal(r.winner,old.winner);}
const bands=['1-50','51-100'],themes={kanto:'관동',johto:'성도',hoenn:'호연',sinnoh:'신오',unova:'하나',kalos:'칼로스',alola:'알로라',galar:'가라르',paldea:'팔데아'};
const pct=n=>n===null?'—':`${(100*n).toFixed(2)}%`,pp=n=>`${n>=0?'+':''}${(100*n).toFixed(2)}%p`;
const table=(headers,body)=>['| '+headers.join(' | ')+' |','| '+headers.map(()=> '---').join(' | ')+' |',...body.map(row=>'| '+row.join(' | ')+' |')].join('\n');
const summary=group=>({n:group.length,wins:group.filter(r=>r.winner==='Player').length,rate:group.length?group.filter(r=>r.winner==='Player').length/group.length:null});
const regular=phase=>rows[phase].filter(r=>r.kind==='named');
const groups=(list,key)=>Object.entries(Object.groupBy(list,key));
const namedStats=Object.fromEntries(['before','after'].map(phase=>[phase,groups(regular(phase),r=>`${r.npcId}:${r.band}`).map(([key,r])=>({key,id:r[0].npcId,name:r[0].name,band:r[0].band,...summary(r)}))]));
const npcComparison=namedStats.after.map(r=>({...r,before:namedStats.before.find(old=>old.key===r.key).rate,delta:r.rate-namedStats.before.find(old=>old.key===r.key).rate}));
const ruleNames=rules=>Object.entries(rules??{}).map(([key,names])=>`${key}: ${names.join('/')}`).join('; ')||'—';
const review=groups(source.samples,r=>r.id).map(([id,templates])=>{
 const members=templates.flatMap(r=>r.team),moves=members.flatMap(p=>p.profile.moves);
 const concepts=[
  members.some(p=>['Drizzle','Drought','Sand Stream','Snow Warning'].includes(p.profile.ability))?'weather':null,
  members.some(p=>p.profile.ability==='Toxic Debris')||moves.some(m=>['Stealth Rock','Spikes','Toxic Spikes','Sticky Web'].includes(m))?'hazard':null,
  moves.some(m=>['Toxic','Thunder Wave','Will-O-Wisp','Yawn','Glare','Hypnosis'].includes(m))?'status':null,
  moves.some(m=>['Swords Dance','Dragon Dance','Nasty Plot','Calm Mind','Quiver Dance','Bulk Up','Shell Smash'].includes(m))?'setup':null,
  moves.some(m=>['U-turn','Volt Switch','Flip Turn'].includes(m))?'pivot':null,
  moves.some(m=>['Recover','Roost','Slack Off','Rest','Milk Drink','Moonlight','Soft-Boiled'].includes(m))?'bulk/recovery':null,
  moves.includes('Trick Room')?'trick room':null,
 ].filter(Boolean);
 const rules=templates.filter(r=>r.selectionRules).map(r=>({stage:r.allFloors?'all':r.stage,rules:r.selectionRules}));
 let reason=rules.length?'실제 역할에 한정한 선출/배치 규칙':templates.some(r=>r.select)?'기존 필수 에이스와 시드 변화 유지; 추가 필수 역할 근거 없음':'고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지';
 if(id==='named-jasmine')reason='Steelix+Skarmory+Bronzong 배제, 공격 동료 보장; Spikes 미사용 확인 후 선봉 강제는 제외';
 if(id==='named-pryce')reason='Snow Warning 보유자를 선출했을 때만 선봉; 필수 선출은 상성/후보 다양성 악화로 제외';
 if(id==='named-bugsy'||id==='named-chuck')reason='후반 약화는 조합·상성·행동·기믹을 함께 관찰; 조합 규칙으로 해결된다는 근거 없어 유지';
 if(id==='named-wallace-gym')reason='실제 풀에 Drizzle/Rain Dance가 없어 비 파티를 가정하지 않음';
 if(id==='named-geeta')reason='Toxic Debris 선봉과 Sucker Punch/강화 마무리 분리; 에이스 자동 마지막의 반례';
 if(['named-lance','named-cynthia'].includes(id))reason='기존 드래곤 에이스의 마무리 전술/보스 연출; 다른 두 슬롯의 시드 순서는 유지';
 if(id==='named-wallace')reason='기존 회복/지속력 Milotic을 마무리 선호; 비 시동자를 새로 가정하지 않음';
 if(id==='named-barry')reason='실제 Stealth Rock 담당 Empoleon을 선봉으로 이동';
 if(rules.length&&members.some(p=>['Drizzle','Drought','Sand Stream','Snow Warning'].includes(p.profile.ability))&&id!=='named-pryce')reason='기존 날씨 특성 시동자를 선봉으로 이동; 고정 3마리이므로 선출 강제 추가 불필요';
 return {id,name:templates[0].name,role:templates[0].role,templates:templates.length,pools:templates.map(r=>({stage:r.allFloors?'all':r.stage,species:r.team.map(p=>p.species)})),concepts,rules,reason};
});
const lineups={};
for(const phase of ['before','after']){
 const seen=new Set(),entries=[];
 for(const m of manifests[phase].manifest){
  if(m.foe.kind!=='named')continue;
  const key=[m.theme,m.floor,m.n].join(':');if(seen.has(key))continue;seen.add(key);
  const team=Showdown.Teams.unpack(m.foe.packed).map(p=>p.species);
  entries.push({id:m.foe.npcId,name:m.foe.name,floor:m.floor,band:m.floor<=50?'1-50':'51-100',n:m.n,team});
 }
 lineups[phase]=groups(entries,r=>r.id+':'+r.band).map(([key,group])=>({key,id:group[0].id,name:group[0].name,band:group[0].band,n:group.length,combinations:groups(group,r=>[...r.team].sort().join('/')).map(([team,rows])=>({team,n:rows.length})).sort((a,b)=>b.n-a.n),leads:Object.fromEntries(groups(group,r=>r.team[0]).map(([name,r])=>[name,r.length])),lasts:Object.fromEntries(groups(group,r=>r.team[2]).map(([name,r])=>[name,r.length]))}));
}
const placement=[];
for(const phase of ['before','after'])for(const m of manifests[phase].manifest){
 if(m.rule!=='basic'||m.foe.kind!=='named')continue;
 const team=Showdown.Teams.unpack(m.foe.packed).map(p=>p.species);
 const template=source.samples.find(r=>r.id===m.foe.npcId&&(r.allFloors||r.stage===(m.floor<=50?(m.floor===50?'first-gate':'leaders-early'):(m.floor===100?'final-gate':'leaders-late'))));
 if(!template?.selectionRules)continue;
 for(const [kind,slot] of [['preferredLead',0],['preferredLast',2]]){
  const wanted=template.selectionRules[kind]?.find(name=>team.includes(name));if(wanted)placement.push({phase,id:m.foe.npcId,name:m.foe.name,kind,wanted,success:team[slot]===wanted});
 }
}
const placements=groups(placement,r=>[r.phase,r.id,r.kind].join(':')).map(([key,group])=>({key,...group[0],n:group.length,successes:group.filter(r=>r.success).length}));
assert.ok(placements.filter(r=>r.phase==='after').every(r=>r.n===r.successes));
const gimmicks=[];
for(const phase of ['before','after'])for(const row of regular(phase)){
 const data=outcomes.get(row.key)?.telemetry;assert.ok(data,`Missing telemetry: ${row.key}`);
 for(const available of data.available){const used=data.used.find(u=>u.kind===available.kind&&u.species===available.species);gimmicks.push({phase,id:row.npcId,name:row.name,band:row.band,caseId:row.caseId,rule:row.rule,winner:row.winner,...available,used:!!used,...(used?{turn:used.turn,hp:used.hp,targetHP:used.targetHP}:{})});}
}
const gimmickStats=(list,key)=>groups(list,key).map(([key,r])=>{
 const used=r.filter(r=>r.used),unused=r.filter(r=>!r.used),hp=used.filter(r=>r.hp!==null);
 return {key,available:r.length,used:used.length,usage:used.length/r.length,firstTurn:used.filter(r=>r.turn===1).length,turn:used.length?used.reduce((s,r)=>s+r.turn,0)/used.length:null,hp:hp.length?hp.reduce((s,r)=>s+r.hp,0)/hp.length:null,playerWinWhenUsed:summary(used).rate,playerWinWhenUnused:summary(unused).rate,lowTargetHP:used.filter(r=>r.targetHP!==null&&r.targetHP<=.25).length,carriers:Object.fromEntries(groups(r,x=>x.species).map(([species,r])=>[species,r.length]))};
});
const gimmickByNpc=gimmickStats(gimmicks,r=>[r.phase,r.id,r.band,r.kind].join(':'));
const gimmickTotals=gimmickStats(gimmicks,r=>[r.phase,r.kind].join(':'));
const at=(phase,theme,band)=>({before,after}[phase]).byTheme.find(r=>r.theme===theme&&r.band===band);
const transition=(old,current)=>`${pct(old)} → ${pct(current)}`;
const globalTable=part=>table(['테마','1–50층 이전 → 이후','51–100층 이전 → 이후'],Object.entries(themes).map(([id,name])=>[name,...bands.map(band=>transition(at('before',id,band)[part].rate,at('after',id,band)[part].rate))]));
const selectionDoc=[
 '# 네임드 선출·배치 규칙',
 '',
 '`trainer-catalog → reviewed samples → runtime export → npc-templates → opponent-team → npc-ai/policy` 경로를 유지한다. 신규 필드는 검토 원본 `scripts/data/npc/normal-npc-samples.json`의 `selectionRules`이며, 기존 최상위 `required`는 저장된 정의 및 기존 파일럿과의 호환을 위해 그대로 지원한다.',
 '',
 '```ts',
 'selectionRules?: { required?: string[]; atLeastOneOf?: string[]; preferredLead?: string[]; preferredLast?: string[] }',
 '```',
 '',
 '- `required`: 에이스·기믹 carrier·기존 required와 합쳐 반드시 포함한다.',
 '- `atLeastOneOf`: 지정한 단일 후보군에서 최소 한 마리를 포함한다. 빈 배열은 오류다.',
 '- `preferredLead` / `preferredLast`: 이미 선출된 멤버만 이동한다. 배열 앞쪽이 우선순위다. 선출 확률이나 멤버를 바꾸지 않는다. 한 종을 두 배치 목록에 동시에 넣으면 오류다.',
 '- 후보 조합 열거 → 필수 조건으로 가능한 조합 제한 → 기존 품질 가중치와 시드로 선출 → 기존 시드 셔플 → 선봉 이동 → 마지막 이동 순서다. 배치 규칙이 없으면 추가 난수를 소비하지 않는다.',
 '- 후보에 없는 종, 중복/빈 목록, 알 수 없는 필드, 에이스·carrier를 합쳐 3마리를 넘는 필수 조건, 만족 불가능한 선택군을 원본 export와 런타임 로드 시 모두 거절한다. 최종 팀도 조건을 검증한다.',
 '- preferredLast는 시작 팀의 세 번째 슬롯이다. 전투 중 AI의 교체·강제 교체로 실제 마지막 출전이 달라질 수 있다. 이를 막는 새 AI 규칙은 넣지 않았다.',
 '- 기존 packed 팀은 수정하거나 재생성하지 않는다. retry는 기존 packed/seed/순서를 복사하고, reconnect와 replay는 저장된 스냅샷을 사용한다.',
 '',
 `## 적용 목록 (${review.filter(r=>r.rules.length).length}개 ID / ${source.samples.filter(r=>r.selectionRules).length}개 템플릿)`,
 '',
 table(['NPC / ID','stage','규칙','이유'],review.filter(r=>r.rules.length).flatMap(r=>r.rules.map(x=>[`${r.name} / ${r.id}`,x.stage,ruleNames(x.rules),r.reason]))),
 '',
 '## 적용하지 않은 주요 사례',
 '',
 '- 비상·꼭두·이향·아폴로·비주기: 기존 필수 에이스와 후보 변화를 유지한다. 대표라는 이유만으로 마지막 슬롯을 지정하지 않는다.',
 '- 호일·사도: 승률 이상만으로 임의의 공격수 고정을 추가하지 않는다. 관측된 상성/기술/기믹 문제는 밸런스 보고서에 기록한다.',
 '- 윤진 관장: 실제 후보에 비 시동자가 없다. 왕구리·패리퍼를 새로 추가하거나 특성을 바꿔 비 파티로 만들지 않는다. 챔피언 윤진은 기존 회복/지속력 밀로틱을 마무리 선호로만 설정한다.',
 '- 민지의 코터스는 White Smoke, 비상의 패리퍼는 Keen Eye다. 종 이름만 보고 Drought/Drizzle 파티로 분류하지 않는다.',
 '- status/setup/pivot/bulk 포켓몬은 기술이 있다는 이유만으로 선봉/마지막을 지정하지 않는다. Trick Room 기술을 가진 검토 템플릿은 이번 점검에서 없었다.',
 '',
 '## 대사',
 '',
 '- 목호: “드래곤 조련사 목호! 자아, 간다!” — [한국어 대사 reference](https://d.namu.moe/w/목호).',
 '- 레드(성도): “……………… ………………” — [HGSS 전투 전 대사](https://bulbapedia.bulbagarden.net/wiki/Red_(game)/Quotes).',
 '- 레드(관동): “… …!” — 같은 reference의 레츠고 전투 전 대사.',
 '- 카렌의 “강한 포켓몬…”은 전투 후 대사여서 제외했다. 비주기 등 나머지 한국어 전투 전 원문/맥락은 이번 검토에서 unverified로 남겨 생략했다. 창작 문장을 넣지 않았다.',
 '- 기존 introduction 필드와 전투 시작 화면을 재사용한다. 빈 대사는 기존 등장 안내로 처리하며 새 대화 단계나 대기 시간을 추가하지 않는다.',
 '',
 '## 전체 검토 목록',
 '',
 `원본 ${source.samples.length}개 템플릿 / ${review.length}개 ID를 실제 기술·특성 기준으로 분류했다. 아래 분류는 컨셉의 존재를 나타내며 해당 AI가 성공적으로 운영한다는 뜻은 아니다. 조직 별칭·일반 조직원도 원본 범위에 포함한다.`,
 '',
 '<details><summary>전체 ID별 후보·컨셉·판단</summary>',
 '',
 table(['ID','이름','컨셉','규칙 여부','판단'],review.map(r=>[r.id,r.name,r.concepts.join(', ')||'직접 공격',r.rules.length?'적용':'유지',r.reason])),
 '',
 '</details>',
 ];
writeFileSync('docs/gameplay/named-trainer-selection-rules.md',selectionDoc.join('\n')+'\n');
const report=[
 '# 네임드 밸런스·기믹 점검 보고서',
 '',
 '2026-10-18. 모든 승률은 **플레이어 대리 AI의 단일 전투 승률**이다. 낮을수록 NPC가 강하다. 목표는 동일 승률 강제가 아니라 후보 조합 붕괴 방지와 실제 전투 역할의 작동이다.',
 '',
 '## A. 테스트 조건',
 '',
 '- 이전: 성도 9명 확장 완료 직후, selectionRules 도입 전의 보존된 런타임. 이후: 같은 빌드에 selectionRules만 추가. 원본 팀/기술/도구/특성/성격/육성은 구조 비교로 완전 동일함을 확인했다. 공통 AI는 수정하지 않았다.',
 `- 이전 ${rows.before.length.toLocaleString()}조건이 직전 성도 실험의 현재 결과와 팀·시드 입력 키 및 승패까지 동일함을 검증했다.`,
 '- 팀: 리자몽/거북왕/이상해꽃, 한카리아스/메타그로스/라프라스, 야도란/아머까오/트리토돈, 따라큐/짜랑고우거/갸라도스. 기본 기술배치 일부는 미완성이며 실제 초보/고수 사용자 평균을 뜻하지 않는다.',
 '- 육성: 레벨 50. 층별 IV/포인트 상한 적용(50층 IV12/8점, 51층 IV7/3점, 100층 IV31/66점). 55층부터 역할 성격. 11층부터 기본 소지품과 룰에 맞는 메가/Z/다이맥스 장비. 플레이어 테라 티켓 0장. 기술 습득 비용·상점·누적 피해·회복약은 제외.',
 '- 플레이어 ZMovePolicy, NPC 현재 v11 Basic/Tactical/Expert와 실제 해금 경로. 4개 경로/전투 시드 × 4팀 × 6룰 × 50층 = 테마·구간당 4,800조건(네임드 960, 일반 3,840). basic/mega/dynamax/tera/chaos/z 동일 가중치.',
 '- 1~100층 독립 전투. 두 번째 챕터 셔플 적용. 히든 보스는 별도 보존하고 정규 표에서 제외. 일반 NPC와 동일 입력은 캐시 공유하므로 모든 조건을 독립 표본으로 간주하지 않는다. 실제 사용자 승률·연속 돌파율·인과적 기믹 효과는 추정하지 않는다.',
 `- 오류 ${before.total.errors+after.total.errors}건. 기존 캐시와 별개로 기믹 telemetry가 없는 네임드는 재실행했다. 각 phase manifest에 실제 packed 팀/로드 데이터 해시/엔진 정보를 보존했다.`,
 '',
 '## B. 테마별 승률',
 '',
 '전체 층:',
 '',globalTable('all'),
 '', '네임드전만:', '',globalTable('named'),
 '', '룰별 전체 승률:', '',
 table(['테마','구간','룰','이전 → 이후'],after.byRule.map(r=>[themes[r.theme],r.band,r.rule,transition(before.byRule.find(b=>b.theme===r.theme&&b.band===r.band&&b.rule===r.rule).rate,r.rate)])),
 '', '## C. NPC별 승률', '',
 `정규 경로에서 관측된 ${new Set(npcComparison.map(r=>r.id)).size}개 네임드를 표시한다. 기존 데이터 전체의 검토와 전투 표본의 범위는 다르다. 조직 이벤트 NPC 등 이번 정규 경로에 등장하지 않은 대상은 수치를 만들어 넣지 않았다.`, '',
 table(['NPC / ID','구간','전투 수','이전','이후','변화'],npcComparison.map(r=>[`${r.name} / ${r.id}`,r.band,r.n,pct(r.before),pct(r.rate),pp(r.delta)])),
 '', '## D. 선출 조합 품질', '',
 '각 경로·층·시드를 한 번씩 세고 플레이어 팀/룰로 반복된 동일 선출은 중복 제거했다. 원시 JSON에는 모든 조합·선봉·마지막 빈도를 보존한다. 표의 대표 조합은 최빈 조합이며 동률이면 관측 순서다.', '',
 '규리의 Steelix+Skarmory+Bronzong은 총 6개 생성 조건 중 1회→0회다. 전투 조건으로는 24회→0회이며, 서로 독립된 24개 선출을 의미하지 않는다. 별도 256개 층/시드 검증에서도 공격 동료 조건과 후보/순서 변화가 유지됐다.', '',
 table(['NPC','구간','생성 조건','이전 최빈 조합(횟수)','이후 최빈 조합(횟수)','규칙'],lineups.after.map(r=>{const old=lineups.before.find(x=>x.key===r.key),rule=review.find(x=>x.id===r.id);return [r.name,r.band,r.n,`${old.combinations[0].team} (${old.combinations[0].n})`,`${r.combinations[0].team} (${r.combinations[0].n})`,rule?.rules.length?'적용':'유지'];})),
 '', '## E. Lead / Last 분석', '',
 '성공률은 선출된 preferred 종이 시작 팀의 해당 슬롯에 있는 비율이다. 전투 중 교체를 제한하지 않는다. 원시 lineups JSON에는 모든 NPC의 종별 빈도가 있다.', '',
 table(['NPC','규칙','이전 성공/해당 조건','이후 성공/해당 조건'],placements.filter(r=>r.phase==='after').map(r=>{const old=placements.find(x=>x.phase==='before'&&x.id===r.id&&x.kind===r.kind);return [r.name,r.kind,old?`${old.successes}/${old.n}`:'미선출',`${r.successes}/${r.n}`];})),
 '', '## F. 기믹 사용 분석', '',
 '가능 횟수는 해당 전투의 실제 선발 팀/장비/티켓에 기믹이 존재한 조건 수다. 사용은 선택 명령이 아니라 엔진의 Mega/Z/Dynamax/Tera 발동 로그로 확인했다. HP는 발동 직전 공개 HP 비율(반올림 포함)이다. 미사용에는 carrier가 나오기 전 종료되거나 행동 전에 쓰러진 경우도 포함한다.', '',
 table(['phase / 기믹','가능','사용','사용률','평균 발동 턴','평균 HP','사용 시 플레이어 승률','미사용 시 플레이어 승률'],gimmickTotals.map(r=>[r.key,r.available,r.used,pct(r.usage),r.turn?.toFixed(2)??'—',pct(r.hp),pct(r.playerWinWhenUsed),pct(r.playerWinWhenUnused)])),
 '', '발동 여부에 따른 승률 차이는 상황 선택의 영향을 받으므로 기믹의 효과라고 해석하지 않는다. Z 사용 시 상대 HP≤25%도 기록했으나 무효·낭비 판정은 별도 로그 검토가 필요하다. Primal은 정규 표본에 없다.', '',
 '관찰: Mega/Tera/Dynamax 사용률은 약 97%지만 Z는 47.34%다. Z의 낮은 사용률을 전부 낭비/지연으로 단정하지 않는다. 실제 Z 발동 1,511회 중 상대 HP≤25%는 5회였다. Dynamax는 1,301회 중 전투 1턴 발동이 300회여서 전투 시작 즉시 무조건 사용한 결과는 아니다. NPC별 passive carrier 문제는 종별 표와 실제 사용 기술을 함께 확인해야 한다.', '',
 '공통 정책의 한계: 현재 Mega는 선택한 공격에 가능하면 즉시 붙이고, Tera는 선택 공격의 추정 피해가 양수이면 발동한다. Tera 전후 방어/공격 이득을 직접 비교하는 정책은 아니다. 공개 발동 시점만으로 올바른 방어 테라였다고 판정하지 않았고, 이번 작업에서 공통 AI 변경은 하지 않았다.', '',
 table(['NPC / 구간 / 기믹 (이후)','가능','사용','사용률','평균 턴','평균 HP','carrier'],gimmickByNpc.filter(r=>r.key.startsWith('after:')).map(r=>[r.key.slice(6),r.available,r.used,pct(r.usage),r.turn?.toFixed(2)??'—',pct(r.hp),Object.keys(r.carriers).join('/') ])),
 '', '## G. 이상치와 원인 분류', '',
 '분류: A 후보 / B 조합 / C 순서 / D 기술 / E 도구 / F AI 활용 / G 기믹 / H 테스트 팀 상성。',
 '',
 '- 규리(B/C/F): 기존 Steelix+Skarmory+Bronzong 조합을 공격 동료 최소 1종 조건으로 금지한다. 초기 시험의 무장조 선봉 선호는 Spikes 실제 사용 0회였고 전반 플레이어 승률을 92.71%→98.96%로 올렸다. 선봉 선호를 제거하고 조합 제약만 남겼다. 강철 공통 약점과 기술/AI 문제까지 해결한다고 보지 않는다.',
 '- 류옹(B/C/H): 초기 시험은 눈설왕 필수+선봉으로 전반 플레이어 승률 60.42%→79.17%였다. Ice 팀 전체를 필수 날씨 파티로 취급하지 않고, 눈설왕을 선출한 경우에만 선봉 선호로 좁혔다. 이 중간 시험은 trial-forced-leads/에 보존했다.',
 '- 호일(D/F/H): 기존 확장 전 69.44%에서 확장 후 91.67%로 오른 후반 플레이어 승률을 이번 이전 기준으로 삼았다. 이번 후반 Mega는 72/72회 사용했다(평균 2.71턴). 칼춤 15회, 유턴 6회, 날개쉬기 8회 사용했으나 스타팅·공격 팀에는 각각 18/18회 패배했다. 실제 3개 생성 조건 모두 Pinsir를 포함했지만 이것만으로 후보 자체와 조합의 원인을 분리할 수 없다. 임의의 2번째 공격수를 고정하지 않았다.',
 '- 사도(E/F/G/H): 기존 확장 전 66.67%에서 확장 후 73.96%로 오른 후반 승률을 조사한다. Z는 39/96회(40.63%), 평균 4.08턴에 사용했고 그 39회에서 상대 HP≤25% 발동은 없었다. Waterium Z가 Poliwrath의 기본 Sitrus Berry를 대체하는 것은 확인되지만, 그 때문에 약해졌다는 인과 결론은 내리지 않는다. 별도 도구 제거/복원 대조 실험이 필요하다.',
 '- 재현 예: `before-named-chuck-85-offense.json`에서 한카리아스의 지진으로 강챙이 HP가 42%가 되고 냉동펀치를 사용한다. 까칠한피부 후 29%에서 다음 지진에 쓰러져 Z를 쓰지 못한다. 커버리지 선택·행동 순서·생존 문제가 섞여 있어 단순 Z 지연 버그로 처리하지 않았다.',
 '- status/setup/bulk는 기술을 썼다는 사실과 성공적으로 이득을 얻었다는 판단을 구분한다. traces에는 실제 공개 전투 로그와 NPC 판단 시점 HP/행동을 저장했다. 이번 작업에서 NPC ID에 따른 AI 분기나 스탯 보정은 추가하지 않았다.',
 '', '후반 규리/호일/사도의 팀별 승률과 실제 기술 사용:', '',
 ...['named-jasmine','named-bugsy','named-chuck'].map(id=>{
  const selected=regular('after').filter(r=>r.npcId===id&&r.band==='51-100'),moves=selected.flatMap(r=>outcomes.get(r.key).telemetry.moves);
  return [`### ${id}`,table(['팀','플레이어 승/전투','승률'],groups(selected,r=>r.caseId).map(([name,r])=>[name,`${summary(r).wins}/${r.length}`,pct(summary(r).rate)])),table(['실제 사용 기술','횟수'],groups(moves,r=>r.move).map(([move,r])=>[move,r.length]).sort((a,b)=>b[1]-a[1]))].join('\n\n');
 }),
 '', '## H. 다음 실험 backlog', '',
 '- Milk Drink, Moonlight, Roost/Slack Off, Rest/Sleep Talk: 회복 시점·실제 회복량·턴 손실.',
 '- U-turn/pivot: 교체 대상과 다음 대면, 루프·기회비용.',
 '- Tailwind, Yawn, Glare, Hypnosis, Reflect, Spikes/hazards: 성공 여부와 후속 수혜 턴.',
 '- setup timing: 능력 상승 후 실제 공격/생존 여부.',
 '- gimmick timing: Z 대상 HP/무효·분신·방어·폼 변화, Mega carrier 생존, Dynamax 공격 기여, Tera 실제 상성 변화.',
 '- 사도: Sitrus Berry/Waterium Z 대조 및 냉동펀치와 Z 선택의 생존 조건.',
 '- 호일: 같은 조합·선봉 고정 후 후보/기술/특성의 단일 변수 실험. 본 실험의 플레이어 불꽃/바위/비행 견제 편향 확인.',
 '- 플레이어 기술 완성도/육성/기믹 재고를 분리한 초급·중급·완성형 벤치마크. 경로 시드 확대 및 정규 등반 밖 조직/히든 보스 표본 확대.',
 '', '## I. 검증', '',
 ...(existsSync(`${root}/validation.json`)?json(`${root}/validation.json`).entries.map(line=>'- '+line):['- 실행 결과 확정 후 validation.json으로 갱신한다. 미실행 테스트를 통과로 간주하지 않는다.']),
 '', '## 원시 산출물과 재현', '',
 `실험 폴더: ${root}. comparison.json(NPC/조합/기믹/검토), gimmick-events.jsonl(발동 종·턴·HP·상대 HP·승자), outcomes.jsonl, before/after-battles.jsonl, manifests, traces를 보존한다. 기믹 JSON에는 사용/미사용 전투 승률을 모두 저장했다.`,
 'AI/엔진/전투 처리 자체를 수정한 실험은 반드시 새 THEME_BALANCE_OUTPUT 폴더에서 실행한다. 기존 캐시는 같은 팀·시드·설정에 대한 본 실험의 결과이며, 정책 소스가 달라진 뒤 자동으로 유효하다고 보장하지 않는다.',
 '', '```powershell',
 `$env:THEME_BALANCE_OUTPUT='${root}'`,
 "$env:THEME_BALANCE_TELEMETRY='1'",
 "$env:THEME_BALANCE_ALL_THEMES='1'",
 `$env:NPC_BALANCE_BASELINE='${root}/before-runtime.json'`,
 'node --import ./scripts/lib/npc-balance-baseline.mjs --import tsx scripts/simulate-johto-theme-comparison.ts --before',
 'Remove-Item Env:NPC_BALANCE_BASELINE',
 'node --import tsx scripts/simulate-johto-theme-comparison.ts',
 'node scripts/report-named-selection.mjs',
 '```',
 ];
writeFileSync('docs/gameplay/named-trainer-balance-report.md',report.join('\n')+'\n');
writeFileSync(`${root}/comparison.json`,JSON.stringify({npcComparison,lineups,placements,gimmickByNpc,gimmickTotals,review},null,2));
writeFileSync(`${root}/gimmick-events.jsonl`,gimmicks.map(r=>JSON.stringify(r)).join('\n')+'\n');
console.log(JSON.stringify({reviewed:review.length,applied:review.filter(r=>r.rules.length).length,johto:after.byTheme.filter(r=>r.theme==='johto'),gimmickTotals,focus:npcComparison.filter(r=>['named-jasmine','named-bugsy','named-chuck'].includes(r.id))},null,2));
