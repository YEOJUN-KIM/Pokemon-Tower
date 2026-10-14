import {createReadStream,readFileSync,writeFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {runBattle,battleEvents} from '../src/battle/run';
import {compositionSnapshot,compositionChanges} from './lib/composition-diagnostics';
import {assertFreshCourses} from './lib/course-freshness';
const seed=process.argv[2]??'20261011';if(!/^\d{1,12}$/.test(seed))throw Error('Numeric seed');
const prefix=`artifacts/experiments/samples/sample-holdout-${seed}`,read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
async function rows(path:string){const out:any[]=[];for await(const l of createInterface({input:createReadStream(path),crlfDelay:Infinity}))if(l.trim())out.push(JSON.parse(l));return out;}
const manifest=read(prefix+'-manifest.json');for(const f of manifest.files)assert.equal(createHash('sha256').update(readFileSync(f.path)).digest('hex'),f.sha256);
const courses=read(manifest.courseFile).courses,cells:any[]=[],strip=(b:any)=>{const {phase,...rest}=b;return rest;};
let totalBattles=0,reproducedBattles=0,replays=0,common:any;
const prior=manifest.priorCourseFiles.flatMap((f:any)=>read(f.path).courses);
const freshness=assertFreshCourses(courses,prior);assert.equal(courses.length,18);
assert.equal(new Set(courses.map((c:any)=>c.theme)).size,9);
for(const t of new Set(courses.map((c:any)=>c.theme)))assert.equal(courses.filter((c:any)=>c.theme===t).length,2);
const normalizeCases=(cases:any[])=>cases.map(c=>{const {moves,profiles,...rest}=c;return {...rest,profiles:Object.fromEntries(Object.entries(profiles).map(([n,p]:any)=>{const {moves,...r}=p;return[n,r];}))};});
for(const mode of manifest.modes)for(const rule of manifest.rules){
 const report=read(`artifacts/experiments/balance/simulation-sample-holdout-${seed}-${rule}-${mode}-balanced.json`),data=await rows(prefix+`-${rule}-${mode}-battles.jsonl`);
 const config={prices:report.prices,cases:normalizeCases(report.caseDefinitions),sourceCourseHash:report.sourceCourseHash,opponentAI:report.opponentAI,playerAI:report.playerAI,format:report.format,behavior:report.behavior,composition:report.composition,totalFloors:report.totalFloors};
 if(common)assert.deepEqual(config,common);common=config;assert.equal(report.opponentAI,'v7');assert.equal(report.playerAI,'immunity-experimental');
 totalBattles+=data.length;assert.equal(data.length,report.stages.reduce((s:number,c:any)=>s+c.battles,0));
 let pairLosses=0,roomLosses=0,coverageLosses=0,selectedGaps=0;const mutationCounts:Record<string,number>={};
 for await(const l of createInterface({input:createReadStream(prefix+`-${rule}-${mode}-trace.jsonl`),crlfDelay:Infinity})){
  const e=JSON.parse(l);assert.deepEqual(e.changes,compositionChanges(e.before,e.after));assert.deepEqual(e.after,compositionSnapshot(e.after.team,e.after.profiles));
  if(e.kind==='battle-selection'){selectedGaps+=Number(!e.after.shedinjaAnswerMembers.length);continue;}
  if(e.kind==='terminal-loss')continue;
  pairLosses+=Number(e.changes.lostRoles.includes('pairedScreens'));roomLosses+=Number(e.changes.lostRoles.includes('room'));coverageLosses+=Number(e.changes.lostShedinjaAnswer);
  if(JSON.stringify(e.before.profiles)!==JSON.stringify(e.after.profiles))mutationCounts[e.kind]=(mutationCounts[e.kind]??0)+1;
 }
 const runs:any[]=[];let rechargeLosses=0,rechargeTurns=0,repeatImmuneLosses=0,preventableBlocked=0;
 for(const b of data)preventableBlocked+=b.immunityDecisionMetrics.preventableBlocked;
 for(const st of report.stages){assert.equal(st.climbs.length,manifest.courses);for(const c of st.climbs){
  const seq=data.filter(b=>b.caseId===st.stage&&b.courseId===c.id);assert.equal(seq.length,c.cleared+(c.cleared<100?1:0));assert(seq.every((b,i)=>b.floor===i+1));assert(seq.slice(0,c.cleared).every(b=>b.winner==='Player'));assert.equal(c.coins,c.earned-c.spent);assert(c.coins>=0);
  runs.push({caseId:st.stage,category:st.category,courseId:c.id,cleared:c.cleared});if(c.cleared===100)continue;
  const loss=seq.at(-1)!;assert.notEqual(loss.winner,'Player');repeatImmuneLosses+=Number(loss.immunityMetrics.repeated>0);
  const n=loss.publicProtocol.filter((l:string)=>l.startsWith('|cant|p1')&&l.includes('|recharge')).length;rechargeLosses+=Number(n>0);rechargeTurns+=n;
  const queue=(side:'p1'|'p2')=>{const actions=loss.decisions.filter((d:any)=>d.side===side);let n=0;return{choose:()=>actions[n++].action};};
  const e=courses.find((s:any)=>s.id===c.id).encounters[loss.floor-1];
  const replay=await runBattle({rule:loss.rule,format:loss.format,seed:loss.seed,teams:{p1:Showdown.Teams.pack(loss.playerTeam),p2:Showdown.Teams.pack(loss.opponentTeam)},teraTickets:{p1:loss.teraTicketsBefore,p2:rule==='basic'?0:e.enemyTeraTickets??1},battleItems:loss.battleItemsBefore,player:queue('p1'),opponent:queue('p2')});
  assert.equal(replay.winner,loss.winner);assert.deepEqual(replay.decisions.map(d=>[d.side,d.action]),loss.decisions.map((d:any)=>[d.side,d.action]));assert.deepEqual(battleEvents(replay.publicProtocol),loss.publicProtocol);replays++;
 }}
 cells.push({mode,rule,battles:data.length,climbs:runs.length,finished:runs.filter(r=>r.cleared===100).length,passed50:runs.filter(r=>r.cleared>=50).length,earlyLosses:runs.filter(r=>r.cleared<10).length,averageCleared:runs.reduce((s,r)=>s+r.cleared,0)/runs.length,pairLosses,roomLosses,coverageLosses,selectedGaps,mutationCounts,rechargeLosses,rechargeTurns,repeatImmuneLosses,preventableBlocked,runs});
 console.log('Audited '+mode+' '+rule);
}
const totals=['battles','climbs','finished','passed50','earlyLosses','pairLosses','roomLosses','coverageLosses','selectedGaps','rechargeLosses','rechargeTurns','repeatImmuneLosses','preventableBlocked'];
const aggregate=manifest.modes.map((mode:string)=>{const a=cells.filter(c=>c.mode===mode);return{mode,...Object.fromEntries(totals.map(k=>[k,a.reduce((s,c)=>s+c[k],0)])),averageCleared:a.reduce((s,c)=>s+c.averageCleared,0)/a.length};});
const contrasts=[['samples','baseline','samples']].map(([name,before,after])=>{
 let higher=0,lower=0,same=0;const byCategory:Record<string,any>={},byCase:Record<string,any>={};
 for(const rule of manifest.rules){const b=cells.find(c=>c.rule===rule&&c.mode===before),a=cells.find(c=>c.rule===rule&&c.mode===after);for(const r of a.runs){const old=b.runs.find((q:any)=>q.caseId===r.caseId&&q.courseId===r.courseId);const h=Number(r.cleared>old.cleared),l=Number(r.cleared<old.cleared),s=Number(r.cleared===old.cleared);higher+=h;lower+=l;same+=s;
  for(const [map,key] of [[byCategory,r.category],[byCase,r.caseId]] as const){const row=map[key]??={count:0,beforeSum:0,afterSum:0,higher:0,lower:0,same:0};row.count++;row.beforeSum+=old.cleared;row.afterSum+=r.cleared;row.higher+=h;row.lower+=l;row.same+=s;}
 }}
 return{name,before,after,higher,lower,same,byCategory,byCase};
});
const result={totalBattles,replays,freshness,aggregate,cells,contrasts,notes:'Frozen 18 development teams, 18 fresh courses (two per region), three rules. Held-out courses only, not held-out teams. No source rule tuning after preregistration. Course and battle seeds disjoint from all prior saved course files; correlated team/course/rule repeats are not human win rates. Sample intervention changes initial attack moves only, existing investment/support retained. Wall factor combines paired utility and complementary move retention. Future captured/TM attack ranking unchanged. Full terminal public protocol and actions replayed, same NPC/economy between conditions. No live promotion or ML training.'};
writeFileSync(prefix+'-audit.json',JSON.stringify(result,null,2));
const labels:Record<string,string>={baseline:'기존',samples:'샘플만',walls:'벽 평가만',both:'둘 다'};
const table=aggregate.map((c:any)=>`| ${labels[c.mode]} | ${c.finished}/${c.climbs} | ${c.passed50} | ${c.averageCleared.toFixed(2)} | ${c.earlyLosses} | ${c.pairLosses} | ${c.rechargeLosses} | ${c.repeatImmuneLosses} |`).join('\n');
writeFileSync(prefix+'-report.md',`# 수정 샘플 새 코스 검증\n\n총 ${totalBattles}배틀, 조건별 972등반(18팀×18새코스×3룰). 마지막 패배 ${replays}개 전체 공개 프로토콜 및 행동 재생 일치. 기존 코스 ${freshness.priorCourses}개와 코스 내용·ID·배틀 시드 중복 없음. 기준/계수와 시작 팀은 기존 실험 그대로 고정했다.\n\n| 조건 | 100층 완주 | 50층 통과 | 평균 성공 층 | 10층 미만 종료 | 양쪽 벽 손실 사건 | 반동 대기 있는 마지막 패배 | 반복 무효 마지막 패배 |\n|---|---:|---:|---:|---:|---:|---:|---:|\n${table}\n\n팀은 기존 18팀을 유지했으므로 새 포켓몬 조합 검증은 아니다. 지역별 두 코스이고 팀/룰 반복이 연관되므로 사람 승률이나 독립적인 972개 코스 표본으로 해석하지 않는다. 추가 TM/영입의 공격 기술 평가는 기존 방식이며, 벽 변경·실제 게임 변경·ML훈련은 없다.\n`);
console.log(JSON.stringify({totalBattles,replays,freshness,aggregate,contrasts:contrasts.map(({byCase,...r})=>r)},null,2));
