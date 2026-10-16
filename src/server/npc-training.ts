import Showdown from 'pokemon-showdown';
import {npcTrainingTargets,type NpcTrainingDefinition,type NpcTrainingTier,type NpcItemTier} from '../data/npc-training';
import {statKeys,type StatBlock,type StatKey} from '../data/training';
import type {TrainerTactic} from '../data/trainer-catalog';
import {isHeldItem} from '../data/held-items';
import {allowsRuleItem,type BattleRule} from '../data/run-rules';
import {defaultProfile} from './training';
import {encounterRandom,opponentMoves,gentleMoves,type OpponentEntry} from './opponent-team';
import type {Seed} from '../battle/run';

export function npcTrainingProfile(name:string,moves:string[],floor:number,tier:NpcTrainingTier,tactic:TrainerTactic,random:()=>number,frozenTarget?:NpcTrainingDefinition){
 const target=frozenTarget??npcTrainingTargets(floor,tier),profile=defaultProfile(name);
 profile.moves=[...moves];
 profile.ivs=Object.fromEntries(statKeys.map(stat=>[stat,target.ivRange[0]+Math.floor(random()*(target.ivRange[1]-target.ivRange[0]+1))])) as StatBlock;
 const base=Showdown.Dex.species.get(name).baseStats;
 const attack:StatKey=tactic==='physical'?'atk':tactic==='special'?'spa':base.atk>=base.spa?'atk':'spa';
 const weights:Partial<Record<StatKey,number>>=tactic==='bulk'?{hp:4,def:3,spd:3}:tactic==='status'?{hp:4,def:2,spd:2,spe:2}:tactic==='speed'?{spe:5,[attack]:3,hp:2}:tactic==='balanced'?{[attack]:4,hp:3,spe:2,def:1,spd:1}:{[attack]:5,spe:3,hp:2};
 // Weighted fair allocation spends the whole budget without truncation loss or cap overflow.
 for(let point=0;point<target.evBudget;point++){
  const stat=statKeys.filter(key=>weights[key]&&profile.evs[key]<32).sort((a,b)=>(profile.evs[a]+1)/weights[a]!-(profile.evs[b]+1)/weights[b]!)[0];
  if(!stat)throw Error('NPC EV budget cannot be allocated');
  profile.evs[stat]++;
 }
 return profile;
}

export function npcItemCandidates(tier:NpcItemTier,tactic:TrainerTactic,moves:string[],ranked=false):string[]{
 if(tier==='none')return [];
 const attacks=moves.map(name=>Showdown.Dex.moves.get(name)),physical=attacks.filter(m=>m.category==='Physical').length>=attacks.filter(m=>m.category==='Special').length;
 const band=physical?'Muscle Band':'Wise Glasses';
 if(tier==='basic')return ['Sitrus Berry','Lum Berry','Wide Lens'];
 if(ranked&&tier==='premium'){
  const preferences=tactic==='bulk'||tactic==='status'?['Leftovers','Rocky Helmet','Sitrus Berry']:
   tactic==='setup'?['Focus Sash','Lum Berry','Life Orb']:
   tactic==='speed'?[(attacks.every(m=>m.category!=='Status')?'Choice Scarf':'Focus Sash'),'Life Orb',band]:['Life Orb',band,'Focus Sash'];
  return [...preferences,'Expert Belt','Sitrus Berry','Lum Berry',band];
 }
 const preferences=tactic==='bulk'||tactic==='status'?['Leftovers','Sitrus Berry','Rocky Helmet']:
  tactic==='setup'?['Focus Sash','Lum Berry','Life Orb']:
  tactic==='speed'?['Focus Sash','Life Orb',band]:[band,'Expert Belt','Sitrus Berry'];
 return tier==='premium'?[...preferences,'Life Orb','Focus Sash',band,'Expert Belt','Sitrus Berry']:[...preferences.filter(item=>!['Life Orb','Focus Sash'].includes(item)),band,'Expert Belt','Sitrus Berry','Lum Berry'];
}

// Reusable by other NPC generators; each caller owns membership and saves the packed result.
export function trainNpcTeam(team:OpponentEntry[],floor:number,tier:NpcTrainingTier,tactic:TrainerTactic,seed:Seed,rule:BattleRule,frozenTarget?:NpcTrainingDefinition):OpponentEntry[]{
 const random=encounterRandom(seed),target=frozenTarget??npcTrainingTargets(floor,tier),used=new Set<string>();
 return team.map(entry=>{
  let moves=opponentMoves(entry.name,random,target.buildQuality==='simple'?undefined:tactic);
  if(target.buildQuality==='simple'){
   const attacks=moves.filter(move=>Showdown.Dex.moves.get(move).category!=='Status');
   // Transform/Counter specialists must retain a usable build.
   if(attacks.length)moves=attacks;
  }
  if(target.buildQuality!=='optimized')moves=gentleMoves([{name:entry.name,moves}])[0].moves;
  const item=npcItemCandidates(target.itemTier,tactic,moves,!!frozenTarget).find(item=>!used.has(item)&&isHeldItem(item)&&Showdown.Dex.items.get(item).exists&&allowsRuleItem(rule,item));
  if(item)used.add(item);
  return {name:entry.name,moves,item,profile:npcTrainingProfile(entry.name,moves,floor,tier,tactic,random,target)};
 });
}
