import Showdown from 'pokemon-showdown';
import type {OpponentEntry} from '../server/opponent-team';
import {DYNAMAX_ITEM} from './gimmicks';
// Tower adaptations. Original reference data remains unchanged.
export const bossGimmickBuilds:Record<string,{floor:number;species:string;item:string;moves?:string[]}>= {
 'named-lance':{floor:40,species:'Dragonite',item:DYNAMAX_ITEM},
 'named-red':{floor:50,species:'Pikachu',item:DYNAMAX_ITEM},
};
export function equipBossGimmick(team:OpponentEntry[],id:string,floor:number){
 const build=bossGimmickBuilds[id];if(!build || floor<build.floor)return team;
 return team.map(p=>{
  const replacements=id==='named-red' ? ({Snorlax:{'Shadow Ball':'Earthquake',Blizzard:'Rock Slide'},Lapras:{Brine:'Surf',Blizzard:'Ice Beam'}} as Record<string,Record<string,string>>)[p.name] : undefined;
  const moves=p.moves.map(m=>replacements?.[Showdown.Dex.moves.get(m).name] ?? m);
  return {...p,moves,...(p.name===build.species ? {item:build.item,...(build.moves ? {moves:[...build.moves]} : {})} : {})};
 });
}
