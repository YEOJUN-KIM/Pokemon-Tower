import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {galarTrainers,galarSample} from '../src/data/galar-trainers';
import {pokemonName} from '../src/data/pokemon-catalog';
import {moveInfo} from '../src/data/move-info';
import abilities from '../src/data/ability-names.json' with {type:'json'};
import {itemName} from '../src/data/held-items';
import {npcAi} from '../src/data/npc-ai';

const benchmark=JSON.parse(readFileSync('artifacts/experiments/balance/galar-20261019/summary.json','utf8'));
const testLog=readFileSync('artifacts/galar-all-tests-final.log','utf8');
const testCount=testLog.match(/ℹ tests (\d+)/)?.[1],passCount=testLog.match(/ℹ pass (\d+)/)?.[1],failCount=testLog.match(/ℹ fail (\d+)/)?.[1];
const koreanAbility=(a:string)=>(abilities as Record<string,string>)[a]??a;
const label=(s:string)=>pokemonName(s)+(s.endsWith('-Galar')?'(가라르)':'');
const lines=['# 가라르 NPC 샘플 구현 보고서','',
 '2026-10-19. 지정된 13종만 등록했다. 기존 1~7세대 소스/런타임 데이터는 작업 전 HEAD 기준 해시로 동일함을 검증한다. 샘플은 원작을 참고한 타워용 3vs3 각색이다.','',
 '## 최종 파티 · 거다이맥스 · AI','',
 '| NPC | 선봉 → 중견 → 최종 | 거다이맥스 담당 | AI |',
 '|---|---|---|---|'];
for(const t of galarTrainers){const ai=npcAi(95,galarSample(t));lines.push(`| ${t.name} | ${t.entries.map(label).join(' → ')} | ${t.signature?label(t.signature.species):'사용 안 함'} | ${ai.tier} / ${ai.galar} |`);}
lines.push('','## 39마리의 특성 · 도구 · 기술','',
 '거다이맥스 담당 12마리는 전부 도구 없음이다. 로즈의 무한다이노도 도구 없이 일반 폼으로 등장한다.','',
 '| NPC | 포켓몬 | 특성 | 도구 | 기술 4개 |','|---|---|---|---|---|');
