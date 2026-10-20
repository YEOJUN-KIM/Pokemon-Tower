import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import preservation from '../tests/fixtures/alola-tuning-preservation.json' with {type:'json'};

const root='artifacts/experiments/balance/alola-tuning-20261018';
const json=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const rows=(p:string):any[]=>readFileSync(`${root}/${p}.jsonl`,'utf8').trim().split('\n').filter(Boolean).map(l=>JSON.parse(l));
const before=rows('before'),after=rows('after'),holdBefore=rows('holdout-before'),holdAfter=rows('holdout-after');
const smartBefore=rows('smart-before'),smartAfter=rows('smart-after');
const key=(r:any)=>[r.id,r.floor,r.case,r.seed,...r.battleSeed].join(':');
for(const [b,a,n]of [[before,after,768],[holdBefore,holdAfter,384],[smartBefore,smartAfter,192]] as const){assert.equal(b.length,n);assert.equal(a.length,n);assert.deepEqual(b.map(key).sort(),a.map(key).sort());assert.ok([...b,...a].every(r=>['Player','Tower AI'].includes(r.winner)));}
const digest=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fileHash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const reviewed=json('scripts/data/npc/normal-npc-samples.json').samples,runtime=json('src/data/normal-npc-templates.json'),baseline=json(root+'/baseline-reviewed.json').samples;
const kept=(r:any[])=>r.filter(r=>!preservation.ids.includes(r.id)).sort((a,b)=>(a.id+a.stage).localeCompare(b.id+b.stage));
assert.equal(digest(kept(runtime)),preservation.runtime);assert.equal(digest(kept(reviewed)),preservation.source);
for(const p of ['after','holdout-after','smart-after'])assert.equal(json(`${root}/${p}-manifest.json`).runtime,fileHash('src/data/normal-npc-templates.json'));
for(const p of ['before','holdout-before','smart-before'])assert.equal(json(`${root}/${p}-manifest.json`).runtime,fileHash(root+'/baseline-runtime.json'));
for(const [path,hash]of Object.entries(preservation.common))assert.equal(createHash('sha256').update(readFileSync(path,'utf8').replace(/\r\n/g,'\n')).digest('hex'),hash,path);
const mean=(a:number[])=>a.length?a.reduce((a,b)=>a+b,0)/a.length:0;
function summary(r:any[],template:any){
 const wins=r.filter(r=>r.winner==='Tower AI'),sum=(f:(r:any)=>number)=>r.reduce((n,r)=>n+f(r),0);
 const pokemon=template.team.map((p:any)=>{
  const selected=r.filter(r=>r.team.includes(p.species)),appeared=selected.filter(r=>r.telemetry.pokemon[p.species]?.entries>0);
  const sum=(field:string)=>r.reduce((n,r)=>n+(r.telemetry.pokemon[p.species]?.[field]??0),0);
  const actualMoves:Record<string,number>={};for(const battle of r)for(const [m,n]of Object.entries(battle.telemetry.pokemon[p.species]?.moves??{}))actualMoves[m]=(actualMoves[m]??0)+Number(n);
  const moves=Object.fromEntries(p.profile.moves.map((m:string)=>[m,actualMoves[m]??0]));
  const totalKOs=sum('directKOs')+sum('residualKOs');
  return {species:p.species,selectedBattles:selected.length,appearedBattles:appeared.length,entryEvents:sum('entries'),averageActiveTurnsPerAppearedBattle:mean(appeared.map(r=>r.telemetry.pokemon[p.species].activeTurns)),averageActiveTurnsPerEntry:sum('entries')?sum('activeTurns')/sum('entries'):0,directKOs:sum('directKOs'),residualKOs:sum('residualKOs'),totalKOs,averageKOsPerAppearedBattle:appeared.length?totalKOs/appeared.length:0,threeKOBattles:appeared.filter(r=>r.telemetry.pokemon[p.species].directKOs>=3).length,switchIns:sum('switchIns'),switchOuts:sum('switchOuts'),moves,unusedMoves:Object.entries(moves).filter(([,n])=>n===0).map(([m])=>m),actualMoves};
 });
 return {battles:r.length,npcWins:wins.length,playerWins:r.filter(r=>r.winner==='Player').length,npcWinRate:r.length?wins.length/r.length:0,averageRemainingNpc:mean(r.map(r=>r.telemetry.remainingNpc)),averageRemainingPlayer:mean(r.map(r=>r.telemetry.remainingPlayer)),averageRemainingNpcOnWins:mean(wins.map(r=>r.telemetry.remainingNpc)),averageTurns:mean(r.map(r=>r.turns)),voluntarySwitches:sum(r=>r.telemetry.voluntarySwitches),pokemon,z:{equipped:sum(r=>Number(r.telemetry.z.equipped)),legalBattles:sum(r=>Number(r.telemetry.z.legal)),used:sum(r=>r.telemetry.z.used),directKOs:sum(r=>r.telemetry.z.directKOs)},whiteHerb:sum(r=>r.telemetry.whiteHerb),unburden:sum(r=>r.telemetry.unburden),intimidate:sum(r=>r.telemetry.intimidate),galeEligibleTurns:sum(r=>r.telemetry.galeEligibleTurns),galeUsed:sum(r=>r.telemetry.galeUsed),galeBraveBird:sum(r=>r.telemetry.galeBraveBird),thickClubBattles:sum(r=>r.telemetry.thickClub)};
}
const results=preservation.ids.map(id=>{
 const old=baseline.find((r:any)=>r.id===id),current=reviewed.find((r:any)=>r.id===id),filter=(r:any[])=>r.filter(r=>r.id===id);
 const summarize=(r:any[],t:any)=>summary(filter(r),t);
 return {id,name:current.name,conclusion:'유지 가능',lineup:current.team.map((p:any)=>p.species),ace:current.ace,signature:current.signature,sets:current.team,primary:{before:summarize(before,old),after:summarize(after,current)},holdout:{before:summarize(holdBefore,old),after:summarize(holdAfter,current)},smart:{before:summarize(smartBefore,old),after:summarize(smartAfter,current)},combined:{before:summarize([...before,...holdBefore],old),after:summarize([...after,...holdAfter],current)},all:{before:summarize([...before,...holdBefore,...smartBefore],old),after:summarize([...after,...holdAfter,...smartAfter],current)},byFloor:[45,95].map(floor=>({floor,before:summarize(before.filter(r=>r.floor===floor),old),after:summarize(after.filter(r=>r.floor===floor),current)})),byCase:[...new Set([...after,...holdAfter].map(r=>r.case))].map(caseId=>({caseId,before:summarize([...before,...holdBefore].filter(r=>r.case===caseId),old),after:summarize([...after,...holdAfter].filter(r=>r.case===caseId),current)}))};
});
const validation={fullTests:readFileSync(root+'/full-tests.log','utf8').match(/tests (\d+)/)?.[1],fullPassed:readFileSync(root+'/full-tests.log','utf8').match(/pass (\d+)/)?.[1],e2e:readFileSync(root+'/e2e.log','utf8').match(/(\d+) passed/)?.[1],typecheck:true,runtimeRows:runtime.length,preservedRows:preservation.count};
assert.equal(validation.fullTests,'1000');assert.equal(validation.fullPassed,'1000');assert.equal(validation.e2e,'3');
const manifests=Object.fromEntries(['before','after','holdout-before','holdout-after','smart-before','smart-after'].map(p=>[p,{...json(`${root}/${p}-manifest.json`),dataHash:fileHash(`${root}/${p}.jsonl`)}]));
const output={date:'2026-10-18',method:'Paired independent battles, 45/95 floors, same seeds before/after. Primary: eight teams ×16 seeds ×2 floors =256 per NPC, DamagePolicy. Holdout: eight different teams ×8 new seeds ×2 floors =128 per NPC, TowerPolicy. Extra adaptive-player check: holdout teams ×4 new seeds ×2 floors =64 per NPC, LearningOpponentPolicy(p1). Player has curated defaults, 31 IV, 66 normal points, no held items; NPC retains existing 48/66 budgets, named IV distribution, Tactical/Expert and gimmick gates. Not human win rates.',errors:0,pairedBeforeBattles:before.length+holdBefore.length+smartBefore.length,pairedAfterBattles:after.length+holdAfter.length+smartAfter.length,validation,manifests,results};
writeFileSync('artifacts/reports/npc/alola-tuning.json',JSON.stringify(output,null,2)+'\n');
const pct=(s:any)=>`${(100*s.npcWinRate).toFixed(1)}% (${s.npcWins}/${s.battles})`,f=(n:number)=>n.toFixed(2);
const md=[
 '# 라이치·카일리·키아웨 고정 파티 조정 보고','',
 '2026-10-18. 세 NPC만 수정했다. 대상 밖 224개 검토 원본/런타임 행, 다른 알로라 NPC 메타데이터, 공유 세팅과 공용 엔진·AI·기믹은 보존 해시 검사로 확인했다. 구즈마·루자미네·쿠쿠이 및 1–6세대는 변경하지 않았다.','',
 '## 1. 비교 결과와 판단','',
 '|NPC|같은 조건 수정 전 256전|고정 파티 수정 후 256전|별도 상대·시드·정책 전→후 128전|판단|','|---|---|---|---|---|',
 ...results.map(r=>`|${r.name}|${pct(r.primary.before)}|${pct(r.primary.after)}|${pct(r.holdout.before)} → ${pct(r.holdout.after)}|${r.conclusion}|`),'',
 '각 NPC의 수정 후 독립 표본은 총 384전이다. 위 두 실험의 상대 파티·플레이어 정책이 달라 서로 섞은 비율보다 각각의 전후 비교를 우선한다. 정규 실험은 8종 파티 ×16시드 ×45/95층, 별도 확인은 다른 8종 파티 ×새 시드 8개 ×45/95층이다. 플레이어는 31 IV/정상 66포인트/역할별 성격/기존 pokemonSets 기술/도구 없음이며 정규 실험 DamagePolicy, 별도 실험 TowerPolicy를 사용한다. NPC는 원래 캡틴 48·사천왕 66포인트와 층별 축소·네임드 IV 규칙을 유지한다. 45층은 기존 제한대로 Z가 없고 95층은 기존 Z가 허용된다.','',
 '초기 16전의 라이치 0/16·카일리 2/16·키아웨 0/16은 네 고정 팀과 작은 시드 표본의 결과였다. 이번 더 넓은 상대·다른 시드 표본에서는 수정 전부터 승률이 더 높다. 따라서 작은 원래 수치에서 최종 수치로의 차이를 모두 버프 효과로 계산하지 않는다. 버프 효과는 위의 동일 조건 전후에서 평가한다. 사람 상대 승률·등반 완주율·통계적 난이도 서열을 뜻하지 않는다.','',
 '멤버 변경·순서·기술·도구를 함께 바꿨으므로 개선을 랜덤 선출 제거 하나의 효과로 단정할 수 없다. 이번 요청의 고정 파티 검증 범위에서는 세 팀 모두 정상적인 경쟁력을 보였다.','',
 '### 학습·교체하는 플레이어 AI 추가 확인','',
 'DamagePolicy/TowerPolicy는 흡수 특성을 충분히 학습하지 못할 수 있어, 별도 8종 파티와 새 시드 25–28로 LearningOpponentPolicy(p1)를 사용한 64전/NPC도 전후 비교했다. 이는 공개 정보로 면역을 학습하고 교체하며 숨겨진 상대 정보를 받지 않는다.','',
 '|NPC|수정 전 64전|수정 후 64전|','|---|---|---|',
 ...results.map(r=>`|${r.name}|${pct(r.smart.before)}|${pct(r.smart.after)}|`),'',
 '카일리는 이 조건에서 27→20승으로 악화됐다. 따라서 고정 파티가 모든 정책에 대해 우월하다고 결론 내리지 않는다. 수정 후에도 31.3%로 요청의 문제 범위인 10–15%를 벗어나 있으므로 현재 파티는 유지 가능으로 판단하되, 더 똑똑한 상대에 대한 후속 평가 대상으로 남긴다. 이 추가 확인까지 합하면 NPC당 수정 후 448전이며, 아래 상세 telemetry 표는 비교가 일관된 정규+별도 표본 384전을 사용한다. 추가 64전의 전체 telemetry도 JSON의 smart/all에 별도 기록했다.','',
 '## 2. 최종 3마리와 초기 순서','',
 '기존 `allFloors:true, select:true`를 유지하고 후보를 정확히 3마리, `required`도 같은 3마리로 지정했다. `preferredLead`와 `preferredLast`가 중간 한 마리까지 결정하므로 초기 배열은 아래와 같다. 전투 중 Tactical/Expert의 합리적인 교체는 허용한다. 미지원 fixedTeam/randomSelection 필드를 추가하지 않았다. 카일리의 대표 및 Z 담당은 왕큰부리, 마지막 마무리 담당은 루차불이다.','',
 ...results.map(r=>`- ${r.name}: **${r.lineup.join(' → ')}**.`),'',
];
for(const r of results){md.push(`### ${r.name} 세팅`,'','|포켓몬|특성|도구|성격|훈련 HP/공/방/특공/특방/속|기술|','|---|---|---|---|---|---|');for(const p of r.sets)md.push(`|${p.species}|${p.profile.ability}|${p.item}|${p.profile.nature}|${Object.values(p.profile.evs).join('/')}|${p.profile.moves.join(' / ')}|`);md.push('');}
md.push('## 3. 합법성과 조정 이유','',
 '- 설치된 pokemon-showdown TeamValidator와 프로젝트 수집 키로 9세트의 종/기술/특성/도구/성격을 확인했다. 모두 정상적인 물리·특수·내구 역할이며 공유 종의 타 NPC 세팅은 바꾸지 않는 trainer별 override다. Ancient Power는 릴리요에게 합법적이며 Power Gem을 강제로 넣지 않았다. 시라칸의 Aqua Jet는 설치 learnset에 없어 Zen Headbutt로 대체했다.','',
 '- 라이치는 Storm Drain/Leftovers/Recover 릴리요가 물 공격에 대한 피난처를 제공하고, Rock Head/Choice Band/Head Smash 시라칸이 중반을 압박한다. 현재 지원되는 정오 Lycanroc와 Rockium Z를 유지했다. 모래가 없는 파티에서 Sand Rush 대신 합법적인 Keen Eye를 사용한다.','',
 '- 카일리는 무장조 Rocky Helmet·Roost에 실제 사용하는 Toxic/Drill Run을 더했다. 초안 Iron Head/Body Press는 정규 256전에서 사용되지 않아 데이터로 대체했다. Spikes/Stealth Rock/Whirlwind를 넣지 않았다. 왕큰부리는 Flyinium Z와 Skill Link/연속기/Beak Blast를 유지한다. 루차불 White Herb/Close Combat/Unburden은 실제 작동했으며 Swords Dance도 사용되어 유지했다.','',
 '- 키아웨는 Intimidate/Sitrus 선봉 윈디, Sharp Beak/Gale Wings 파이어로, 기존 Lightning Rod/Thick Club 텅구리를 사용한다. 생명의구슬의 추가 자해 대신 부리 도구를 선택했고 훈련 한도는 올리지 않았다. 파이어로의 Roost와 Swords Dance 모두 사용됐다.','',
 '- 초안 윈디 Extreme Speed/Crunch, Lycanroc Accelerock은 256전에서 0회였다. 현재 전술 점수는 낮은 HP의 KO 가능성을 기준으로 선공기를 충분히 우선하지 않고 큰 예상 피해를 선호한다. 데이터만으로 윈디는 Crunch→Close Combat, Extreme Speed→Play Rough, Lycanroc는 Accelerock→Play Rough로 바꿨다. 이는 추천안에서의 의도적인 보정이다. 선공기 AI를 특별 조작하지 않았고 마지막 에이스는 속도 투자와 Jolly로 마무리한다.','',
 '## 4. NPC 전체 telemetry','',
 '|NPC|수정 후 표본|NPC 승/패|평균 남은 NPC/플레이어|승리 시 NPC 생존|평균 턴|자발 교체|','|---|---:|---|---|---:|---:|---:|',
 ...results.map(r=>{const s=r.combined.after;return `|${r.name}|${s.battles}|${s.npcWins}/${s.playerWins}|${f(s.averageRemainingNpc)} / ${f(s.averageRemainingPlayer)}|${f(s.averageRemainingNpcOnWins)}|${f(s.averageTurns)}|${s.voluntarySwitches}|`;}),'',
 '다음 포켓몬별 표는 정규+별도 확인의 384전이다. 실제 출전은 벤치에서 끝난 전투를 제외하며 재진입을 구분한다. 생존 턴은 필드에서 활동한 턴의 합을 실제 출전 전투 수로 나눈 값이고, 교체로 벤치에 머문 시간은 제외한다. KO는 직접 기술 KO와 명시적으로 출처가 확인되는 잔여 피해(예: Rocky Helmet)를 분리한다. Z KO는 직접 KO에 이미 포함하므로 중복 합산하지 않는다.','');
