import Showdown from 'pokemon-showdown';
import {initialPartners,packPlayerTeam,pokemonSets} from '../../src/data/teams';
import {defaultProfile,validateProfile} from '../../src/server/training';
import {statKeys,type StatBlock,type TrainingProfile} from '../../src/data/training';
import {towerDifficulty} from '../../src/data/tower-progression';
import {isCollectibleSpecies} from '../../src/data/pokedex-roster';

export type SimulationTeam={id:string;species:string[];minFloor:number};
const collected=[
 ['Pikachu','Gyarados','Alakazam'],['Arcanine','Lapras','Golem'],['Gengar','Snorlax','Scizor'],
 ['Jolteon','Dragonite','Lucario'],['Garchomp','Gardevoir','Blastoise'],['Tyranitar','Venusaur','Metagross'],
 ['Lucario','Lapras','Arcanine'],['Scizor','Gengar','Gyarados'],['Snorlax','Alakazam','Jolteon'],['Dragonite','Golem','Gardevoir'],
];
export const simulationTeams:SimulationTeam[]=[
 ...Array.from({length:10},(_,i)=>({id:`starter-${i+1}`,species:i<9?initialPartners.slice(i*3,i*3+3):['Charizard','Feraligatr','Sceptile'],minFloor:2})),
 ...collected.map((species,i)=>({id:`collected-${i+1}`,species,minFloor:Array.from({length:100},(_,i)=>i+1).find(f=>towerDifficulty(f).bstCeiling>=Math.max(...species.map(n=>Showdown.Dex.species.get(n).bst)))!})),
];
export const simulationFloors=[5,15,25,35,45,55,65,75,85,95];
export function simulationPlayerTeam(team:SimulationTeam,floor:number){
 // Existing balance-simulation stages motivate these explicit, non-empirical
 // progression assumptions. No run bonuses or perfect trained/counter teams.
 const [iv,points]=floor<=10?[0,0]:floor<=60?[15,33]:[25,50];
 const profiles:Record<string,TrainingProfile>={};
 const items:Record<string,string>={};
 for(const [index,name]of team.species.entries()){
  if(!Object.hasOwn(pokemonSets,name)||!isCollectibleSpecies(name))throw Error(`Unavailable player species ${name}`);
  const profile=defaultProfile(name),base=Showdown.Dex.species.get(name).baseStats;
  profile.ivs=Object.fromEntries(statKeys.map(k=>[k,iv])) as StatBlock;
  profile.evs[base.atk>=base.spa?'atk':'spa']=Math.ceil(points*.48);profile.evs.spe=Math.floor(points*.32);profile.evs.hp=points-Object.values(profile.evs).reduce((a,b)=>a+b,0);
  validateProfile(name,profile);profiles[name]=profile;
  if(floor>=15&&index===0)items[name]='Sitrus Berry';
  if(floor>=50&&index===1)items[name]=base.atk>=base.spa?'Muscle Band':'Wise Glasses';
  if(floor>=50&&index===2)items[name]='Leftovers';
 }
 return {packed:packPlayerTeam(team.species,profiles,items),profiles,items};
}
