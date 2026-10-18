import {npcAi} from '../data/npc-ai';
import {createHash} from 'node:crypto';
import {generateOpponentTeam,type OpponentEntry} from './opponent-team';
import {opponentProfile} from './opponent-training';
import {packTeam} from '../data/teams';
import {statKeys,type StatBlock} from '../data/training';
import type {Seed} from '../battle/run';
import type {BattleRule} from '../data/run-rules';
import type {TowerProgression} from '../data/tower-progression';
import {trainerView,type TrainerSample} from '../data/trainer-catalog';
import {normalNpcTemplate} from './npc-templates';
import {npcGimmick,type NpcGimmick} from '../data/npc-gimmicks';
import {normalNpcCategory,normalNpcGimmicksEnabled} from '../data/normal-mode-stages';
import {megaStones,DYNAMAX_ITEM} from '../data/gimmicks';
import {primalOrbs} from '../data/primal-forms';
import {zCrystals} from '../data/z-crystals';

export type TrainerEventBattleSnapshot={aiVersion?:string;sample:TrainerSample;seed:Seed;team:OpponentEntry[];opponentTeam:string;rule:BattleRule;trainer:ReturnType<typeof trainerView>;opponentTeraTickets:number};
export function snapshotTrainerEventBattle(eventId:string,sample:TrainerSample,floor:number,rule:BattleRule,progression:TowerProgression):TrainerEventBattleSnapshot{
  const bytes=createHash('sha256').update(eventId).digest(),seed=[0,2,4,6].map(i=>bytes.readUInt16BE(i)) as Seed;
  const team=generateOpponentTeam(floor,seed,[],null,sample,progression);
  const allowed=progression!=='legacy'&&normalNpcGimmicksEnabled(floor,normalNpcCategory(sample.role,sample.id,sample.kind));
  const template=normalNpcTemplate(sample.id,floor,sample.role);
  const plan=template?.signature??npcGimmick(sample.id,sample.generation,team.map(p=>p.name),sample.ace);
  const carrier=team.find(p=>p.item&&(megaStones[p.item]||primalOrbs[p.item]||p.item===DYNAMAX_ITEM||zCrystals[p.item]));
  const signature:NpcGimmick|null=allowed?(carrier?{rule:primalOrbs[carrier.item!]?'primal':megaStones[carrier.item!]?'mega':carrier.item===DYNAMAX_ITEM?'dynamax':'z',species:carrier.name,item:carrier.item}:plan?.rule==='tera'||plan?.rule==='dynamax'&&team.some(p=>p.name===plan.species&&p.gigantamax)?plan:null):null;
  const profiles=Object.fromEntries(team.map(entry=>[entry.name,{...(entry.profile??opponentProfile(entry.name,entry.moves,floor,Object.fromEntries(statKeys.map((stat,i)=>[stat,bytes[i]%32])) as StatBlock,progression)),moves:entry.moves,...(entry.ability?{ability:entry.ability}:{}),gender:'N' as const}]));
  return {aiVersion:progression==='legacy'?'tower-policy-v9':'tower-policy-v13',sample,seed,team,rule,trainer:{...trainerView(sample),npcAi:npcAi(floor,sample,{boss:floor%50===0}),introduction:'',...(signature?{gimmick:signature}:{})},opponentTeraTickets:signature?.rule==='tera'?1:0,opponentTeam:packTeam(team.map(p=>p.name),profiles,Object.fromEntries(team.map(p=>[p.name,p.item??''])),team.filter(p=>p.gigantamax).map(p=>p.name))};
}
