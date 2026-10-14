import {readFileSync,writeFileSync,createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {runBattle,replayBattle,battleEvents} from '../src/battle/run';

const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
async function rows(path:string){const out:any[]=[];for await(const l of createInterface({input:createReadStream(path),crlfDelay:Infinity}))if(l.trim())out.push(JSON.parse(l));return out;}
const source=read('artifacts/experiments/ai/observed-damage-validation-courses.json').courses;
const oldLosses=read('artifacts/experiments/balance/tower-loss-diagnosis.json').climbs;
let fixedBattles=0,fixedDecisions=0,replays=0;const summaries:any[]=[],climbs:any[]=[];
for(const rule of ['basic','tera','chaos']){
 const manifest=read(`artifacts/experiments/ai/immunity-recheck-${rule}-manifest.json`);assert.equal(createHash('sha256').update(readFileSync(manifest.source)).digest('hex'),manifest.sourceHash);
 for(const f of manifest.files)assert.equal(createHash('sha256').update(readFileSync(f.path)).digest('hex'),f.sha256);
 const summary=read(`artifacts/experiments/ai/immunity-recheck-${rule}-summary.json`);summaries.push(summary);const records=await rows(`artifacts/experiments/ai/immunity-recheck-${rule}-battles.jsonl`);assert.equal(records.length,1188);
 for(const b of records){assert.equal(b.playerDecisions.length,b.decisions.filter((d:any)=>d.side==='p1').length);for(const d of b.playerDecisions){assert(d.observation.legalActions.some((a:any)=>a.command===d.action));assert(d.context.immunity.turn<=d.observation.turn);if(d.observation.opponent)assert(Object.keys(d.observation.opponent).every(k=>['species','condition'].includes(k)));fixedDecisions++;}}
 for(const mode of ['v9','matchup'])assert.equal(records.filter(b=>b.mode===mode&&b.winner==='Player').length,summary[mode].wins);
 fixedBattles+=records.length;
 for(const pair of summary.results.filter((p:any)=>p.v9.winner!==p.matchup.winner)){
  const b=records.find(b=>b.mode==='matchup'&&b.caseId===pair.caseId&&b.courseId===pair.courseId&&b.floor===pair.floor)!;
  const log={...b,decisions:b.decisions.map((d:any)=>({...d,observation:{}}))};const replay=await replayBattle(log);assert.deepEqual(battleEvents(replay.publicProtocol),battleEvents(b.publicProtocol));replays++;
 }
 const report=read(`artifacts/experiments/balance/simulation-immunity-climb-${rule}-matchup-balanced.json`),before=read(`artifacts/experiments/balance/simulation-observed-climb-${rule}-v9-balanced.json`);
 assert.equal(report.stages.length,6);assert.deepEqual(report.prices,before.prices);assert.deepEqual(report.caseDefinitions,before.caseDefinitions);assert.equal(report.sourceCourseHash,before.sourceCourseHash);assert.equal(report.opponentAI,'v7');
 const battles=await rows(`artifacts/experiments/ai/immunity-climb-${rule}-matchup-battles.jsonl`);assert.equal(battles.length,report.stages.reduce((s:number,c:any)=>s+c.battles,0));
 let finished=0,passed50=0,cleared=0,higher=0,lower=0,same=0,count=0,lossesWithRepeat=0,repeatLossAttacks=0,knownBlocked=0,preventableBlocked=0,losses=0;
 for(const st of report.stages){assert.equal(st.climbs.length,9);for(const c of st.climbs){count++;finished+=Number(c.cleared===100);passed50+=Number(c.cleared>=50);cleared+=c.cleared;
  assert.equal(c.coins,c.earned-c.spent);assert(c.coins>=0);const sequence=battles.filter(b=>b.caseId===st.stage&&b.courseId===c.id);assert.equal(sequence.length,c.cleared+(c.cleared<100?1:0));assert(sequence.every((b,i)=>b.floor===i+1));assert(sequence.slice(0,c.cleared).every(b=>b.winner==='Player'));
  const old=before.stages.find((s:any)=>s.stage===st.stage).climbs.find((b:any)=>b.id===c.id);assert(old);higher+=Number(c.cleared>old.cleared);lower+=Number(c.cleared<old.cleared);same+=Number(c.cleared===old.cleared);
  if(c.cleared<100){const b=sequence.at(-1)!;assert.notEqual(b.winner,'Player');losses++;lossesWithRepeat+=Number(b.immunityMetrics.repeated>0);repeatLossAttacks+=b.immunityMetrics.repeated;
   const queue=(side:'p1'|'p2')=>{const a=b.decisions.filter((d:any)=>d.side===side);let n=0;return{choose:()=>a[n++].action};};
   const e=source.find((c:any)=>c.id===b.courseId).encounters.find((e:any)=>e.floor===b.floor);
   const log=await runBattle({rule:b.rule,format:b.format,seed:b.seed,teams:{p1:Showdown.Teams.pack(b.playerTeam),p2:Showdown.Teams.pack(b.opponentTeam)},teraTickets:{p1:b.teraTicketsBefore,p2:rule==='basic'?0:e.enemyTeraTickets??1},battleItems:b.battleItemsBefore,player:queue('p1'),opponent:queue('p2')});
   assert.equal(log.winner,b.winner);assert.deepEqual(log.decisions.map(d=>[d.side,d.action]),b.decisions.map((d:any)=>[d.side,d.action]));assert.deepEqual(battleEvents(log.publicProtocol),b.publicProtocol);replays++;
  }
 }}
 assert.equal(count,54);for(const b of battles){knownBlocked+=b.immunityDecisionMetrics.knownBlocked;preventableBlocked+=b.immunityDecisionMetrics.preventableBlocked;}
 const baseline={finished:before.stages.reduce((s:number,c:any)=>s+c.finished,0),passed50:before.stages.reduce((s:number,c:any)=>s+c.passed50,0),averageCleared:before.stages.reduce((s:number,c:any)=>s+c.averageCleared,0)/6,terminalLosses:oldLosses.filter((b:any)=>b.rule===rule).length,terminalLossesWithRepeat:oldLosses.filter((b:any)=>b.rule===rule&&b.metrics.repeatedAfterReveal>0).length};
 climbs.push({rule,battles:battles.length,climbs:count,before:baseline,after:{finished,passed50,averageCleared:cleared/count,terminalLosses:losses,terminalLossesWithRepeat:lossesWithRepeat,repeatLossAttacks,knownBlocked,preventableBlocked},higher,lower,same});
 console.log(`Audited ${rule}: ${battles.length} climb battles, ${losses} terminal loss replays`);
}
const files=['scripts/simulate-immunity-climb.ts','src/battle/matchup-aware-support-player-policy.ts','src/battle/revealed-immunity.ts','src/data/type-effectiveness.ts','src/data/type-chart.json'];
writeFileSync('artifacts/experiments/ai/immunity-recheck-audit.json',JSON.stringify({fixedBattles,fixedDecisions,replays,files:files.map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')})),summaries:summaries.map(({results,...s})=>s),climbs,notes:'Seen course diagnostic rerun, not held-out generalization. Rules share nine courses. No player profile or enemy AI/balance change. Climb exposure lengths differ; fixed battle pairs isolate teams/seeds and player-version change.'},null,2));
console.log(JSON.stringify({fixedBattles,fixedDecisions,replays,climbs},null,2));
