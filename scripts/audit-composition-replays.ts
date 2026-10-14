import {readFileSync,createReadStream,writeFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
import Showdown from 'pokemon-showdown';
import {runBattle} from '../src/battle/run';
import type {Policy} from '../src/battle/policy';
const manifest=JSON.parse(readFileSync('artifacts/experiments/samples/composition-experiment-manifest.json','utf8'));
let checked=0;
for(const job of manifest.jobs){
 let first:any,deepest:any,room:any;
 for await(const line of createInterface({input:createReadStream(`artifacts/experiments/samples/${job.phase}-battles.jsonl`),crlfDelay:Infinity})){
  const row=JSON.parse(line);first??=row;if(!deepest||row.floor>deepest.floor)deepest=row;
  if(!room&&row.supportMoves?.['Trick Room'])room=row;
 }
 const source=JSON.parse(readFileSync(job.source,'utf8')).courses;
 const rows=[...new Map([first,deepest,room].filter(Boolean).map(r=>[`${r.caseId}/${r.courseId}/${r.floor}`,r])).values()];
 for(const row of rows){
  const make=(side:'p1'|'p2'):Policy=>{const actions=row.decisions.filter((d:any)=>d.side===side);let n=0;return{choose:()=>{if(!actions[n])throw Error('Missing replay action');return actions[n++].action;}};};
  const encounter=source.find((c:any)=>c.id===row.courseId).encounters.find((e:any)=>e.floor===row.floor);
  const log=await runBattle({rule:row.rule,format:row.format,seed:row.seed,teams:{p1:Showdown.Teams.pack(row.playerTeam),p2:Showdown.Teams.pack(row.opponentTeam)},
   battleItems:row.battleItemsBefore,teraTickets:{p1:row.teraTicketsBefore,p2:['tera','chaos'].includes(row.rule)?encounter.enemyTeraTickets??1:0},player:make('p1'),opponent:make('p2')});
  if(log.winner!==row.winner||log.turns!==row.turns||log.decisions.length!==row.decisions.length)throw Error(`Replay mismatch ${job.phase}/${row.caseId}/${row.floor}`);
  checked++;
 }
 console.log('Replayed '+job.phase+': '+rows.length+' sampled battles');
}
writeFileSync('artifacts/experiments/samples/composition-replay-audit.json',JSON.stringify({checked,notes:'First, deepest and first Trick Room battle per phase; exact winner, turns and action count reproduced from JSONL + frozen course metadata. Full public protocol is not stored in JSONL.'},null,2));
console.log('Replay samples passed: '+checked);
