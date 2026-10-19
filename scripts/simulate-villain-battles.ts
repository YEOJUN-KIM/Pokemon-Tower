import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {villainCampaignTracks,villainStageMinFloor} from '../src/data/villain-tracks';
import {villainTrackSample} from '../src/server/villain-track-samples';
import {snapshotTrainerEventBattle} from '../src/server/trainer-event-battle';
import {CURRENT_PROGRESSION} from '../src/data/tower-progression';
import {createNpcPolicy} from '../src/battle/npc-policy';
import {ZMovePolicy} from '../src/battle/z-move-policy';
import {packedNpcRule} from '../src/data/npc-gimmicks';
import {runBattle,engineVersion,FORMAT} from '../src/battle/run';
import {cases,gear,player} from './lib/villain-benchmark';
import {readFileSync} from 'node:fs';
// Reviewed NPCs at their minimum arrival floor. Same regional simulation benchmarks;
// this measures automated independent battles, not human completion/win probability.
const results:Record<string,unknown>[]=[],count=Number(process.env.VILLAIN_SEEDS??3);
for(const [organization,track] of Object.entries(villainCampaignTracks))for(const stage of track.stages){
 if(stage.rank==='grunt'||!stage.sampleId)continue;
 const floor=villainStageMinFloor[stage.rank],sample=villainTrackSample(stage.sampleId);
 let wins=0,errors=0,turns=0,battles=0;
 for(let n=1;n<=count;n++)for(const [i,benchmark] of cases.entries())for(const rule of ['basic','chaos'] as const){
  const snapshot=snapshotTrainerEventBattle(`villain-benchmark:${sample.id}:${n}:${rule}`,sample,floor,rule,CURRENT_PROGRESSION);
  const tera=snapshot.opponentTeraTickets;
  try{
   const log=await runBattle({teams:{p1:player(i,floor,rule),p2:snapshot.opponentTeam},seed:[n,floor,37,101],rule,opponentRule:packedNpcRule(snapshot.team.map(p=>({item:p.item??''})),tera),opponentTeraSpecies:snapshot.trainer.gimmick?.rule==='tera'?snapshot.trainer.gimmick.species:undefined,teraTickets:{p1:0,p2:tera},trainerEquipment:gear(floor,rule),player:new ZMovePolicy('p1'),opponent:createNpcPolicy(snapshot.trainer.npcAi!)});
   wins+=Number(log.winner==='Player');turns+=log.turns;
   results.push({organization,stage:stage.key,id:sample.id,floor,n,benchmark:benchmark.id,rule,winner:log.winner,turns:log.turns});
  }catch(error){errors++;results.push({organization,stage:stage.key,id:sample.id,floor,n,benchmark:benchmark.id,rule,error:String(error)});}
  battles++;
 }
 console.log(`${sample.id} @ ${floor}: ${wins}/${battles} player wins, ${errors} errors, mean turns ${(turns/Math.max(1,battles-errors)).toFixed(1)}`);
}
mkdirSync('artifacts/reports/villain-campaigns',{recursive:true});
const sources=['src/data/normal-npc-templates.json','src/server/trainer-event-battle.ts','src/battle/npc-policy.ts','scripts/lib/villain-benchmark.ts'];
writeFileSync('artifacts/reports/villain-campaigns/battles.json',JSON.stringify({engineVersion,FORMAT,seeds:count,rules:['basic','chaos'],assumptions:'Four established regional benchmarks, independent battles, no shopping or consumables',sourceHashes:Object.fromEntries(sources.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')])),results},null,2));
if(results.some(r=>r.error))process.exitCode=1;
