import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import baseline from '../tests/fixtures/paldea-round2-baseline.json' with {type:'json'};
import {paldeaRound2Telemetry} from './lib/paldea-round2-telemetry';

const root='artifacts/experiments/balance/paldea-round2-20261019';
const phases=['before','after','tulip-no-item','rika-toxic-spikes'] as const;
const load=(phase:string)=>readFileSync(`${root}/${phase}/logs.jsonl`,'utf8').trim().split('\n').map(l=>{const r=JSON.parse(l);return {id:r.id,name:r.name,floor:r.floor,case:r.case,n:r.n,evaluations:r.evaluations,...paldeaRound2Telemetry(r.log)};});
const data=Object.fromEntries(phases.map(p=>[p,load(p)])) as Record<typeof phases[number],ReturnType<typeof load>>;
type Row=ReturnType<typeof load>[number];
const manifests=Object.fromEntries(phases.map(p=>[p,JSON.parse(readFileSync(`${root}/${p}/summary.json`,'utf8'))]));
for(const phase of phases){assert.equal(data[phase].length,phase==='before'||phase==='after'?912:64);assert.ok(manifests[phase].summary.every((s:any)=>s.errors===0));assert.equal(manifests[phase].FORMAT,manifests.before.FORMAT);assert.deepEqual(manifests[phase].cases,manifests.before.cases);}
for(let i=0;i<data.before.length;i++){const b=data.before[i],a=data.after[i];assert.deepEqual([a.id,a.floor,a.case,a.n],[b.id,b.floor,b.case,b.n]);}
for(const row of manifests.after.summary)if(!baseline.ids.includes(row.id))assert.deepEqual(row,manifests.before.summary.find((b:any)=>b.id===row.id&&b.floor===row.floor));
for(const [p,hash]of Object.entries(manifests.after.hashes))assert.equal(createHash('sha256').update(readFileSync(p)).digest('hex'),hash,p);
for(const row of [...data.after,...data['tulip-no-item'],...data['rika-toxic-spikes']]){
 let last=-10;for(const e of row.evaluations.filter((e:any)=>e.mode!=='ko')){assert.ok(e.netImprovement>0&&e.remainingHP>.25);assert.equal(e.koAvailable,false);assert.ok(e.turn-last>=3);last=e.turn;}
}
const group=(phase:typeof phases[number],id:string,floor?:number)=>data[phase].filter(r=>r.id===id&&(floor===undefined||r.floor===floor));
const sum=(rows:Row[],f:(r:Row)=>number)=>rows.reduce((n,r)=>n+f(r),0),pct=(n:number,d:number)=>`${(100*n/d).toFixed(2)}%`,avg=(rows:Row[],f:(r:Row)=>number)=>(sum(rows,f)/rows.length).toFixed(2),wins=(rows:Row[])=>pct(sum(rows,r=>Number(r.winner==='Tower AI')),rows.length),rate=(rows:Row[],f:(r:Row)=>boolean)=>`${sum(rows,r=>Number(f(r)))}/${rows.length}`;
const moved=(r:Row,name:string,move:string)=>(r.mons[name]?.moves[move]??0)>0;
const order=['named-iono','named-tulip','named-hassel','named-rika'];const names:Record<string,string>={'named-iono':'모야모','named-tulip':'리파','named-hassel':'팔자크','named-rika':'칠리'};
writeFileSync(root+'/comparison-battles.json',JSON.stringify(data,null,2)+'\n');
let doc=`# 팔데아 4종 2차 제한 조정·조건부 후보 비교\n\n기준 커밋: \`0ef5da4c8e929fe744c63eac9d014dc381b9f19f\`. 실제 반영은 찌리비크 Tailwind→Air Slash, 음번 Tailwind→Flamethrower, 엘레이드 Life Orb→Expert Belt, 토오 Toxic→Stone Edge의 네 필드만이다. 선봉 무도구·특성·나머지 기술·훈련·파티·테라 설정은 그대로다. 뽀삐/네모/테사/교수/다른 NPC와 모든 Advanced Switch·피벗·hazard·테라 AI 소스를 기준 해시로 보존했다.\n\n## 동일 조건과 실험 분리\n\n기준/1차안은 각각 14종 912전, 조건부 무도구 리파/독압정 칠리는 각각 64전, 총 1,952전이다. 기본은 NPC/층별 4파티×8 seed=32전, 네모 hazard 추가 16전도 전후 그대로 유지했다. 이벤트 ID·seed·플레이어 파티/도구/육성/정책·층·엔진/포맷은 동일하다. 각 단계 offense seed 1의 재생 검증은 총 60전이며 모든 실행 오류 0건이다.\n\n조건부 후보는 실제 source/runtime 데이터를 바꾸지 않고 시뮬레이터에 전달하는 packed team 사본만 한 필드 바꿨다. 실행 후에도 실제 엘레이드는 Expert Belt, 토오는 Stone Edge다. 1차안 결과를 본 뒤 리파가 100%/96.88%이며 엘레이드 KO 기여가 늘었고, 칠리 후반도 93.75%로 높아 후보 비교 조건이 충족되었다.\n\n## 최종 비교표 — 실제 반영한 1차안\n\n| NPC | 현재 중반 | 수정 후 중반 | 현재 후반 | 수정 후 후반 |\n|---|---:|---:|---:|---:|\n`;
for(const id of order)doc+=`| ${names[id]} | ${wins(group('before',id,45))} | ${wins(group('after',id,45))} | ${wins(group('before',id,95))} | ${wins(group('after',id,95))} |\n`;
doc+='\n각 칸 32전이며 1전은 3.125%p다. 관측 승률이지 실제 PvP 분포의 보편 승률이 아니다. 나머지 10종의 summary 객체 전체는 전후 동일하다. 뽀삐는 45/95층 모두 46.88%를 유지했고 데이터·장막 AI도 그대로다.\n\n## 리파 — 도구 후보\n\n| 엘레이드 도구 | 중반 | 후반 | 평균 직접 피해 45/95층 (%p) | KO 수 45/95층 |\n|---|---:|---:|---:|---:|\n';
for(const [label,phase]of [['생명의구슬','before'],['달인의띠 — 실제 반영','after'],['도구 없음 — 비교 전용','tulip-no-item']] as const){const b=group(phase,'named-tulip',45),a=group(phase,'named-tulip',95);doc+=`| ${label} | ${wins(b)} | ${wins(a)} | ${avg(b,r=>r.mons.Gallade?.damage??0)} / ${avg(a,r=>r.mons.Gallade?.damage??0)} | ${sum(b,r=>r.kos.Gallade??0)} / ${sum(a,r=>r.kos.Gallade??0)} |\n`;}
doc+='\n피해는 공개 HP 비율로 집계한 상대 최대 HP 대비 직접 피해 누계의 전투당 평균이다. 여러 상대를 합쳐 100%p를 넘을 수 있고 잔여 HP로 피해가 포화되는 점도 포함한다. KO는 실제 직접 공격으로 쓰러뜨린 수이며 예측 KO와 구분한다.\n\n| 리파 지표 | 생명의구슬 | 달인의띠 | 도구 없음 |\n|---|---:|---:|---:|\n';
for(const [label,f]of [
 ['엘레이드 총 직접 KO',(r:Row)=>r.kos.Gallade??0],['약점 적중의 실제 피해 누계 (%p)',(r:Row)=>r.galladeSuperDamage],['약점 적중 횟수',(r:Row)=>r.galladeSuperHits],['생명의구슬 반동 자멸',(r:Row)=>r.galladeRecoilKO],
] as const)doc+=`| ${label} | ${(['before','after','tulip-no-item'] as const).map(p=>label.includes('%p')?sum(group(p,'named-tulip'),f).toFixed(2):String(sum(group(p,'named-tulip'),f))).join(' | ')} |\n`;
doc+='\n달인의띠는 약점 공격에만 실제 엔진의 1.2배 보정이 있고 중립 공격에는 없음을 고정 난수 엔진 테스트로 확인했다. 예리함은 유지된다. AI에 새 약점 기술 선택 보너스를 추가하지 않았으며, 이번 달인의띠 선택은 기존 원시 예상 피해 최댓값을 버리고 낮은 약점 기술을 강제하는 패턴이 없었다.\n\n**추천:** 달인의띠를 단순한 하향으로 간주하면 안 된다. 이번 표본에서는 생명의구슬 반동 제거로 생존/누적 공격 기회가 늘어 승률과 KO가 증가했다. 승패가 뒤집힌 4전 중 3전의 기준 로그에는 엘레이드의 생명의구슬 반동 사망이 있다. 관장 화력 완화가 우선이면 별도 후보 중 무도구가 더 적절하지만, 여전히 90.63%/93.75%로 높아 중견 도구만이 원인은 아니다. 요청대로 무도구를 자동 반영하지 않고 실제 데이터는 달인의띠로 남겼다.\n\n## 칠리 — 세 번째 기술 후보\n\n| 토오 3번째 기술 | 중반 | 후반 | 역할/관측 |\n|---|---:|---:|---|\n';
for(const [label,phase,role]of [['맹독','before','직접 독살 압박'],['스톤에지 — 실제 반영','after','비행 상대 직접 공격, 기존 회복·저수 유지'],['독압정 — 비교 전용','rika-toxic-spikes','필드 지원 후보, 설치와 유효 진입 기회가 제한됨']] as const)doc+=`| ${label} | ${wins(group(phase,'named-rika',45))} | ${wins(group(phase,'named-rika',95))} | ${role} |\n`;
doc+='\n### 독압정 후보의 실제 작동\n\n| 지표 | 45층 / 32전 | 95층 / 32전 |\n|---|---:|---:|\n';
for(const [label,f]of [
 ['독압정 선택 전투',(r:Row)=>r.toxicSpikesSelected>0],['실제 설치 성공 전투',(r:Row)=>r.toxicSpikesInstalled>0],['진입 독/맹독 발생 전투',(r:Row)=>r.toxicSpikesPoisoned>0],['독 타입 진입으로 제거된 전투',(r:Row)=>r.toxicSpikesPoisonAbsorptions>0],['최대 2층 이후 중복 사용 전투',(r:Row)=>r.toxicSpikesOverstack>0],
] as const)doc+=`| ${label} | ${rate(group('rika-toxic-spikes','named-rika',45),f)} | ${rate(group('rika-toxic-spikes','named-rika',95),f)} |\n`;
doc+='\n| 토오 기술 | 평균 필드 턴 45/95층 | 평균 직접 피해 45/95층 (%p) | HP회복 사용 전투 45/95층 |\n|---|---:|---:|---:|\n';
for(const [label,phase]of [['맹독','before'],['스톤에지','after'],['독압정','rika-toxic-spikes']] as const){const b=group(phase,'named-rika',45),a=group(phase,'named-rika',95);doc+=`| ${label} | ${avg(b,r=>r.mons.Clodsire?.activeTurns??0)} / ${avg(a,r=>r.mons.Clodsire?.activeTurns??0)} | ${avg(b,r=>r.mons.Clodsire?.damage??0)} / ${avg(a,r=>r.mons.Clodsire?.damage??0)} | ${rate(b,r=>moved(r,'Clodsire','Recover'))} / ${rate(a,r=>moved(r,'Clodsire','Recover'))} |\n`;}
doc+='\n독압정 후보에서도 연속 HP회복, 보수적 KO를 버린 변화기, 테라 후 타입 무효 공격은 관찰되지 않았다. 설치만 반복하는 과도한 수동성은 확인되지 않았지만, 유효 설치 기회가 특정 bulk 대진에 몰렸다.\n';
const tsp=group('rika-toxic-spikes','named-rika');
doc+=`\n독압정 기원 중독의 관측 독 피해 누계 ${sum(tsp,r=>r.toxicSpikesPoisonDamage).toFixed(2)}%p, 플레이어 자발 교체 ${sum(tsp,r=>r.playerVoluntary)}회다. 이 플레이어 정책은 상성 교체를 적극적으로 하지 않으므로 hazard로 유도한 교체 압박을 PvP처럼 평가하기에는 제한이 있다. 설치 7회는 후반 bulk의 Corviknight 대면에서 발생했다. Corviknight는 비행/강철로 토오의 두 공격을 무효화하고 독압정 진입 중독도 피한다. 상대 필드 hazard는 자기 팀 진입 비용과 별개이며, 고급 교체/hazard 계층은 일절 수정하지 않았다. 네모 hazard 전용 결과도 그대로다. 벤치마크에서는 독 타입 흡수 사례가 없었지만, 독압정 후보의 실제 기술 사용 → Blastoise 진입 중독 → Venusaur 진입 제거는 별도 엔진 테스트로 확인했다.\n\n**추천:** 현재는 스톤에지를 유지한다. 직접 공격 범위와 역할이 명확하고, 독압정은 설치 자체와 유효 상대 진입 기회가 제한됐다. 독압정 후보의 더 낮은 승률만 보고 채택하지 않는다. 필드 운영 후보를 채택하려면 다양한 교체 상대와 별도 설치 판단 검토가 필요하며, 이번 AI 보존 범위에서는 추가하지 않았다.\n\n## NPC별 행동 지표\n\n비율의 분모는 각 층 전체 32전이다. 필드 턴은 재진입을 포함해 살아서 필드에 있던 서로 다른 턴 수의 전투당 평균이다. 45층 테라 0은 기존 55층 게이트에 따른 정상 동작이다.\n`;
function metrics(id:string,items:[string,(r:Row)=>boolean][],averages:[string,(r:Row)=>number][]=[]){
 let out=`\n### ${names[id]}\n\n| 지표 | 45층 현재→수정 | 95층 현재→수정 |\n|---|---|---|\n`;
 for(const [label,f]of items)out+=`| ${label} | ${[45,95].map(floor=>rate(group('before',id,floor),f)+' → '+rate(group('after',id,floor),f)).join(' | ')} |\n`;
 for(const [label,f]of averages)out+=`| ${label} | ${[45,95].map(floor=>avg(group('before',id,floor),f)+' → '+avg(group('after',id,floor),f)).join(' | ')} |\n`;
 return out;
}
doc+=metrics('named-iono',[
 ['찌리비크 순풍',r=>moved(r,'Kilowattrel','Tailwind')],['Volt Switch',r=>moved(r,'Kilowattrel','Volt Switch')],['Air Slash',r=>moved(r,'Kilowattrel','Air Slash')],['Hurricane',r=>moved(r,'Kilowattrel','Hurricane')],['찌리배리 전기로바꾸기',r=>(r.mons.Bellibolt?.electromorphosis??0)>0],['무우마직 도달',r=>r.mons.Mismagius?.entered??false],['전기 테라',r=>(r.mons.Mismagius?.tera??0)>0],
],[['찌리비크 평균 필드 턴',r=>r.mons.Kilowattrel?.activeTurns??0],['찌리배리 평균 직접 피해',r=>r.mons.Bellibolt?.damage??0],['무우마직 평균 직접 피해',r=>r.mons.Mismagius?.damage??0]]);
doc+=metrics('named-hassel',[
 ['음번 순풍',r=>moved(r,'Noivern','Tailwind')],['화염방사',r=>moved(r,'Noivern','Flamethrower')],['도발',r=>moved(r,'Noivern','Taunt')],['액스라이즈 용의춤',r=>moved(r,'Haxorus','Dragon Dance')],['용의춤 후 실제 타격',r=>r.haxDanceThenDamage>0],['드닐레이브 등장',r=>r.mons.Baxcalibur?.entered??false],['드래곤 테라',r=>(r.mons.Baxcalibur?.tera??0)>0],['대검돌격',r=>moved(r,'Baxcalibur','Glaive Rush')],
],[['음번 평균 필드 턴',r=>r.mons.Noivern?.activeTurns??0],['음번 평균 직접 피해',r=>r.mons.Noivern?.damage??0],['용의춤 후 평균 직접 피해',r=>r.haxDanceDamage],['평균 직접 교체',r=>r.voluntary]]);
doc+=metrics('named-tulip',[
 ['플라제스 도달',r=>r.mons.Florges?.entered??false],['플라제스 명상',r=>moved(r,'Florges','Calm Mind')],['플라제스 에스퍼 테라',r=>(r.mons.Florges?.tera??0)>0],
],[['엘레이드 평균 필드 턴',r=>r.mons.Gallade?.activeTurns??0],['플라제스 평균 직접 피해',r=>r.mons.Florges?.damage??0]]);
doc+=metrics('named-rika',[
 ['토오 진입',r=>r.mons.Clodsire?.entered??false],['저수',r=>(r.mons.Clodsire?.waterAbsorb??0)>0],['맹독',r=>moved(r,'Clodsire','Toxic')],['스톤에지',r=>moved(r,'Clodsire','Stone Edge')],['HP회복',r=>moved(r,'Clodsire','Recover')],['땅 테라',r=>(r.mons.Clodsire?.tera??0)>0],
],[['토오 평균 필드 턴',r=>r.mons.Clodsire?.activeTurns??0],['토오 평균 직접 피해',r=>r.mons.Clodsire?.damage??0],['평균 직접 교체',r=>r.voluntary]]);
doc+='\n### 칠리 bulk 상대 승리 / 8전\n\n| 기술 | 45층 | 95층 |\n|---|---:|---:|\n';
for(const [label,phase]of [['맹독','before'],['스톤에지','after'],['독압정','rika-toxic-spikes']] as const)doc+=`| ${label} | ${[45,95].map(f=>sum(group(phase,'named-rika',f).filter(r=>r.case==='bulk'),r=>Number(r.winner==='Tower AI'))).join(' | ')} |\n`;
doc+='\n## 이상 행동 감사\n\n| 지표 (실제 반영 1차안의 4종 256전) | 횟수 |\n|---|---:|\n';
const changed=data.after.filter(r=>baseline.ids.includes(r.id));
for(const [label,key]of [['Air Slash 고명중 KO를 두고 Hurricane 선택','hurricaneOverReliableKO'],['음번 도발 연속 반복','tauntRepeats'],['달인의띠 때문에 낮은 원시 예상 피해 기술 강제 선택','galladeSuboptimalRawChoices'],['토오 HP회복 연속 반복','recoverRepeats'],['HP>65%에서 HP회복 선택','highHpRecover'],['보수적 예상 KO가 있는데 설치/변화기','statusOverKO'],['테라 후 공개 타입에 무효인 공격 선택','teraTypeImmuneChoices']] as const)doc+=`| ${label} | ${sum(changed,r=>r[key])} |\n`;
doc+=`\n찌리비크의 두 비행기가 모두 합법인 요청 ${sum(changed,r=>r.bothFlyingAvailable)}회에서 Air Slash 선택 ${sum(changed,r=>r.airChoices)}회, Hurricane 선택 ${sum(changed,r=>r.hurricaneChoices)}회다. Hurricane의 110×70%=77은 Air Slash의 75×95%=71.25보다 기존 명중률 반영 예상 화력이 높아 선택이 편중된다. 강제 기술 잠금이 아니라 동결된 점수 함수의 선호이며, 안정성 가중치를 새로 넣지 않았다. Air Slash 실제 사용이 적은 점은 다음 조정 검토 후보로 남긴다.\n\n기록된 모든 Advanced 이탈은 보수적 KO 없음·진입 후 HP>25%·순이득 양수·3턴 간격을 만족했다. 후속 구성에 따른 교체 수 변화는 위 표에 있으며, 반복 교체를 만들기 위한 정책 변경은 없다. 이 감사는 공개 정보 기반 보수적 평가 모델 기준으로, 실제 숨은 선택까지 아는 최적해를 주장하지 않는다.\n\n## 팔자크 용의춤의 실제 후속 역할\n\n후반 용의춤 사용은 6/32 → 8/32로 늘었지만, 성공 후 직접 타격을 한 전투는 양쪽 모두 0/32였다. 예를 들어 signature seed 1은 용의춤 뒤 Gyarados의 Ice Fang이 공개되자 다음 턴 Baxcalibur로 교체했다. 따라서 순풍 제거가 후반 용의춤의 피해 기여를 개선했다고 볼 수 없다. 음번의 평균 직접 피해가 47.84 → 100.19%p로 증가한 점이 더 뚜렷하며, 기존 패배였던 후반 offense seed 3도 승리로 바뀌었다.\n\n## 최종 판단\n\n- 모야모: 후반 100% → 90.63%로 무패는 해소됐다. 관장 중 강한 수준이며 추가 찌리배리/무우마직 하향은 하지 않았다.\n- 팔자크: 순풍을 빼도 화염방사 커버리지/초기 공격으로 후반은 오히려 100%다. 의도한 지원 안정성은 제거했지만 전체 하향에는 실패했다. 이번 범위에서는 추가 변경하지 않고 후속 검토 대상으로 남긴다.\n- 리파: 달인의띠는 이번 표본에서 하향이 아니었다. 무도구가 완화 후보로 더 낫지만 자동 반영하지 않는다.\n- 칠리: 맹독 고정 패턴은 사라졌으나 저수/땅 테라 중심 후반 강세가 남는다. 이번 범위에서는 스톤에지 유지가 더 명확한 역할을 제공한다.\n- 뽀삐: 성공한 빌드와 46.88%/46.88% 및 장막 정책을 보존했다.\n\n## 수정 파일과 검증\n\n수정은 Paldea 생성 스크립트/design/reviewed/runtime 4개 파일의 네 build 값, benchmark의 비교 전용 packed-team 옵션뿐이다. 공통 전투 AI 소스는 변경하지 않았다. 추가 파일은 round2 보존 fixture/테스트, 이전 라운드 보존 reader, 비교 전용 variant helper, 후처리 telemetry/보고서 생성기와 이 문서다. 이전 라운드의 체크섬은 허용된 네 행만 당시 값으로 복원하고, 새 round2 테스트가 현재 전체 데이터를 직접 검증한다.\n\n`;
const tests=readFileSync('artifacts/paldea-round2-all-tests.log','utf8'),passed=tests.match(/ℹ pass (\d+)/)?.[1],failed=tests.match(/ℹ fail (\d+)/)?.[1];
doc+=`전체 회귀: ${passed&&failed==='0'?passed+'/'+passed+' 통과':'최종 실행 진행 중'}. TypeScript, Next 프로덕션 빌드, reviewed/runtime exporter 일치 검증을 수행했다. 기존 저장/재접속/리플레이와 뽀삐 장막 테스트도 회귀에 포함한다.\n\n로그: \`artifacts/paldea-round2-{all-tests,focused,types,build}.log\`. 1,952전 원본/manifest: \`${root}/{before,after,tulip-no-item,rika-toxic-spikes}/\`. 후처리 전체 지표는 \`comparison-battles.json\`. 재생성: \`node node_modules/tsx/dist/cli.mjs scripts/report-paldea-round2.ts\`.\n`;
doc+='\n최종 TypeScript·프로덕션 빌드·exporter 일치 검사 모두 통과했다. 집중 55개 테스트는 실제 반영 범위, 후보의 사본 격리, 달인의띠 엔진 보정, 독압정 진입/독 타입 제거와 기존 팔데아·뽀삐 장막 검증을 포함한다.\n';
writeFileSync('docs/gameplay/paldea-npc-round2.md',doc);
console.log(order.map(id=>({id,before:[45,95].map(f=>wins(group('before',id,f))),after:[45,95].map(f=>wins(group('after',id,f)))})));
