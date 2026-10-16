import Showdown from 'pokemon-showdown';
import type {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {mirrorChallengerSettings as settings,mirrorRewardProfile as profile,type MirrorTeamSnapshot} from '../data/mirror-challenger';
import {npcSamples} from '../data/npc-samples';
import {npcRankTraining} from '../data/npc-ranks';
import {challengerDefinition,type ChallengerDefinition} from '../data/challengers';
import {npcTrainingProfile} from './npc-training';
import {npcBuildAttackStat} from './npc-builds';
import {encounterRandom} from './opponent-team';
import {weightedRewardId} from './challenger-rewards';
import {enhancementCandidates} from './pokemon-enhancements';
import type {RewardSelectionDefinition,RewardEffect} from '../data/rewards';
import type {BattleRule} from '../data/run-rules';
import {allowsGimmick,allowsRuleItem} from '../data/run-rules';
import {megaStones,canEquipGimmick} from '../data/gimmicks';
import {primalOrbs} from '../data/primal-forms';
import {zCrystals} from '../data/z-crystals';
import {trainerEquipmentKeys} from '../data/trainer-equipment';
import {collectionSpecies} from '../data/selectable-forms';
import {POINT_TEAM_MARKER} from '../data/teams';
import type {Seed} from '../battle/run';
import {FORMAT} from '../battle/run';

export function snapshotMirrorReward(db:DatabaseSync,runId:string,random:()=>number){
 const owner=(db.prepare('SELECT player_id FROM runs WHERE id=?').get(runId) as {player_id:string}).player_id;
 const rule=(db.prepare('SELECT rule FROM run_rules WHERE run_id=?').get(runId) as {rule:BattleRule}).rule;
 const kind=weightedRewardId(profile.pool,random);
 let entries:RewardEffect[]=[],selections:RewardSelectionDefinition[]|undefined;
 const growth=()=>[{kind:'growth-points',amount:profile.growth}] as RewardEffect[];
 if(kind==='eggs')entries=[{kind:'egg-ticket',amount:profile.tickets}];
 else if(kind==='growth')entries=growth();
 else if(kind==='superRare'||kind==='shiny-ticket')entries=[{kind:'typed-egg-ticket',eggKind:kind==='superRare'?'superRare':'shiny',amount:1}];
 else if(kind==='equipment'){
  const eligible=trainerEquipmentKeys.filter(item=>allowsRuleItem(rule,item)&&!db.prepare('SELECT 1 FROM run_trainer_equipment WHERE run_id=? AND item=?').get(runId,item));
  entries=eligible.length?[{kind:'trainer-equipment',item:eligible[Math.floor(random()*eligible.length)],amount:1,fallbackPoints:profile.equipmentFallback}]:growth();
 }else{
  const candidates=enhancementCandidates(db,owner,runId,kind);
  if(candidates.length)selections=[{id:'mirror-target',title:kind==='one-iv'?'강화할 포켓몬을 선택하세요.':kind==='six-iv'?'6V로 만들 포켓몬을 선택하세요.':'이로치로 만들 포켓몬을 선택하세요.',expanded:true,targetMode:kind,candidates}];
  else entries=growth();
 }
 return {rewardKind:kind,rewardSnapshotVersion:2 as const,rewardDefinition:{id:`mirror-${kind}`,title:kind==='one-iv'?'1V 강화':kind==='six-iv'?'6V 완성':kind==='shiny'?'이로치 변환':'특별한 보상',tone:'great' as const,entries},...(selections?{selections}:{})};
}

// Existing candidates are generated first. This isolated pass replaces at most
// one slot and never consumes the existing NPC/rank/reward random stream.
export function addMirrorCandidate(db:DatabaseSync,eventId:string,runId:string,floor:number,rule:BattleRule,candidates:ChallengerDefinition[],random?:()=>number){
 const digest=createHash('sha256').update(`${eventId}:mirror`).digest(),seed=[0,2,4,6].map(i=>digest.readUInt16LE(i)) as Seed;
 const roll=random??encounterRandom(seed);
 if(roll()>=settings.mirrorCandidateChance)return candidates;
 // Recruitment receipts exist only for completed floor battles, never challengers.
 const source=db.prepare("SELECT b.id,b.player_team,b.rule,b.trainer_equipment FROM battles b JOIN recruitments r ON r.battle_id=b.id WHERE b.run_id=? AND b.floor=? AND b.stage=0 AND b.status='complete' ORDER BY b.attempt DESC LIMIT 1").get(runId,floor-1) as {id:string;player_team:string;rule:BattleRule;trainer_equipment:string|null}|undefined;
 if(!source||source.rule!==rule)return candidates;
 const original=Showdown.Teams.unpack(source.player_team);
 if(!original||original.length!==3||new Set(original.map(p=>collectionSpecies(p.species))).size!==3)return candidates;
 const slot=Math.floor(roll()*candidates.length),others=candidates.filter((_,i)=>i!==slot);
 const eligible=npcSamples.filter(s=>(settings.sampleIds as readonly string[]).includes(s.id)&&s.minFloor<=floor&&s.pools.includes('challenger')&&!others.some(c=>c.title===s.displayName||c.id===s.id));
 if(!eligible.length)return candidates;
 const sample=eligible[Math.floor(roll()*eligible.length)],training=npcRankTraining(floor,'elite');
 const packed=structuredClone(original),team=[];
 for(const set of packed){
  const species=collectionSpecies(set.species);
  if(!Showdown.Dex.species.get(set.species).exists||!set.moves.length||set.moves.some(m=>!Showdown.Dex.moves.get(m).exists)||!allowsRuleItem(rule,set.item)||!canEquipGimmick(set.species,set.item))return candidates;
  const stats=npcTrainingProfile(species,set.moves,floor,'elite',sample.tactic,roll,training,npcBuildAttackStat(set.species,set.moves));
  set.ivs={...stats.ivs};set.evs={...stats.evs};set.pokeball=POINT_TEAM_MARKER;
  team.push({name:species,moves:[...set.moves],item:set.item,profile:{...stats,nature:set.nature,ability:set.ability,teraType:set.teraType as typeof stats.teraType,shiny:set.shiny,gender:set.gender as typeof stats.gender}});
 }
 // Validate species, form, moves, nature, ability and held-item combination using
 // the same point-system proxy as battle/run. No build repair or move reroll.
 const legality=structuredClone(packed).map(p=>({...p,pokeball:'',evs:{hp:1,atk:0,def:0,spa:0,spd:0,spe:0},ivs:{hp:31,atk:31,def:31,spa:31,spd:31,spe:31},gender:'',shiny:false}));
 if(new Showdown.TeamValidator(FORMAT).validateTeam(legality))return candidates;
 const equipment:string[]=source.trainer_equipment?JSON.parse(source.trainer_equipment):[];
 let gimmick:MirrorTeamSnapshot['gimmick']=null;
 for(const set of packed){
  const kind=primalOrbs[set.item]?'primal':megaStones[set.item]?'mega':zCrystals[set.item]?'z':null;
  if(kind&&allowsGimmick(rule,kind==='z'?'zmove':kind==='primal'?'mega':kind)){gimmick={rule:kind,species:set.species,item:set.item};break;}
 }
 if(!gimmick&&equipment.includes('Tera Orb')&&allowsGimmick(rule,'terastallize'))gimmick={rule:'tera',species:packed[0].species};
 if(!gimmick&&equipment.includes('Dynamax Band')&&allowsGimmick(rule,'dynamax'))gimmick={rule:'dynamax',species:packed[0].species};
 const reward=snapshotMirrorReward(db,runId,roll),opponentRule=gimmick?.rule==='primal'?'mega':gimmick?.rule??'basic';
 const mirror:MirrorTeamSnapshot={version:1,baseSampleId:sample.id,sourceBattleId:source.id,sourcePlayerTeam:source.player_team,opponentTeam:Showdown.Teams.pack(packed),opponentRule,gimmick,rewardKind:reward.rewardKind};
 const definition:ChallengerDefinition={...challengerDefinition(sample,'elite',floor),...reward,title:'???',danger:3,battleStyle:'어딘가 익숙한 기분이 든다.',rewardPreview:'특별한 보상',mirror,encounter:{version:2,rank:'elite',floor,seed,sample:structuredClone(sample),training,team,gimmick,composition:{themeAvailable:0,themeRequired:0,themeUsed:0,fallback:false,candidateCount:1,itemSlots:3}}};
 return candidates.map((candidate,i)=>i===slot?definition:candidate);
}
