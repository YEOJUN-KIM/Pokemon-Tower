import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const root='artifacts/experiments/balance/galar-tuning-20261019';
const before=JSON.parse(readFileSync(`${root}/before-summary.json`,'utf8')),after=JSON.parse(readFileSync(`${root}/after-summary.json`,'utf8'));
const oldRows=JSON.parse(readFileSync(`${root}/before-battles.json`,'utf8')),rows=JSON.parse(readFileSync(`${root}/after-battles.json`,'utf8'));
const old=(id:string,floor:number)=>before.summary.find((r:any)=>r.id===id&&r.floor===floor);
const current=(id:string,floor=95)=>after.summary.find((r:any)=>r.id===id&&r.floor===floor);
const battles=(id:string,floor=95)=>rows.filter((r:any)=>r.id===id&&r.floor===floor);
const uses=(r:any,key:string)=>r.moves[key]??0;
const rate=(n:number,d=32)=>`${n}/${d} (${(n/d*100).toFixed(1)}%)`;
const pct=(n:number)=>`${(n*100).toFixed(1)}%`;
const occurrence=(id:string,predicate:(r:any)=>boolean,floor=95)=>battles(id,floor).filter(predicate).length;
const moveBattles=(id:string,move:string,floor=95)=>occurrence(id,r=>Object.entries(r.moves).some(([k,v])=>k.endsWith('/'+move)&&(v as number)>0),floor);
const moveTotal=(id:string,move:string,floor=95)=>Object.entries(current(id,floor).moves).reduce((n,[k,v])=>n+(k.endsWith('/'+move)?v as number:0),0);
const effectBattles=(id:string,effect:string)=>occurrence(id,r=>(r.effects[effect]??0)>0);
const weatherBattles=(id:string,weather:string)=>occurrence(id,r=>(r.weather[weather]??0)>0);
const testLog=readFileSync('artifacts/experiments/balance/raw/galar-tuning-all-tests.log','utf8'),tests=testLog.match(/ℹ tests (\d+)/)?.[1],passed=testLog.match(/ℹ pass (\d+)/)?.[1],failed=testLog.match(/ℹ fail (\d+)/)?.[1];
const allister=current('named-allister'),raihan=current('named-raihan'),leon=current('named-leon',100),bede=current('named-bede');
const lines=['# 가라르 NPC 소규모 밸런스 조정 및 행동 검증','',
 '기준 커밋: `edc1d6eb0261e5db9ae17f59d3a6349d5c9f21ec`. 지정한 네 가지 변경만 적용했다. 파티 구성, 육성치, 출전 순서, AI 판단 코드, 비트를 포함한 나머지 10종의 샘플은 그대로다.','',
 '## A. 실제 수정 사항','',
 '| NPC / 포켓몬 | 변경 전 | 변경 후 |','|---|---|---|',
 '| 어니언 / 산호르곤 | 기합의띠 | 도구 없음 |',
 '| 금랑 / 두랄루돈 | 바디프레스 | 악의파동 |',
 '| 단델 / 드래펄트 | 생명의구슬 | 기합의띠 |',
 '| 단델 / 리자몽 | 도구 없음 | 생명의구슬 + 기존 거다이맥스 |','',
 '설계 원본은 `scripts/build-galar-npc-samples.ts`, 생성된 설계는 `scripts/data/npc/galar-design.json`, 검토 소스는 `scripts/data/npc/normal-npc-samples.json`, 런타임은 `src/data/normal-npc-templates.json`이다. 생명의구슬이 있어도 지정된 거다이맥스 권한을 인식하도록 `src/data/npc-gimmicks.ts`와 `src/battle/gimmicks.ts`의 도구 없음 조건만 제거했다. 일반 생명의구슬 포켓몬에 권한을 부여하지 않는다.',
 '', '보존 테스트는 기준 커밋의 원본 행과 비교해 네 필드만 달라졌음을 확인한다. `src/battle/galar-policy.ts`의 SHA-256도 동일하다. 과거 보존 fixture의 가라르 데이터/공용 기믹 해시는 이 승인된 변경을 반영해 갱신했으며, 새 tuning fixture가 나머지 모든 세대와 가라르 10종을 독립적으로 고정한다.','',
 '## B. 테스트와 재현 조건','',
 `- 전체 회귀: ${tests??'집계 중'}개 / 성공 ${passed??'집계 중'} / 실패 ${failed??'집계 중'}. 가라르 전용 + 조정/집계 검증 53개도 별도로 실행했다.`,
 '- TypeScript 검사, 소스/런타임 투영 일치 검사, Next.js 프로덕션 빌드 통과. 빌드는 Windows sandbox의 junction 제약 때문에 승인된 외부 실행을 사용했다.',
 '- 변경 전 832전투 + 변경 후 832전투 = 1,664전투, 양쪽 실행 오류 0건. 각 NPC는 2개 층 × 4개 상대 × 8개 시드 = 64전투다.',
 '- 층: 일반 NPC 45/95, 로즈 75/95, 단델 50/100. 상대: starters(리자몽/거북왕/이상해꽃), offense(한카리아스/메타그로스/라프라스), bulk(야도란/아머까오/트리토돈), signature(따라큐/짜랑고우거/갸라도스).',
 '- 기존 이벤트 ID와 시드, ZMovePolicy 플레이어, 기본 기술과 역할별 성격, 층별 포인트/IV, Expert Belt/Leftovers/Sitrus Berry, 플레이어 basic 룰을 그대로 사용했다. 변경 전 재실행 결과는 기준 커밋의 기존 승률과 일치한다.',
 '- NPC별/층별 offense 1번 시드의 리플레이도 양쪽 26전투씩 재검증했다. 실제 전투의 전체 프로토콜·선택·packed team은 before/after-logs.jsonl에 저장했다.',
 '- 수치는 32전투당 1승 = 3.125%p인 작은 고정 벤치마크다. 실제 사용자 승률이나 통계적으로 확정된 난이도 순위가 아니다.','',
 '## C. 전체 승률 비교','',
 '| NPC | 전반 층 | 전반 전 → 후 | 후반 층 | 후반 전 → 후 |','|---|---:|---:|---:|---:|'];
