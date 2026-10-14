import {readFileSync,writeFileSync,createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {runBattle,type BattleLog} from '../src/battle/run';
import type {Policy} from '../src/battle/policy';

// Offline diagnosis only: opponent sets and future outcomes never enter a player policy.
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
async function rows(p:string){const out:any[]=[];for await(const l of createInterface({input:createReadStream(p),crlfDelay:Infinity}))if(l.trim())out.push(JSON.parse(l));return out;}
const rules=['basic','tera','chaos'];
const source=read('artifacts/experiments/ai/observed-damage-validation-courses.json').courses;
const inputs:string[]=[];
function events(lines:string[]){
 let move:any,turn=0,entry=0;const attacks:any[]=[],supports:any[]=[],seenImmune=new Set<string>();
 for(const line of lines){const p=line.split('|');if(p[1]==='turn')turn=+p[2];
  if(['switch','drag','replace','-formechange','detailschange','-terastallize'].includes(p[1])&&p[2]?.startsWith('p2')){entry++;seenImmune.clear();}
  if(p[1]==='move'){const d=Showdown.Dex.moves.get(p[3]);move={turn,actor:p[2],name:p[3],category:d.category,immune:false,damage:false,failed:false};if(p[2].startsWith('p1'))(d.category==='Status'?supports:attacks).push(move);}
  if(p[1]==='-immune'&&move?.actor.startsWith('p1')&&p[2].startsWith('p2')){const key=`${entry}/${move.name}`;move.immune=true;move.repeatedAfterReveal=seenImmune.has(key);move.source=p.slice(3).join('|');seenImmune.add(key);}
  if(p[1]==='-damage'&&move?.actor.startsWith('p1')&&p[2].startsWith('p2')&&!p.slice(4).some(s=>s.startsWith('[from]')))move.damage=true;
  if(p[1]==='-fail'&&move?.actor===p[2])move.failed=true;
  if(p[1]==='faint'&&p[2].startsWith('p1')){for(const s of supports.filter(s=>s.actor===p[2]))s.noAttackDamageBeforeFaint=!attacks.some(a=>a.actor===s.actor&&a.turn>=s.turn&&a.damage);}
 }
 const immune=attacks.filter(a=>a.immune),failedSupport=supports.filter(s=>s.failed),unconverted=supports.filter(s=>s.noAttackDamageBeforeFaint);
 return {attacks:attacks.length,immuneAttacks:immune.length,repeatedImmunity:immune.length>=2,repeatedAfterReveal:immune.filter(a=>a.repeatedAfterReveal).length,immuneSources:immune.map(a=>a.source),supports:supports.length,failedSupports:failedSupport.length,supportWithoutOwnAttackDamageBeforeFaint:unconverted.length,unconvertedMoves:unconverted.map(s=>s.name),immuneMoves:immune.map(s=>s.name)};
}
function teamFlags(sets:any[],enemies:any[]){
 const mismatches=sets.filter(s=>{const m=s.moves.map((n:string)=>Showdown.Dex.moves.get(n)).filter((m:any)=>m.category!=='Status');return m.length&&m.every((m:any)=>m.category==='Physical')&&(s.evs?.spa??0)>(s.evs?.atk??0)||m.length&&m.every((m:any)=>m.category==='Special')&&(s.evs?.atk??0)>(s.evs?.spa??0);}).map(s=>({species:s.species,nature:s.nature,points:s.evs,moves:s.moves}));
 const blocked=enemies.filter(s=>Showdown.toID(s.ability)==='wonderguard').filter(enemy=>!sets.some(s=>s.moves.some((n:string)=>{const m=Showdown.Dex.moves.get(n);return m.category!=='Status'&&Showdown.Dex.getEffectiveness(m.type,Showdown.Dex.species.get(enemy.species))>0;})));
 // This narrow flag measures direct super-effective move coverage; weather/status/abilities/items may still defeat Wonder Guard.
 return {trainingMismatches:mismatches,noSuperEffectiveMoveAgainstWonderGuard:blocked.map(s=>s.species)};
}
const fixed:any[]=[],climbs:any[]=[],summaries:any[]=[];
for(const rule of rules){
 const fp=`artifacts/experiments/ai/observed-damage-validate-${rule}-v9-battles.jsonl`,cp=`artifacts/experiments/ai/observed-climb-${rule}-v9-battles.jsonl`,sp=`artifacts/experiments/balance/simulation-observed-climb-${rule}-v9-balanced.json`;inputs.push(fp,cp,sp);
 for(const b of await rows(fp)){const sets=Showdown.Teams.unpack(b.teams.p1)!,enemies=Showdown.Teams.unpack(b.teams.p2)!;fixed.push({rule,caseId:b.caseId,courseId:b.courseId,floor:b.floor,winner:b.winner,metrics:events(b.publicProtocol),...teamFlags(sets,enemies),traceHash:createHash('sha256').update(b.publicProtocol.filter((l:string)=>!l.startsWith('|t:')).join('\n')).digest('hex')});}
 const all=await rows(cp),report=read(sp);
 for(const st of report.stages)for(const c of st.climbs){summaries.push({rule,caseId:st.stage,courseId:c.id,cleared:c.cleared,failedFloor:c.failedFloor,coins:c.coins,spent:c.spent,shops:c.shops.length,purchases:c.purchases,finalParty:c.finalParty,recruitments:c.recruitments});if(c.cleared===100)continue;
  const b=all.find(b=>b.caseId===st.stage&&b.courseId===c.id&&b.floor===c.failedFloor);assert(b);assert.notEqual(b.winner,'Player');
  const queue=(side:'p1'|'p2'):Policy=>{const a=b.decisions.filter((d:any)=>d.side===side);let n=0;return{choose:()=>{assert(a[n]);return a[n++].action;}};};
  const e=source.find((s:any)=>s.id===b.courseId).encounters.find((e:any)=>e.floor===b.floor);
  const log:BattleLog=await runBattle({rule:b.rule,format:b.format,seed:b.seed,teams:{p1:Showdown.Teams.pack(b.playerTeam),p2:Showdown.Teams.pack(b.opponentTeam)},teraTickets:{p1:b.teraTicketsBefore,p2:rule==='basic'?0:e.enemyTeraTickets??1},battleItems:b.battleItemsBefore,player:queue('p1'),opponent:queue('p2')});
  assert.equal(log.winner,b.winner);assert.equal(log.turns,b.turns);assert.deepEqual(log.decisions.map(d=>[d.side,d.action]),b.decisions.map((d:any)=>[d.side,d.action]));
  climbs.push({rule,caseId:b.caseId,courseId:b.courseId,floor:b.floor,trainer:b.trainer,role:b.role,turns:b.turns,coins:b.coinsBefore,shops:c.shops.length,playerTeam:b.playerTeam,opponentTeam:b.opponentTeam,metrics:events(log.publicProtocol),...teamFlags(b.playerTeam,b.opponentTeam),publicProtocol:log.publicProtocol.filter(l=>!l.startsWith('|t:'))});
 }
 console.log(`Replayed terminal losses: ${rule}, cumulative ${climbs.length}`);
}
const aggregate=(r:any[])=>({count:r.length,repeatedImmunity:r.filter(b=>b.metrics.repeatedImmunity).length,repeatedAfterReveal:r.filter(b=>b.metrics.repeatedAfterReveal>0).length,noSuperEffectiveMoveAgainstWonderGuard:r.filter(b=>b.noSuperEffectiveMoveAgainstWonderGuard.length).length,trainingMismatch:r.filter(b=>b.trainingMismatches.length).length,failedSupport:r.filter(b=>b.metrics.failedSupports>0).length,supportWithoutOwnAttackDamageBeforeFaint:r.filter(b=>b.metrics.supportWithoutOwnAttackDamageBeforeFaint>0).length});
const byCase=summaries.reduce((acc:any,c:any)=>{const a=acc[c.caseId]??={runs:0,cleared:0,finished:0,preShopFailures:0};a.runs++;a.cleared+=c.cleared;a.finished+=Number(c.cleared===100);a.preShopFailures+=Number(c.cleared<10);return acc;},{});
for(const a of Object.values(byCase) as any[])a.averageCleared=a.cleared/a.runs;
const uniqueFixed=[...new Map(fixed.map(b=>[`${b.caseId}/${b.courseId}/${b.floor}/${b.traceHash}`,b])).values()];
const result={notes:['Overlapping observational flags, not mutually exclusive or causal explanations.','Baseline v9 only; candidate copies and Mega/Dynamax duplicate rules excluded. Other rule runs remain correlated.','Support without own damage can benefit teammates: this flag alone is not wasted play.','Coins/blocked purchases cannot establish price causality without controlled reruns.','Fixed strong-team isolated battles and adaptive climbs have different preparation/economy conditions.'],inputs:inputs.map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')})),terminalReplayCount:climbs.length,climbAttempts:summaries.length,finished:summaries.filter(c=>c.cleared===100).length,climbFlags:aggregate(climbs),byCase,fixed:{total:fixed.length,wins:aggregate(fixed.filter(b=>b.winner==='Player')),losses:aggregate(fixed.filter(b=>b.winner!=='Player')),deduplicatedCount:uniqueFixed.length,deduplicatedLosses:aggregate(uniqueFixed.filter(b=>b.winner!=='Player'))},climbs,summaries};
writeFileSync('artifacts/experiments/balance/tower-loss-diagnosis.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({climbFlags:result.climbFlags,byCase,fixed:result.fixed},null,2));
