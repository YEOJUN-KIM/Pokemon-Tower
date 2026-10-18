import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {towerThemes} from '../src/data/tower-themes.ts';
import {namedTrainerSamples} from '../src/data/trainer-catalog.ts';
import {npcAi} from '../src/data/npc-ai.ts';
import {pokemonName} from '../src/data/pokemon-catalog.ts';
import {itemName} from '../src/data/held-items.ts';
import {moveInfo} from '../src/data/move-info.ts';
import {satisfiesSelectionRules} from '../src/data/npc-selection-rules.ts';

const root=process.env.THEME_BALANCE_OUTPUT??'artifacts/experiments/balance/kanto-completion-20261018';
// Generate reviewable artifacts first. Updating tracked docs is an explicit opt-in.
const documentOutput=process.env.NPC_REPORT_DOCS_OUTPUT??`${root}/documents`;
mkdirSync(documentOutput,{recursive:true});
const json=p=>JSON.parse(readFileSync(p,'utf8')),jsonl=p=>readFileSync(p,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const config=towerThemes.kanto,ids=[...config.gyms,...config.elites,config.champion,config.final];
const source=json('scripts/data/npc/normal-npc-samples.json'),oldSource=json(`${root}/before-source.json`);
const before=json(`${root}/before-report.json`),first=json(`${root}/first-pass/after-report.json`),after=json(`${root}/after-report.json`);
const rows={before:jsonl(`${root}/before-battles.jsonl`),first:jsonl(`${root}/first-pass/after-battles.jsonl`),after:jsonl(`${root}/after-battles.jsonl`)};
const manifests={before:json(`${root}/before-manifest.json`),after:json(`${root}/after-manifest.json`)};
const cache=new Map(jsonl(`${root}/outcomes.jsonl`).map(r=>[r.key,r]));
const reviews=json(`${root}/design-review.json`),bands=['1-50','51-100'];
const regular=r=>r.kind!=='hidden',named=r=>r.kind==='named'||r.kind==='hidden';
const pct=n=>n===null?'—':`${(100*n).toFixed(2)}%`,pp=n=>`${n>=0?'+':''}${(100*n).toFixed(2)}%p`;
const group=(r,key)=>Object.entries(Object.groupBy(r,key));
const stats=r=>({n:r.length,wins:r.filter(x=>x.winner==='Player').length,rate:r.length?r.filter(x=>x.winner==='Player').length/r.length:null});
const count=(r,key)=>Object.fromEntries(group(r,key).map(([k,r])=>[k,r.length]));
const table=(headers,body)=>['| '+headers.join(' | ')+' |','| '+headers.map(()=> '---').join(' | ')+' |',...body.map(row=>'| '+row.join(' | ')+' |')].join('\n');
const label=id=>namedTrainerSamples.find(s=>s.id===id)?.name??id;
const summaryNpc=(phase,id,band)=>stats(rows[phase].filter(r=>r.npcId===id&&r.band===band));
for(const phase of ['before','first','after']){
 assert.equal(rows[phase].length,9792);assert.ok(rows[phase].every(r=>r.theme==='kanto'&&!r.error));
}
assert.deepEqual(source.samples.filter(r=>!ids.includes(r.id)),oldSource.samples.filter(r=>!ids.includes(r.id)),'Non-Kanto reviewed data must be unchanged.');
const prior=new Map(jsonl('artifacts/experiments/balance/named-selection-20261018/after-battles.jsonl').filter(r=>r.theme==='kanto').map(r=>[[r.floor,r.kind,r.caseId,r.rule,r.n].join(':'),r]));
for(const r of rows.before){const old=prior.get([r.floor,r.kind,r.caseId,r.rule,r.n].join(':'));assert.equal(r.key,old.key);assert.equal(r.winner,old.winner);}
const npc=ids.flatMap(id=>bands.map(band=>({id,name:label(id),band,kind:id===config.final?'hidden':'named',before:summaryNpc('before',id,band),first:summaryNpc('first',id,band),after:summaryNpc('after',id,band)})));
const lineups={};const successes=[];
for(const phase of ['before','after']){
 const seen=new Set(),entries=[];
 for(const m of manifests[phase].manifest){
  if(!named(m.foe))continue;
  const key=[m.floor,m.n,m.foe.kind].join(':');if(seen.has(key))continue;seen.add(key);
  const team=Showdown.Teams.unpack(m.foe.packed).map(p=>p.species);
  entries.push({id:m.foe.npcId,band:m.floor<=50?'1-50':'51-100',floor:m.floor,n:m.n,kind:m.foe.kind,team});
  if(phase==='after'){
   const template=source.samples.find(r=>r.id===m.foe.npcId);
   assert.ok(team.includes(template.ace)&&team.includes(template.signature.species));assert.ok(satisfiesSelectionRules(team,template.selectionRules));
   successes.push({id:template.id,success:true,floor:m.floor,n:m.n,rules:template.selectionRules??null});
  }
 }
 lineups[phase]=group(entries,r=>`${r.id}:${r.band}`).map(([key,r])=>({key,id:r[0].id,band:r[0].band,n:r.length,combinations:group(r,x=>[...x.team].sort().join('/')).map(([team,r])=>({team,n:r.length})).sort((a,b)=>b.n-a.n),leads:count(r,x=>x.team[0]),lasts:count(r,x=>x.team[2])}));
}
const gimmickEvents=[];
for(const phase of ['before','after'])for(const row of rows[phase].filter(named)){
 const data=cache.get(row.key).telemetry;assert.ok(data,row.key);
 for(const available of data.available){
  const used=data.used.find(u=>u.kind===available.kind&&u.species===available.species);
  gimmickEvents.push({phase,id:row.npcId,name:row.name,band:row.band,encounterKind:row.kind,caseId:row.caseId,rule:row.rule,winner:row.winner,...available,used:!!used,carrierActed:data.moves.some(m=>m.species===available.species),carrierMoves:data.moves.filter(m=>m.species===available.species).map(m=>m.move),...(used?{turn:used.turn,hp:used.hp,targetHP:used.targetHP}:{})});
 }
}
function gimmickStats(list,key){return group(list,key).map(([key,r])=>{
 const used=r.filter(x=>x.used),unused=r.filter(x=>!x.used),hp=used.filter(x=>x.hp!==null);
 return {key,available:r.length,used:used.length,rate:used.length/r.length,turn:used.length?used.reduce((s,x)=>s+x.turn,0)/used.length:null,hp:hp.length?hp.reduce((s,x)=>s+x.hp,0)/hp.length:null,firstTurn:used.filter(x=>x.turn===1).length,lowTargetHP:used.filter(x=>x.targetHP!==null&&x.targetHP<=.25).length,unusedButActed:unused.filter(x=>x.carrierActed).length,unusedNoAction:unused.filter(x=>!x.carrierActed).length,playerWinUsed:stats(used).rate,playerWinUnused:stats(unused).rate,carriers:count(r,x=>x.species)};
 });}
const gimmicks=gimmickStats(gimmickEvents,r=>[r.phase,r.id,r.band,r.kind].join(':'));
const gimmickTotals=gimmickStats(gimmickEvents,r=>[r.phase,r.kind].join(':'));
const matrix=[];
for(const phase of ['before','after'])for(const [key,r] of group(rows[phase],r=>[r.npcId,r.band,r.kind,r.caseId,r.rule].join(':')))matrix.push({phase,key,id:r[0].npcId,band:r[0].band,kind:r[0].kind,team:r[0].caseId,rule:r[0].rule,...stats(r)});
const combinations=group(rows.after.filter(named),r=>[r.npcId,r.band,[...cache.get(r.key).telemetry.team].sort().join('/')].join(':')).map(([key,r])=>({key,...stats(r)}));
writeFileSync(`${root}/comparison.json`,JSON.stringify({npc,lineups,successes,gimmicks,gimmickTotals,matrix,combinations},null,2));
writeFileSync(`${root}/gimmick-events.jsonl`,gimmickEvents.map(r=>JSON.stringify(r)).join('\n')+'\n');
writeFileSync(`${root}/matrix.csv`,['phase,npc,band,encounter,team,rule,n,wins,player_win_rate',...matrix.map(r=>[r.phase,r.id,r.band,r.kind,r.team,r.rule,r.n,r.wins,r.rate].join(','))].join('\n')+'\n');

const pname=name=>`${pokemonName(name)} (${name})`,moves=p=>p.profile.moves.map(m=>moveInfo[m]?.name??m).join(' / ');
const role=p=>p.profile.evs.atk>p.profile.evs.spa?'물리':p.profile.evs.spa>p.profile.evs.atk?'특수':p.profile.evs.def+p.profile.evs.spd>0?'내구/반격':'혼합';
const design=[
 '# 관동 네임드 완성', '',
 '2026-10-18. 관동 테마의 실제 gyms/elites/champion/final에서 추출한 14개 ID만 검토했다. 성도 독수/목호와 로켓단 보스 비주기는 별도 ID로 보존한다. 공통 AI·선출 엔진·floor scaling·기믹 해금은 유지한다.', '',
 '## 원본과 품질 기준', '',
 '- 관동 28개 전·후반 템플릿을 14개 단일 후보 원본으로 정리했다. 전체 runtime은 311→297개, 전체 ID는 163개다. 후보는 국화 5종, 나머지 6종이다.',
 '- 후보 사용 이력은 아래 reference의 본가 게임 팀에서 확인했다. 특정 한 작품의 팀을 그대로 복제한 것은 아니다. 맘모꾸리/무우마직은 기존 프로젝트의 메꾸리/무우마 진화형 대응을 유지했다.',
 '- 원본 IV31/66포인트(능력당 최대32), 성실 성격을 사용한다. 실제 전투에서는 기존 층별 포인트 축소와 네임드 역할별 IV 배분을 적용한다. 50층 챔피언/히든과 55층 관장·사천왕의 기존 기믹 해금을 그대로 따른다.',
 '- 기존 에이스·기믹 carrier를 모두 유지했다. 마티스의 tactic만 physical→speed, 체육관 비주기는 physical→balanced로 데이터에서 변경했다. AI 버전과 판단 코드는 변경하지 않았다.',
 '- 후보 풀의 기본 도구는 서로 다르게 배정했다. 해금 시 carrier의 기본 도구를 기존 Mega/Z/Dynamax 도구로 교체한다. 전기구슬·굵은뼈는 현재 도구 카탈로그 미지원이므로 시스템에 새로 추가하지 않았다.', '',
 ...ids.flatMap(id=>{
  const s=source.samples.find(r=>r.id===id),sample=namedTrainerSamples.find(r=>r.id===id),review=reviews.find(r=>r.id===id),representative=lineups.after.find(r=>r.id===id&&r.band==='51-100').combinations[0];
  return [`## ${s.name} · ${id}`,'',`에이스: ${pname(s.ace)}. tactic: ${sample.tactic}. AI: 전반 ${npcAi(5,sample).tier}, 50층 이후 ${npcAi(55,sample).tier}. 기믹: ${s.signature.rule} / ${pname(s.signature.species)}.`, '',`required: ${s.required.join('/')}; selectionRules: ${JSON.stringify(s.selectionRules??{})}. 별도 lead/last 강제는 없다. 대표 후반 조합: ${representative.team.split('/').map(pokemonName).join(' / ')} (${representative.n}회).`, '',review.reason,'',table(['후보 / 역할','특성','기본 도구','4기술','HP/공/방/특공/특방/속 포인트'],s.team.map(p=>[`${pname(p.species)} · ${role(p)}`,p.profile.ability,itemName(p.item),moves(p),Object.values(p.profile.evs).join('/')])), '',`원작 후보 근거: ${review.references.map((url,i)=>`[reference ${i+1}](${url})`).join(', ')}.`, ''];
 }),
 '## 유지·보정 판단', '',
 '- 국화: 기존 팬텀·크로뱃·무우마직의 핵심 공격 기술과 Mega Gengar를 유지했다. 나머지는 원작 독 파트너이며 더 강한 관계없는 고스트를 추가하지 않았다.',
 '- 칸나: 기존 라프라스·루주라·맘모꾸리의 공격 구성을 보존했다. 후보 확대에 필요한 원작 파트너만 추가했고 파르셀 껍질깨기나 날씨 시동자 추가는 하지 않았다.',
 '- 목호: 성도용 마지막 배치를 복사하지 않았다. 관동 에이스와 기존 Mega carrier를 유지하며 물리 전술에 맞는 드래곤 공격을 구성했다.',
 '- 1차 검사 후 보정은 1회만 했다. 웅의 프테라 Roost→Ice Fang, 관동 시바의 괴력몬 Bullet Punch→Poison Jab만 바꿨다. 수치/레벨/공통 AI 보정은 없다. 중간 결과는 first-pass/에 보존했다.', '',
 '## 선출 규칙', '',
 table(['NPC','atLeastOneOf','목적'],source.samples.filter(r=>ids.includes(r.id)&&r.selectionRules?.atLeastOneOf).map(r=>[r.name,r.selectionRules.atLeastOneOf.map(pokemonName).join('/'),r.id==='named-sabrina'?'에이스+마임맨+마자용 수동 조합 방지':r.id==='named-ltsurge'?'에이스+붐볼+파치리스 저압박 조합 방지':r.id==='named-blaine'?'전기/풀 견제 담당 동료 최소1': '물/얼음 축만 겹치는 조합에 별도 공격 역할 최소1'])), '',
 '웅은 에이스 딱구리와 Mega 프테라가 기존 선출 경로에서 모두 보장된다. 다른 에이스도 required를 유지한다. 날씨 시동자가 없는 팀에 날씨 규칙을 붙이거나 모든 에이스를 마지막에 두지 않았다.', '',
 '## 대사', '',
 '이번에 새로 추가한 대사는 없다. 기존 관동 레드의 “… …!”만 유지했다([레츠고 전투 전 reference](https://bulbapedia.bulbagarden.net/wiki/Red_(game)/Quotes)). 다른 한국어 전투 직전 원문/맥락은 unverified로 남겼으며 창작하지 않았다.', '',
 '승률·선출·기믹·테스트: [관동 최종 밸런스 보고서](kanto-named-trainer-balance-report.md).',
];
writeFileSync(`${documentOutput}/kanto-named-trainers.md`,design.join('\n')+'\n');
const allStats=(phase,band,filter=regular)=>stats(rows[phase].filter(r=>r.band===band&&filter(r)));
const report=[
 '# 관동 네임드 최종 밸런스 보고서', '',
 '2026-10-18. 승률은 **플레이어 대리 AI의 단일 전투 승률**이다. 낮을수록 NPC가 강하다. 기존 전 지역 보고서는 baseline 스냅샷으로 보존했고 이번에는 관동만 측정했다.', '',
 '## 조건·baseline', '',
 '- 이전: 커밋 e3357c782498ba0548d4e500d0f9966e282e7329의 관동 데이터. 기존 named-selection 보고서의 관동 9,792조건과 입력 키·승패가 전량 일치한다. catalog tactic도 inventory-before.jsonl로 보존하여 재현 시 원복한다.',
 '- 플레이어는 기존 4팀(스타팅/공격/내구/전용기), 6룰(basic/mega/dynamax/tera/chaos/z), 4개 고정 경로·전투 시드. 테마·구간당 4,800조건, 이 중 네임드 960조건. 별도 히든 레드는 각 구간 96조건이다.',
 '- 팀은 리자몽/거북왕/이상해꽃, 한카리아스/메타그로스/라프라스, 야도란/아머까오/트리토돈, 따라큐/짜랑고우거/갸라도스다. 기존 기본 기술배치 일부가 미완성이며, 실전 최적화 팀이나 초보/고수 사용자의 평균을 뜻하지 않는다.',
 '- 층별 육성·장비·플레이어 정책은 기존 실험과 동일하다. 50층 IV12/8포인트, 51층 IV7/3포인트, 100층 IV31/66포인트. 55층부터 역할 성격. 플레이어 테라 티켓0, 회복약·누적 피해·상점·영입 비용 제외. 개별 전투마다 독립적으로 시작한다.',
 '- 관동 에이스/기믹·해금·현재 v11 등급은 유지했다. 관동 14명 외의 원본 데이터는 구조 비교와 frozen hash로 동일함을 확인했다. 공통 AI/생성 엔진은 변경하지 않았다.',
 '- 이전·1차·최종 각각 9,792조건, 실행 오류0. 동일 팀/시드/AI/장비 입력은 캐시 공유했으므로 조건 수를 독립 표본 수나 사람의 실제 승률로 보지 않는다. 개별 NPC는 24~96조건이며 경로 표본이 작다.', '',
 '## 전체 / 네임드 / 히든', '',
 table(['대상','구간','이전','1차','최종','전후 변화'],bands.flatMap(band=>[['전체',regular],['네임드',r=>r.kind==='named'],['레드 히든',r=>r.kind==='hidden']].map(([name,filter])=>{const b=allStats('before',band,filter),f=allStats('first',band,filter),a=allStats('after',band,filter);return [name,band,pct(b.rate),pct(f.rate),pct(a.rate),pp(a.rate-b.rate)];}))), '',
 '## NPC별 Before → After', '',
 table(['NPC / ID','구간','종류','N','이전','1차','최종','변화'],npc.map(r=>[`${r.name} / ${r.id}`,r.band,r.kind,r.after.n,pct(r.before.rate),pct(r.first.rate),pct(r.after.rate),pp(r.after.rate-r.before.rate)])), '',
 '## 룰별·플레이어 팀별', '',
 ...['rule','caseId'].flatMap(field=>[table(['구분','구간','N','이전','최종'],bands.flatMap(band=>group(rows.after.filter(r=>r.band===band&&regular(r)),r=>r[field]).map(([key,r])=>{const b=rows.before.filter(r=>r.band===band&&regular(r)&&r[field]===key);return [key,band,r.length,pct(stats(b).rate),pct(stats(r).rate)];}))), '']),
 'NPC×플레이어 팀×룰의 전체 분할 결과는 comparison.json / matrix.csv에 저장했다.', '',
 '## 실제 조합·선봉·마지막', '',
 '층/경로 시드별 선출을 한 번씩 세고 같은 선출을 플레이어 팀/룰로 반복한 것은 중복 제거했다. 조합별 전투 승률은 comparison.json의 combinations, 전 조합/선봉/마지막 빈도는 lineups에 있다.', '',
 table(['NPC','구간','생성 조건','조합 수','최빈 조합(횟수)','선봉 빈도','마지막 빈도'],lineups.after.map(r=>[label(r.id),r.band,r.n,r.combinations.length,`${r.combinations[0].team.split('/').map(pokemonName).join('/')} (${r.combinations[0].n})`,Object.entries(r.leads).map(([s,n])=>`${pokemonName(s)} ${n}`).join('/'),Object.entries(r.lasts).map(([s,n])=>`${pokemonName(s)} ${n}`).join('/')])), '',
 `에이스·carrier·required·atLeastOneOf 조건: ${successes.length}/${successes.length} 성공(100%). 관동에서 preferredLead/preferredLast를 새로 적용하지 않았으므로 배치 성공률은 해당 없음이다. 기본 시드 순서 변화는 테스트로 확인했다.`, '',
 '## 기믹 telemetry', '',
 '아래는 관장·사천왕·챔피언과 히든 레드를 포함한다. 실제 발동 로그에서만 사용을 인정했다. HP는 발동 직전 공개 HP 비율이다. 사용/미사용 승률 차이는 상황 선택의 영향을 받으므로 기믹의 인과적 효과를 의미하지 않는다.', '',
 table(['phase/기믹','가능','사용','사용률','평균 턴','평균 HP','사용 시 플레이어 승률','미사용 시 플레이어 승률'],gimmickTotals.map(r=>[r.key,r.available,r.used,pct(r.rate),r.turn?.toFixed(2)??'—',pct(r.hp),pct(r.playerWinUsed),pct(r.playerWinUnused)])), '',
 table(['NPC/구간/기믹 (최종)','가능','사용','사용률','평균 턴','평균 HP','carrier','미사용 중 일반 행동 있음/없음'],gimmicks.filter(r=>r.key.startsWith('after:')).map(r=>[r.key.slice(6),r.available,r.used,pct(r.rate),r.turn?.toFixed(2)??'—',pct(r.hp),Object.keys(r.carriers).map(pokemonName).join('/'),`${r.unusedButActed}/${r.unusedNoAction}`])), '',
 '일반 행동 없음은 미출전과 행동 전 KO를 합친 값이다. 둘을 구분하려면 traces의 실제 switch/faint를 봐야 하며 낮은 Z 사용률을 AI 버그로 자동 판정하지 않는다. Z carrier가 번개/얼음/풀 등 다른 coverage를 선택한 경우도 포함한다.', '',
 '모든 Z carrier는 선출에 포함됐다. 아래는 Z를 쓰지 않은 전투에서 carrier가 실제로 사용한 일반 기술 횟수다. coverage·회복·setup을 고른 사례와 행동이 없던 사례를 분리했다. 일반 행동이 최적이었는지는 별도의 반사실 실험 없이 단정하지 않는다.', '',
 table(['NPC (후반 Z 미사용 전투)','실제 일반 기술 횟수'],['named-misty','named-blaine','named-ltsurge','named-koga-kanto'].map(id=>[label(id),Object.entries(count(gimmickEvents.filter(r=>r.phase==='after'&&r.id===id&&r.band==='51-100'&&r.kind==='z'&&!r.used).flatMap(r=>r.carrierMoves),m=>m)).map(([m,n])=>`${m} ${n}`).join(' / ')])), '',
 '기본 도구 교체: 아쿠스타 Wise Glasses→Waterium Z, 라이츄 Focus Sash→Electrium Z, 윈디/또도가스 Sitrus Berry→Z, 라프라스 Leftovers→Dynamax Band, 피카츄 Magnet→Dynamax Band. 이 손실 때문에 약해졌다고 단정하지 않으며 도구만 바꾼 대조 실험은 이번 범위에서 하지 않았다.', '',
 '## 이상치·원인 분류·한 차례 보정', '',
 'A 후보 / B 조합 / C 순서 / D 기술 / E 도구 / F AI 활용 / G 기믹 / H 벤치마크 상성으로 분류했다.', '',
 '- 초련(D/E/H): 후반 알라카잠의 유일한 에스퍼 공격이 미래예지여서 즉발 STAB가 사라졌다. 사이코키네시스를 복구하고 후보별 공격/보조를 나눴다. 대미지나 AI를 보정하지 않았다.',
 '- 강연(A/D/E/H): 불꽃 기술 중복과 특수 배분에 기합펀치가 섞여 있었다. 본가에 사용 이력이 있는 불꽃 파트너에게 전기/풀/격투 coverage를 분담했다. 가뭄이나 타입 외 메타 후보를 추가하지 않았다.',
 '- 마티스(D/E/F/H): 특수 STAB·물리 보조가 섞인 배분을 역할에 맞췄다. speed tactic은 마티스 데이터에만 적용했다. 땅 면역인 전기 기술에 고집하지 않도록 풀묶기·냉동펀치 등 원래 합법 coverage를 제공했다.',
 '- 체육관 비주기(A/D/E/H): 로켓단 보스와 완전히 별도다. 니드킹/니드퀸의 특수 coverage, 하드록 거대코뿌리, 실제 땅 파트너로 역할을 분담했다. 전반 N24의 50%를 정밀한 실제 난이도 추정으로 보지 않는다.',
 '- 웅(D/F/H): 1차 전반 플레이어 승률95.83%, 실제 프테라 Roost 76회였다. 빠른 공격수의 회복 슬롯을 Ice Fang으로 바꿔 드래곤/풀 견제를 확보했다. 최종 전반70.83%, 후반66.67%. 바위의 물/풀 약점은 유지했다.',
 '- 시바(D/H): 1차 전반90.63%. 벤치마크의 비행/에스퍼/페어리 저항과 면역에 취약했다. 괴력몬 Bullet Punch를 Poison Jab으로만 보정했다. 최종 전반83.33%, 후반78.13%. 선출/AI에 전용 예외를 넣지 않았다.',
 '- 칸나·국화(A/H): 이미 충분히 강했던 핵심 공격과 기믹을 보존했다. 후보 확대 후 더 약해진 구간을 수치 버프로 되돌리지 않았다.',
 '- 레드(B/E/G/H): 후보 확대 후 후반 플레이어 승률51.04%→68.75%로 쉬워졌다. 공격 팀의 한카리아스/메타그로스/라프라스에는 최종24/24 패배했다. 피카츄 기본 도구/기믹, 출전 순서와 파트너 조합의 영향을 분리해야 한다. 이 결과만으로 최종 보스가 챔피언보다 항상 강하다고 주장하지 않는다.', '',
 '## 남은 편향과 판단', '',
 '관동 완료. 후보 5~6종·원작 계열 정체성·합법 빌드·에이스/기믹 포함·시드 변화·기존 저장 호환을 검증했고, 전체 승률90~100%의 반복적 약체 이상치는 최종 표본에서 해소됐다. 균등 승률이나 모든 플레이어 팀에 대한 안정성을 달성했다고 보지는 않는다.',
 '후속 실험은 저사용 Z의 출전 전 KO/coverage/도구 손실 분리, 레드의 공격 팀 상성, 회복·setup·pivot의 실제 이득, 더 많은 경로 시드와 플레이어 기술 완성도별 비교다. 이번에는 세 번째 튜닝이나 다른 지방 수정으로 확장하지 않는다.', '',
 '## 검증', '',
 ...(existsSync(`${root}/validation.json`)?json(`${root}/validation.json`).entries.map(s=>'- '+s):['- 최종 실행 결과는 validation.json으로 확정한다.']), '',
 '## 재현·산출물', '',
 `실험 폴더: ${root}. before-runtime/source, inventory-before, design-review, outcomes, before/after manifests/battles, first-pass, traces, comparison.json, matrix.csv, gimmick-events.jsonl을 보존한다. AI/엔진을 바꿀 때는 새 출력 폴더를 사용한다.`, '',
 '```powershell',
 `$env:THEME_BALANCE_OUTPUT='${root}'`,
 "$env:THEME_BALANCE_THEMES='kanto'",
 "$env:THEME_BALANCE_TELEMETRY='1'",
 `$env:NPC_BALANCE_BASELINE='${root}/before-runtime.json'`,
 `$env:THEME_BALANCE_BASELINE_CATALOG='${root}/inventory-before.jsonl'`,
 'node --import ./scripts/lib/npc-balance-baseline.mjs --import tsx scripts/simulate-johto-theme-comparison.ts --before',
 'Remove-Item Env:NPC_BALANCE_BASELINE',
 'Remove-Item Env:THEME_BALANCE_BASELINE_CATALOG',
 'node --import tsx scripts/simulate-johto-theme-comparison.ts',
 'node --import tsx scripts/report-kanto-npc-balance.mjs',
 '```',
];
writeFileSync(`${documentOutput}/kanto-named-trainer-balance-report.md`,report.join('\n')+'\n');
console.log(JSON.stringify({npc,gimmickTotals,successes:successes.length},null,2));