for(const r of after.summary.filter((r:any)=>r.floor>=95)){
 const early=after.summary.find((x:any)=>x.id===r.id&&x.floor<95),oldLate=old(r.id,r.floor),oldEarly=old(r.id,early.floor);
 lines.push(`| ${r.name} | ${early.floor} | ${pct(oldEarly.winRate)} → ${pct(early.winRate)} | ${r.floor} | ${pct(oldLate.winRate)} → ${pct(r.winRate)} |`);
}
const wins=(s:any)=>s.summary.reduce((n:number,r:any)=>n+r.npcWins,0);
lines.push('',`전체 NPC 승리 합계: ${wins(before)}/832 (${pct(wins(before)/832)}) → ${wins(after)}/832 (${pct(wins(after)/832)}). 변경 대상 이외 10종은 동일 조건에서 승패도 동일하다.`,
 '', '### 주요 4종의 후반 상대별 승리 수','', '| NPC | starters | offense | bulk | signature |','|---|---:|---:|---:|---:|');
for(const id of ['named-allister','named-raihan','named-bede','named-leon']){const f=id==='named-leon'?100:95,r=current(id,f);lines.push(`| ${r.name} | ${['starters','offense','bulk','signature'].map(c=>`${oldRows.filter((x:any)=>x.id===id&&x.floor===f&&x.case===c&&x.winner==='Tower AI').length}/8 → ${rows.filter((x:any)=>x.id===id&&x.floor===f&&x.case===c&&x.winner==='Tower AI').length}/8`).join(' | ')} |`);}
lines.push('','## D. 핵심 기믹 실제 활용','',
 '아래는 후반 32전투 기준이다. `전투 수/32`는 적어도 한 번 실제로 사용/발동한 전투 수이며, 별도로 쓴 `회`는 실제 move/event 로그 횟수다. 단순 선택 명령과 실제 발동을 구분한다.','',
 '| NPC | 핵심 기믹 관측 |','|---|---|',
 `| 야청 | 잔비 ${rate(weatherBattles('named-nessa','RainDance'))}, 순풍 ${rate(effectBattles('named-nessa','p2:tailwind'))}, 거다이암진 ${moveTotal('named-nessa','G-Max Stonesurge')}회. 쓱쓱은 생성된 갈가부기의 실제 특성이며 전용 엔진 특성 계산을 사용한다. |`,
 `| 순무 | 가뭄 ${rate(weatherBattles('named-kabu','SunnyDay'))}, 스텔스록 ${rate(effectBattles('named-kabu','p1:stealthrock'))}, 거다이백화 ${moveTotal('named-kabu','G-Max Centiferno')}회. |`,
 `| 채두 | 칼춤 ${moveTotal('named-bea','Swords Dance')}회, 배수의진 ${moveTotal('named-bea','No Retreat')}회, 거다이회심격 ${moveTotal('named-bea','G-Max Chi Strike')}회. 평균 자발적 교체 ${current('named-bea').meanSwitches.toFixed(2)}회. |`,
 `| 어니언 | 도깨비불 ${moveTotal('named-allister','Will-O-Wisp')}회 / ${rate(moveBattles('named-allister','Will-O-Wisp'))}, 힘흡수 ${uses(allister,'Cursola/Strength Sap')}회, 병상첨병 ${uses(allister,'Cursola/Hex')}회, 상태이상 대상 병상첨병 ${allister.hexOnStatus}회. 탈이 깨지기 전 칼춤 ${allister.swordsDanceWithDisguise}회, 거다이환영 ${moveTotal('named-allister','G-Max Terror')}회. |`,
 `| 마쿠와 | 모래 ${rate(weatherBattles('named-gordie','Sandstorm'))}, 끈적끈적네트 ${rate(effectBattles('named-gordie','p1:stickyweb'))}, 스텔스록 ${rate(effectBattles('named-gordie','p1:stealthrock'))}, 거다이분석 ${moveTotal('named-gordie','G-Max Volcalith')}회. |`,
 `| 멜론 | 나비춤 ${moveTotal('named-melony','Quiver Dance')}회, 불비달마 고드름떨구기 ${moveTotal('named-melony','Icicle Crash')}회, 거다이선율 ${moveTotal('named-melony','G-Max Resonance')}회, 실제 오로라베일 ${rate(effectBattles('named-melony','p2:auroraveil'))}. |`,
 `| 마리 | 도발 ${moveTotal('named-marnie','Taunt')}회, 위협 ${rate(effectBattles('named-marnie','ability:Intimidate'))}, 벌크업 ${moveTotal('named-marnie','Bulk Up')}회, 거다이수마 ${moveTotal('named-marnie','G-Max Snooze')}회. |`,
 `| 비트 | 명상 ${uses(bede,'Hatterene/Calm Mind')}회, 거다이천벌 ${moveTotal('named-bede','G-Max Smite')}회. 자연 벤치마크에서 매직미러 발동은 ${effectBattles('named-bede','Magic Bounce')}전투이며 별도의 실제 반사 테스트에서 발동과 플레이어 마비를 확인했다. |`,
 `| 금랑 | 모래 ${rate(weatherBattles('named-raihan','Sandstorm'))}, 스텔스록 ${rate(effectBattles('named-raihan','p1:stealthrock'))}, 플라이곤 유턴 ${uses(raihan,'Flygon/U-turn')}회, 평균 자발적 교체 ${raihan.meanSwitches.toFixed(2)}회, 거다이감쇠 ${moveTotal('named-raihan','G-Max Depletion')}회. |`,
 `| 직원 | 다이맥스 0, 자발적 교체 0. 약한 기본 강철 파티 역할을 유지. |`,
 `| 올리브 | 길동무 ${moveTotal('named-oleana','Destiny Bond')}회, 밀로틱 HP회복 ${moveTotal('named-oleana','Recover')}회, 미러코트 ${moveTotal('named-oleana','Mirror Coat')}회, 거다이악취 ${moveTotal('named-oleana','G-Max Malodor')}회. |`,
 `| 로즈 | 고정 순서, 자발적 교체 0. 대왕끼리동 거다이맥스 ${rate(current('named-rose').maxBattles)}, 무한다이노 권한/도구/무한다이맥스 0. |`,
 `| 단델 | 킹실드 ${uses(leon,"Aegislash/King's Shield")}회, 약점보험 ${leon.items['Aegislash/Weakness Policy']??0}회, 드래펄트 유턴 ${uses(leon,'Dragapult/U-turn')}회, 거다이옥염 ${uses(leon,'Charizard/G-Max Wildfire')}회. |`,
 '', '### 다이맥스 기회와 실제 사용','',
 '| NPC | 에이스 등장 | 실제 사용 | 평균 사용 턴 | 에이스가 사용 전 쓰러짐 |','|---|---:|---:|---:|---:|');
