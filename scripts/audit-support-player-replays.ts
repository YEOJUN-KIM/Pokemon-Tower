import {readFileSync,writeFileSync,createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import assert from 'node:assert/strict';
import {runBattle} from '../src/battle/run';
import type {Policy} from '../src/battle/policy';
const manifest=JSON.parse(readFileSync('artifacts/experiments/ai/support-player-manifest.json','utf8'));
let checked=0;const samples:string[]=[];
for(const job of manifest.jobs){
 let first:any,longest:any,wall:any,room:any;
 for await(const line of createInterface({input:createReadStream(`artifacts/experiments/ai/${job.phase}-battles.jsonl`),crlfDelay:Infinity})){
  const r=JSON.parse(line);first??=r;if(!longest||r.turns>longest.turns)longest=r;
  if(!wall&&r.publicProtocol.some((l:string)=>l.startsWith('|-sidestart|p1:')))wall=r;
  if(!room&&r.publicProtocol.some((l:string)=>l.startsWith('|-fieldstart|move: Trick Room')))room=r;
 }
 for(const r of new Map([first,longest,wall,room].filter(Boolean).map(r=>[r.key,r])).values()){
  const make=(side:'p1'|'p2'):Policy=>{const actions=r.decisions.filter((d:any)=>d.side===side);let n=0;return{choose:()=>{assert(actions[n]);return actions[n++].action;}};};
  const log=await runBattle({rule:r.rule,format:r.format,seed:r.seed,teams:r.teams,teraTickets:r.teraTickets,player:make('p1'),opponent:make('p2')});
  assert.equal(log.winner,r.winner);assert.equal(log.turns,r.turns);
  assert.deepEqual(log.decisions.map(d=>({side:d.side,action:d.action})),r.decisions);
  const canonical=(lines:string[])=>lines.filter(l=>!l.startsWith('|t:'));
  assert.deepEqual(canonical(log.publicProtocol),canonical(r.publicProtocol));checked++;samples.push(r.key);
 }
 console.log('Replayed '+job.phase);
}
writeFileSync('artifacts/experiments/ai/support-player-replay-audit.json',JSON.stringify({checked,samples,checks:'Exact winner, turns, decisions and full public battle protocol; wall, Trick Room, first and longest examples per phase. Wall-clock timestamp lines excluded.'},null,2));
console.log('Replay samples passed: '+checked);
