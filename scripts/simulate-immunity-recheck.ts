import {readFileSync,writeFileSync,appendFileSync,createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {SupportPlayerPolicy} from '../src/battle/support-player-policy';
import {MatchupAwareSupportPlayerPolicy} from '../src/battle/matchup-aware-support-player-policy';
import {RevealedImmunity} from '../src/battle/revealed-immunity';
import {CautiousSwitchingPolicy} from '../src/battle/switch-policy';
import type {Policy,Observation} from '../src/battle/policy';

export function immunityEvents(lines:string[]){
 let entry=0,attack='',repeated=0,total=0;const seen=new Set<string>();
 for(const l of lines){const [,event,actor,value]=l.split('|');
  if(['switch','drag','replace','-formechange','detailschange','-terastallize'].includes(event)&&actor?.startsWith('p2')){entry++;seen.clear();attack='';}
  if(event==='turn')attack='';
  if(event==='move')attack=actor?.startsWith('p1')&&Showdown.Dex.moves.get(value).category!=='Status'?value:'';
  if(event==='-immune'&&actor?.startsWith('p2')&&attack){const key=`${entry}/${attack}`;total++;if(seen.has(key))repeated++;seen.add(key);}
 }
 return {total,repeated};
}

const rule=process.argv[2]??'basic';if(!['basic','tera','chaos'].includes(rule))throw Error('Invalid rule');
const input=`artifacts/experiments/ai/observed-damage-validate-${rule}-v9-battles.jsonl`,prefix=`artifacts/experiments/ai/immunity-recheck-${rule}`;
const files=['src/battle/matchup-aware-support-player-policy.ts','src/battle/revealed-immunity.ts','src/data/type-effectiveness.ts','src/data/type-chart.json','scripts/simulate-immunity-recheck.ts'];
writeFileSync(prefix+'-manifest.json',JSON.stringify({rule,source:input,sourceHash:createHash('sha256').update(readFileSync(input)).digest('hex'),files:files.map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')})),scope:'Seen development courses; no new held-out performance claim. Same profiles, teams, items, seed and live opponent v7. Only experimental player differs.'},null,2));
writeFileSync(prefix+'-battles.jsonl','');const results:any[]=[];let replays=0;
for await(const line of createInterface({input:createReadStream(input),crlfDelay:Infinity})){
 const b=JSON.parse(line),pair:any={caseId:b.caseId,courseId:b.courseId,floor:b.floor};
 for(const mode of ['v9','matchup']){
  const p=mode==='v9'?new SupportPlayerPolicy():new MatchupAwareSupportPlayerPolicy(),memory=new RevealedImmunity();const decisions:any[]=[];
  const player:Policy={switchingInformation:true,uncertainSwitchingInformation:true,choose:(o:Observation)=>{
   const context={immunity:memory.context()},action=p.choose(o),own=o.ownTeam.find(p=>p.active),a=o.legalActions.find(a=>a.command===action)!;
   const blocked=!!own&&action.startsWith('move ')&&memory.blocked(a.label,own,o);
   const alternative=!!own&&o.legalActions.some(a=>a.command.startsWith('move ')&&Showdown.Dex.moves.get(a.label).category!=='Status'&&!memory.blocked(a.label,own,o));
   decisions.push({observation:o,context,action,reason:p.decisionReason,blockedByPublicInformation:blocked,hasHittableLegalMove:alternative});return action;
  }};
  const log=await runBattle({rule:b.rule,format:b.format,teams:b.teams,seed:b.seed,teraTickets:b.teraTickets,player,opponent:new CautiousSwitchingPolicy(),onPlayerLine:l=>{p.consumePublicLine(l);memory.consume(l);}});
  if(mode==='v9'){assert.equal(log.winner,b.winner);assert.deepEqual(battleEvents(log.publicProtocol),battleEvents(b.publicProtocol));assert.deepEqual(log.decisions.map(d=>[d.side,d.action]),b.decisions.map((d:any)=>[d.side,d.action]));}
  const metrics={...immunityEvents(log.publicProtocol),knownBlockedDecisions:decisions.filter(d=>d.blockedByPublicInformation).length,preventableBlockedDecisions:decisions.filter(d=>d.blockedByPublicInformation&&d.hasHittableLegalMove).length};
  pair[mode]={winner:log.winner,turns:log.turns,metrics};
  appendFileSync(prefix+'-battles.jsonl',JSON.stringify({...b,key:b.key.replace('/v9/',`/${mode}/`),phase:`immunity-recheck-${rule}`,mode,...log,playerDecisions:decisions,metrics})+'\n');
  if(results.length===0||mode==='matchup'&&metrics.repeated>0&&replays<8){const replay=await replayBattle(log);assert.deepEqual(battleEvents(log.publicProtocol),battleEvents(replay.publicProtocol));replays++;}
 }
 results.push(pair);if(results.length%99===0)console.log(`${rule}: ${results.length}/594 pairs`);
}
assert.equal(results.length,594);
const summary:any={rule,pairs:results.length,replays,gained:results.filter(r=>r.v9.winner!=='Player'&&r.matchup.winner==='Player').length,lost:results.filter(r=>r.v9.winner==='Player'&&r.matchup.winner!=='Player').length,cases:[],results};
for(const mode of ['v9','matchup'])summary[mode]={wins:results.filter(r=>r[mode].winner==='Player').length,immuneAttacks:results.reduce((s,r)=>s+r[mode].metrics.total,0),repeatedImmuneAttacks:results.reduce((s,r)=>s+r[mode].metrics.repeated,0),battlesWithRepeat:results.filter(r=>r[mode].metrics.repeated>0).length,lossesWithRepeat:results.filter(r=>r[mode].winner!=='Player'&&r[mode].metrics.repeated>0).length,preventableBlockedDecisions:results.reduce((s,r)=>s+r[mode].metrics.preventableBlockedDecisions,0)};
for(const caseId of new Set(results.map(r=>r.caseId)))summary.cases.push({caseId,...Object.fromEntries(['v9','matchup'].map(mode=>[mode,results.filter(r=>r.caseId===caseId&&r[mode].winner==='Player').length]))});
writeFileSync(prefix+'-summary.json',JSON.stringify(summary,null,2));console.log(JSON.stringify({...summary,results:undefined},null,2));
