import Showdown from 'pokemon-showdown';
import type {Seed} from '../battle/run';
import type {NpcSample} from '../data/npc-samples';
import {npcTrainerSample} from '../data/npc-samples';
import {npcRankTraining,type NpcRank,type NpcRankTraining} from '../data/npc-ranks';
import {CURRENT_PROGRESSION,type TowerProgression} from '../data/tower-progression';
import {allowsGimmick,type BattleRule} from '../data/run-rules';
import {megaStones,DYNAMAX_ITEM,canEquipGimmick} from '../data/gimmicks';
import {matchingZCrystals} from '../data/z-crystals';
import type {NpcGimmick} from '../data/npc-gimmicks';
import {generateOpponentTeam,encounterPool,normalOpponentSpecies,encounterRandom,selectNamedEntries,type OpponentEntry} from './opponent-team';
import {trainNpcTeam} from './npc-training';

export type NpcEncounterSnapshot={version:1;sample:NpcSample;rank:NpcRank;floor:number;seed:Seed;training:NpcRankTraining;team:OpponentEntry[];gimmick:NpcGimmick|null};

function equipRankGimmick(team:OpponentEntry[],rank:NpcRank,random:()=>number,rule:BattleRule,chance:number):NpcGimmick|null{
 if(rank==='normal'||rule==='basic'||random()>=chance)return null;
 const options:NpcGimmick[]=[];
 for(const entry of team){
  if(allowsGimmick(rule,'mega'))for(const item of Object.keys(megaStones))if(canEquipGimmick(entry.name,item))options.push({rule:'mega',species:entry.name,item});
  if(allowsGimmick(rule,'terastallize'))options.push({rule:'tera',species:entry.name});
  if(allowsGimmick(rule,'dynamax')&&canEquipGimmick(entry.name,DYNAMAX_ITEM))options.push({rule:'dynamax',species:entry.name,item:DYNAMAX_ITEM});
  if(allowsGimmick(rule,'zmove')){
   for(const item of matchingZCrystals(entry.name,entry.moves))options.push({rule:'z',species:entry.name,item});
  }
 }
 if(!options.length)return null;
 const selected=options[Math.floor(random()*options.length)],carrier=team.find(e=>e.name===selected.species)!;
 if(selected.item)carrier.item=selected.item;
 if(selected.rule==='tera')carrier.profile!.teraType=Showdown.Dex.species.get(carrier.name).types[0] as import('../data/tera').TeraType;
 if(selected.rule==='dynamax'&&Showdown.Dex.species.get(carrier.name).canGigantamax)carrier.gigantamax=true;
 return selected;
}

export function generateNpcEncounter(floor:number,seed:Seed,sample:NpcSample,rank:NpcRank=sample.defaultRank,rule:BattleRule='basic',progression:TowerProgression=CURRENT_PROGRESSION):NpcEncounterSnapshot{
 const random=encounterRandom(seed),training=npcRankTraining(floor,rank),descriptor=npcTrainerSample(sample,rank);
 // Rank never unlocks a larger BST/legendary pool or a later floor.
 const ordinary=encounterPool(floor,progression).filter(normalOpponentSpecies);
 const typed=ordinary.filter(name=>sample.specialty&&Showdown.Dex.species.get(name).types.includes(sample.specialty));
 const base=generateOpponentTeam(floor,seed,[],null,{...descriptor,kind:'normal',specialty:rank==='normal'&&typed.length>=3?sample.specialty:null},progression);
 let members=base;
 if(rank!=='normal'){
  const candidates=[...new Set([...base.map(p=>p.name),...typed.slice().sort((a,b)=>a.localeCompare(b)).filter(()=>random()<.6).slice(0,3)])];
  // Extra candidates come from exactly the same pool and give the existing coverage selector room.
  for(let i=0;members.length&&candidates.length<(rank==='master'?8:6)&&i<ordinary.length;i++){
   const name=ordinary[Math.floor(random()*ordinary.length)];if(!candidates.includes(name))candidates.push(name);
  }
  const carrier=rank==='master'&&rule==='mega'?ordinary.find(name=>Object.keys(megaStones).some(item=>canEquipGimmick(name,item))):undefined;
  if(carrier&&!candidates.includes(carrier))candidates.push(carrier);
  const ace=sample.specialty?candidates.find(name=>typed.includes(name)):undefined;
  members=selectNamedEntries(candidates,random,ace,carrier).map(name=>({name,moves:[]}));
 }
 const team=trainNpcTeam(members,floor,'standard',sample.tactic,seed,rule,training);
 const gimmick=equipRankGimmick(team,rank,random,rule,training.gimmickChance);
 return {version:1,sample:structuredClone(sample),rank,floor,seed:[...seed] as Seed,training,team,gimmick};
}
