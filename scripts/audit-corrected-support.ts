import {readFileSync,writeFileSync,createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {runBattle,battleEvents} from '../src/battle/run';

const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
async function rows(path:string){const out:any[]=[];for await(const l of createInterface({input:createReadStream(path),crlfDelay:Infinity}))if(l.trim())out.push(JSON.parse(l));return out;}
const manifest=read('artifacts/support-correction-manifest.json');
for(const f of manifest.files)assert.equal(createHash('sha256').update(readFileSync(f.path)).digest('hex'),f.sha256);
const source=read('artifacts/observed-damage-validation-courses.json').courses;
const changed=new Set(manifest.changes.map((c:any)=>c.caseId));
let replays=0,totalBattles=0,unchangedClimbs=0;const results:any[]=[];
for(const rule of ['basic','tera','chaos']){
 const before=read(`artifacts/simulation-immunity-climb-${rule}-matchup-balanced.json`);
 const after=read(`artifacts/simulation-support-corrected-${rule}-balanced.json`);
 assert.deepEqual(after.prices,before.prices);assert.equal(after.sourceCourseHash,before.sourceCourseHash);
 assert.equal(after.playerAI,before.playerAI);assert.equal(after.opponentAI,before.opponentAI);
 assert.deepEqual(after.caseDefinitions,read('artifacts/support-corrected-climb-cases.json'));
 const battles=await rows(`artifacts/support-corrected-${rule}-battles.jsonl`);
 const oldBattles=await rows(`artifacts/immunity-climb-${rule}-matchup-battles.jsonl`);
 assert.equal(battles.length,after.stages.reduce((s:number,c:any)=>s+c.battles,0));totalBattles+=battles.length;
 let repeatedLosses=0,preventableBlocked=0,higher=0,lower=0,same=0;
 const teams:any[]=[];
 for(const st of after.stages){
  const old=before.stages.find((s:any)=>s.stage===st.stage);assert(old);assert.equal(st.climbs.length,9);
  teams.push({caseId:st.stage,before:{finished:old.finished,averageCleared:old.averageCleared},after:{finished:st.finished,averageCleared:st.averageCleared}});
  for(const c of st.climbs){
   const b=old.climbs.find((b:any)=>b.id===c.id);assert(b);assert.equal(c.coins,c.earned-c.spent);assert(c.coins>=0);
   higher+=Number(c.cleared>b.cleared);lower+=Number(c.cleared<b.cleared);same+=Number(c.cleared===b.cleared);
   const seq=battles.filter(b=>b.caseId===st.stage&&b.courseId===c.id);
   assert.equal(seq.length,c.cleared+(c.cleared<100?1:0));assert(seq.every((b,i)=>b.floor===i+1));assert(seq.slice(0,c.cleared).every(b=>b.winner==='Player'));
   if(!changed.has(st.stage)){
    assert.deepEqual(c,b);const oldSeq=oldBattles.filter(b=>b.caseId===st.stage&&b.courseId===c.id);
    // Exclude only the experiment name; all recorded battle state/actions must match.
    assert.deepEqual(seq.map(({phase,...b})=>b),oldSeq.map(({phase,...b})=>b));unchangedClimbs++;
   }
   if(c.cleared<100){
    const loss=seq.at(-1)!;assert.notEqual(loss.winner,'Player');repeatedLosses+=Number(loss.immunityMetrics.repeated>0);
    const queue=(side:'p1'|'p2')=>{const actions=loss.decisions.filter((d:any)=>d.side===side);let n=0;return{choose:()=>actions[n++].action};};
    const encounter=source.find((s:any)=>s.id===loss.courseId).encounters[loss.floor-1];
    const log=await runBattle({rule:loss.rule,format:loss.format,seed:loss.seed,teams:{p1:Showdown.Teams.pack(loss.playerTeam),p2:Showdown.Teams.pack(loss.opponentTeam)},teraTickets:{p1:loss.teraTicketsBefore,p2:rule==='basic'?0:encounter.enemyTeraTickets??1},battleItems:loss.battleItemsBefore,player:queue('p1'),opponent:queue('p2')});
    assert.equal(log.winner,loss.winner);assert.deepEqual(log.decisions.map(d=>[d.side,d.action]),loss.decisions.map((d:any)=>[d.side,d.action]));assert.deepEqual(battleEvents(log.publicProtocol),loss.publicProtocol);replays++;
   }
  }
 }
 for(const b of battles)preventableBlocked+=b.immunityDecisionMetrics.preventableBlocked;
 const aggregate=(r:any)=>({finished:r.stages.reduce((s:number,c:any)=>s+c.finished,0),passed50:r.stages.reduce((s:number,c:any)=>s+c.passed50,0),averageCleared:r.stages.reduce((s:number,c:any)=>s+c.averageCleared,0)/r.stages.length});
 results.push({rule,battles:battles.length,before:aggregate(before),after:aggregate(after),higher,lower,same,repeatedLosses,preventableBlocked,teams});
 console.log('Audited '+rule);
}
assert.equal(unchangedClimbs,81);
writeFileSync('artifacts/support-correction-audit.json',JSON.stringify({totalBattles,replays,unchangedClimbs,results,notes:'Same experimental policy, frozen nine courses, seeds, enemies, prices. Three fixture changes in three different teams; 81 unchanged control climbs reproduced exactly. Seen data diagnostic, not held-out or human win rates. Opponent full teams are offline replay inputs only.'},null,2));
console.log(JSON.stringify({totalBattles,replays,unchangedClimbs,results:results.map(({teams,...r})=>r)},null,2));