for(const r of results){const s=r.combined.after;md.push(`### ${r.name} 기여도`,'','|포켓몬|실출전 전투/진입 횟수|평균 활성 턴|직접 KO|잔여 KO|총 KO/출전 평균|재진입/교체 이탈|3KO 전투|','|---|---|---:|---:|---:|---|---|---:|');for(const p of s.pokemon)md.push(`|${p.species}|${p.appearedBattles}/${p.entryEvents}|${f(p.averageActiveTurnsPerAppearedBattle)}|${p.directKOs}|${p.residualKOs}|${p.totalKOs} / ${f(p.averageKOsPerAppearedBattle)}|${p.switchIns}/${p.switchOuts}|${p.threeKOBattles}|`);md.push('','|포켓몬|기술별 실제 사용 횟수|표본에서 0회|','|---|---|---|');for(const p of s.pokemon)md.push(`|${p.species}|${Object.entries(p.actualMoves).map(([m,n])=>`${m}: ${n}`).join(' / ')}|${p.unusedMoves.join(', ')||'없음'}|`);md.push('');}
md.push('## 5. Z·특성·도구 실제 발동','',
 '|NPC|Z 장착 전투|실제로 선택 가능했던 전투|실제 Z 사용|Z 직접 KO|','|---|---:|---:|---:|---:|',
 ...results.filter(r=>r.signature).map(r=>{const z=r.combined.after.z;return `|${r.name} / ${r.signature.item}|${z.equipped}|${z.legalBattles}|${z.used}|${z.directKOs}|`;}),'',
 ...results.map(r=>{const s=r.combined.after;return `- ${r.name}: White Herb 소비 ${s.whiteHerb}, 실제 Unburden 스피드 배율 확인 전투 ${s.unburden}, Intimidate 발동 ${s.intimidate}, Gale Wings 조건 충족 결정 턴 ${s.galeEligibleTurns}, 실제 우선도 적용 Flying 기술 ${s.galeUsed}(Brave Bird ${s.galeBraveBird}), 실제 Thick Club 공격 배율 확인 전투 ${s.thickClubBattles}.`;}),'',
 'Unburden은 공개 로그에 전용 발동 메시지가 없어 하양허브 소모만으로 추정하지 않았다. 시뮬레이션 프로세스 안에서 원래 runEvent의 반환값을 그대로 위임하는 관찰자를 붙여 실제 ModifySpe 2배 적용·Unburden volatile을 확인했다. Thick Club은 실제 ModifyAtk 배율, Gale Wings는 실제 ModifyPriority 결과와 사용된 기술을 함께 확인했다. 관찰자 유무가 같은 시드의 배틀 출력/선택을 바꾸지 않는 회귀 테스트를 통과한다. 프로덕션 엔진은 변경하지 않는다.','',
 '하양허브 소비 242회와 실제 스피드 2배 계산 확인 241회 사이의 1회 차이도 재현했다. 95층 holdout-fast 시드 23에서 Close Combat으로 마지막 Greninja를 쓰러뜨린 직후 허브가 소비되고 즉시 승리해 후속 스피드 계산이 없었다. 소비만 보고 곡예의 실제 활용 횟수를 부풀리지 않았다.','',
 '별도 설치 엔진 테스트에서 White Herb의 방어/특방 감소 초기화·소비 → Unburden 스피드 2배, Acrobatics 기초위력 55→110, 최대 HP Gale Wings의 선공과 Brave Bird 반동 후 우선도 상실, Thick Club 실제 공격 100→200, Rock Head Head Smash의 무반동을 확인했다.','',
 '## 6. dead slot과 남은 한계','',
 '최종 세팅의 광범위 표본에서 남은 0회 슬롯은 아래에 그대로 공개한다.','',
 ...results.flatMap(r=>r.combined.after.pokemon.filter((p:any)=>p.unusedMoves.length).map((p:any)=>`- ${r.name}/${p.species}: ${p.unusedMoves.join(', ')}.`)),'',
 '시라칸 Zen Headbutt는 Head Smash와 선택 기회가 겹치고 실제 벤치·교체 흐름에서 필요한 상대와 만나지 않아 표본 사용이 없었다. 단순히 기술 타입만 확인한 것이 아니라 별도 합법 세트의 Toxicroak 대면에서 Expert가 실제 Zen Headbutt를 선택·사용하는 엔진 테스트를 통과했다. 따라서 이 슬롯은 조건부 커버리지로 유지하며, 숨겨진 미지원 보조기를 넣지 않았다. 삭제한 신속/액셀록의 KO 선공 판단 부족은 공용 AI의 후속 과제로만 남긴다.','',
 '모든 멤버가 KO·피해/유틸리티를 나누어 맡고, 단 한 마리만 승리를 만드는 구조로 측정되지는 않았다. 다만 마지막 텅구리가 느린 물리 에이스라 실제 행동 전 KO되거나 AI가 합리적 교체로 파이어로보다 먼저 내보내는 경우도 있다. 고정 배열은 전투 중 출전 순서를 강제로 묶지 않는다.','',
 '타입 상성 특화 팀에서 여전히 취약할 수 있다. 아래는 0승이거나 90% 이상 승률인 조건을 숨기지 않고 정리한 것이다. 이 극단 표본만으로 NPC 전체를 제거하거나 숨은 능력치를 추가하지 않았다.','',
 ...results.flatMap(r=>r.byCase.filter(c=>c.after.npcWinRate===0||c.after.npcWinRate>=.9).map(c=>`- ${r.name}/${c.caseId}: ${pct(c.after)}.`)),'',
 '키아웨가 카일리와 비슷하거나 일부 조건에서 더 높은 비율을 보이는 것은 시험 상대의 타입·속도·교체 흐름에 좌우된다. 캡틴은 여전히 48포인트/Tactical, 사천왕은 66포인트/후반 Expert로 분리되어 있으며 승률만 맞추려고 육성 규칙을 변경하지 않았다.','',
 '## 7. 검증과 변경 파일','',
 `- 전체 단위/통합 **${validation.fullPassed}/${validation.fullTests} 통과**, 신규 집중 테스트 10개. 최종 기믹/보존 테스트와 TypeScript 검사 통과.`,
 `- 프로덕션 Next 빌드 통과. Chrome E2E **${validation.e2e}/3 통과**: 세 고정 배열, 실제 초기 선봉, 390/1280px, 명령 처리와 새로고침 후 동일 저장 팀 확인.`,
 `- 런타임 투영 **${validation.runtimeRows}행 일치**, 대상 밖 **${validation.preservedRows}행** 보존. 층 7개×100시드×3NPC의 초기 배열 검사.`,
 '- 정규+별도 비교 2,304전에 학습·교체 AI 확인 384전을 더해, 최종 비교는 수정 전 1,344전 + 수정 후 1,344전 = **2,688전**, 완료 실패 0. 초안 iteration1/iteration2 및 기믹 재현은 최종 표본과 별도이며 중복 계산하지 않는다.',
 '- 구현: `scripts/build-alola-npc-samples.ts`, `scripts/data/npc/alola-design.json`, `scripts/data/npc/normal-npc-samples.json`, `src/data/normal-npc-templates.json`.',
 '- 검증/보고: `scripts/simulate-alola-tuning.ts`, `scripts/lib/alola-tuning-telemetry.ts`, `scripts/capture-alola-tuning-preservation.ts`, `scripts/report-alola-tuning.ts`, `tests/alola-tuning.test.ts`, `tests/fixtures/alola-tuning-preservation.json`, `e2e/alola-tuning.spec.ts`.',
 '- 기존 테스트 두 곳의 랜덤 다양성 조건은 세 후보 전부 required인 고정 파티에 대해 가능한 편성 1개를 검증하도록 갱신했다. 다른 NPC의 다양성 조건은 유지한다.',
 '- 문서: 이 보고서, `alola-team-data.md`의 대상 세 명 표, 초기 `alola-named-trainers.md`의 후속 조정 안내. 집계 JSON은 `artifacts/reports/npc/alola-tuning.json`.',
 '- 원시 전투별 telemetry·manifest·원본 스냅샷·로그는 `artifacts/experiments/balance/alola-tuning-20261018/`에 둔다. 집계 JSON에 입력별 SHA-256을 기록한다.',
 '- 이번 범위에서는 추가 버프를 권하지 않는다. 카일리의 학습·교체 AI 조건 회귀는 후속 표본에서 계속 확인할 대상이고, 일반적인 선공기 KO 판단도 별도 개선 후보다. 구즈마 First Impression/교체 AI 및 빌런 스토리 연결은 건드리지 않았다.','',
 '## 최종 결론','',
 '- **라이치: 유지 가능.** 물 대응·회복 선봉과 두 물리 공격수가 역할을 나누고 정규/별도 표본 모두 개선됐다.',
 '- **카일리: 유지 가능.** 수동적인 조합을 줄였으며 Beak Blast/Z와 루차불의 White Herb/Unburden/Acrobatics가 작동한다. 단, 학습·교체 AI 표본의 42.2→31.3% 회귀는 남아 있어 모든 환경의 성능 개선을 주장하지 않는다.',
 '- **키아웨: 유지 가능.** 캡틴 육성을 유지한 채 0–10%대를 벗어났고 실제 Gale Wings·회복·보존한 텅구리 도구 효과가 확인됐다.',
 '');
