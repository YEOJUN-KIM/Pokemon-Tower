import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {sinnohTrainers} from '../src/data/sinnoh-trainers';

const root='artifacts/experiments/balance/sinnoh-20261018';
const json=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const lines=(p:string)=>readFileSync(p,'utf8').trim().split('\n').filter(Boolean).map(l=>JSON.parse(l));
const before=lines(root+'/before-focused.jsonl'),after=lines(root+'/after-focused.jsonl');
const routes={before:lines(root+'/route/before-route.jsonl'),after:lines(root+'/route/after-route.jsonl')};
const lineups=json(root+'/after-lineups.json'),source=json('scripts/data/npc/normal-npc-samples.json').samples;
const baseline=json(root+'/baseline-runtime.json');
const validation=existsSync(root+'/validation.json')?json(root+'/validation.json'):null;
const extra=lines(root+'/final-outliers/after-focused.jsonl');
assert.equal(extra.filter(r=>r.error).length,0);
for(const rows of [before,after,routes.before,routes.after])assert.equal(rows.filter(r=>r.error).length,0);
const pct=(n:number,d:number)=>d?(100*n/d).toFixed(1)+'%':'—';
function stats(rows:any[]){return {n:rows.length,playerWins:rows.filter(r=>r.winner==='Player').length,errors:rows.filter(r=>r.error).length};}
function result(rows:any[]){const s=stats(rows);return s.n?`${pct(s.playerWins,s.n)} (${s.playerWins}/${s.n})`:'신규 / 기존 개별 template 없음';}
const moveUsage:Record<string,Record<string,number>>={};
for(const r of after)for(const [species,moves] of Object.entries(r.moveUsage??{}) as [string,Record<string,number>][]){const map=moveUsage[species]??={};for(const [m,n]of Object.entries(moves))map[m]=(map[m]??0)+n;}
const officialCore:Record<string,string[]>={
 'named-roark':['Rampardos','Probopass','Golem','Archeops'],
 'named-gardenia':['Roserade','Torterra','Cherrim'],
 'named-maylene':['Lucario','Machamp','Medicham'],
 'named-crasherwake':['Floatzel','Gyarados','Quagsire'],
 'named-fantina':['Mismagius','Gengar','Drifblim','Dusknoir'],
 'named-byron':['Bastiodon','Steelix'],
 'named-candice':['Froslass','Abomasnow','Weavile'],
 'named-volkner':['Electivire','Luxray','Raichu','Jolteon'],
 'named-aaron':['Drapion','Heracross','Scizor','Yanmega','Vespiquen','Beautifly'],
 'named-bertha':['Hippowdon','Gliscor','Rhyperior','Whiscash','Golem'],
 'named-flint':['Infernape','Magmortar','Rapidash','Houndoom','Flareon'],
 'named-lucian':['Bronzong','Alakazam','Espeon','Gallade','Mr. Mime'],
 'named-cynthia':['Spiritomb','Roserade','Gastrodon','Lucario','Milotic','Garchomp'],
 'galactic-grunt':['Skuntank','Purugly','Toxicroak'],
 'galactic-executive-mars':['Purugly'],
 'galactic-executive-jupiter':['Skuntank'],
 'galactic-executive-saturn':['Toxicroak','Bronzong'],
 'galactic-boss-cyrus':['Weavile','Crobat','Honchkrow','Houndoom','Gyarados','Dialga'],
};
const notes:Record<string,string>={
 'named-roark':'C: Rampardos 선봉 선호는 자동 ace 포함과 충돌하지 않는다. 강한 물리 브레이커와 Defeatist 리스크를 유지한다.',
 'named-gardenia':'D/F/H: 수면기를 지원되는 씨뿌리기로, 토대부기 회복도 씨뿌리기로 전환했다. 낮은 공격성 자체는 정상이다. 버섯모는 AI가 사용하는 칼춤으로 선공기 위협을 유지한다.',
 'named-maylene':'D/H: 물리·격투 압박과 우선기, Pure Power 스카프를 분담한다. 최강 공격 네 개로 통일하지 않았다.',
 'named-crasherwake':'D/F: 대짱이 압정은 맹독으로 대체. Floatzel의 즉시 공격과 우선기는 유지한다.',
 'named-fantina':'D/F: 아픔나누기는 미지원이므로 Mismagius는 마비, Dusknoir는 선공기로 교체했다. 화상·교란 정체성을 유지한다.',
 'named-byron':'B/D/F/H: 바위/강철 에이스가 물·땅·격투 benchmark에 약하다. 초기 192전에서 Metal Burst/Stealth Rock 사용 0회와 정책의 미지원이 확인돼 Body Press/Toxic으로 교체했다. 방어 포인트를 배분했으며 느린 강철 조합을 실패로 보지 않는다. 공격수 강제 규칙은 없다.',
 'named-candice':'G: Froslass 에이스, Abomasnow는 선택적 눈 파트너. 실제 Snowscape protocol을 테스트했다. 눈을 모든 조합의 필수 전제로 강제하지 않는다.',
 'named-volkner':'D/H: 전기 특화와 얼음·땅·격투 견제를 유지한다. Rotom은 기본 폼이다.',
 'named-aaron':'A/D/F: 드래피온은 원작 대표이므로 벌레가 아니어도 유지. Beautifly는 불법 Air Slash를 Air Cutter로 교체. Yanmega는 미지원 Protect 대신 Giga Drain; Speed Boost 자체는 작동한다.',
 'named-bertha':'D/F/H: 모래·회복·독 운영을 유지하고 Hippowdon의 미지원 Yawn만 Toxic으로 바꿨다.',
 'named-flint':'D/F: 불꽃 화력, 화상 Rapidash, 선공기와 상태 도구를 분담한다. Hypnosis 대신 Will-O-Wisp를 쓴다.',
 'named-lucian':'D/F: 공통 AI가 벽 설치·최면·Morning Sun을 평가하지 않는다. 전용 AI를 추가하지 않고 Mr. Mime은 마비/견제, Bronzong은 독, Espeon은 명상으로 교체했다. Slowbro의 Slack Off는 사용된다. 트릭룸은 없다.',
 'named-cynthia':'A/D/F: 원작 6마리를 유지. Spiritomb의 미지원 Pain Split만 Toxic으로 대체하며 기믹은 없다. Gastrodon의 공통 챔피언 fallback 기술 데이터도 보완했다.',
 'galactic-grunt':'A/E/F/H: collectible 제한으로 Golbat/Bronzor/Kadabra를 Crobat/Bronzong/Alakazam으로 진화. Alakazam은 Sitrus Berry와 마비로 상위 간부 Magic Guard/Life Orb와 구분. 낮은 등급을 억지로 상위 NPC 승률에 맞추지 않는다.',
 'galactic-executive-mars':'A/D/F: Thick Fat Purugly의 Body Slam·Sucker Punch·U-turn 중심 빠른 물리 교란. 나머지는 사용자 지정 확장 후보이며 본가 소유를 단정하지 않는다.',
 'galactic-executive-jupiter':'A/D/F: Skuntank와 Poison/Dark 혼합 화력. Crobat은 공격적인 혼합 견제, Bronzong은 Shadow Ball/Toxic으로 차별화한다.',
 'galactic-executive-saturn':'A/D/F: Toxicroak와 Alakazam의 마비·특수 견제. Crobat은 특수/회복, Skuntank는 특수/독, Bronzong은 Grass Knot로 간부 공통 파트너도 역할을 구분한다.',
 'galactic-boss-cyrus':'A/B/D/E/H/I: Champion+의 Dialga를 유지한다. Expert Belt 특수 견제와 충전 반동이 있는 Roar of Time, 악·비행 파트너다. 전설이라는 이유로 스탯을 낮추지 않으며 기본 층별 성장만 적용한다. Dialga는 USUM Rainbow Rocket 사용 이력과 사용자 지정 최종 보스 방향을 따른다.',
};
const audit={date:'2026-10-18',verdict:'신오 필수 NPC 샘플 완료',method:'Four fixed player benchmarks, six rules, two matched seeds at F45/F95 (Cyrus F76/F96). Independent full-HP battles; not human win rate or climb survival. Route: one deterministic Sinnoh seed, every floor 1..100, four benchmarks and six rules. Initial utility inspection: four seeds for Gardenia/Byron/Lucian/Cyrus, 768 battles.',focused:{before:stats(before),after:stats(after)},route:{before:stats(routes.before),after:stats(routes.after)},lineups,moveUsage,byNpc:sinnohTrainers.map(t=>({id:t.id,bands:(t.category==='boss'?[76,96]:[45,95]).map(floor=>({floor,before:stats(before.filter(r=>r.id===t.id&&r.floor===floor)),after:stats(after.filter(r=>r.id===t.id&&r.floor===floor))})),benchmarks:['starters','offense','bulk','signature'].map(caseId=>({caseId,...stats(after.filter(r=>r.id===t.id&&r.caseId===caseId))})),notes:notes[t.id]})),cyrus:{battles:after.filter(r=>r.id==='galactic-boss-cyrus').length,estimatedDialgaKOs:after.filter(r=>r.id==='galactic-boss-cyrus').reduce((s,r)=>s+r.legendaryKOs,0),estimatedSoloSweeps:after.filter(r=>r.id==='galactic-boss-cyrus'&&r.legendaryKOs>=3).length},trickRoomUsers:source.filter((s:any)=>sinnohTrainers.some(t=>t.id===s.id)&&s.team.some((p:any)=>p.profile.moves.includes('Trick Room'))).length,sourceHashes:Object.fromEntries(['src/data/normal-npc-templates.json','src/data/sinnoh-trainers.ts','src/data/npc-gimmicks.ts','src/data/villain-organizations.ts','src/battle/npc-policy.ts','src/server/opponent-team.ts'].map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]))};
assert.equal(audit.trickRoomUsers,0);assert.ok(lineups.every((l:any)=>l.success===l.draws&&(!sinnohTrainers.find(t=>t.id===l.id)!.ace||l.ace===l.draws)));
const gimmicks={available:after.reduce((s,r)=>s+r.telemetry.available.length,0),used:after.reduce((s,r)=>s+r.telemetry.used.length,0)};
assert.deepEqual(gimmicks,{available:0,used:0});
mkdirSync('artifacts/reports/npc',{recursive:true});writeFileSync('artifacts/reports/npc/sinnoh-audit.json',JSON.stringify({...audit,gimmicks,validation,extraOutliers:['named-byron','named-flint'].map(id=>({id,bands:[45,95].map(floor=>({floor,...stats(extra.filter(r=>r.id===id&&r.floor===floor))}))}))},null,2)+'\n');
const md=['# 신오 필수 NPC 샘플','', '2026-10-18. **신오 필수 NPC 샘플 완료**. 관장 8명, 사천왕 4명, 난천, 조직 공용 조무래기, 마스·주피터·새턴, 태홍: 18개 정의. 용식·다른 라이벌·마박사·프런티어·특수 조우는 제외한다.','',
 '## 데이터와 적용','',
 '`src/data/sinnoh-trainers.ts` → catalog/조직 등록; `scripts/review-sinnoh-npc-samples.ts` → 검토 원본 `scripts/data/npc/normal-npc-samples.json`; `node scripts/export-normal-npc-runtime.mjs` → runtime. 생성기는 신오 ID만 교체하며 다른 지역 검토 데이터를 보존한다. 기존 호연 미커밋 작업도 해시 검사로 보존한다.','',
 '기존 15종을 정리하고 공용 조무래기·주피터·새턴 3종의 runtime을 신규 추가했다. 태홍은 named-cyrus/galactic-boss-cyrus 두 ID를 같은 정의로 유지하며 전반 5후보/Weavile, 75층 이후 6후보/Dialga를 사용한다. 기존 75층 전설 제한·points 66 상한·층별 IV/포인트 스케일·선출기·v12 전투 정책은 유지했다. 일반 관장/사천왕/간부는 Tactical ceiling, 난천/태홍은 Expert, 조무래기는 기존 Basic→Tactical이다.','',
 '기존 신오 Mega/Z/Tera 배정은 데이터에서 제거했다. 신오의 모든 signature와 gimmick carrier는 없음이다. Mega/Z/Dynamax/Tera 엔진 및 타 지역 배정은 유지한다. selectionRules는 강석 preferredLead=[Rampardos] 하나이며, Ace 자동 포함으로 named 17종의 에이스가 항상 선출된다. Ace만으로 preferredLast를 부여하지 않는다.','',
 '## 출처와 후보 구분','',
 '[PWT Sinnoh](https://bulbapedia.bulbagarden.net/wiki/World_Leaders_Tournament/Sinnoh), [Mars](https://bulbapedia.bulbagarden.net/wiki/Mars), [Jupiter](https://bulbapedia.bulbagarden.net/wiki/Jupiter), [Saturn](https://bulbapedia.bulbagarden.net/wiki/Saturn), [Cyrus](https://bulbapedia.bulbagarden.net/wiki/Cyrus)를 정체성 확인에 참고했다. 세트는 요청을 바탕으로 현대화한 타워 세트이며 원작 exact set 복제가 아니다. 아래 공식 사용 확인은 보수적으로 기록한 부분집합이다. 그 외 후보는 사용자 지정 타워 확장/개별 이력 미확정으로 구분하며 실제 소유 이력을 단정하지 않는다. 진화형 Crobat 등 조직 파트너는 원작 Golbat/Bronzor/Kadabra 계열의 확장으로 구분한다. 주피터·새턴 스프라이트는 Pokémon Showdown의 원작 캐릭터 자산을 사용하고 sources.json에 URL·검토일·SHA-256을 등록했다.','',
 '## 측정 조건','',audit.method,'',
 `집중: Before ${result(before)} → After ${result(after)}. 신규 NPC 때문에 전체 표본 구성이 다르므로 이 총계는 동등 비교 수치가 아니다. NPC별 matched 비교는 아래 표를 사용한다. 모든 수치는 **플레이어 AI 승률**이다.`,`경로: Before ${result(routes.before)} → After ${result(routes.after)}. 각 단계 2,400전, 오류 0. 독립 전투이며 연속 생존/경제/완주율을 측정하지 않는다. 조직 이벤트는 경로의 기존 deterministic draw로 표집하며 모든 간부의 도달성은 별도 테스트한다.`,`선출: ${lineups.reduce((s:number,l:any)=>s+l.draws,0).toLocaleString()}회. 규칙 성공 100%, named ace 포함 100%, 기믹 carrier 없음. 전체 lineup/lead/last 빈도는 artifacts/reports/npc/sinnoh-audit.json 및 ${root}/after-lineups.json에 있다.`, '',
 '## NPC별 Before → After','', '| NPC | 전반 Before | 전반 After | 후반 Before | 후반 After |','|---|---|---|---|---|',
 ...sinnohTrainers.map(t=>{const fs=t.category==='boss'?[76,96]:[45,95];return `| ${t.name} | ${fs.flatMap(f=>[result(before.filter(r=>r.id===t.id&&r.floor===f)),result(after.filter(r=>r.id===t.id&&r.floor===f))]).join(' | ')} |`;}),'',
 '## Benchmark별 After','', '| NPC | starters | offense | bulk | signature |','|---|---|---|---|---|',...sinnohTrainers.map(t=>`| ${t.name} | ${['starters','offense','bulk','signature'].map(c=>result(after.filter(r=>r.id===t.id&&r.caseId===c))).join(' | ')} |`),'',
 '## 기능상 죽은 슬롯 교정','',
 '초기 4-seed 추가 검사 768전에서 수면기·벽 설치·압정·일부 회복기가 사용되지 않았다. TowerPolicy 코드도 이 기술을 점수화하지 않음을 확인했다. 공통 AI를 확장하지 않고 지원되는 독·마비·씨뿌리기·선공기 등으로 소규모 대체했다. 오엽의 벽 운영은 현 정책에서 구현할 수 없어 특수 운영/상태 제어로 표현한다. 이 제약은 의도된 수동성과 구별한 기능 문제였다. 초기 runtime/검토 스크립트/trace는 inspection/에 보존했다. 죽은 슬롯 교정 이후 승률 목표를 위한 반복 튜닝은 하지 않았다.','',
 '## 태홍의 전설 영향','',
 `최종 표본 ${audit.cyrus.battles}전 중 Dialga 추정 직접 KO ${audit.cyrus.estimatedDialgaKOs}회, 추정 3KO 단독 sweep ${audit.cyrus.estimatedSoloSweeps}회. 대부분의 benchmark를 혼자 처리하는 상태가 아니며 파트너 공격·강화도 실제 사용된다. 이 집계는 protocol의 마지막 상대 move actor에 따른 추정치로 residual KO 귀속 오차가 있을 수 있다. 무기믹 Champion+ 정체성을 유지한다.`, '',
 '## 각 NPC 세트와 선출',''];