for(const t of galarTrainers)for(const p of t.team)lines.push(`| ${t.name} | ${label(p.species)} | ${koreanAbility(p.ability)} | ${itemName(p.item)} | ${p.moves.map(m=>moveInfo[m]?.name??m).join(' / ')} |`);
lines.push('','## AI와 기존 규칙 재사용','',
 '- 일반 관장: tactical 상한. 불리한 상성에서만 드문 교체, 안전한 랭크업과 설치를 사용한다. 채두는 교체 최대 1회, 긴 교체 간격으로 정면 돌파를 선호한다. 배수의진의 교체 봉쇄는 엔진이 적용한다.',
 '- 금랑: expert. 공용 상성 교체·학습·유턴 정책을 사용한다. 단델은 같은 최고 tier에서 챔피언 성향, 킹실드 조건부 선택과 거다이옥염 우선순위를 추가한다. 두 NPC 모두 선봉/중견 간 적극적인 교체를 허용하되 지정 최종 에이스는 다른 대기 멤버가 남아 있는 동안 보존한다.',
 '- 올리브: expert. 길동무는 낮은 HP·속도·처치 가능성을 확인하고 반복을 금지한다. 회복은 기존 HP 기반 선택을 사용한다. 밀로틱의 승기·미러코트는 엔진 및 공개된 직전 특수 공격을 활용한다.',
 '- 매크로코스모스 직원: basic, 자발적 교체와 다이맥스 없음. 기어체인지는 안전한 상황에서만 고려한다.',
 '- 일반 공격/학습/상성 판단은 기존 v12 scorer와 v13 우선도 정책을 재사용한다. 새 가라르 설정이 있는 전투에만 GalarPolicy를 적용한다. 플레이어 입력이나 실제 미공개 기술·도구·능력치를 읽지 않는다.',
 '- 다이맥스는 즉시 쓰는 고정 명령이 아니다. 쉬운 처치가 가능하면 자원을 아끼고, 안전한 랭크업이 있으면 먼저 사용할 수 있다. 거다이선율의 베일 및 거다이옥염·거다이분석·거다이백화의 추가 가치를 평가한다.',
 '- 기존 층 규칙을 유지한다. 관장 55층, 챔피언/빌런 50층부터 기믹을 허용한다. 로즈는 전설 보스 규칙에 따라 75층 이상에서만 등록한다. 일반 관장 육성 포인트 48, 상위/간부/보스/챔피언 66, 직원 18을 현재 층의 포인트·IV 상한으로 축소한다.',
 '- 잔비/가뭄/모래날림은 기본 날씨 지속시간을 사용한다. 축축한바위·뜨거운바위는 없다. 멜론은 눈 날씨를 별도로 설정하지 않는다.',
 '- 기존 Galar 후보인 아킬·포플러·두송·호브·금랑컵 중복 ID는 현행 카탈로그/경로/런타임에서 제외했다. DLC와 옐단은 추가하지 않았다. 기존에 저장된 전투 파티는 재생성하지 않는다.','',
 '## 로즈의 3단계 보스전','',
 '너트령 → 대왕끼리동 → 일반 무한다이노 순서를 required 3마리와 기존 preferredLead/preferredLast로 보장한다. `galar: phases` 정책은 모든 자발적 교체를 제거하고 강제 교체 시 첫 생존 슬롯을 선택한다. `fixedOrder` 정책 표식은 전투 로그의 `fixedOpponentOrder`로 저장하며, 엔진에서 울부짖기/레드카드의 강제 교체를 막아 순서를 보호하고 리플레이에서도 복원한다. 너트령은 필드를 구축하고, 대왕끼리동만 거다이맥스 권한을 가지며 행동 가능한 첫 기회에 사용한다. 무한다이노는 소스의 hidden 역할을 런타임 `special: hidden`으로 보존한다. 정규 에이스는 대왕끼리동이며, 무한다이노는 다이맥스 권한·도구·무한다이맥스 폼이 없다.','',
 '## 최소 확장 사항','',
 '- NPC 지닌 도구와 거다이맥스 권한 분리: 기존 packed Gigantamax 비트와 빈 도구를 이용한다. 밴드 기반 기존 전투도 지원한다. packedNpcRule, 전투 세션, 저장된 보스 기믹 표시가 이 권한을 인식한다.',
 '- NpcAi의 선택적 galar 성향 설정. 기존 AI 버전 및 가라르 성향이 없는 스냅샷은 기존 정책을 유지한다.',
 '- hidden 멤버 표식을 소스 → 런타임 → 생성된 파티 스냅샷에 전달한다.',
 '- 지정 NPC만 사용하면서 가라르 상위 관문을 채울 수 있도록 4개 관문에서 3명 후보를 순환한다. 다른 지역은 기존 후보 수가 4 이상이므로 결과가 같다.',
 '- 과거 보존 테스트의 해시·카운트는 승인된 가라르 변경을 반영해 갱신했다. 별도의 galar-preservation 검사는 변경 전 HEAD와 모든 비가라르 소스/런타임 행이 정확히 같은지 확인한다.','',
 '## 검증','',
 `- 최종 전체 테스트: ${testCount??'집계 중'}개, 통과 ${passCount??'집계 중'}, 실패 ${failCount??'집계 중'}. 가라르 전용 49개도 최종 코드로 별도 재실행해 통과했다.`,
 '- 가라르 전용: 데이터 존재·합법성, 층별 20개 시드의 고정 3마리·순서·결정성, 13종 실제 전투 및 리플레이, 12종 도구 없는 실제 거다이맥스, 4종 날씨, 단단지 네트·스텔스록, 매직미러 반사·마비, 거다이선율 베일, 로즈 교체 금지·대왕끼리동 전용 권한, 무한다이노의 미사용 자원 상황에서도 다이맥스 금지.',
 '- 공용 회귀: 저장 및 재접속, 지역별 관문·파티, 기존 1~7세대 실제 전투·리플레이, NPC 도구·프로필·합법성, 과거 데이터 보존을 포함한다. 전체 테스트 결과는 최종 실행 로그 `artifacts/galar-all-tests-final.log`에 기록한다.',
 '- TypeScript 검사와 검토 소스 → 런타임 투영 일치 검사 통과. Next.js 프로덕션 빌드 통과. Windows sandbox에서는 Turbopack junction 생성이 차단되어 승인된 외부 실행으로 확인했다.','',
 '## 밸런스 시뮬레이션','',
 `총 ${benchmark.summary.reduce((n:number,r:any)=>n+r.battles,0)}전투, 오류 ${benchmark.summary.reduce((n:number,r:any)=>n+r.errors,0)}건. NPC별 두 층 × 4개 기존 지역 테스트 상대 조합 × 8개 시드. 플레이어는 층별 포인트·IV 상한, 기존 기본 기술, Expert Belt/Leftovers/Sitrus Berry, ZMovePolicy를 사용했다. 플레이어 기믹은 basic이다. 아래 승률은 이 고정 벤치마크에 한정되며 실제 사용자 승률을 뜻하지 않는다.`,
 '', '| NPC | 층 | NPC 승률 | 평균 자발적 교체 | 거다이맥스 사용 전투 |','|---|---:|---:|---:|---:|');
