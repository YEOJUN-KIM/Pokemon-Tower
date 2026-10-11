import {publicMoveEffectiveness} from '../data/type-effectiveness';
import {moveInfo,moveTypeNames} from '../data/move-info';
import {species} from './catalog';
import type {BattleView,MovePP} from './contracts';
const english=(type:string)=>Object.keys(moveTypeNames).find(t=>moveTypeNames[t]===type)??type;
export function moveMatchup(battle:BattleView,move:MovePP,teraSelected=false){
 const own=battle.team.find(p=>p.active),enemy=battle.opponent,info=moveInfo[move.name];
 if(!enemy||!info||(move.category??info.category)==='Status')return null;
 let types=(species[enemy.displaySpecies??enemy.species]?.types??[]).map(english),ability='';
 // Reconstruct only revealed current-opponent state. The browser receives no hidden enemy set.
 for(const line of battle.messages){const [,event,actor,value,extra]=line.split('|');if(!actor?.startsWith('p2a:'))continue;
  if(['switch','drag','replace','-formechange','detailschange'].includes(event)){ability='';types=(species[value.split(',')[0]]?.types??types).map(english);}
  if(event==='-start'&&value==='typechange')types=extra.split('/');
  if(event==='-start'&&value==='typeadd'&&!types.includes(extra))types.push(extra);
  if(event==='-ability')ability=value;
  if(event==='-endability')ability='';
  if(['-immune','-heal','-activate'].includes(event)){const revealed=line.match(/\[from\] ability: ([^|]+)/)?.[1]??(event==='-activate'?value.match(/^ability: (.*)/)?.[1]:undefined);if(revealed)ability=revealed;}
 }
 if(enemy.terastallized&&enemy.terastallized!=='Stellar')types=[enemy.terastallized];
 if(!types.length)return null;
 let type=move.type??info.type;
 if(move.name==='Tera Blast'&&(own?.terastallized||teraSelected))type=own?.terastallized||own?.teraType||type;
 if(type==='Stellar')return {kind:enemy.terastallized?'strong':'neutral',value:enemy.terastallized?2:1} as const;
 const value=publicMoveEffectiveness({type,defending:types,ability,ownAbility:own?.ability,move:move.name,ignoreAbility:['Sunsteel Strike','Moongeist Beam','Photon Geyser','Light That Burns the Sky','Searing Sunraze Smash','Menacing Moonraze Maelstrom'].includes(move.name)});
 // Fixed damage is unaffected by weakness/resistance, but still obeys immunity.
 const fixed=['Seismic Toss','Night Shade','Dragon Rage','Sonic Boom','Super Fang','Nature’s Madness',"Nature's Madness",'Ruination','Final Gambit'].includes(move.name);
 const multiplier=fixed&&value!==0?1:value;
 return {kind:multiplier===0?'immune':multiplier>1?'strong':multiplier<1?'weak':'neutral',value:multiplier};
}
