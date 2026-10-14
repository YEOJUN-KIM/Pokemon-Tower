import {readFileSync,writeFileSync,createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const manifest=read('artifacts/experiments/ai/support-player-manifest.json');
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
assert.equal(createHash('sha256').update(manifest.files.map(p=>readFileSync(p,'utf8')).join('\n')).digest('hex'),manifest.hash);
for(const [cohort,path] of Object.entries(manifest.sources))assert.equal(sha(path),manifest.sourceHashes[cohort]);
const sourceIds=Object.fromEntries(Object.entries(manifest.sources).map(([k,p])=>[k,new Set(read(p).courses.map(c=>c.id))]));
assert([...sourceIds.new].every(id=>!sourceIds.matched.has(id)));
const allowedObservation=['turn','ownTeam','opponent','legalActions','lastOpponentMove','switching'];
const aggregates=[],pairs=new Map();let battles=0,decisions=0,handoffs=0,protectedSetups=0;
for(const job of manifest.jobs){
 const report=read(`artifacts/experiments/ai/${job.phase}-summary.json`);assert.equal(report.cases.length,6);assert.equal(report.sourceHash,manifest.sourceHashes[job.cohort]);
 const index=new Map();const caseCounts=new Map();let jobWins=0;
 for await(const line of createInterface({input:createReadStream(`artifacts/experiments/ai/${job.phase}-battles.jsonl`),crlfDelay:Infinity})){
  const r=JSON.parse(line);assert(!index.has(r.key));assert.equal(r.phase,job.phase);assert(sourceIds[job.cohort].has(r.courseId));assert(manifest.floors.includes(r.floor));
  const actions=r.decisions.filter(d=>d.side==='p1').map(d=>d.action);
  index.set(r.key,{actions,seen:0,outcome:r.winner});caseCounts.set(r.caseId,(caseCounts.get(r.caseId)??0)+1);jobWins+=Number(r.winner==='Player');battles++;
  const pairKey=[r.cohort,r.rule,r.caseId,r.courseId,r.floor].join('/');const pair=pairs.get(pairKey)??{};pair[r.mode]=r.winner==='Player';pairs.set(pairKey,pair);
 }
 assert.equal(index.size,594);assert.equal(caseCounts.size,6);for(const count of caseCounts.values())assert.equal(count,99);
 for await(const line of createInterface({input:createReadStream(`artifacts/experiments/ai/${job.phase}-turns.jsonl`),crlfDelay:Infinity})){
  const r=JSON.parse(line),b=index.get(r.battleKey);assert(b);assert.equal(r.decisionIndex,b.seen);assert.equal(r.action,b.actions[b.seen++]);assert.equal(r.outcome,b.outcome);
  assert(r.observation.legalActions.some(a=>a.command===r.action));assert(Object.keys(r.observation).every(k=>allowedObservation.includes(k)));
  if(r.observation.opponent)assert(Object.keys(r.observation.opponent).every(k=>['species','condition'].includes(k)));
  assert.equal(r.context.turn,r.observation.turn);assert.equal(r.observation.ownTeam.length,3);
  if(job.mode==='v9'){
   assert(r.context.voluntarySwitches<=4);
   if(r.observation.switching?.maybeTrapped&&r.observation.legalActions.some(a=>a.command.startsWith('move ')))assert(!r.action.startsWith('switch '));
  }
  if(r.reason==='screen-handoff'){assert(r.action.startsWith('switch '));assert(Math.max(0,...Object.values(r.context.screens))>=2);handoffs++;}
  if(r.reason==='screen-setup'){assert(Math.max(0,...Object.values(r.context.screens))>0);protectedSetups++;}
  decisions++;
 }
 for(const b of index.values())assert.equal(b.seen,b.actions.length);
 assert.equal(jobWins,report.cases.reduce((s,c)=>s+c.wins,0));
 aggregates.push({...job,battles:index.size,wins:jobWins,winRate:jobWins/index.size,cases:report.cases,datasetHashes:{battles:sha(`artifacts/experiments/ai/${job.phase}-battles.jsonl`),turns:sha(`artifacts/experiments/ai/${job.phase}-turns.jsonl`)}});
 console.log('Audited '+job.phase);
}
const comparisons=[];
for(const cohort of ['matched','new'])for(const rule of ['basic','mega','dynamax','tera','chaos'])for(const baseline of ['v7','v8']){
 let improved=0,worsened=0,unchanged=0;
 for(const [key,p] of pairs){if(!key.startsWith(`${cohort}/${rule}/`))continue;assert.equal(Object.keys(p).length,3);if(p.v9&&!p[baseline])improved++;else if(!p.v9&&p[baseline])worsened++;else unchanged++;}
 assert.equal(improved+worsened+unchanged,594);comparisons.push({cohort,rule,baseline,improved,worsened,unchanged});
}
assert.equal(battles,17820);
writeFileSync('artifacts/experiments/ai/support-player-audit.json',JSON.stringify({schemaVersion:1,battles,decisions,handoffs,protectedSetups,sourceDisjoint:true,implementationHash:manifest.hash,aggregates,comparisons},null,2));
console.log(JSON.stringify({battles,decisions,handoffs,protectedSetups}));
