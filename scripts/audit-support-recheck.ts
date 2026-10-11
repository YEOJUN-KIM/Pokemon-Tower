import {readFileSync,writeFileSync,createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {runBattle} from '../src/battle/run';
import type {Policy} from '../src/battle/policy';
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const m=read('artifacts/support-recheck-manifest.json');
assert.equal(createHash('sha256').update(m.files.map((p:string)=>readFileSync(p,'utf8')).join('\n')).digest('hex'),m.hash);
const source=read(m.source).courses;
const ids=new Set(source.map((c:any)=>c.id));assert.equal(ids.size,9);
for(const old of ['artifacts/hundred-floor-six-z-courses.json','artifacts/support-ai-new-courses.json','artifacts/composition-new-courses.json'])assert(read(old).courses.every((c:any)=>!ids.has(c.id)));
let battles=0,turnSamples=0,climbBattles=0,replays=0;const aggregates:any[]=[];
for(const j of m.jobs){
 const rows:any[]=[];for await(const line of createInterface({input:createReadStream(`artifacts/${j.phase}-battles.jsonl`),crlfDelay:Infinity}))rows.push(JSON.parse(line));
 const counts=new Map<string,{actions:string[];seen:number;winner:string}>();
 if(j.kind==='battle'){
  const r=read(`artifacts/${j.phase}-summary.json`);assert.equal(r.cases.length,6);assert.equal(rows.length,594);
  for(const b of rows){assert(ids.has(b.courseId));assert(!counts.has(b.key));counts.set(b.key,{actions:b.decisions.filter((d:any)=>d.side==='p1').map((d:any)=>d.action),seen:0,winner:b.winner});}
  for await(const line of createInterface({input:createReadStream(`artifacts/${j.phase}-turns.jsonl`),crlfDelay:Infinity})){
   const t=JSON.parse(line),b=counts.get(t.battleKey)!;assert(b);assert.equal(t.decisionIndex,b.seen);assert.equal(t.action,b.actions[b.seen++]);assert.equal(t.outcome,b.winner);
   assert(t.observation.legalActions.some((a:any)=>a.command===t.action));assert.equal(t.context.turn,t.observation.turn);
   if(t.observation.opponent)assert(Object.keys(t.observation.opponent).every(k=>['species','condition'].includes(k)));
   if(j.mode!=='v8'){assert(t.context.voluntarySwitches<=4);if(t.observation.switching?.maybeTrapped&&t.observation.legalActions.some((a:any)=>a.command.startsWith('move ')))assert(!t.action.startsWith('switch '));}
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
 const selected=[...new Map([first,longest,wall].filter(Boolean).map(b=>[`${b.caseId}/${b.courseId}/${b.floor}`,b])).values()];
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
assert.equal(battles,8910);
const climbPairs=[];
for(const rule of ['basic','tera','chaos']){
 const a=read(`artifacts/simulation-support-climb-${rule}-v9-balanced.json`),b=read(`artifacts/simulation-support-climb-${rule}-v10-balanced.json`);
 let higher=0,lower=0,same=0,gained50=0,lost50=0;
 for(const stage of a.stages)for(const before of stage.climbs){
  const after=b.stages.find((s:any)=>s.stage===stage.stage).climbs.find((c:any)=>c.id===before.id);assert(after);
  if(after.cleared>before.cleared)higher++;else if(after.cleared<before.cleared)lower++;else same++;
  gained50+=Number(after.cleared>=50&&before.cleared<50);lost50+=Number(after.cleared<50&&before.cleared>=50);
 }
 assert.equal(higher+lower+same,54);climbPairs.push({rule,higher,lower,same,gained50,lost50});
}
writeFileSync('artifacts/support-recheck-audit.json',JSON.stringify({implementationHash:m.hash,freshCoursesDisjoint:true,battles,turnSamples,climbs:486,climbBattles,replays,aggregates,climbPairs},null,2));
console.log(JSON.stringify({battles,turnSamples,climbBattles,replays}));
