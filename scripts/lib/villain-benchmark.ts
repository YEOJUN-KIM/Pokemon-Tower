import {readFileSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import {templateProfile} from '../../src/server/npc-templates';
import {packPlayerTeam,pokemonSets} from '../../src/data/teams';
import {defaultProfile} from '../../src/server/training';
import {statKeys,type StatBlock,type TrainingProfile} from '../../src/data/training';
import {megaStones,canEquipGimmick} from '../../src/data/gimmicks';
import {matchingZCrystals,zCrystals} from '../../src/data/z-crystals';
import {allowsGimmick,type BattleRule} from '../../src/data/run-rules';
import type {TrainerEquipment} from '../../src/data/trainer-equipment';
// Same four benchmarks, profiles and gear as simulate-hoenn-npcs; independent battles.
export const cases=[{id:'starters',species:['Charizard','Blastoise','Venusaur']},{id:'offense',species:['Garchomp','Metagross','Lapras']},{id:'bulk',species:['Slowbro','Corviknight','Gastrodon']},{id:'signature',species:['Mimikyu','Kommo-o','Gyarados']}];
const highest=JSON.parse(readFileSync('scripts/data/npc/npc-team-samples.json','utf8')).samples as {team:{species:string;profile:TrainingProfile}[]}[];
const roles=new Map<string,TrainingProfile>();for(const r of highest)for(const p of r.team)if(!roles.has(p.species))roles.set(p.species,p.profile);
export const gear=(floor:number,rule:BattleRule):TrainerEquipment[]=>floor<11?[]:[...(allowsGimmick(rule,'dynamax')?['Dynamax Band' as const]:[]),...(allowsGimmick(rule,'terastallize')?['Tera Orb' as const]:[])];
export function player(index:number,floor:number,rule:BattleRule){
 const species=cases[index].species;
 const profiles=Object.fromEntries(species.map(name=>{
  const p=defaultProfile(name),role=roles.get(name);p.moves=[...pokemonSets[name].moves];
  if(name==='Mimikyu')p.moves=['Play Rough','Shadow Claw','Shadow Sneak','Swords Dance'];
  if(name==='Kommo-o')p.moves=['Clanging Scales','Flamethrower','Drain Punch','Protect'];
  p.evs=role?{...role.evs}:{hp:10,atk:0,def:0,spa:32,spd:0,spe:24};
  if(!role&&Showdown.Dex.species.get(name).baseStats.atk>=Showdown.Dex.species.get(name).baseStats.spa){p.evs.atk=32;p.evs.spa=0;}
  p.ivs=Object.fromEntries(statKeys.map(k=>[k,31])) as StatBlock;p.nature=floor>=55?(role?.nature??(p.evs.atk>p.evs.spa?'Adamant':'Modest')):'Serious';return [name,templateProfile(p,floor)];
 }));
 const items=Object.fromEntries(species.map((name,i)=>[name,floor>=11?['Expert Belt','Leftovers','Sitrus Berry'][i]:'']));
 if(floor>=11){
  if(allowsGimmick(rule,'mega')){const pair=species.flatMap(name=>Object.keys(megaStones).filter(item=>canEquipGimmick(name,item)).map(item=>({name,item})))[0];if(pair)items[pair.name]=pair.item;}
  if(allowsGimmick(rule,'zmove')){const eligible=species.filter(n=>!megaStones[items[n]]),name=eligible.find(n=>n==='Mimikyu')??eligible.find(n=>n==='Kommo-o')??eligible[0];const item=matchingZCrystals(name,profiles[name].moves).sort((a,b)=>Number(!!zCrystals[b].from)-Number(!!zCrystals[a].from))[0];if(item)items[name]=item;}
 }
 return packPlayerTeam(species,profiles,items,gear(floor,rule).includes('Dynamax Band'));
}