for(const r of benchmark.summary)lines.push(`| ${r.name} | ${r.floor} | ${(r.winRate*100).toFixed(1)}% (${r.npcWins}/${r.battles}) | ${r.meanSwitches.toFixed(2)} | ${r.dynamaxBattles}/${r.battles} |`);
lines.push('','추가 조정 후보: 어니언(후반 87.5%), 순무(81.3%), 야청·멜론(각 78.1%)의 상성별 편차를 추가 확인해야 한다. 마쿠와는 거다이맥스가 없는 전반에 12.5%로 낮고, 단델은 100층에서 50.0%여서 챔피언의 상대 조합별 안정성을 더 확인할 여지가 있다. 요청된 파티를 유지했으며 리자몽에 도구를 추가하지 않았다. 좁은 벤치마크만으로 임의의 포켓몬/도구 변경은 하지 않았다.',
 '', '시뮬레이션에서 로즈의 자발적 교체는 전부 0회다. 단델/금랑은 일반 관장보다 자발적 교체가 많지만 승률은 상대 조합에 좌우된다. 무조건 높은 승률을 만들기 위한 입력 읽기나 미공개 정보 사용은 없다.',
 '', '재현: `node node_modules/tsx/dist/cli.mjs scripts/build-galar-npc-samples.ts`, `node --import tsx scripts/export-normal-npc-runtime.mjs`, `node node_modules/tsx/dist/cli.mjs scripts/simulate-galar-npcs.ts`. 원시 결과: `artifacts/experiments/balance/galar-20261019/battles.jsonl`, 집계: 같은 폴더의 `summary.json`.',
 '', '## 발견 및 수정한 문제 · 미구현 항목','',
 '- 기존 다이맥스가 밴드 지닌 도구에 의존하던 점을 수정했다.',
 '- 가라르 후보를 13종으로 한정하자 40층에서 네 번째 상위 후보가 없어 전투 미리보기가 실패하던 경로를 수정했다.',
 '- 과거 테스트의 도구/후보 수/전체 행 수 조건을 새 요구사항에 맞게 갱신했다. 1~7세대 자체 데이터는 변경하지 않았다.',
 '- 테스트 초기에 엔진 프로토콜을 잘못 가정한 assertion을 수정했다. 거다이맥스는 별도 formechange 대신 Dynamax의 Gmax 플래그로 기록된다.',
 '- 이 샘플에서 사용하는 기술·특성·거다이맥스 효과 중 별도의 미구현 항목은 확인되지 않았다. Showdown 엔진의 기존 구현을 사용한다. 두랄루돈의 굳건한신념은 싱글 배틀에서는 유의미한 대상 유도 효과가 없는 특성이다.',
 '', '## 추가/수정 파일','');
const paths=execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trimEnd().split('\n').map(l=>l.slice(3).trim()).filter(Boolean);
for(const p of [...new Set([...paths,'scripts/report-galar-npcs.ts','docs/gameplay/galar-named-trainers.md'])])lines.push(`- \`${p}\``);
writeFileSync('docs/gameplay/galar-named-trainers.md',lines.join('\n')+'\n');
console.log('Wrote docs/gameplay/galar-named-trainers.md');