for(const r of after.summary.filter((r:any)=>r.floor>=95&&r.id!=='macrocosmos-grunt'))lines.push(`| ${r.name} | ${r.aceEntered}/32 | ${r.maxBattles}/32 | ${r.meanMaxTurn.toFixed(2)} | ${r.aceFaintedWithoutMax}/32 |`);
lines.push('','미등장/자원 미사용 자체는 곧 오류를 뜻하지 않는다. 중견이 이긴 전투와 행동 기회를 받기 전에 쓰러진 전투를 분리해서 읽어야 한다. 특히 아래 단델의 선택 가능한 상태에서의 미사용은 별도 문제다.',
 '', '### 어니언','',
 `산호르곤 후반 힘흡수 ${uses(allister,'Cursola/Strength Sap')}회·병상첨병 ${uses(allister,'Cursola/Hex')}회로 도구 없이도 일부 역할을 수행한다. 그러나 후반 산호르곤 자체 도깨비불은 ${uses(allister,'Cursola/Will-O-Wisp')}회이고 상태이상 → 병상첨병 연계는 전후 모두 0회다. 도깨비불은 주로 따라큐가 담당한다. 산호르곤의 느린 속도와 행동 전 피격/기절, 후반 공격 선택이 연계 빈도를 제한한다. 따라큐의 탈 보호 중 칼춤은 정상 관측되었다. 승률은 75.0%로 요청한 목표 범위의 상단에 들어왔으며 추가 변경은 하지 않았다.`,
 '', '### 금랑 — 도구 없음 유지 권고','',
 `두랄루돈은 전후 모두 도구 없음이다. 후반 승률 ${pct(old('named-raihan',95).winRate)} → ${pct(raihan.winRate)}, 다이맥스 32/32. 악의파동은 전반 ${uses(current('named-raihan',45),'Duraludon/Dark Pulse')}회, 후반 일반 악의파동 ${uses(raihan,'Duraludon/Dark Pulse')}회 / 다이아크 ${uses(raihan,'Duraludon/Max Darkness')}회. 바디프레스와 다이너클은 변경 전 선택되지 않았다.`,
 `두랄루돈의 후반 직접 피해 합계(공개 HP 백분율 감소 합)는 ${old('named-raihan',95).damage.Duraludon.toFixed(0)} → ${raihan.damage.Duraludon.toFixed(0)}%p, 다이맥스 중 직접 피해 ${old('named-raihan',95).maxDamage.Duraludon.toFixed(0)} → ${raihan.maxDamage.Duraludon.toFixed(0)}%p다. 평균 활동 턴(의사결정 기회)은 ${(old('named-raihan',95).activeTurns.Duraludon/32).toFixed(2)} → ${(raihan.activeTurns.Duraludon/32).toFixed(2)}.`,
 '도구 없이 +12.5%p 개선되고 기믹 사용이 안정적이어서 이번에는 생명의구슬 후보 실험 조건인 “여전히 지나치게 약함”에 해당하지 않는다고 판단했다. 따라서 별도 생명의구슬 실험은 하지 않았고 실제 데이터에도 넣지 않았다. 유턴 미활용은 아이템 버프로 덮을 문제가 아니라 후속 AI 검토 대상으로 남긴다.',
 '', '### 비트 — 변경 없음','',
 `가디안의 선공 move 관측 ${bede.firstMoves.Gardevoir??0}회, 실제 공격 ${Object.entries(bede.moves).filter(([k])=>k.startsWith('Gardevoir/')).reduce((n,[,v])=>n+(v as number),0)}회, 스카프 고정 위반 ${bede.choiceLockViolations}건. 날쌩마 물리 공격은 실제 로그에 관측되며 HP 피해 합 ${bede.damage.Rapidash??0}%p다. 명상 ${uses(bede,'Hatterene/Calm Mind')}회와 거다이맥스 ${bede.maxBattles}/32는 정상 작동한다. bulk 조합에서 0/8이고 공격수들이 저항·회복 벽을 넘지 못하는 상성 편차가 크다. 매직미러는 대상 변화기가 적은 자연 벤치마크에서 0회지만 실제 반사 회귀 테스트가 통과한다. 낮은 승률을 이유로 버프하지 않았다.`,
 '', '### 단델 — 개선됐지만 챔피언 목표 달성으로 보기는 어려움','',
 '| 항목 | 50층 변경 후 | 100층 변경 후 |','|---|---:|---:|');
