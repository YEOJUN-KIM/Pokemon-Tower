import Showdown from 'pokemon-showdown';
import {defaultProfile} from './training';
import {statKeys,type StatBlock} from '../data/training';
import {towerDifficulty,type TowerProgression} from '../data/tower-progression';

// New encounters ramp from low IVs to the full range; archived packed teams never change.
export function opponentIVCap(floor:number){return Math.min(31,4+floor);}
export function opponentProfile(name:string,moves:string[],floor:number,rawIVs:StatBlock,progression:TowerProgression='legacy'){
  const profile=defaultProfile(name);profile.moves=moves;
  const difficulty=progression==='legacy'?null:towerDifficulty(floor);
  const cap=difficulty?.ivCap ?? opponentIVCap(floor);
  profile.ivs=Object.fromEntries(statKeys.map(stat=>[stat,Math.floor(rawIVs[stat]*(cap+1)/32)])) as StatBlock;
  const points=difficulty?.points ?? Math.min(30,Math.max(0,floor-10)),base=Showdown.Dex.species.get(name).baseStats;
  const attack=base.atk>=base.spa?'atk':'spa';
  profile.evs[attack]=Math.min(32,Math.ceil(points*.6));
  if(difficulty?.chapter===2){
    profile.evs.spe=Math.floor(points*.25);
    profile.evs.hp=points-profile.evs[attack]-profile.evs.spe;
    if(floor>=90)profile.nature=attack==='atk'?'Adamant':'Modest';
  }else profile.evs.hp=points-profile.evs[attack];
  return profile;
}