for(const t of sinnohTrainers){
 const row=source.find((s:any)=>s.id===t.id&&(t.category!=='boss'||s.stage==='final-gate'));
 const old=baseline.filter((s:any)=>s.id===t.id),oldNames=[...new Set(old.flatMap((s:any)=>s.team.map((p:any)=>p.species)))];
 const l=lineups.find((l:any)=>l.id===t.id&&l.floor===(t.category==='boss'?96:95));
 const top=(map:Record<string,number>,n=3)=>Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,n).map(([s,count])=>`${s}: ${pct(count,l.draws)}`).join('; ');
 md.push(`### ${t.name} — ${t.id}`,'',`Category: ${t.category}; Power Tier: ${t.power}; Ace: ${t.ace||'없음'}; AI Tier: ${t.category==='grunt'?'Basic→Tactical':t.aiCeiling}; Gimmick / Carrier: 없음.`,`Concept: ${t.concept}. selectionRules: \`${JSON.stringify(t.selectionRules??{})}\`.`,`기존 후보: ${oldNames.join(', ')||'개별 runtime 없음'}. → Candidates: ${t.entries.join(', ')}.`,`공식 사용 확인: ${(officialCore[t.id]??[]).join(', ')}. 타워 확장/개별 이력 미확정: ${t.entries.filter(p=>!officialCore[t.id]?.includes(p)).join(', ')||'없음'}.`,'',
 '| Pokémon | Ability | Item | Moves | Role |','|---|---|---|---|---|',...row.team.map((p:any)=>`| ${p.species} | ${p.profile.ability} | ${p.item} | ${p.profile.moves.join(' / ')} | ${p.role} |`),'',
 `Representative Lineups (F${l.floor}, ${l.draws} draws): ${top(l.teams)}.`,`Lead: ${top(l.leads)}. Last: ${top(l.lasts)}. Ace: ${t.ace?pct(l.ace,l.draws):'해당 없음'}. selectionRules: ${pct(l.success,l.draws)}.`,`Design Notes: ${notes[t.id]}`,'');
}
md.push('## 검증 및 재현','',
 '- `node scripts/export-normal-npc-runtime.mjs --check` 및 `node node_modules/typescript/bin/tsc --noEmit`.','- `node node_modules/tsx/dist/cli.mjs --test tests/*.test.ts` (최종 실제 결과는 아래 실행 기록).','- `node --require ./scripts/windows-build-links.cjs node_modules/next/dist/bin/next build`.','- `node --import tsx node_modules/@playwright/test/cli.js test e2e/sinnoh-named-trainers.spec.ts`.','- `node --import tsx scripts/simulate-sinnoh-npcs.ts`; 별도 `SINNOH_OUTPUT=.../route`로 `--route-only`.','- 기본 집중 2 seeds × 2 floors × 4 benchmarks × 6 rules; lineup 1,000 draws/floor. `SINNOH_NPCS`, `SINNOH_SEEDS`, `SINNOH_TRACES`, `SINNOH_OUTPUT`으로 추가 검사가 가능하다.','',
 'baseline-runtime.json은 작업 시작 시점 runtime을 보존한다. before 결과는 catalog/AI ceiling/기믹 데이터 변경 전 실행했다. 현재 코드에서 baseline runtime만 주입하면 이전 catalog까지 복구되는 것은 아니므로 저장된 before 결과/manifest를 비교 근거로 사용한다. before 재현 시 당시 metadata도 함께 사용해야 한다.','',
 '## 남은 문제와 판단','',
 '동관의 높은 플레이어 승률은 바위/강철 에이스의 약점 및 느린 방어 스타일, 물/땅/격투 benchmark 구성(H)에 따른 결과다. 사용 불능 슬롯(D/F)은 교정했고, 무작위 3마리의 기능 붕괴·규칙 실패·전설 독점·기믹 불작동은 최종 검사에서 확인되지 않았다. 벽/수면 AI 미지원은 지원되는 상태 제어로 대체한 설계 제약이며 공통 AI 후속 작업 범위다. 두 집중 seed와 한 route seed는 제한된 표본이다. 승률 균등화나 스탯 보정은 적용하지 않았다.','',
 '## 추가 이상치 검사','',
 `최종 세트를 바꾸지 않고 별도 seeds 3~6으로 동관·대엽을 각 192전씩 추가 확인했다. 동관 F45 ${result(extra.filter(r=>r.id==='named-byron'&&r.floor===45))}, F95 ${result(extra.filter(r=>r.id==='named-byron'&&r.floor===95))}; 대엽 F45 ${result(extra.filter(r=>r.id==='named-flint'&&r.floor===45))}, F95 ${result(extra.filter(r=>r.id==='named-flint'&&r.floor===95))}. 오류 0. 대엽의 초기 F95 100%는 다른 선출 시드에서 반복되지 않았으며 공격 기술과 화상 운영이 실제 실행된다. 동관은 높은 플레이어 승률이 반복되지만 Bastiodon의 낮은 화력과 물/땅/격투 약점(H), 느린 수비 캐릭터성에 부합한다. 최종 Bastiodon의 Toxic ${moveUsage.Bastiodon?.Toxic??0}회, Body Press ${moveUsage.Bastiodon?.['Body Press']??0}회 사용으로 기능 불능과는 구별한다. 공격수 강제나 후보 교체로 승률을 맞추지 않는다.`,
 `기믹 telemetry: 최종 집중 ${after.length}전에서 available=${gimmicks.available}, used=${gimmicks.used}; 무기믹 설계와 일치한다. 기존 기믹 엔진의 전 룰 실행/리플레이는 회귀 테스트로 검사한다.`, '',
 '**신오 필수 NPC 샘플 완료**','');
if(validation)md.push('## 최종 실행 결과','',...validation.results.map((r:{check:string;result:string})=>`- ${r.check}: ${r.result}`),'', '전체 회귀에는 retry, reconnect, snapshot, hidden boss, raid, run events, Teleport, 기존 Mega/Z/Dynamax/Tera 및 저장된 전투 replay가 포함된다. 초기 실패는 변경된 후보 수·고정 3마리·기믹 가정과 충돌한 fixture에서 발생했고, 최종 실행 결과는 이를 수정한 뒤의 결과다.','');
writeFileSync('docs/gameplay/sinnoh-named-trainers.md',md.join('\n'));
console.log(JSON.stringify({focused:audit.focused,route:audit.route,cyrus:audit.cyrus,trickRoomUsers:audit.trickRoomUsers}));