for(const [label,fn]of [
 ['약점보험 발동',(r:any)=>String(r.items['Aegislash/Weakness Policy']??0)],
 ['드래펄트 기합의띠 발동',(r:any)=>String(r.items['Dragapult/Focus Sash']??0)],
 ['띠 발동 뒤 같은 출전에서 실제 move를 확보한 사례',(r:any)=>String(r.sashSavedEntries)],
 ['띠 발동 뒤 실제 move 총수',(r:any)=>String(r.sashExtraActions)],
 ['거다이맥스 전투',(r:any)=>`${r.maxBattles}/32`],
 ['거다이옥염 move 횟수',(r:any)=>String(uses(r,'Charizard/G-Max Wildfire'))],
 ['거다이옥염 잔여 피해 합(%p)',(r:any)=>(r.damage['Charizard residual']??0).toFixed(0)],
 ['생명의구슬 반동 피해 합(%p)',(r:any)=>(r.damage['Charizard recoil']??0).toFixed(0)],
 ['리자몽 직접+옥염으로 3마리 기절시킨 전투',(r:any)=>`${r.charizardSweeps}/32`],
 ['리자몽 평균 활동 턴(의사결정 기회)',(r:any)=>(r.activeTurns.Charizard/32).toFixed(2)],
] as [string,(r:any)=>string][])lines.push(`| ${label} | ${fn(current('named-leon',50))} | ${fn(leon)} |`);
lines.push('','띠가 발동했다고 무조건 추가 행동을 얻었다고 세지 않았다. 같은 출전에서 실제 move 로그가 뒤따른 경우만 구분했다. 충전/잠복 기술의 move 선언도 행동으로 세며, 피해를 준 공격과 같다고 주장하지 않는다. 공개 HP는 백분율로 반올림되므로 피해 합은 근사치이고, 다이맥스 시점의 최대 HP 변화도 있다.',
 `100층 드래펄트는 띠 발동 ${leon.items['Dragapult/Focus Sash']}회 중 ${leon.sashSavedEntries}회에서 실제 추가 행동을 확보했다 (${pct(leon.sashSavedEntries/leon.items['Dragapult/Focus Sash'])}). 리자몽의 평균 활동 턴은 ${(old('named-leon',100).activeTurns.Charizard/32).toFixed(2)} → ${(leon.activeTurns.Charizard/32).toFixed(2)}로 줄었다. 두 도구를 동시에 변경했으므로 모든 승률 변화가 생명의구슬 하나 때문이라고 분리해 해석하지 않는다.`,
 `100층 거다이옥염 잔여 피해는 변경 전 ${old('named-leon',100).damage['Charizard residual']} → ${leon.damage['Charizard residual']}%p로 늘었다. 생구 과폭주/리자몽 단독 3킬은 0/32다. 하지만 단델 56.3%는 금랑 65.6%, 올리브 75.0%보다 낮다. “대부분 관장보다 확실히 강한 챔피언” 목표까지 달성했다고 보고하지 않는다.`,
 '', '## E. 행동 품질과 발견한 문제','',
 '- 양쪽 모두 중복 스텔스록/네트/활성 순풍, 같은 랭크업 반복, 고HP 회복 후보, 연속 길동무/킹실드/유턴으로 잡힌 이상 후보는 0건이다. 회복 횟수나 승률만으로 정상임을 단정하지 않았고 실제 HP/공개 상태를 함께 집계했다.',
 '- 킹실드는 전후 64전투 모두 0회다. 배틀스위치의 블레이드 폼 전환과 약점보험은 발동한다. 실제 own request의 details는 `Aegislash, L50`로 남는데 기존 GalarPolicy는 `Aegislash-Blade` 접두어를 요구하므로 보호 선택 조건에 진입하지 못하는 문제가 확인됐다. 이번에는 AI 코드 보존 범위에 따라 수정하지 않았다.',
 '- 금랑의 플라이곤, 단델의 드래펄트 유턴도 전후 0회다. 교체 자체는 금랑 후반 평균 0.81회, 단델 0.75회로 사용되지만 유턴 연계는 활용되지 않는다. 공용 점수기의 직접 화력 우선과 기존 pivot 조건을 후속 검토할 필요가 있다.',
 '- 단델 100층은 리자몽이 등장한 32전투 중 9전투에서 다이맥스 명령이 가능했는데도 일반 솔라빔을 선택하고 사용 전 쓰러졌다. 변경 전 같은 유형은 4전투였다. 띠로 중견 전투가 길어져 상대 HP/진입 상황이 달라지면서 이 기존 판단의 약점이 더 드러났다. 단순 아이템 수치로 해결됐다고 보기 어렵다.',
 '- 어니언의 상태이상→병상첨병 연계는 자연 벤치마크에서 0회다. 마리 도발/벌크업, 올리브 길동무 같은 조건부 기술도 빈도가 낮거나 0회인 항목은 위 표 그대로 보고한다. 기술 존재와 실전 기믹 활용은 별개다.',
 '- 올리브는 거다이맥스가 14/32에서 작동했지만 거다이악취와 미러코트 선택은 0회다. 길동무는 12회로 정상 사용됐다. 마리 도발은 0회, 벌크업은 1회다. 조건부 기회 부족과 점수 편중을 구분하는 후속 AI 검토가 필요하며 이번 데이터에는 손대지 않았다.',
 '- 상성 편차가 크다. 비트는 bulk 0/8을 유지하고, 단델은 100층 starters 2/8 대 signature 8/8이다. 아이템 변경이 모든 상대를 균일하게 강화하지 않는다.',
 '- 공격형 채두는 후반 자발적 교체 0, 마리는 평균 0.50회다. 상위 NPC의 교체 미사용 문제는 없지만, 교체가 매번 최적이라는 보장은 없다. 불필요한 교체 여부는 실제 상대의 미공개 수를 알고 평가하는 치팅 기준을 쓰지 않고 후속 검토 대상으로 남긴다.',
 '- 요청한 파티·기술 변경 외의 AI 패치나 추가 버프는 하지 않았다. 특히 비트·로즈를 포함한 나머지 10종은 기준 커밋과 동일하다.',
 '', '## F. 로즈 회귀','',
 '전후 각 64전투의 등장 순서가 너트령 → 대왕끼리동 → 일반 무한다이노의 접두 순서와 일치한다. 자발적 교체 0, 다이맥스 actor는 대왕끼리동뿐이다. 무한다이노의 다이맥스/무한다이맥스/도구는 없다. 실제 울부짖기 시도에서도 강제 교체를 차단하며, fixedOpponentOrder를 포함한 리플레이가 동일하다. 이 구조의 데이터와 AI는 변경하지 않았다.',
 '', '## 산출물 · 수정 파일','',
 `원시 결과 및 전체 전투 로그: ${root}/before-logs.jsonl, after-logs.jsonl, before/after-battles.json, before/after-summary.json. 각 summary에는 엔진/포맷, 기준 커밋, 입력 조건, 실행 당시 원본 파일 해시가 있다.`,
 '', '재현: 기준 커밋 상태에서 `node node_modules/tsx/dist/cli.mjs scripts/audit-galar-tuning.ts before`, 지정 조정 적용 후 같은 명령의 `after`를 실행한다. `--reanalyze`는 저장된 전체 로그만 다시 집계하며 원래 실행 해시를 유지한다. `scripts/report-galar-tuning.ts`로 이 문서를 생성한다.',
 '', '수정/추가 파일:','');
const paths=execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trimEnd().split('\n').map(l=>l.slice(3).trim()).filter(Boolean);
for(const p of [...new Set([...paths,'scripts/report-galar-tuning.ts','artifacts/reports/npc/galar-npc-tuning.md'])])lines.push(`- \`${p}\``);
for(const phase of ['before','after'])for(const line of readFileSync(`${root}/${phase}-logs.jsonl`,'utf8').trim().split('\n')){
 const e=JSON.parse(line);if(['named-leon','named-allister','named-raihan','named-bede'].includes(e.id)&&e.floor>=95&&e.n===1||phase==='after'&&e.id==='named-leon'&&e.floor===100&&e.case==='starters'&&e.n===2)writeFileSync(`${root}/traces/${phase}-${e.id}-${e.floor}-${e.case}-${e.n}.json`,JSON.stringify(e,null,2)+'\n');
}
writeFileSync('artifacts/reports/npc/galar-npc-tuning.md',lines.join('\n')+'\n');console.log('Wrote artifacts/reports/npc/galar-npc-tuning.md');
