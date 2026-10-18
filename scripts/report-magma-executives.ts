import {readFileSync,writeFileSync,readdirSync,mkdirSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {hoennTrainers} from '../src/data/hoenn-trainers';

const root='artifacts/experiments/balance/magma-executives-20261018';
const commit='5325869e2c042f27767501af521c4168ebddd8d6';
const ids=['magma-executive-tabitha','magma-executive-courtney'];
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const rows=(p:string):any[]=>readFileSync(p,'utf8').trim().split('\n').filter(Boolean).map(s=>JSON.parse(s));
const before=rows(root+'/before-focused.jsonl'),after=rows(root+'/after-focused.jsonl');
const holdBefore=rows(root+'/validation-last/before-focused.jsonl'),holdAfter=rows(root+'/validation-last/after-focused.jsonl');
const noCrobatPackage=rows(root+'/without-crobat-package/before-focused.jsonl'),noMega=rows(root+'/without-mega-final/before-focused.jsonl');
const lineups=read(root+'/after-lineups.json'),oldLineups=read(root+'/before-lineups.json');
const source=read('scripts/data/npc/normal-npc-samples.json');
const baseline=read(root+'/baseline-runtime.json');
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const pct=(n:number|null)=>n===null?'—':(n*100).toFixed(1)+'%';
function stats(rs:any[]){return {n:rs.length,errors:rs.filter(r=>r.error).length,wins:rs.filter(r=>r.winner==='Player').length,rate:rs.length?rs.filter(r=>r.winner==='Player').length/rs.length:null};}
for(const rs of [before,after,holdBefore,holdAfter,noCrobatPackage]){assert.equal(rs.length,384);assert.ok(rs.every(r=>ids.includes(r.id)&&!r.error));}
assert.equal(noMega.length,192);assert.ok(noMega.every(r=>!r.error));
const mechanisms=['src/battle/npc-policy.ts','src/battle/z-decision.ts','src/data/npc-selection-rules.ts','src/server/opponent-team.ts','src/server/npc-templates.ts','src/data/tower-progression.ts','src/data/npc-gimmicks.ts','src/battle/gimmicks.ts'];
for(const path of mechanisms)assert.equal(readFileSync(path,'utf8').replace(/\r\n/g,'\n'),execFileSync('git',['show',`${commit}:${path}`],{encoding:'utf8'}).replace(/\r\n/g,'\n'),`Forbidden common-system change: ${path}`);
const currentRuntime=read('src/data/normal-npc-templates.json');
assert.deepEqual(currentRuntime.filter((s:any)=>!ids.includes(s.id)),baseline.filter((s:any)=>!ids.includes(s.id)));
assert.deepEqual(source.samples.filter((s:any)=>!ids.includes(s.id)),read(root+'/baseline-source.json').samples.filter((s:any)=>!ids.includes(s.id)));
const cases=['starters','offense','bulk','signature'],rules=['basic','mega','dynamax','tera','chaos','z'];
function moveSummary(rs:any[]){const out:Record<string,number>={};for(const r of rs)for(const m of r.telemetry.moves){const key=m.species.replace(/-Mega$/,'')+': '+m.move;out[key]=(out[key]??0)+1;}return out;}
function gimmickStats(rs:any[]){const available=rs.filter(r=>r.telemetry.available.some((g:any)=>g.kind==='mega')),used=rs.filter(r=>r.telemetry.used.some((g:any)=>g.kind==='mega'));
 return {availableBattles:available.length,activatedBattles:used.length,activationRate:available.length?used.length/available.length:null,meanTurn:used.length?used.flatMap(r=>r.telemetry.used).reduce((s,u)=>s+u.turn,0)/used.length:null,playerWinWhenActivated:stats(used),playerWinWithoutActivation:stats(available.filter(r=>!used.includes(r)))};
}
function lineupSummary(l:any){const doubleWater4x=Object.entries(l.teams).reduce((s,[names,n])=>s+(names.split(' / ').filter(name=>Showdown.Dex.getEffectiveness('Water',Showdown.Dex.species.get(name))>=2).length>=2?Number(n):0),0);return {...l,doubleWater4x};}
const metrics=ids.map(id=>({id,name:id.endsWith('tabitha')?'호걸':'구열',floors:[45,95].map(floor=>({floor,before:stats(before.filter(r=>r.id===id&&r.floor===floor)),after:stats(after.filter(r=>r.id===id&&r.floor===floor)),holdoutBefore:stats(holdBefore.filter(r=>r.id===id&&r.floor===floor)),holdoutAfter:stats(holdAfter.filter(r=>r.id===id&&r.floor===floor))})),byBenchmark:[45,95].flatMap(floor=>cases.map(caseId=>({floor,caseId,before:stats(before.filter(r=>r.id===id&&r.floor===floor&&r.caseId===caseId)),after:stats(after.filter(r=>r.id===id&&r.floor===floor&&r.caseId===caseId))}))),byRule:[45,95].flatMap(floor=>rules.map(rule=>({floor,rule,before:stats(before.filter(r=>r.id===id&&r.floor===floor&&r.rule===rule)),after:stats(after.filter(r=>r.id===id&&r.floor===floor&&r.rule===rule))}))),gimmicks:{before:gimmickStats(before.filter(r=>r.id===id)),after:gimmickStats(after.filter(r=>r.id===id))},moves:{before:moveSummary(before.filter(r=>r.id===id)),after:moveSummary(after.filter(r=>r.id===id))},waterAbsorbProtocolEvents:after.filter(r=>r.id===id).reduce((s,r)=>s+(r.waterAbsorbActivations??0),0),lineups:[45,55,95].map(floor=>({floor,before:lineupSummary(oldLineups.find((l:any)=>l.id===id&&l.floor===floor)),after:lineupSummary(lineups.find((l:any)=>l.id===id&&l.floor===floor))})),crobatPackageAblation:[45,95].map(floor=>({floor,withPackage:stats(before.filter(r=>r.id===id&&r.floor===floor)),withoutPackage:stats(noCrobatPackage.filter(r=>r.id===id&&r.floor===floor))}))}));
const traces=readdirSync(root+'/traces').filter(f=>f.endsWith('.json')).map(file=>{const t=read(root+'/traces/'+file);return {file,winner:t.winner,protocolEvidence:t.publicProtocol.filter((l:string)=>l.includes('Water Absorb')||l.startsWith('|-mega|p2')),actions:t.decisions.filter((d:any)=>d.own).map((d:any)=>({turn:d.turn,actor:d.own.ident,condition:d.own.condition,item:d.own.item,action:d.action,target:d.opponent?.species}))};});
const totalCrobMovesBefore=metrics.reduce((s,t)=>s+(t.moves.before['Crobat: Giga Drain']??0)+(t.moves.before['Crobat: U-turn']??0),0);
assert.equal(totalCrobMovesBefore,0);
const repeatedHighBenchmarks=metrics.flatMap(t=>cases.filter(caseId=>t.byBenchmark.filter(b=>b.caseId===caseId).every(b=>b.after.rate!>=.95)).map(caseId=>({id:t.id,caseId})));
// Respect the requested stopping criterion for repeated high benchmark rates,
// rather than declaring completion from aggregate improvement alone.
const stable=metrics.every(t=>t.floors.every(f=>f.after.rate!<.95&&f.holdoutAfter.rate!<.95))&&repeatedHighBenchmarks.length===0;
const audit={baselineCommit:commit,scope:ids,repeatedHighBenchmarks,verdict:stable?'마그마단 간부 조정 완료':'마그마단 간부 추가 설계 필요',method:{primary:{floors:[45,95],seeds:[1,2,3,4],teamSeed:'[n,floor,29,43]',battleSeed:'[n,floor,37,101]',cases,rules},holdoutSeeds:[17,18,19,20],lineupDrawsPerNpcFloor:1000,ai:'unchanged tactical ceiling / tower-policy-v12',note:'Independent full-HP proxy-AI battles; no human win-rate, climb survival, shop, or economy claims. Completion is a qualitative tier judgement, not a target of equal win rates.'},invariants:{otherRuntimeDefinitions:282,otherReviewedDefinitions:282,runtimeHash:hash(currentRuntime.filter((s:any)=>!ids.includes(s.id))),sourceHash:hash(source.samples.filter((s:any)=>!ids.includes(s.id))),unchangedMechanisms:mechanisms},metrics,megaAblation:[45,95].map(floor=>({floor,withMega:stats(after.filter(r=>r.id===ids[1]&&r.floor===floor)),withoutMegaBaseBerry:stats(noMega.filter(r=>r.floor===floor))})),traces,manifest:{before:read(root+'/before-focused-manifest.json'),after:read(root+'/after-focused-manifest.json'),holdout:read(root+'/validation-last/after-focused-manifest.json')}};
mkdirSync('artifacts/reports/npc',{recursive:true});writeFileSync('artifacts/reports/npc/magma-executives-audit.json',JSON.stringify(audit,null,2)+'\n');
const md=[
 '# 마그마단 간부 추가 조정', '', `기준 commit: \`${commit}\`. 호걸·구열 두 샘플만 수정했다. 다른 282개 검토/runtime 정의와 공통 정책·선출기·성장·기믹 구현은 그대로인지 검사했다.`, '',
 '## 1. Tabitha 변경', '', '폭타 에이스, Tactical 상한, 무기믹을 유지했다. 마그카르고→점토도리, 선인왕 추가로 6후보를 구성했다. 느린 불꽃/바위 중복을 줄이고 땅/에스퍼·트릭룸·물 면역/풀 공격 역할을 분담한다. 폭타는 돌격조끼와 4공격기로 즉시 압박한다.', '',
 '## 2. Courtney 변경', '', '폭타 에이스와 메가폭타를 유지했다. 후보 변경은 호걸과 같은 두 자리이며, 허용 층부터 메가스톤으로 바뀐다. 폭타 자신의 낮은 Speed와 물 4배 약점은 그대로이고 선인왕·크로뱃·점토도리가 서로 다른 방식으로 보완한다.', '',
 '두 간부 모두 atLeastOneOf=[Crobat,Cacturne], preferredLead=[Crobat,Claydol]이다. 폭타는 기존 에이스 제약으로 자동 포함된다. 크로뱃 또는 선인왕 하나가 있어야 하며 점토도리는 선택된 경우에만 트릭룸 선봉 우선순위다. required를 더 넣지 않아 실제 가능한 조합 7개를 유지한다.', '',
 '### 후보의 원작 연결과 확장 범위', '',
 '[Tabitha](https://bulbapedia.bulbagarden.net/wiki/Tabitha), [Courtney](https://bulbapedia.bulbagarden.net/wiki/Courtney)의 폭타·그라에나·골뱃 계열 정체성을 우선했다. 크로뱃은 기존 진화형 대체이며 또도가스는 기존 조직 공용 확장이다. [마그마단의 본가 조직 공용 풀](https://bulbapedia.bulbagarden.net/wiki/Magma)에 포함된 에메랄드의 오뚝군을 진화시켜 점토도리로 확장했다. 점토도리를 간부의 실제 사용 포켓몬이라고 주장하지 않는다. 선인왕은 호연 사막의 풀/악 파트너와 저수 역할로 연결한 타워용 조직 확장이다. 관계없는 범용 메타 포켓몬으로 교체하지 않았다.', '',
 '### 최종 세트', '',
];
for(const id of ids){const s=source.samples.find((s:any)=>s.id===id);md.push(`#### ${s.name}`,'','| 후보 | 특성 | 기본 도구 | 기술 ×4 | 역할 |','|---|---|---|---|---|',...s.team.map((p:any)=>`| ${p.species} | ${p.profile.ability} | ${p.item} | ${p.profile.moves.join(' / ')} | ${p.role} |`),'');}
md.push('공통 빌드 정의 자체는 바꾸지 않고 두 간부용 override만 사용했다. 따라서 다른 NPC의 폭타·크로뱃·점토도리 세트는 그대로다. 저수·기합의띠·돌격조끼·검은진흙 등은 현재 roster/held-item 목록과 TeamValidator로 확인했다. 아이템 목록을 확장하지 않았다.', '',
 '### 기존 크로뱃 보정의 효과', '',
 '기준 384전에서 크로뱃의 Giga Drain과 U-turn 실제 사용은 모두 0이었다. Life Orb/Giga Drain/preferredLead를 함께 제거한 반사실 비교에서 전반 승률은 동일했고 후반은 오히려 두 NPC 모두 2.1pp 낮아졌다. 따라서 기존 보정이 물 대응을 해결했다고 볼 근거는 없다. 세 요인을 함께 바꾼 실험이므로 각각의 인과 효과로 분리하지 않는다.', '',
 '| NPC | F45 보정 있음 / 제거 | F95 보정 있음 / 제거 |','|---|---|---|',...metrics.map(t=>`| ${t.name} | ${t.crobatPackageAblation.map(a=>`${pct(a.withPackage.rate)} / ${pct(a.withoutPackage.rate)}`).join(' | ')} |`),'',
 '최종 크로뱃은 Black Sludge / Brave Bird / Cross Poison / U-turn / Roost로 바꿨다. 물 대응은 실제 저수·풀 STAB·기합의띠·선공기가 있는 선인왕에게 넘겼다. 최종 primary에서도 크로스포이즌/유턴 사용은 0이므로, 두 기술이 승률 개선을 만들었다고 주장하지 않는다. 크로뱃은 주로 브레이브버드와 날개쉬기를 사용했고, 검은진흙은 Life Orb의 추가 반동을 없앤 회복 선택이다.', '',
 '## 3. Before → After', '',
 '플레이어 대리 AI의 단판 승률이며 낮을수록 NPC가 강하다. 기존 네 benchmark, 여섯 플레이어 룰, 같은 팀/배틀 seed, F45/F95를 유지했다. 각 NPC/층 96전이다. 원작 소유 여부와 별개로 모든 세트는 프로젝트 현재 포맷에서 합법적이다.', '',
 '| NPC | probe | Before | After | 변화 | holdout Before → After |','|---|---|---|---|---|---|',...metrics.flatMap(t=>t.floors.map(f=>`| ${t.name} | F${f.floor} | ${pct(f.before.rate)} (${f.before.wins}/${f.before.n}) | ${pct(f.after.rate)} (${f.after.wins}/${f.after.n}) | ${((f.after.rate!-f.before.rate!)*100).toFixed(1)}pp | ${pct(f.holdoutBefore.rate)} → ${pct(f.holdoutAfter.rate)} |`)),'',
 'holdout은 최종 세트 확정 뒤 따로 검사한 seed 17~20이며 이 결과를 보고 다시 세트를 튜닝하지 않았다. primary Before/After 각 384전, holdout Before/After 각 384전 모두 오류 0이다. 후보 1~2마리/개별 기술·도구·규칙·역할 조정으로 개선했고 AI 또는 스탯 배율은 바꾸지 않았다.', '',
 '### Benchmark별', '', '| NPC | floor | benchmark | Before | After |','|---|---|---|---|---|',...metrics.flatMap(t=>t.byBenchmark.map(b=>`| ${t.name} | ${b.floor} | ${b.caseId} | ${pct(b.before.rate)} (${b.before.n}) | ${pct(b.after.rate)} (${b.after.n}) |`)),'',
 '### 플레이어 rule별', '', '| NPC | floor | rule | Before | After |','|---|---|---|---|---|',...metrics.flatMap(t=>t.byRule.map(b=>`| ${t.name} | ${b.floor} | ${b.rule} | ${pct(b.before.rate)} (${b.before.n}) | ${pct(b.after.rate)} (${b.after.n}) |`)),'',
 '## 4. Lineup', '',
 '각 NPC × F45/F55/F95 × 1,000회, before/after 각각 6,000회 generateOpponentTeam을 호출했다. 아래 slow는 세 마리 모두 원종 base Speed ≤70인 조합이다. 우선기·아이템·메가 폼의 실제 전투 Speed를 대체하는 지표는 아니다. Water response는 물 내성/흡수 또는 풀 공격 coverage 포함, hard response는 물 내성/흡수 포함이다. 기존 크로뱃의 미사용 기가드레인도 전자의 coverage로 세므로 두 지표를 구분한다.', '',
 '| NPC | F | 가능 lineup | slow Before → After | 물4배 2마리 이상 Before → After | coverage 포함 response Before → After | hard response Before → After | ace/carrier/규칙 After |','|---|---|---|---|---|---|---|',...metrics.flatMap(t=>t.lineups.map(l=>`| ${t.name} | ${l.floor} | ${Object.keys(l.before.teams).length} → ${Object.keys(l.after.teams).length} | ${pct(l.before.slowTeam70/1000)} → ${pct(l.after.slowTeam70/1000)} | ${pct(l.before.doubleWater4x/1000)} → ${pct(l.after.doubleWater4x/1000)} | ${pct(l.before.waterResponse/1000)} → ${pct(l.after.waterResponse/1000)} | ${pct(l.before.waterResistance/1000)} → ${pct(l.after.waterResistance/1000)} | ${pct(l.after.ace/1000)} / ${t.id.endsWith('courtney')?pct(l.after.carrier/1000):'없음'} / ${pct(l.after.success/1000)} |`)),'',
 '폭타+마그카르고 조합은 완전히 사라졌다. 단 폭타+선인왕+또도가스/그라에나는 여전히 느리다. 이 조합에는 저수·기합의띠·기습과 상태/위협 역할이 있어, 느리다는 이유만으로 모두 배제하거나 고정 3마리로 만들지 않았다. 전체 lineup/lead/last 빈도는 감사 JSON에 보존했다.', '',
 '| NPC / F95 | lineup | 빈도 |','|---|---|---|',...metrics.flatMap(t=>Object.entries(t.lineups.find(l=>l.floor===95)!.after.teams).sort((a:any,b:any)=>b[1]-a[1]).map(([names,n])=>`| ${t.name} | ${names} | ${n}/1000 |`)),'',
 '| NPC / F95 | lead frequency | last frequency |','|---|---|---|',...metrics.map(t=>{const l=t.lineups.find(l=>l.floor===95)!.after;return `| ${t.name} | ${JSON.stringify(l.leads)} | ${JSON.stringify(l.lasts)} |`;}),'',
 '## 5. Mega Camerupt', '',
 '| 단계 | available | activation | 사용률 | 평균 턴 |','|---|---|---|---|',...(['before','after'] as const).map(phase=>{const g=metrics[1].gimmicks[phase];return `| ${phase} F95 | ${g.availableBattles} | ${g.activatedBattles} | ${pct(g.activationRate)} | ${g.meanTurn?.toFixed(2)} |`;}),'',
 'Courtney F45는 기존 floor gate 때문에 activation 0/0이다. Tabitha는 두 층 모두 무기믹이다. 최종 Courtney에서 메가 사용 여부만 비교한 반사실 검사는 아래와 같다. signature를 끈 쪽은 기본 Sitrus Berry를 유지하므로 순수 종족값 효과가 아닌 메가 도구/기믹 선택 전체의 효과다. 선출·seed·AI는 같다.', '',
 '| floor | 실제 메가 세트 player win | signature off + 기본 열매 player win |','|---|---|---|',...audit.megaAblation.map(a=>`| ${a.floor} | ${pct(a.withMega.rate)} (${a.withMega.wins}/${a.withMega.n}) | ${pct(a.withoutMegaBaseBerry.rate)} (${a.withoutMegaBaseBerry.wins}/${a.withoutMegaBaseBerry.n}) |`),'',
 `저수 관련 실제 p2 protocol event는 호걸 ${metrics[0].waterAbsorbProtocolEvents}건, 구열 ${metrics[1].waterAbsorbProtocolEvents}건이다. 선인왕의 씨폭탄/기습 실제 사용과 메가폭타의 대지의힘/불대문자 사용은 감사 JSON의 moves 집계에서 확인한다. 메가 사용률 하나로 성공 여부를 판단하지 않았다.`, '',
 '## 6. 남은 약점과 판단', '',
 '의도된 약점: 폭타/메가폭타는 느리고 물 4배 약점이 있다. 팀 전체를 빠른 풀 메타 포켓몬으로 대체하지 않았다. 선인왕은 약한 내구를 기합의띠로 한 번 보완하는 공격수이며 모든 상대를 막는 벽이 아니다. 점토도리는 물 약점이 남지만 격투 내성과 부유, 트릭룸을 분담한다.', '',
 '남은 강한 편향: signature benchmark에는 primary 승률 100%가 남는다. 특히 Mimikyu/Kommo-o/Gyarados와 플레이어 Dynamax가 강한 상대다. 최종 holdout Dynamax는 두 NPC 모두 93.8%다. 이 매치업을 50%로 만들려고 공통 AI/기믹 엔진을 바꾸거나 후보를 다시 대량 교체하지 않았다. 반면 bulk에는 43.8%, starters에는 77.1~83.3%, offense에는 89.6%여서 기존의 거의 모든 benchmark·룰에서 95~100%인 상태는 해소됐다. 전체 난이도는 개선됐지만 signature의 95~100% 반복은 요청된 완료 기준을 충족하지 못한다. 따라서 마그마단 간부 추가 설계 필요로 판정한다. 공통 AI를 바꾸거나 세 번째 후보를 추가해 이 결과를 숨기지 않았다.', '',
 '기존 크로뱃 패키지의 제한을 확인하고 실제 물 면역 역할을 더한 것이 핵심이다. 위협/악 압박 역할인 그라에나에는 구애머리띠와 4공격기를 적용했다. 헬가를 검토했으나 격투 약점 중복과 방탄 짜랑고우거 상대 오물폭탄 반복 문제가 있어 본가 조직 공용 계열의 점토도리를 선택했다. 또도가스도 오물폭탄 대신 방탄에 막히지 않는 오물웨이브를 사용한다. 점토도리의 실제 primary 행동은 사이코키네시스·대지의힘·냉동빔이며 트릭룸 사용은 0회다. 트릭룸 슬롯은 잠재적인 속도 역전 수단이며 승률 개선을 트릭룸 연계 효과로 해석하지 않는다. 5~16번 seed는 중간 확인이고 마지막 구성은 17~20번 seed로 검증한 뒤 추가 튜닝하지 않았다.', '',
 '## 7. 테스트·재현', '',
 '```powershell',
 'node --import tsx scripts/review-hoenn-npc-samples.ts',
 'node scripts/export-normal-npc-runtime.mjs --check',
 'node --import tsx --test tests/magma-executives.test.ts tests/hoenn-named-trainers.test.ts tests/named-selection-rules.test.ts tests/npc-templates.test.ts tests/npc-gimmicks.test.ts',
 'node node_modules/typescript/bin/tsc --noEmit',
 'node --require ./scripts/windows-build-links.cjs node_modules/next/dist/bin/next build',
 'node --import tsx node_modules/@playwright/test/cli.js test e2e/hoenn-named-trainers.spec.ts',
 "$env:HOENN_NPCS='magma-executive-tabitha,magma-executive-courtney'",
 "$env:HOENN_OUTPUT='artifacts/experiments/balance/magma-executives-20261018'",
 "$env:HOENN_TRACES='1'",
 'node --import tsx scripts/simulate-hoenn-npcs.ts',
 'node --import tsx scripts/report-magma-executives.ts',
 '```', '',
 `Before는 git show ${commit}:src/data/normal-npc-templates.json 으로 저장한 읽기 전용 기준 파일을 NPC_BALANCE_BASELINE에 지정하고, --import ./scripts/lib/npc-balance-baseline.mjs --import tsx 및 --before로 실행한다. 이 두 NPC의 catalog/AI 설정은 그대로이므로 runtime 기준 치환으로 동일 조건을 재현한다. holdout은 HOENN_SEED_START=17이며 본 실험의 count는 기존과 같은 4다.`, '',
 '원시 전투·시드·manifest·16개 기본 룰 trace는 로컬 실험 폴더에 있고, 추적 가능한 집계/trace 요약은 `artifacts/reports/npc/magma-executives-audit.json`에 있다. 다른 NPC·Maxie/Archie·조무래기·아쿠아 샘플은 before commit과 구조적으로 동일하다.', '',
);
const verification=root+'/verification.md';if(existsSync(verification))md.push(readFileSync(verification,'utf8'),'');
md.push(audit.verdict);
writeFileSync('docs/gameplay/magma-executive-balance-report.md',md.join('\n')+'\n');
// Refresh only the two current design sections. Keep the original broad report
// and its measurements as historical baseline evidence.
const designPath='docs/gameplay/hoenn-named-trainers.md';let design=readFileSync(designPath,'utf8');
for(const t of hoennTrainers.filter(t=>ids.includes(t.id))){const s=source.samples.find((s:any)=>s.id===t.id),title=`## ${t.name} (${t.id})`,start=design.indexOf(title);assert.ok(start>=0);let end=design.indexOf('\n## ',start+title.length);if(end<0)end=design.length;
 const l=lineups.find((l:any)=>l.id===t.id&&l.floor===95);
 const section=[title,'',`Category: executive; Power Tier: ${t.power}; Ace: Camerupt; AI: Tactical ceiling.`, '',`Concept: ${t.concept}.`, '',`Gimmick: ${t.signature?'Mega Camerupt / Cameruptite':'None'}.`, '',`selectionRules: \`${JSON.stringify(t.selectionRules)}\`.`, '', '| 후보 | 특성 | 기본 아이템 | 기술 ×4 | 역할 |','|---|---|---|---|---|',...s.team.map((p:any)=>`| ${p.species} | ${p.profile.ability} | ${p.item} | ${p.profile.moves.join(' / ')} | ${p.role} |`),'','signature carrier는 허용 층부터 지정 기믹 도구로 바뀐다. 기존 층별 성장·선출기를 사용한다.', '',`Representative Lineups (F95, 1000회): ${Object.entries(l.teams).sort((a:any,b:any)=>b[1]-a[1]).slice(0,3).map(([names,n])=>`${names}: ${n}회`).join('; ')}.`, '', 'Design Notes: 마그카르고를 점토도리로 교체하고 저수 선인왕을 추가한 두 자리 조직 확장이다. 점토도리/선인왕을 원작 간부 소유로 주장하지 않는다. 크로뱃의 미사용 기가드레인에 물 대응을 의존하지 않는다. [추가 조정 검증](magma-executive-balance-report.md)에 기준 commit·세트·승률·holdout·선출·메가 비교를 기록했다.', ''].join('\n');
 design=design.slice(0,start)+section+design.slice(end);
}
writeFileSync(designPath,design);
const oldReport='docs/gameplay/hoenn-named-trainer-balance-report.md';let old=readFileSync(oldReport,'utf8');const notice='> 이 문서는 commit 5325869의 1차 기준 결과다. 마그마 간부 둘의 최신 결과는 [추가 조정 보고서](magma-executive-balance-report.md)를 따른다.';
if(!old.includes(notice))old=old.replace('\n','\n\n'+notice+'\n');writeFileSync(oldReport,old);
console.log(JSON.stringify({verdict:audit.verdict,metrics:metrics.map(t=>({id:t.id,floors:t.floors,gimmicks:t.gimmicks.after}))}));