writeFileSync('artifacts/reports/npc/alola-npc-tuning.md',md.join('\n'));
// Update only the three current team tables; all other NPC sections are intact.
let teams=readFileSync('artifacts/reports/npc/alola-team-data.md','utf8');
for(const r of results){const heading=`## ${r.name} / ${r.id==='named-kiawe'?'captain':'elite'}`,block=[heading,'',`고정 순서: ${r.lineup.join(' → ')}. 3마리 모두 필수. [후속 조정 보고](alola-npc-tuning.md).`,'','|포켓몬|종족값 HP/공/방/특공/특방/속|성격|특성|도구|훈련 HP/공/방/특공/특방/속|기술|','|---|---|---|---|---|---|---|'];const dex=Showdown.Dex;for(const p of r.sets)block.push(`|${p.species}|${Object.values(dex.species.get(p.species).baseStats).join('/')}|${p.profile.nature}|${p.profile.ability}|${p.item}|${Object.values(p.profile.evs).join('/')}|${p.profile.moves.join(' / ')}|`);block.push('','');const start=teams.indexOf(heading),end=teams.indexOf('\n## ',start+1);assert.ok(start>=0);teams=teams.slice(0,start)+block.join('\n')+teams.slice(end<0?teams.length:end+1);}
writeFileSync('artifacts/reports/npc/alola-team-data.md',teams);
const report='artifacts/reports/npc/alola-named-trainers.md',notice='> 후속 조정: 라이치·카일리·키아웨는 [고정 3마리 조정 보고](alola-npc-tuning.md)에 따라 변경됐다. 아래 설계/승률은 알로라 최초 추가 시점의 기록이며 최신 세팅은 후속 보고와 최종 팀 표를 참고한다.\n\n';let original=readFileSync(report,'utf8');if(!original.includes('> 후속 조정:')){const i=original.indexOf('\n')+1;original=original.slice(0,i)+'\n'+notice+original.slice(i).replace(/^\s*\n/,'');writeFileSync(report,original);}
console.log(results.map(r=>({id:r.id,primary:pct(r.primary.after),holdout:pct(r.holdout.after),combined:pct(r.combined.after),conclusion:r.conclusion})));
