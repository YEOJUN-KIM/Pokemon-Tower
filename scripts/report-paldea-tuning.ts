import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import baseline from '../tests/fixtures/paldea-tuning-baseline.json' with {type:'json'};
import {paldeaTuningTelemetry} from './lib/paldea-tuning-telemetry';

const root='artifacts/experiments/balance/paldea-tuning-20261019';
const load=(phase:string)=>readFileSync(`${root}/${phase}/logs.jsonl`,'utf8').trim().split('\n').map(l=>{const r=JSON.parse(l);return {id:r.id,name:r.name,floor:r.floor,case:r.case,n:r.n,...paldeaTuningTelemetry(r.log)};});
const before=load('before'),after=load('after');assert.equal(before.length,912);assert.equal(after.length,912);
const bs=JSON.parse(readFileSync(root+'/before/summary.json','utf8')),as=JSON.parse(readFileSync(root+'/after/summary.json','utf8'));
assert.ok(bs.summary.every((s:any)=>s.errors===0));assert.ok(as.summary.every((s:any)=>s.errors===0));
for(const s of as.summary)if(!baseline.ids.includes(s.id))assert.deepEqual(s,bs.summary.find((b:any)=>b.id===s.id&&b.floor===s.floor));
for(const [p,hash]of Object.entries(as.hashes))assert.equal(createHash('sha256').update(readFileSync(p)).digest('hex'),hash,p);
for(let i=0;i<before.length;i++)assert.deepEqual([before[i].id,before[i].floor,before[i].case,before[i].n],[after[i].id,after[i].floor,after[i].case,after[i].n]);
type Row=typeof before[number];
const sum=(rows:Row[],f:(r:Row)=>number)=>rows.reduce((n,r)=>n+f(r),0),pct=(n:number,d:number)=>`${(100*n/d).toFixed(2)}%`,avg=(rows:Row[],f:(r:Row)=>number)=>(sum(rows,f)/rows.length).toFixed(2);
const group=(rows:Row[],id:string,floor:number)=>rows.filter(r=>r.id===id&&r.floor===floor);
const rate=(rows:Row[],f:(r:Row)=>boolean)=>`${sum(rows,r=>Number(f(r)))}/${rows.length} (${pct(sum(rows,r=>Number(f(r))),rows.length)})`;
const win=(rows:Row[])=>pct(sum(rows,r=>Number(r.winner==='Tower AI')),rows.length);
const moved=(r:Row,name:string,move:string)=>(r.mons[name]?.moves[move]??0)>0;
const active=(r:Row,name:string)=>r.mons[name]?.activeTurns??0;
const names:Record<string,string>={'named-iono':'모야모','named-tulip':'리파','named-hassel':'팔자크','named-rika':'칠리','named-poppy':'뽀삐'};
const order=['named-iono','named-tulip','named-hassel','named-rika','named-poppy'];
const summary=order.flatMap(id=>[45,95].map(floor=>{const b=group(before,id,floor),a=group(after,id,floor);return {id,floor,beforeWin:win(b),afterWin:win(a),beforeLeadTurns:avg(b,r=>active(r,r.team[0])),afterLeadTurns:avg(a,r=>active(r,r.team[0])),beforeLeadSurvival:rate(b,r=>r.leadSurvivedTurn1),afterLeadSurvival:rate(a,r=>r.leadSurvivedTurn1),beforeMiddleActs:rate(b,r=>r.middleActed),afterMiddleActs:rate(a,r=>r.middleActed),beforeAceEntry:rate(b,r=>r.aceEntered),afterAceEntry:rate(a,r=>r.aceEntered),beforeTera:rate(b,r=>(r.mons[r.team[2]]?.tera??0)>0),afterTera:rate(a,r=>(r.mons[r.team[2]]?.tera??0)>0)};}));
writeFileSync(root+'/comparison-battles.json',JSON.stringify({before,after},null,2)+'\n');writeFileSync(root+'/comparison-summary.json',JSON.stringify(summary,null,2)+'\n');
let doc=`# 팔데아 5종 제한 조정 전후 검증\n\n기준 커밋: \`e00845a293a250bb296c66ff19411a6cc073ef7a\`. 기준과 변경 후 각각 912전을 재실행했다. 14종 전체, 동일 이벤트 ID·seed·플레이어 파티·육성·도구·정책·층을 유지했다. 기본은 NPC/층당 4파티×8 seed=32전이고, 네모 hazard 전용 16전도 양쪽에 그대로 포함했다. 양쪽 오류 0건, 대표 offense seed 1 리플레이 단계당 28전 확인.\n\n## 지정 변경 및 보존\n\n- 찌리비크/리파 클레스퍼트라/팔자크 음번: 기합의띠 → 도구 없음. 특성·기술·육성 유지.\n- 칠리 폭타: 돌격조끼 → 도구 없음. 코리갑·토오 포함 다른 구성 유지.\n- 뽀삐 중견: 아머까오 → 자포코일, Sturdy/Light Clay, Light Screen/Tri Attack/Flash Cannon/Discharge. 특수 역할에 맞춰 Modest, HP32/SpA32/SpD2, IV31로 기존 66포인트 예산 유지. 대왕끼리동·두드리짱은 동일.\n- \`PaldeaPolicy\`에는 뽀삐의 자포코일 Light Screen 분기만 추가했다. 기존 KO/교체/hazard/테라/네모/테사/교수 정책은 변경하지 않았다.\n\n허용한 다섯 build 외의 모든 design/reviewed/runtime 행과 공통 AI 소스는 기준 fixture와 비교했다. PaldeaPolicy도 새 Light Screen 분기만 제거하면 기준 소스 해시와 같다. 나머지 9종의 시뮬레이션 요약 지표 전체가 전후 동일하다.\n\n## 승률\n\n| NPC | 중반 전 | 중반 후 | 후반 전 | 후반 후 |\n|---|---:|---:|---:|---:|\n`;
for(const id of order){const mid=summary.find(s=>s.id===id&&s.floor===45)!,late=summary.find(s=>s.id===id&&s.floor===95)!;doc+=`| ${names[id]} | ${mid.beforeWin} | ${mid.afterWin} | ${late.beforeWin} | ${late.afterWin} |\n`;}
doc+=`\n각 칸 32전이다. 1전 차이는 3.125%p이며 작은 표본의 관측값이지 일반 승률 추정치가 아니다.\n\n## 역할 수행 공통 지표\n\n생존 턴은 공개 프로토콜에서 해당 포켓몬이 살아서 필드에 있었던 서로 다른 턴 수(재진입 포함, 초기 team preview 제외)를 전투별 집계한 평균이다. 1턴 생존은 첫 턴 종료 후 생존 여부이며 벤치로 빠져도 생존으로 센다. 중견 수행은 전투 중 실제 기술을 한 번 이상 사용한 비율이다. 에이스 도달/테라는 해당 전투 내 발생 여부, 분모는 항상 전체 32전이다.\n\n| NPC / 층 | 선봉 평균 필드 턴 전→후 | 첫 턴 생존 전→후 | 중견 기술 수행 전→후 | 에이스 도달 전→후 | 에이스 테라 전→후 |\n|---|---|---|---|---|---|\n`;
for(const s of summary)doc+=`| ${names[s.id]} ${s.floor} | ${s.beforeLeadTurns} → ${s.afterLeadTurns} | ${s.beforeLeadSurvival} → ${s.afterLeadSurvival} | ${s.beforeMiddleActs} → ${s.afterMiddleActs} | ${s.beforeAceEntry} → ${s.afterAceEntry} | ${s.beforeTera} → ${s.afterTera} |\n`;
function metrics(id:string,items:[string,(r:Row)=>boolean][],averages:[string,(r:Row)=>number][]=[]){
 let out=`\n### ${names[id]}\n\n| 측정 | 45층 전→후 | 95층 전→후 |\n|---|---|---|\n`;
 for(const [label,f]of items)out+=`| ${label} | ${[45,95].map(floor=>rate(group(before,id,floor),f)+' → '+rate(group(after,id,floor),f)).join(' | ')} |\n`;
 for(const [label,f]of averages)out+=`| ${label} | ${[45,95].map(floor=>avg(group(before,id,floor),f)+' → '+avg(group(after,id,floor),f)).join(' | ')} |\n`;
 return out;
}
doc+='\n## NPC별 기믹 변화\n\n기술 사용률은 실제 공개 move 이벤트가 있는 전투 비율이다. 명중/성공률과 구분하며, 분모 32전을 고정한다. 피해 기여는 상대 최대 HP 대비 실제 직접 피해 비율의 누계(전투당 평균 %p)로, 여러 상대에게 준 피해를 합산하여 100을 넘을 수 있다. 원시 HP값이나 실제 전체 팀 피해 점유율과 다르다.\n';
doc+=metrics('named-iono',[
 ['찌리비크 순풍',r=>moved(r,'Kilowattrel','Tailwind')],['찌리비크 Volt Switch',r=>moved(r,'Kilowattrel','Volt Switch')],['찌리비크 기띠 실제 발동',r=>(r.mons.Kilowattrel?.sash??0)>0],['찌리배리 전기로바꾸기',r=>(r.mons.Bellibolt?.electromorphosis??0)>0],['무우마직 전기 테라',r=>(r.mons.Mismagius?.tera??0)>0],
],[['찌리배리 평균 직접 피해',r=>r.mons.Bellibolt?.damage??0],['찌리배리 평균 회복 누계',r=>r.mons.Bellibolt?.healing??0]]);
doc+=metrics('named-tulip',[
 ['루미나콜리전',r=>moved(r,'Espathra','Lumina Crash')],['리플렉터',r=>moved(r,'Espathra','Reflect')],['클레스퍼트라 기띠 실제 발동',r=>(r.mons.Espathra?.sash??0)>0],['엘레이드 실제 피해 발생',r=>(r.mons.Gallade?.damage??0)>0],['플라제스 명상',r=>moved(r,'Florges','Calm Mind')],['플라제스 에스퍼 테라',r=>(r.mons.Florges?.tera??0)>0],
],[['루미나콜리전 특방 하락 사건/전투',r=>r.luminaDrops],['엘레이드 평균 직접 피해',r=>r.mons.Gallade?.damage??0],['플라제스 평균 직접 피해',r=>r.mons.Florges?.damage??0]]);
doc+=metrics('named-hassel',[
 ['음번 순풍',r=>moved(r,'Noivern','Tailwind')],['음번 도발',r=>moved(r,'Noivern','Taunt')],['음번 기띠 실제 발동',r=>(r.mons.Noivern?.sash??0)>0],['액스라이즈 용의춤',r=>moved(r,'Haxorus','Dragon Dance')],['드닐레이브 드래곤 테라',r=>(r.mons.Baxcalibur?.tera??0)>0],['드닐레이브 대검돌격',r=>moved(r,'Baxcalibur','Glaive Rush')],
]);
doc+=metrics('named-rika',[
 ['폭타 진입',r=>r.mons.Camerupt?.entered??false],['토오 진입',r=>r.mons.Clodsire?.entered??false],['토오 저수 실제 발동',r=>(r.mons.Clodsire?.waterAbsorb??0)>0],['토오 맹독',r=>moved(r,'Clodsire','Toxic')],['토오 HP회복',r=>moved(r,'Clodsire','Recover')],['토오 땅 테라',r=>(r.mons.Clodsire?.tera??0)>0],
],[['폭타 평균 필드 턴',r=>active(r,'Camerupt')],['폭타 평균 직접 피해',r=>r.mons.Camerupt?.damage??0]]);
doc+=metrics('named-poppy',[
 ['대왕끼리동 스텔스록',r=>moved(r,'Copperajah','Stealth Rock')],['자포코일 옹골참 실제 발동',r=>(r.mons.Magnezone?.sturdy??0)>0],['자포코일 빛의장막 사용',r=>moved(r,'Magnezone','Light Screen')],['빛의장막 설치 성공',r=>r.screenInstalled>0],['활성 장막 중복 사용',r=>r.screenDuplicate>0],['자포코일 방전',r=>moved(r,'Magnezone','Discharge')],['자포코일 러스터캐논',r=>moved(r,'Magnezone','Flash Cannon')],['두드리짱 등장',r=>r.mons.Tinkaton?.entered??false],['두드리짱 강철 테라',r=>(r.mons.Tinkaton?.tera??0)>0],['두드리짱 거대해머',r=>moved(r,'Tinkaton','Gigaton Hammer')],['장막 활성 중 두드리짱 진입',r=>r.screenTinkatonEntry],
],[['중견 평균 필드 턴',r=>active(r,r.team[1])],['중견 평균 직접 피해',r=>r.mons[r.team[1]]?.damage??0],['장막 아래 두드리짱 평균 필드 턴',r=>r.tinkatonScreenTurns]]);
const screened=after.filter(r=>r.id==='named-poppy'&&r.screenInstalled>0),poppyBeforeAce=after.filter(r=>r.id==='named-poppy'&&!r.aceEntered);
doc+=`\n뽀삐의 장막 설치 ${screened.length}전은 모두 starters 대진이었고, 그 중 승리는 ${sum(screened,r=>Number(r.winner==='Tower AI'))}전이었다. 따라서 후반 승률 상승을 장막 단독의 효과라고 해석하지 않는다. 두드리짱 등장률이 줄어든 ${poppyBeforeAce.length}전은 모두 에이스 진입 전 NPC 승리였으며, 자포코일의 실제 공격 압박이 확인됐다. 후반 signature 대진 승리가 2/8 → 7/8로 증가한 것이 승률 상승 5전의 출처다. 장막 지원은 동작했으나 starters의 불리한 대면 자체를 뒤집지는 못했다.\n`;
doc+='\n빛의장막 판단은 뽀삐의 Magnezone/에이스 Tinkaton 조합에만 적용한다. 최근 공개 공격이 Special이고 추정 피해가 최대 HP 12% 이상이며, 장막이 없고 살아 있는 후속이 있고, 온전한 옹골참 또는 충분한 생존 여유가 있을 때 선택한다. 기존 보수적 KO 우선 검사는 먼저 적용된다. 공개된 Physical/알 수 없는 공격에는 설치를 강제하지 않는다. 이미 활성화되었거나 해당 포켓몬이 이미 선택했다면 반복하지 않는다. 실제 엔진에서 옹골참 1 HP 생존→빛의장막, 빛의점토 8턴 지속, 두드리짱 승계와 특수 피해 감소도 검사했다.\n';
doc+='\n## 대진별 확인 — 리파\n\n기띠 제거 후에도 90% 이상이므로 동일 표본의 나머지 화력/지원 기여를 확인한다.\n\n| 층 / 플레이어 파티 | 승리 전→후 / 8전 |\n|---|---|\n';
for(const floor of [45,95])for(const c of ['starters','offense','bulk','signature']){const b=group(before,'named-tulip',floor).filter(r=>r.case===c),a=group(after,'named-tulip',floor).filter(r=>r.case===c);doc+=`| ${floor} / ${c} | ${sum(b,r=>Number(r.winner==='Tower AI'))} → ${sum(a,r=>Number(r.winner==='Tower AI'))} |\n`;}
doc+='\n기합의띠 제거만으로 리파의 우세가 해소되지는 않았다. 루미나콜리전의 특방 하락, 생명의구슬/예리함 엘레이드, 명상·고화력 플라제스가 유지된 상태에서 나온 결과다. 위 표의 사용률과 실제 피해는 이 해석을 뒷받침하는 관측값이고, 각 기믹의 독립 기여를 분리한 인과 추정은 아니다. 모야모 후반·팔자크 후반·칠리 후반도 여전히 높다. 빠른 선봉의 첫 지원 행동 자체는 기띠 없이도 유지될 수 있으므로 기띠 유무만을 고승률의 원인으로 단정하지 않는다.\n';
doc+='\n## 역할 우선 결론\n\n- 기띠 제거는 일부 승률·생존에 영향을 줬지만 순풍 전개가 무너진 것은 아니다. 음번 첫 턴 생존은 95층 100% → 46.88%로 크게 줄었으나 순풍은 여전히 32/32전이다. 이 표본에서 빠른 첫 지원 행동보다 이후 행동을 보장하던 기띠 효과가 사라졌다는 해석이 맞는다. 지정한 세 선봉은 도구 없음 그대로 유지했다.\n- 폭타 무도구는 중반에 더 불리해졌으나 후반 승률은 그대로다. 45층 starters 승리가 6/8 → 3/8로 줄었고, 후반 토오 진입/저수/맹독/땅 테라는 각각 32/32전을 유지했다. 새 도구로 보완하지 않았다.\n- 뽀삐 후반은 31.25% → 46.88%로 개선됐다. 장기전 중견을 특수 공격/장막 지원으로 바꾼 결과이며 장막 단독 효과와 종족 교체 효과를 분리한 실험은 아니다.\n- 현재 표본에서 중반 칠리 34.38%, 뽀삐 46.88%는 관찰 대상이다. 역할 수행이 확인된 만큼 즉시 새 도구를 추가할 근거로 삼지 않는다. 모야모·리파·팔자크·칠리 후반은 추가 대진/재현 로그 검토 후보다. 추가 밸런스 수정은 이번 범위에서 시행하지 않았다.\n\n## 나머지 9종과 검증\n\n나머지 9종(네모/테사/올림/투로 포함)의 summary 객체 전체가 기준 실행과 동일함을 검증했다. 1~8세대 데이터도 기준 해시를 유지한다.\n\n수정 파일: 생성 스크립트/Paldea design/reviewed source/runtime, \`src/battle/paldea-policy.ts\`의 제한된 분기, 벤치마크의 선택적 출력 경로, 이 보고서 생성기와 후처리 telemetry, \`tests/paldea-tuning.test.ts\`/기준 fixture와 telemetry 회귀 테스트.\n\n';
const tests=readFileSync('artifacts/experiments/balance/raw/paldea-tuning-all-tests.log','utf8'),passed=tests.match(/ℹ pass (\d+)/)?.[1],failed=tests.match(/ℹ fail (\d+)/)?.[1];
doc+=`전체 회귀: ${passed&&failed==='0'?passed+'/'+passed+' 통과':'최종 실행 진행 중'}. 집중 7개(범위 보존·장막 조건·중복 금지·실제 엔진·특성 로그 집계), TypeScript, 프로덕션 빌드 및 exporter 일치 검증을 수행했다. 최종 로그는 \`artifacts/paldea-tuning-{all-tests,focused,types,build}.log\`.\n\n원본 전체 로그/manifest는 \`${root}/{before,after}/\`, 후처리 전체 지표는 \`comparison-battles.json\`, 공통 비교는 \`comparison-summary.json\`. 재생성: \`node node_modules/tsx/dist/cli.mjs scripts/report-paldea-tuning.ts\`.\n`;
doc+='\n45층의 테라 사용 0은 기존 층별 기믹 게이트에 따른 정상 동작이다. 다섯 대상 모두 95층에서는 테라가 허용된다. 최종 TypeScript·프로덕션 빌드·reviewed/runtime 일치 검사는 모두 통과했다.\n';
writeFileSync('artifacts/reports/npc/paldea-npc-tuning.md',doc);
console.log(summary.map(s=>({id:s.id,floor:s.floor,before:s.beforeWin,after:s.afterWin})));
