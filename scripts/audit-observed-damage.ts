import {readFileSync,writeFileSync,createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {runBattle} from '../src/battle/run';
import type {Policy} from '../src/battle/policy';
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const stage=process.argv[2]??'validate';if(!['dev','validate'].includes(stage))throw Error('Unknown stage');
const m=read(`artifacts/observed-damage-${stage}-manifest.json`);
assert.equal(createHash('sha256').update(m.files.map((p:string)=>readFileSync(p,'utf8')).join('\n')).digest('hex'),m.hash);
const source=read(m.source).courses;
const ids=new Set(source.map((c:any)=>c.id));assert.equal(ids.size,9);
for(const old of ['artifacts/hundred-floor-six-z-courses.json','artifacts/support-ai-new-courses.json','artifacts/composition-new-courses.json',...(stage==='validate'?['artifacts/support-recheck-fresh-courses.json','artifacts/support-ablation-validation-courses.json']:[])])assert(read(old).courses.every((c:any)=>!ids.has(c.id)));
let battles=0,turnSamples=0,climbBattles=0,replays=0,evidenceTurns=0,adjustedDecisions=0;const aggregates:any[]=[];
for(const j of m.jobs){
 let adjustedKey:string|undefined;
 const rows:any[]=[];for await(const line of createInterface({input:createReadStream(`artifacts/${j.phase}-battles.jsonl`),crlfDelay:Infinity}))rows.push(JSON.parse(line));
 const counts=new Map<string,{actions:string[];seen:number;winner:string}>();
 if(j.kind==='battle'){
  const r=read(`artifacts/${j.phase}-summary.json`);assert.equal(r.cases.length,6);assert.equal(rows.length,594);
  for(const b of rows){assert(ids.has(b.courseId));assert(!counts.has(b.key));counts.set(b.key,{actions:b.decisions.filter((d:any)=>d.side==='p1').map((d:any)=>d.action),seen:0,winner:b.winner});}
  for await(const line of createInterface({input:createReadStream(`artifacts/${j.phase}-turns.jsonl`),crlfDelay:Infinity})){
   const t=JSON.parse(line),b=counts.get(t.battleKey)!;assert(b);assert.equal(t.decisionIndex,b.seen);assert.equal(t.action,b.actions[b.seen++]);assert.equal(t.outcome,b.winner);
   assert(t.observation.legalActions.some((a:any)=>a.command===t.action));assert.equal(t.context.turn,t.observation.turn);
   if(t.observation.opponent)assert(Object.keys(t.observation.opponent).every(k=>['species','condition'].includes(k)));
   if(true){assert(t.context.voluntarySwitches<=4);if(t.observation.switching?.maybeTrapped&&t.observation.legalActions.some((a:any)=>a.command.startsWith('move ')))assert(!t.action.startsWith('switch '));}
   const evidence=t.context.observedDamage;assert(evidence);assert.equal(evidence.ttl,3);assert.equal(evidence.buffer,1.1);
   assert(evidence.records.every((r:any)=>r.turn<=t.observation.turn&&r.entry===evidence.entry&&r.rawFraction>0));
   if(evidence.records.length)evidenceTurns++;
   if(t.diagnostics?.adjustedChecks>0){adjustedDecisions++;adjustedKey??=t.battleKey;}
   turnSamples++;
  }
  for(const b of counts.values())assert.equal(b.seen,b.actions.length);
  const wins=rows.filter(b=>b.winner==='Player').length;assert.equal(wins,r.cases.reduce((s:number,c:any)=>s+c.wins,0));
  battles+=rows.length;aggregates.push({...j,battles:rows.length,wins,rate:wins/rows.length,cases:r.cases});
 }else{
  const r=read(`artifacts/simulation-${j.phase}-balanced.json`);assert.equal(r.stages.length,6);assert.equal(rows.length,r.stages.reduce((s:number,c:any)=>s+c.battles,0));
  assert.equal(r.playerAI,j.mode+'-experimental');assert.equal(r.opponentAI,'v7');let number=0;
  for(const stage of r.stages){assert.equal(stage.climbs.length,9);for(const c of stage.climbs){assert(ids.has(c.id));assert.equal(c.coins,c.earned-c.spent);assert(c.coins>=0);assert.equal(c.battles,c.cleared+(c.cleared<100?1:0));const record=rows.filter(b=>b.caseId===stage.stage&&b.courseId===c.id);assert.equal(record.length,c.battles);assert(record.every((b,i)=>b.floor===i+1));assert(record.slice(0,c.cleared).every(b=>b.winner==='Player'));number++;}}
  assert.equal(number,54);climbBattles+=rows.length;aggregates.push({...j,climbs:number,battles:rows.length,passed50:r.stages.reduce((s:number,c:any)=>s+c.passed50,0),finished:r.stages.reduce((s:number,c:any)=>s+c.finished,0),averageCleared:r.stages.reduce((s:number,c:any)=>s+c.averageCleared,0)/6,stages:r.stages.map(({climbs,...s}:any)=>s)});
 }
 const first=rows[0],longest=rows.reduce((a,b)=>a.turns>b.turns?a:b),wall=rows.find(b=>j.kind==='battle'?b.publicProtocol.some((l:string)=>l.startsWith('|-sidestart|p1:')):b.supportMoves?.Reflect||b.supportMoves?.['Light Screen']);
 const adjusted=rows.find(b=>b.key===adjustedKey);
 const selected=[...new Map([first,longest,wall,adjusted].filter(Boolean).map(b=>[`${b.caseId}/${b.courseId}/${b.floor}`,b])).values()];
 for(const b of selected){
  const make=(side:'p1'|'p2'):Policy=>{const actions=b.decisions.filter((d:any)=>d.side===side);let n=0;return{choose:()=>{assert(actions[n]);return actions[n++].action;}};};
  const e=source.find((c:any)=>c.id===b.courseId).encounters.find((e:any)=>e.floor===b.floor);
  const log=await runBattle({rule:b.rule,format:b.format,seed:b.seed,teams:j.kind==='battle'?b.teams:{p1:Showdown.Teams.pack(b.playerTeam),p2:Showdown.Teams.pack(b.opponentTeam)},teraTickets:j.kind==='battle'?b.teraTickets:{p1:b.teraTicketsBefore,p2:['tera','chaos'].includes(b.rule)?e.enemyTeraTickets??1:0},battleItems:b.battleItemsBefore,player:make('p1'),opponent:make('p2')});
  assert.equal(log.winner,b.winner);assert.equal(log.turns,b.turns);assert.deepEqual(log.decisions.map(d=>[d.side,d.action]),b.decisions.map((d:any)=>[d.side,d.action]));
  if(j.kind==='battle')assert.deepEqual(log.publicProtocol.filter(l=>!l.startsWith('|t:')),b.publicProtocol.filter((l:string)=>!l.startsWith('|t:')));
  replays++;
 }
 console.log('Audited '+j.phase+' ('+selected.length+' replays)');
}
assert.equal(battles,stage==='dev'?3564:5940);
const comparisons=[];
for(const rule of stage==='dev'?['basic','tera','chaos']:['basic','mega','dynamax','tera','chaos']){
 const jobs=m.jobs.filter((j:any)=>j.kind==='battle'&&j.rule===rule);
 const load=async(phase:string)=>{const map=new Map<string,any>();for await(const line of createInterface({input:createReadStream(`artifacts/${phase}-battles.jsonl`),crlfDelay:Infinity})){const b=JSON.parse(line);map.set(`${b.caseId}/${b.courseId}/${b.floor}`,b);}return map;};
 const baseline=await load(jobs.find((j:any)=>j.mode==='v9').phase);
 if(stage==='dev'){
  const history=await load(`support-ablation-validate-${rule}-v9`);
  for(const [key,b] of baseline){const old=history.get(key);assert(old);assert.deepEqual(b.decisions,old.decisions);assert.deepEqual(b.publicProtocol.filter((l:string)=>!l.startsWith('|t:')),old.publicProtocol.filter((l:string)=>!l.startsWith('|t:')));}
 }
 for(const job of jobs.filter((j:any)=>j.mode!=='v9')){
  const candidate=await load(job.phase);let gained=0,lost=0,same=0,changedBattles=0;
  for(const [key,b] of baseline){const c=candidate.get(key);assert(c);if(c.winner==='Player'&&b.winner!=='Player')gained++;else if(c.winner!=='Player'&&b.winner==='Player')lost++;else same++;if(JSON.stringify(c.decisions)!==JSON.stringify(b.decisions))changedBattles++;}
  assert.equal(gained+lost+same,594);comparisons.push({rule,mode:job.mode,gained,lost,same,changedBattles});
 }
}
const climbPairs=[];
if(stage==='validate')for(const rule of ['basic','tera','chaos']){
 const candidate=m.selection.candidate;
 const a=read(`artifacts/simulation-observed-climb-${rule}-v9-balanced.json`),b=read(`artifacts/simulation-observed-climb-${rule}-${candidate}-balanced.json`);
 let higher=0,lower=0,same=0,gained50=0,lost50=0;
 for(const st of a.stages)for(const before of st.climbs){const after=b.stages.find((s:any)=>s.stage===st.stage).climbs.find((c:any)=>c.id===before.id);assert(after);if(after.cleared>before.cleared)higher++;else if(after.cleared<before.cleared)lower++;else same++;gained50+=Number(after.cleared>=50&&before.cleared<50);lost50+=Number(after.cleared<50&&before.cleared>=50);}
 assert.equal(higher+lower+same,54);climbPairs.push({rule,higher,lower,same,gained50,lost50});
}
writeFileSync(`artifacts/observed-damage-${stage}-audit.json`,JSON.stringify({stage,implementationHash:m.hash,source:m.source,freshCoursesDisjoint:true,baselineHistoryExactlyReproduced:stage==='dev',battles,turnSamples,evidenceTurns,adjustedDecisions,climbs:stage==='dev'?0:324,climbBattles,replays,aggregates,comparisons,climbPairs},null,2));
console.log(JSON.stringify({battles,turnSamples,evidenceTurns,adjustedDecisions,climbBattles,replays}));
