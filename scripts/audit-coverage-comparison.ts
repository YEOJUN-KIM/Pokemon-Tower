import {createReadStream,readFileSync,writeFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {runBattle,battleEvents} from '../src/battle/run';
import {immuneLossSignals} from './lib/immune-loss-signals';

const seed=process.argv[2]??'20261010';if(!/^\d{1,12}$/.test(seed))throw Error('Numeric seed required');
const prefix=`artifacts/coverage-compare-${seed}`,read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
async function rows(path:string){const out:any[]=[];for await(const l of createInterface({input:createReadStream(path),crlfDelay:Infinity}))if(l.trim())out.push(JSON.parse(l));return out;}
const manifest=read(prefix+'-manifest.json');for(const f of manifest.files)assert.equal(createHash('sha256').update(readFileSync(f.path)).digest('hex'),f.sha256);
const source=read('artifacts/observed-damage-validation-courses.json').courses;
let replays=0,baselineBattlesReproduced=0,totalBattles=0;const results:any[]=[];
for(const rule of manifest.rules){
 const original=await rows(`artifacts/auto-suite-${seed}-${rule}-battles.jsonl`);
 const before=read(`artifacts/simulation-coverage-compare-${seed}-${rule}-matchup-balanced.json`),after=read(`artifacts/simulation-coverage-compare-${seed}-${rule}-adaptive-balanced.json`);
 const baseline=await rows(prefix+`-${rule}-matchup-battles.jsonl`),candidate=await rows(prefix+`-${rule}-adaptive-battles.jsonl`);
 assert.deepEqual(baseline.map(({phase,immunityDecisionMetrics,decisionReasons,...b})=>b),original.map(({phase,immunityDecisionMetrics,...b})=>b));baselineBattlesReproduced+=baseline.length;
 assert.deepEqual(before.caseDefinitions,after.caseDefinitions);assert.deepEqual(before.prices,after.prices);assert.equal(before.sourceCourseHash,after.sourceCourseHash);assert.equal(before.opponentAI,after.opponentAI);assert.equal(before.opponentAI,'v7');
 const modes:any[]=[];
 for(const [mode,report,battles] of [['matchup',before,baseline],['adaptive',after,candidate]] as const){
  assert.equal(battles.length,report.stages.reduce((s:number,c:any)=>s+c.battles,0));totalBattles+=battles.length;
  let repeatedLosses=0,immuneLosses=0,knownBlocked=0,preventableBlocked=0,allRepeatedAttacks=0;
  const immuneSignalBattles:Record<string,number>={},decisionReasons:Record<string,number>={};
  for(const b of battles){knownBlocked+=b.immunityDecisionMetrics.knownBlocked;preventableBlocked+=b.immunityDecisionMetrics.preventableBlocked;allRepeatedAttacks+=b.immunityMetrics.repeated;for(const [reason,n] of Object.entries(b.decisionReasons))decisionReasons[reason]=(decisionReasons[reason]??0)+Number(n);}
  for(const st of report.stages){assert.equal(st.climbs.length,manifest.courses);for(const c of st.climbs){
   const seq=battles.filter((b:any)=>b.caseId===st.stage&&b.courseId===c.id);assert.equal(seq.length,c.cleared+(c.cleared<100?1:0));assert(seq.every((b:any,i:number)=>b.floor===i+1));assert(seq.slice(0,c.cleared).every((b:any)=>b.winner==='Player'));assert.equal(c.coins,c.earned-c.spent);assert(c.coins>=0);
   if(c.cleared===100)continue;
   const loss=seq.at(-1)!;assert.notEqual(loss.winner,'Player');repeatedLosses+=Number(loss.immunityMetrics.repeated>0);immuneLosses+=Number(loss.immunityMetrics.total>0);
   for(const key of Object.keys(immuneLossSignals(loss.playerTeam,loss.publicProtocol)))immuneSignalBattles[key]=(immuneSignalBattles[key]??0)+1;
   const queue=(side:'p1'|'p2')=>{const actions=loss.decisions.filter((d:any)=>d.side===side);let n=0;return{choose:()=>actions[n++].action};};
   const e=source.find((s:any)=>s.id===c.id).encounters[loss.floor-1];
   const replay=await runBattle({rule:loss.rule,format:loss.format,seed:loss.seed,teams:{p1:Showdown.Teams.pack(loss.playerTeam),p2:Showdown.Teams.pack(loss.opponentTeam)},teraTickets:{p1:loss.teraTicketsBefore,p2:rule==='basic'?0:e.enemyTeraTickets??1},battleItems:loss.battleItemsBefore,player:queue('p1'),opponent:queue('p2')});
   assert.equal(replay.winner,loss.winner);assert.deepEqual(replay.decisions.map(d=>[d.side,d.action]),loss.decisions.map((d:any)=>[d.side,d.action]));assert.deepEqual(battleEvents(replay.publicProtocol),loss.publicProtocol);replays++;
  }}
  modes.push({mode,battles:battles.length,climbs:manifest.cases*manifest.courses,finished:report.stages.reduce((s:number,c:any)=>s+c.finished,0),passed50:report.stages.reduce((s:number,c:any)=>s+c.passed50,0),averageCleared:report.stages.reduce((s:number,c:any)=>s+c.averageCleared,0)/report.stages.length,knownBlocked,preventableBlocked,repeatedLosses,immuneLosses,allRepeatedAttacks,immuneSignalBattles,decisionReasons});
 }
 let higher=0,lower=0,same=0;const teams:any[]=[];
 for(const st of after.stages){const prev=before.stages.find((s:any)=>s.stage===st.stage);teams.push({caseId:st.stage,before:prev.averageCleared,after:st.averageCleared});for(const c of st.climbs){const old=prev.climbs.find((b:any)=>b.id===c.id);higher+=Number(c.cleared>old.cleared);lower+=Number(c.cleared<old.cleared);same+=Number(c.cleared===old.cleared);}}
 results.push({rule,before:modes[0],after:modes[1],higher,lower,same,teams});console.log('Audited '+rule);
}
const report={seed,totalBattles,baselineBattlesReproduced,replays,results,notes:'Same 18 teams and nine seen courses; paired policy comparison. Both sides of the metrics use expanded public observer. Climb exposure differs. Static survivor answer diagnostics do not model PP/disabled/lock/safety. Public-only experimental player; no live NPC change or ML training. Future full-team replay data are offline only.'};
writeFileSync(prefix+'-audit.json',JSON.stringify(report,null,2));
const table=results.map(r=>`| ${r.rule} | ${r.before.finished}→${r.after.finished} /${r.after.climbs} | ${r.before.passed50}→${r.after.passed50} | ${r.before.averageCleared.toFixed(1)}→${r.after.averageCleared.toFixed(1)} | ${r.before.repeatedLosses}→${r.after.repeatedLosses} |`).join('\n');
writeFileSync(prefix+'-report.md',`# 공개 정보 기반 AI 개선 비교 · ${seed}\n\n같은 18팀·9코스·3룰로 기존/후보 각 486등반을 실행했다. 총 ${totalBattles}배틀. 기존 ${baselineBattlesReproduced}배틀의 상태·승패·선택이 원래 기록과 정확히 일치했다. 두 정책의 마지막 패배 ${replays}개를 전체 공개 프로토콜로 재생해 일치 확인했다.\n\n| 룰 | 100층 완주 전→후 | 50층 통과 전→후 | 평균 성공 층 전→후 | 반복 무효가 나온 마지막 패배 전→후 |\n|---|---:|---:|---:|---:|\n${table}\n\n공개된 추가 무효 특성, 흡수/발동 이벤트, 테라 이후 특성 유지, 공격 가능한 강제 교체 후보, 무효 상태의 제한된 긴급 교체, 필터링 뒤 가짜 강제 교체를 만드는 폴백을 개선했다. 실제로 합법인 교체만 쓰고 함정 경고/다이맥스/입장 즉사 위험을 제외하며 긴급 교체 상한은 6회다. 비공개 상대 세트/특성/미래 순서는 입력하지 않는다. 미래에만 등장할 미공개 상대를 위해 특정 동료를 보호하는 예지 전략은 추가하지 않았다.\n\n표본은 기존에 본 9코스이며 사람이 직접 하는 승률은 아니다. 룰/팀 결과는 같은 코스로 연관된다. 기술 배치, 영입/상점 알고리즘, 상대 v7, 가격, 난이도는 고정했다. 정책 변화로 등반 길이와 난수/상대 행동이 달라져 단일 행동의 효과로 해석하지 않는다. 정적 공격 해법 신호는 PP/봉인/선택 잠금/생존 가능성까지 증명하지 않는다. 새 정책은 실험용 플레이어에만 연결하며 실제 게임/NPC에는 승격하지 않았다.\n\n원본/후보 정책과 입력은 manifest.json의 해시로 확인한다. 전후 동일한 PublicImmunityV2 관측 검사기를 사용하므로 이전 제한된 검사기의 0건 수치와 직접 비교하지 않는다. audit.json에는 룰/팀별 결과, 결정 이유, 무효 분류와 집계가 있다. 실행: node scripts/run-coverage-comparison.mjs 완료된자동샘플시드. 기존 비교 파일은 보존한다. 감사: node node_modules/tsx/dist/cli.mjs scripts/audit-coverage-comparison.ts ${seed}.\n`);
console.log(JSON.stringify({totalBattles,baselineBattlesReproduced,replays,results:results.map(({teams,...r})=>r)},null,2));
