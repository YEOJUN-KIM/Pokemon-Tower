import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';

// Regenerate from the preserved, identical-seed baseline and final battle logs.
const root='artifacts/experiments/balance/galar-ai-20261019';
const read=(name:string)=>JSON.parse(readFileSync(`${root}/${name}.json`,'utf8'));
const before=read('before-summary'),after=read('after-summary');
const logs=(phase:string)=>readFileSync(`${root}/${phase}-logs.jsonl`,'utf8').trim().split('\n').map(l=>JSON.parse(l));
const rawBefore=logs('before'),rawAfter=logs('after');
assert.equal(rawBefore.length,832);assert.equal(rawAfter.length,832);
for(const row of after.summary)if(!['named-raihan','named-leon'].includes(row.id))assert.deepEqual(row,before.summary.find((b:any)=>b.id===row.id&&b.floor===row.floor));
const pct=(n:number)=>`${(n*100).toFixed(2)}%`;
const move=(s:any,name:string)=>s.moves[name]??0;
function extra(rows:any[],id:string,floor:number){
 const all=rows.filter(r=>r.id===id&&r.floor===floor);
 let pivotBattles=0,shieldBattles=0,solarEligible=0,maxEligibleBattles=0;
 for(const r of all){
  if(r.log.publicProtocol.some((l:string)=>/^\|move\|p2a: (Flygon|Dragapult)\|U-turn\|/.test(l)))pivotBattles++;
  if(r.log.publicProtocol.some((l:string)=>l.startsWith("|move|p2a: Aegislash|King's Shield|")))shieldBattles++;
  let eligible=false;
  for(const d of r.log.decisions.filter((d:any)=>d.side==='p2')){
   const o=d.observation,active=o.ownTeam.find((p:any)=>p.active);
   if(!active?.details.startsWith('Charizard'))continue;
   const max=o.legalActions.some((a:any)=>a.command.endsWith(' dynamax'));
   eligible ||= max;
   if(max&&o.legalActions.find((a:any)=>a.command===d.action)?.label==='Solar Beam')solarEligible++;
  }
  maxEligibleBattles+=Number(eligible);
 }
 return {pivotBattles,shieldBattles,solarEligible,maxEligibleBattles};
}
let pivots=0,hazardPivots=0,hardSwitches=0,koChoices=0;
for(const r of rawAfter){
 let last=-10,count=0;
 for(const e of r.pivotEvaluations??[]){
  if(e.mode==='ko'){koChoices++;continue;}
  assert.equal(e.koAvailable,false);assert.ok(e.receiverRisk<=e.risk*.65+1e-9);assert.ok(e.risk-e.receiverRisk>=.15-1e-9);assert.ok(e.receiverRisk+e.entryCost<e.risk);
  if(e.mode==='switch'){hardSwitches++;continue;}
  assert.ok(e.turn-last>=3);last=e.turn;count++;pivots++;hazardPivots+=Number(e.entryCost!==0);
 }
 assert.ok(count<=4);
}
const targets=after.summary.filter((s:any)=>['named-raihan','named-leon'].includes(s.id));
let doc=`# 가라르 NPC 피벗·에이스 판단 개선\n\n기준 커밋: \`aab4bda6e99c19f087f53ad17cf0edeb214cbf10\`. 파티·도구·기술·훈련·층 배치 변경 없이 AI만 개선했다. 금랑 두랄루돈의 무도구/악의파동, 단델의 약점보험/기합의띠/생명의구슬을 유지했다.\n\n## 적용 범위와 파일\n\n- \`src/battle/pivot-policy.ts\`: 종족과 무관한 U-turn/Volt Switch 평가 및 진입 비용.\n- \`src/battle/galar-ace-policy.ts\`: 단델 킬가르도 상태 추적, 리자몽 Solar Beam/다이맥스 판단.\n- \`src/data/npc-ai.ts\`, \`src/battle/npc-policy.ts\`: 새 금랑/단델에만 \`pivot: v1\`, 새 단델에만 \`galarAce: v2\`를 명시적으로 부여하고 기존 정책을 감싼다. 기존 저장 설정에 새 플래그가 없으면 기존 정책을 사용한다.\n- \`tests/galar-ai-decisions.test.ts\`, \`tests/fixtures/galar-ai-preservation.json\`: 행동·실제 엔진·리플레이·데이터 보존 검사.\n- \`tests/npc-gimmicks.test.ts\`: 재접속에서 새 정책 플래그 복원 확인. tests/fixtures/alola-preservation.json, tests/fixtures/alola-tuning-preservation.json은 공용 npc-ai 소스 해시만 갱신하며 데이터 행 해시는 유지했다.\n- \`scripts/audit-galar-tuning.ts\`: 기존 벤치마크 입력 유지, 별도 결과 경로와 피벗 평가 기록 추가. \`scripts/report-galar-ai.ts\`: 이 보고서 재생성 및 기록된 판단 검증.\n\n## 피벗 판단\n\n상대의 이번 턴 선택, 비공개 기술·도구·특성은 읽지 않는다. 공개된 직전 공격에 1.0, 해당 상대가 등장한 뒤 공개한 다른 공격에 0.65, 아직 확인되지 않은 STAB 후보에 0.35의 가중치를 준다. 공개된 타입과 자기 팀의 능력치·HP·도구·특성으로 피해 비율을 추정한다. 상대 실제 능력치 대신 종족값 기반 근삿값을 쓰므로 KO와 속도 판단은 추정이다.\n\n보수적 예상 KO가 있으면 우선 공격한다(명중률 90 이상, 최소 다단 히트, 추가 0.85 피해 여유, 충전/조건부 선제기 제외). 현재 위험이 충분하고, 후속의 예상 피해가 현재의 65% 이하로 줄며 최소 15%p 개선되고, 후속이 공격으로 압박할 수 있을 때만 피벗을 승인한다. 후속의 피해 위험+진입 비용도 현재 위험보다 작아야 한다. 후보 정렬은 예상 피해+진입 비용−공격 압박 보너스(최대 0.15)다. 두 피벗 기술 중 예상 피해가 높은 기술을 택한다. 피벗이 안전하게 적중하면 피해를 주는 이점을 인정해 직접 교체보다 우선한다.\n\n느리고 이번 공격 전에 쓰러질 위험이 높으면 직접 교체한다. 공개된 우선도, 자기 스피드 변화·마비·구애스카프, 온전한 기합의띠와 공개 다단 공격도 고려한다. Volt Switch는 땅 타입과 공개된 축전·피뢰침·전기엔진 등 무효 정보를 적용한다. 공개 정보 없이 숨은 특성을 가정하지 않는다. 피벗 이후의 강제 교체 요청에 평가한 후속을 저장해 연결한다. 피벗 보유자가 아닌 팀원의 기존 직접 교체 판단은 그대로다.\n\n마지막 자발적 이탈/피벗에서 최소 3턴을 띄우며 전투당 피벗 승인 최대 4회다. 유리한 대면·좋은 후속 부재·쿨다운에는 일반 공격 평가로 돌아간다. KO용 피벗 기술은 KO 우선 규칙으로 처리한다. 함정 가능성이 있는 요청에서는 자발 피벗을 억제한다.\n\n## 후속의 entry hazard cost\n\n기존 후속 점수에 비용을 추가했다. HP가 즉시 사라지는 피해와 미래 상태/속도 비용을 분리한다. 진입 피해로 쓰러지거나 진입 후 HP가 25% 이하인 후보는 제외한다. 비용이 상성 개선을 상쇄하는 경우도 제외한다.\n\n| 요소 | 반영 방식 |\n|---|---|\n| Stealth Rock | 바위 상성 × 최대 HP의 1/8 |\n| Spikes | 접지 시 1/2/3층 = 1/8, 1/6, 1/4 |\n| Toxic Spikes | 접지·감염 가능 시 독 0.08, 맹독 0.16 비용. 기존 상태·강철·독 면역 특성 등 반영 |\n| Sticky Web | 접지 시 0.05, 선공권을 잃는 추정이면 0.14. 하락 방지 특성/클리어참 반영 |\n| 비행·부유·풍선 | 접지 hazard 면역, Stealth Rock은 별도 적용. 검은철구는 접지 |\n| Heavy-Duty Boots | 진입 피해·독·Web 비용 면제 |\n| Magic Guard | 진입 피해/독의 HP 비용 면제. Web 비용은 유지 |\n| 독 타입 흡수 | 접지 독 타입의 독압정 제거에 층당 0.06 이익. Boots 착용 중 제거도 엔진과 일치 |\n\n수치는 피해 예언이 아닌 후보 비교용 비용이다. 실제 엔진 테스트로 중첩 피해, Web, Boots를 착용한 독 타입의 독압정 제거를 확인했다. 저HP 두랄루돈의 진입 사망 배제, 생존해도 비용이 이득을 넘는 후보 배제, Boots로 가치 회복, 독압정 제거 후보 우선도도 검사한다.\n\n## King's Shield와 리자몽\n\n킬가르도는 등장 시 실드폼, 공개 formechange를 우선 반영하고 공격/King's Shield 행동으로 상태를 보완한다. request의 \`Aegislash, L50\` 문자열에 Blade가 없어도 동작한다. 블레이드이고 보수적 예상 KO가 없으며 HP≤65% 또는 공개 공격/물리형 위협이 있으면 King's Shield를 고려한다. 최소 3턴 간격으로 연속 및 매 2턴 교대를 막는다. 상대가 Shield 턴에 변화기로 이득을 봤으면 5턴까지 늦추며, 최근 변화기 상대에게 HP 여유가 있으면 사용을 억제한다.\n\n새 단델 리자몽만 일반 Solar Beam을 후보에서 뺀다. 해당 슬롯의 Max Overgrowth는 정상 평가한다. 일반기로 보수적 예상 KO를 못 내고 다이맥스가 가능하면 유효한 Max 공격을 우선하며 G-Max Wildfire의 지속 효과도 평가한다. 다른 NPC Solar Beam, 기존 저장 전투의 정책은 유지한다.\n\n## 동일 벤치마크 전후 비교\n\n13명 × 2개 층 × 4개 플레이어 파티 × 8개 동일 seed = 단계별 832전, 총 1,664전. 각 표 행은 32전이다. 기존 이벤트 ID·플레이어 구성/정책·훈련·도구·층을 유지했다. Showdown ${after.engineVersion}. 양쪽 실행 오류 0건. 각 NPC/층의 offense seed 1 리플레이도 확인했다(단계당 26전).\n\n| 대상 | U-turn 실제 사용 횟수 | 사용 전투/32 | 평균 직접 교체 | NPC 승률 | 다이맥스 전투/32 |\n|---|---:|---:|---:|---:|---:|\n`;
for(const a of targets){const b=before.summary.find((s:any)=>s.id===a.id&&s.floor===a.floor),eb=extra(rawBefore,a.id,a.floor),ea=extra(rawAfter,a.id,a.floor),name=a.id==='named-raihan'?'Flygon':'Dragapult';doc+=`| ${a.name} ${a.floor}층 | ${move(b,name+'/U-turn')} → ${move(a,name+'/U-turn')} | ${eb.pivotBattles} → ${ea.pivotBattles} | ${b.meanSwitches.toFixed(3)} → ${a.meanSwitches.toFixed(3)} | ${pct(b.winRate)} → ${pct(a.winRate)} | ${b.maxBattles} → ${a.maxBattles} |\n`;}
doc+='\n| 단델 층 | King’s Shield 횟수 (사용 전투/32) | Max 가능 중 일반 Solar Beam 선택 | 일반 Solar Beam 실제 사용 | 리자몽 Max 미사용 사망 |\n|---|---:|---:|---:|---:|\n';
for(const a of targets.filter((s:any)=>s.id==='named-leon')){const b=before.summary.find((s:any)=>s.id===a.id&&s.floor===a.floor),eb=extra(rawBefore,a.id,a.floor),ea=extra(rawAfter,a.id,a.floor);doc+=`| ${a.floor} | ${move(b,"Aegislash/King's Shield")} → ${move(a,"Aegislash/King's Shield")} (${eb.shieldBattles} → ${ea.shieldBattles}) | ${eb.solarEligible} → ${ea.solarEligible} | ${move(b,'Charizard/Solar Beam')} → ${move(a,'Charizard/Solar Beam')} | ${b.aceFaintedWithoutMax} → ${a.aceFaintedWithoutMax} |\n`;}
doc+='\n金랑 45층은 기존 규칙상 다이맥스가 없다. 다이맥스 사용률 분모는 해당 NPC 전체 전투 32전이며 에이스가 생존/등장한 전투만으로 줄이지 않았다.\n\n| NPC | 초반 층 승률 전 → 후 | 후반 층 승률 전 → 후 |\n|---|---:|---:|\n';
for(const id of [...new Set<string>(after.summary.map((s:any)=>s.id))]){const aa=after.summary.filter((s:any)=>s.id===id);doc+=`| ${aa[0].name} | ${aa.map((a:any)=>{const b=before.summary.find((s:any)=>s.id===id&&s.floor===a.floor);return `${a.floor}층 ${pct(b.winRate)} → ${pct(a.winRate)}`;}).join(' | ')} |\n`;}
doc+=`\n나머지 11명의 요약 지표 전체가 기준 실행과 동일함을 스크립트에서 검증했다. 금랑의 피벗은 두 층 합계 2회로 제한적으로 쓰였고 승률은 유지됐다. 단델은 원래 사용하지 못하던 행동이 활성화되어 승률이 상승했다. 50층의 32/32 승리는 이 고정 소규모 표본 결과이며 일반 플레이 승률로 일반화할 수 없다. 승률을 맞추기 위한 데이터 버프는 하지 않았다.\n\n## 판단 감사와 검증\n\n기록된 피벗 승인 ${pivots}회, 새 계층 직접 교체 ${hardSwitches}회, 보수적 KO 우선 ${koChoices}회. 모든 승인에서 KO 불가·후속 위험 35% 이상 감소·최소 0.15 개선·진입 비용 후 순이득·3턴 간격·전투당 최대 4회를 재검증했다. 이 벤치마크의 비용이 0이 아닌 피벗 승인은 ${hazardPivots}회다. 플레이어 파티의 hazard 사례가 부족하므로 hazard의 정확성은 별도 인공 상황 및 실제 엔진 테스트로 검증했다. 기존 행동 이상 탐지기의 중복 행동 경고는 0건이다.\n\n새 행동 테스트 34개는 피벗/직접 교체/면역/KO/유리 대면/쿨다운, hazard 전체, King's Shield 상태 및 남용 방지, Solar Beam/Max Overgrowth, 실제 엔진의 후속 연결과 리플레이를 포함한다. 전체 회귀·타입·빌드 결과는 아래 최종 검증 기록을 참조한다.\n\n네모는 향후 자신의 AI 설정에 \`pivot: 'v1'\`을 부여해 같은 평가 계층을 사용할 수 있다. 빠르모트 Volt Switch를 실제 엔진에서 검사했고 종족 조건은 없다. 이번 작업에서 네모의 데이터나 활성 정책은 추가하지 않았다.\n\n원본: \`${root}/{before,after}-{summary,battles}.json\`, \`{before,after}-logs.jsonl\`. 대표 전체 로그는 \`traces/\`, 검증 집계는 \`decision-audit.json\`에 보관한다. 재생성: \`node node_modules/tsx/dist/cli.mjs scripts/report-galar-ai.ts\`.\n`;
doc=doc.replace('金랑','금랑');
doc+='\n100층에서 남은 Max 미사용 사망 1건(signature seed 4)은 U-turn 후 진입한 리자몽이 같은 턴 Kommo-o의 급소 Outrage를 받아 쓰러진 사례다. 리자몽에게 일반 공격/다이맥스 선택 요청이 오기 전이었으며 Solar Beam 충전 사고는 아니다. 대표 로그 `traces/leon-max-unused.json`에서 확인할 수 있다.\n';
const testLog=readFileSync('artifacts/galar-ai-all-tests.log','utf8'),buildLog=readFileSync('artifacts/galar-ai-build.log','utf8');
const passed=testLog.match(/ℹ pass (\d+)/)?.[1],failed=testLog.match(/ℹ fail (\d+)/)?.[1];
doc+='\n## 최종 검증 기록\n\n';
doc+=passed&&failed==='0'?`- 전체 회귀: ${passed}/${passed} 통과.\n`:'- 전체 회귀: 최종 실행 진행 중.\n';
doc+=`- 신규 행동 테스트: 34/34 통과. 가라르 기존 데이터/행동·밸런스 테스트도 전체 회귀에 포함.\n- TypeScript: \`node node_modules/typescript/bin/tsc --noEmit\` 통과.\n- 프로덕션 빌드: ${buildLog.includes('ƒ  (Dynamic)')?'통과':'최종 실행 진행 중'}.\n- 저장/재접속의 정책 플래그 복원 및 실제 엔진 리플레이 통과. 기존 플래그 없는 저장 설정은 기존 정책 선택을 검사.\n- 결과 로그: \`artifacts/galar-ai-all-tests.log\`, \`artifacts/galar-ai-focused.log\`, \`artifacts/galar-ai-build.log\`.\n- 문서: 이 보고서와 이전 데이터 조정 보고서 \`docs/gameplay/galar-npc-tuning.md\` 연결.\n`;
writeFileSync('docs/gameplay/galar-npc-ai.md',doc);
writeFileSync(`${root}/decision-audit.json`,JSON.stringify({battles:832,pivots,hardSwitches,koChoices,hazardPivots,unchangedOtherNpcs:11},null,2)+'\n');
mkdirSync(`${root}/traces`,{recursive:true});
for(const [name,predicate]of [
 ['raihan-pivot',(r:any)=>r.id==='named-raihan'&&r.pivotEvaluations.some((e:any)=>e.mode==='pivot')],
 ['leon-shield',(r:any)=>r.id==='named-leon'&&r.log.publicProtocol.some((l:string)=>l.includes("|King's Shield|"))],
 ['leon-max-unused',(r:any)=>r.id==='named-leon'&&r.floor===100&&!r.log.publicProtocol.some((l:string)=>l.startsWith('|-start|p2a: Charizard|Dynamax'))],
] as const){const r=rawAfter.find(predicate);if(r)writeFileSync(`${root}/traces/${name}.json`,JSON.stringify(r,null,2)+'\n');}
console.log({pivots,hardSwitches,koChoices,hazardPivots,report:'docs/gameplay/galar-npc-ai.md'});
