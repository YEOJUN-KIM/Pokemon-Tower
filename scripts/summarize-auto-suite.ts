import {createReadStream,readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {runBattle,battleEvents} from '../src/battle/run';
import {immuneLossSignals} from './lib/immune-loss-signals';

const seed=process.argv[2]??'20261010';if(!/^\d{1,12}$/.test(seed))throw Error('Numeric seed required');
const prefix=`artifacts/auto-suite-${seed}`,read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const manifest=read(prefix+'-manifest.json'),samples=read(prefix+'-samples.json');
for(const f of manifest.files)assert.equal(createHash('sha256').update(readFileSync(f.path)).digest('hex'),f.sha256);
const cases=read(prefix+'-cases.json'),source=read('artifacts/observed-damage-validation-courses.json').courses;
const failureGroups:Record<string,number>={},abilityGroups:Record<string,number>={},failures:any[]=[],summary:any[]=[];
const immuneSignalBattles:Record<string,number>={},immuneSignalEvents:Record<string,number>={};
let battles=0,climbs=0,replays=0;let prices:any;
const count=(group:Record<string,number>,key:string)=>group[key]=(group[key]??0)+1;
for(const rule of manifest.rules){
 const report=read(`artifacts/simulation-auto-suite-${seed}-${rule}-balanced.json`);
 assert.deepEqual(report.caseDefinitions,cases);assert.equal(report.playerAI,'matchup-experimental');assert.equal(report.opponentAI,'v7');
 if(prices)assert.deepEqual(prices,report.prices);prices=report.prices;
 assert.equal(report.sourceCourseHash,manifest.files.find((f:any)=>f.path==='artifacts/observed-damage-validation-courses.json').sha256);
 const rows:any[]=[];for await(const l of createInterface({input:createReadStream(prefix+`-${rule}-battles.jsonl`),crlfDelay:Infinity}))if(l.trim())rows.push(JSON.parse(l));
 assert.equal(rows.length,report.stages.reduce((s:number,c:any)=>s+c.battles,0));battles+=rows.length;
 for(const st of report.stages)for(const c of st.climbs){
  climbs++;assert.equal(c.coins,c.earned-c.spent);assert(c.coins>=0);
  const seq=rows.filter(b=>b.caseId===st.stage&&b.courseId===c.id);assert.equal(seq.length,c.cleared+(c.cleared<100?1:0));
  assert(seq.every((b,i)=>b.floor===i+1));assert(seq.slice(0,c.cleared).every(b=>b.winner==='Player'));
  if(c.cleared===100)continue;
  const loss=seq.at(-1)!;assert.notEqual(loss.winner,'Player');
  const signals:string[]=[];
  if(loss.immunityMetrics.repeated>0)signals.push('repeated-immune-attack');
  if(loss.immunityDecisionMetrics.preventableBlocked>0)signals.push('recognized-avoidable-immune');
  if(loss.floor<=10)signals.push('early-loss');
  if(loss.floor>50)signals.push('late-loss');
  const flags=samples.generatedAudit.find((a:any)=>a.caseId===loss.caseId);if(flags.gaps.length)signals.push('starting-static-coverage-gap');
  if(!signals.length)signals.push('other-loss-needs-review');
  for(const s of signals)count(failureGroups,s);
  const abilities=[...new Set<string>(loss.publicProtocol.filter((l:string)=>l.startsWith('|-immune|p2')).flatMap((l:string)=>{const m=l.match(/\[from\] ability: ([^|]+)/);return m?[m[1]]:[];}))];
  for(const a of abilities)count(abilityGroups,a);
  const immuneSignals=immuneLossSignals(loss.playerTeam,loss.publicProtocol);
  for(const [key,value] of Object.entries(immuneSignals)){count(immuneSignalBattles,key);immuneSignalEvents[key]=(immuneSignalEvents[key]??0)+value;}
  const failure={rule,caseId:loss.caseId,category:cases.find((c:any)=>c.id===loss.caseId).category,courseId:c.id,theme:c.theme,floor:loss.floor,trainer:loss.trainer,signals,publicImmuneAbilities:abilities,repeatAttacks:loss.immunityMetrics.repeated,immuneSignals};failures.push(failure);
  const queue=(side:'p1'|'p2')=>{const actions=loss.decisions.filter((d:any)=>d.side===side);let n=0;return{choose:()=>actions[n++].action};};
  const e=source.find((s:any)=>s.id===c.id).encounters[loss.floor-1];
  const replay=await runBattle({rule:loss.rule,format:loss.format,seed:loss.seed,teams:{p1:Showdown.Teams.pack(loss.playerTeam),p2:Showdown.Teams.pack(loss.opponentTeam)},teraTickets:{p1:loss.teraTicketsBefore,p2:rule==='basic'?0:e.enemyTeraTickets??1},battleItems:loss.battleItemsBefore,player:queue('p1'),opponent:queue('p2')});
  assert.equal(replay.winner,loss.winner);assert.deepEqual(replay.decisions.map(d=>[d.side,d.action]),loss.decisions.map((d:any)=>[d.side,d.action]));assert.deepEqual(battleEvents(replay.publicProtocol),loss.publicProtocol);replays++;
 }
 assert.equal(report.stages.length,cases.length);assert(report.stages.every((s:any)=>s.climbs.length===9));
 summary.push({rule,climbs:cases.length*9,battles:rows.length,finished:report.stages.reduce((s:number,c:any)=>s+c.finished,0),passed50:report.stages.reduce((s:number,c:any)=>s+c.passed50,0),averageCleared:report.stages.reduce((s:number,c:any)=>s+c.averageCleared,0)/cases.length,teams:report.stages.map((c:any)=>({caseId:c.stage,category:cases.find((s:any)=>s.id===c.stage).category,finished:c.finished,averageCleared:c.averageCleared}))});
 console.log('Audited '+rule+' '+rows.length+' battles');
}
const diagnosticFiles=['scripts/run-auto-suite.mjs','scripts/summarize-auto-suite.ts','scripts/lib/immune-loss-signals.ts'].map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}));
const result={seed,battles,climbs,replays,catalogSpecies:samples.catalogSpecies,uniqueSpecies:new Set(cases.flatMap((c:any)=>c.team)).size,summary,failureGroups,abilityGroups,immuneSignalBattles,immuneSignalEvents,failures,diagnosticFiles,notes:'Signals overlap and are observational, not causal labels. Existing nine courses, no independent generalization claim; three rules share courses. Offline static target ability scenarios never enter player input. Same experimental player and NPC v7, no ML training or live changes.'};
writeFileSync(prefix+'-summary.json',JSON.stringify(result,null,2));
const table=summary.map(s=>`| ${s.rule} | ${s.finished}/${s.climbs} | ${s.passed50}/${s.climbs} | ${s.averageCleared.toFixed(1)} |`).join('\n');
const sorted=(g:Record<string,number>)=>Object.entries(g).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`- ${k}: ${v}`).join('\n');
writeFileSync(prefix+'-report.md',`# 자동 샘플 점검과 대량 시뮬 · ${seed}\n\n도감 ${samples.catalogSpecies}종의 기본 설정, 기존 샘플, 자동 생성 ${cases.length}팀(${result.uniqueSpecies}종)을 점검했다. ${climbs}등반 / ${battles}배틀을 실행했다. 마지막 패배 ${replays}개는 전체 공개 프로토콜로 재생해 일치 확인했다.\n\n| 룰 | 100층 완주 | 50층 통과 | 평균 성공 층 |\n|---|---:|---:|---:|\n${table}\n\n## 실패 신호\n\n${sorted(failureGroups)}\n\n## 마지막 패배에서 공개된 무효 특성\n\n${sorted(abilityGroups)}\n\n신호는 서로 겹치며 패배 원인을 증명하는 라벨이 아니다. 현재 무효 검사기는 일부 특성을 지원하지 않아 recognized-avoidable-immune 수치는 전체 엔진의 보장이 아니다. 정적 공격 범위 검사는 상태이상·날씨·PP·도구·테라·생존 여부를 완전히 모형화하지 않는다.\n\n스타터 1~9세대 9팀과 시드로 뽑은 벽/트릭룸/혼합 각 3팀을 사용했다. 모든 자동 팀은 합법성 검사를 통과했으며, 경고가 있어도 기존 설정을 자동 변경하지 않는다. 완전 육성/층별 회복/자동 영입·구매 조건이다. 임의 3마리 조합의 사람 승률이나 최적화된 파티 승률은 아니다. 기존 9코스의 진단으로 지역과 룰 결과는 연관된다. 실제 게임 설정이나 상대 강도, 학습 모델은 변경하지 않았다.\n\n재실행: node scripts/run-auto-suite.mjs 새숫자시드. 기존 시드 파일이 있으면 덮어쓰지 않는다. 완료된 기록만 재검사: node node_modules/tsx/dist/cli.mjs scripts/summarize-auto-suite.ts ${seed}. cases/samples/manifest/룰별 battles/summary 파일은 같은 artifacts/auto-suite-${seed} 접두어다. 새 시드는 조합을 바꾸며 적 코스는 고정한다. 독립 검증에는 별도 적 코스가 필요하다.\n`);
appendFileSync(prefix+'-report.md',`\n## 공개 무효 사건의 자동 세부 분류\n\n${sorted(immuneSignalBattles)}\n\n위 수치는 해당 신호가 한 번 이상 나온 마지막 패배 수다. 별도 JSON의 immuneSignalEvents는 사건 수다. 유효 기술의 정적 존재만 확인하므로 PP·봉인·선택 잠금·교체 제한·생존 가능성 등 실제 합법성과 성공 가능성을 증명하지 않는다. 교체한 상대의 특성은 새 공개 이벤트까지 초기화하고 쓰러진 동료는 제외한다.\n\n기본 도감 설정에서 직접 공격이 없는 메타몽·해무기·루브도 3종은 역할 검토 경고이며 설정 오류로 단정하지 않는다. 기존 마릴리/코터스 육성 불일치도 자동 검출했다.\n`);
console.log(JSON.stringify({battles,climbs,replays,summary:summary.map(({teams,...s})=>s),failureGroups,abilityGroups,immuneSignalBattles},null,2));
