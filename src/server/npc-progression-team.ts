import Showdown from 'pokemon-showdown';
import type {OpponentEntry} from './opponent-team';
import {encounterRandom} from './opponent-team';
import type {Seed} from '../battle/run';
import {isBuildProgression} from '../data/opponent-progression';
import type {TowerProgression} from '../data/tower-progression';
import {progressionMoves,progressionItemCandidates,inferProgressionRole,type NpcBuildRole} from './npc-progression-builds';
import {isHeldItem} from '../data/held-items';
import type {TrainerTactic} from '../data/trainer-catalog';
import {megaStones,DYNAMAX_ITEM} from '../data/gimmicks';
import {zCrystals} from '../data/z-crystals';
import {primalOrbs} from '../data/primal-forms';

export const isNpcGimmickItem=(item:string)=>!!(megaStones[item]||zCrystals[item]||primalOrbs[item]||item===DYNAMAX_ITEM||item==='Tera Orb');
// Names, aces, type identity and late reference moves remain owned by the template.
export function progressNamedTeam(team:OpponentEntry[],floor:number,seed:Seed,tactic:TrainerTactic,progression:TowerProgression){
 if(!isBuildProgression(progression))return team;
 const random=encounterRandom(seed),used=new Set<string>(),roles:NpcBuildRole[]=[];
 return team.map((entry,index)=>{
  const build=floor<41?progressionMoves(entry.name,floor,'elite',tactic,random,entry.moves,roles):{role:inferProgressionRole(entry.name,entry.moves),moves:[...entry.moves]};roles.push(build.role);
  const slots=floor<=10?0:floor<=20?1:floor<=30?2:3;
  let item=entry.item;
  if(floor<41||!item||floor<50&&isNpcGimmickItem(item)||used.has(item)||['Choice Band','Choice Specs','Choice Scarf','Assault Vest'].includes(item)&&build.moves.some(m=>Showdown.Dex.moves.get(m).category==='Status'))item=index<slots?progressionItemCandidates(entry.name,build.moves,floor,'elite',build.role).find(i=>!used.has(i)&&isHeldItem(i)):undefined;
  if(floor<50&&item&&isNpcGimmickItem(item))item=undefined;
  if(item)used.add(item);
  return {...entry,moves:build.moves,item,gigantamax:floor>=50&&entry.gigantamax,profile:entry.profile?{...entry.profile,moves:[...build.moves]}:entry.profile};
 });
}
