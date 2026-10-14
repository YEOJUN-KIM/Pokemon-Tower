import Showdown from 'pokemon-showdown';
import {megaStones,DYNAMAX_ITEM,canEquipGimmick} from './gimmicks';
import {zCrystals} from './z-crystals';
import {moveLearnsets} from '../server/move-learnsets';
import type {BattleRule} from './run-rules';
import type {OpponentEntry} from '../server/opponent-team';
import {evolvedOpponentSpecies} from './opponent-species';
import {primalOrbs} from './primal-forms';

export type NpcGimmick={rule:Exclude<BattleRule,'basic'|'chaos'>|'primal';species:string;item?:string};
// Explicit tower adaptations for generations 1–5, not original-game claims.
// Keep an ace without a Mega forme rather than silently choosing another ace.
const earlyRows:[string,NpcGimmick['rule'],string][]=[
 ['brock','mega','Aerodactyl'],['giovanni','mega','Kangaskhan'],['blue','mega','Pidgeot'],
 ['misty','z','Starmie'],['ltsurge','z','Raichu'],['erika','tera','Vileplume'],
 ['koga-kanto','z','Weezing'],['sabrina','mega','Alakazam'],['blaine','z','Arcanine'],
 ['giovanni-gym','tera','Nidoking'],['lorelei','dynamax','Lapras'],['bruno-kanto','dynamax','Machamp'],
 ['agatha','mega','Gengar'],['lance-kanto','mega','Dragonite'],['red-kanto','dynamax','Pikachu'],
 ['falkner','mega','Pidgeot'],['bugsy','mega','Scizor'],['whitney','z','Miltank'],
 ['morty','mega','Gengar'],['chuck','z','Poliwrath'],['jasmine','mega','Steelix'],
 ['pryce','tera','Mamoswine'],['clair','z','Kingdra'],['will','tera','Xatu'],
 ['koga','tera','Crobat'],['bruno','dynamax','Machamp'],['karen','z','Umbreon'],
 ['archer','mega','Houndoom'],['lance','mega','Dragonite'],['red','dynamax','Pikachu'],
 ['roxanne','tera','Probopass'],['brawly','z','Hariyama'],['wattson','mega','Manectric'],
 ['flannery','z','Torkoal'],['norman','z','Slaking'],['winona','mega','Altaria'],
 ['tateandliza','tera','Solrock'],['wallace-gym','z','Milotic'],['juan','z','Kingdra'],
 ['sidney','mega','Absol'],['phoebe','mega','Banette'],['glacia','tera','Walrein'],
 ['drake','mega','Salamence'],['maxie','mega','Camerupt'],['archie','mega','Sharpedo'],
 ['steven','mega','Metagross'],['wallace','z','Milotic'],
 ['roark','tera','Rampardos'],['gardenia','z','Roserade'],['maylene','mega','Lucario'],
 ['crasherwake','z','Floatzel'],['fantina','tera','Mismagius'],['byron','tera','Bastiodon'],
 ['candice','mega','Abomasnow'],['volkner','z','Electivire'],['aaron','mega','Scizor'],
 ['bertha','tera','Hippowdon'],['flint','z','Infernape'],['lucian','tera','Bronzong'],
 ['cyrus','z','Weavile'],['cynthia','mega','Garchomp'],['barry','z','Empoleon'],
 ['cilan','z','Simisage'],['chili','z','Simisear'],['cress','z','Simipour'],
 ['lenora','tera','Watchog'],['burgh','z','Leavanny'],['elesa','z','Zebstrika'],
 ['clay','z','Excadrill'],['skyla','tera','Swanna'],['brycen','tera','Beartic'],
 ['drayden','z','Haxorus'],['cheren','tera','Stoutland'],['roxie','z','Scolipede'],
 ['marlon','z','Jellicent'],['shauntal','z','Chandelure'],['marshal','z','Conkeldurr'],
 ['grimsley','tera','Bisharp'],['caitlin','z','Gothitelle'],['ghetsis','z','Hydreigon'],
 ['alder','z','Volcarona'],['iris','z','Haxorus'],
 // Organization executives have no generation field in the source catalog.
 ['tabitha','mega','Camerupt'],['mars','tera','Purugly'],['zinzolin','z','Cryogonal'],
 ['xerosic','mega','Houndoom'],['plumeria','z','Salazzle'],['guzma','z','Golisopod'],
 ['matt','mega','Sharpedo'],['faba','z','Hypno'],
];
export const earlyNpcAssignments=Object.fromEntries(earlyRows.map(([id,rule,species])=>['named-'+id,{rule,species}])) as Record<string,NpcGimmick>;
const overrides:Record<string,NpcGimmick>={...earlyNpcAssignments,
 'named-diantha':{rule:'mega',species:'Gardevoir'},
 'named-lysandre':{rule:'mega',species:'Gyarados'},
 'named-ramos':{rule:'mega',species:'Venusaur'},
 'named-iris':{rule:'z',species:'Haxorus',item:'Dragonium Z'},
 'named-acerola':{rule:'z',species:'Mimikyu',item:'Mimikium Z'},
 'named-acerola-captain':{rule:'z',species:'Mimikyu',item:'Mimikium Z'},
};
export const npcExtraCandidates:Record<string,string[]>={'named-ramos':['Venusaur'],'named-milo':['Flapple'],'named-piers':['Grimmsnarl']};
const regionalPartners:Record<string,Record<string,string>>={
 'named-kiawe':{Marowak:'Marowak-Alola'},'named-kukui':{Ninetales:'Ninetales-Alola'},
 'named-hau':{Raichu:'Raichu-Alola'},'named-molayne':{Dugtrio:'Dugtrio-Alola'},
 'named-opal':{Weezing:'Weezing-Galar'},'named-melony':{Darmanitan:'Darmanitan-Galar'},
 'named-bede':{Rapidash:'Rapidash-Galar'},
};
export function npcSpecies(name:string,id:string,generation:number|null){
 name=regionalPartners[id]?.[name] ?? name;
 return evolvedOpponentSpecies(name);
}
const organizationGenerations:Record<string,number>={rocket:1,magma:3,aqua:3,galactic:4,plasma:5,flare:6,skull:7,aether:7,macrocosmos:8,star:9};
// A first roster assignment, independent of the player's rule. Floor presets can
// refine these assignments later without multiplying them by player rule.
export function npcGimmick(id:string,generation:number|null,entries:readonly string[],ace?:string):NpcGimmick|null{
 const canonical=id.startsWith('named-')?id:'named-'+id.replace(/^[^-]+-(?:executive|boss)-/,'');
 const configured=overrides[canonical];
 const preferred=configured?{...configured,species:entries.includes(configured.species)?configured.species:npcSpecies(configured.species,canonical,generation)}:undefined;
 if(preferred){
  if(!entries.includes(preferred.species))return null;
  if(preferred.rule==='mega')return {...preferred,item:Object.keys(megaStones).find(item=>megaStones[item].species===preferred.species)};
  if(preferred.rule==='dynamax')return {...preferred,item:DYNAMAX_ITEM};
  if(preferred.rule==='primal')return {...preferred,item:preferred.item ?? Object.keys(primalOrbs).find(item=>primalOrbs[item].species===preferred.species)};
  if(preferred.rule==='tera')return {...preferred};
  const type=Showdown.Dex.species.get(preferred.species).types[0];
  return {...preferred,item:preferred.item ?? Object.keys(zCrystals).find(item=>!zCrystals[item].from && zCrystals[item].type===type)};
 }
 const candidates=[...new Set([...(ace && entries.includes(ace)?[ace]:[]),...entries])];
 const gen=generation ?? organizationGenerations[id.split('-')[0]] ?? 7;
 if(gen===9)return candidates[0]?{rule:'tera',species:candidates[0]}:null;
 if(gen===8){const species=candidates.find(name=>!!Showdown.Dex.species.get(name).canGigantamax && canEquipGimmick(name,DYNAMAX_ITEM));return species?{rule:'dynamax',species,item:DYNAMAX_ITEM}:null;}
 if(gen<=5)return null;
 if(gen===6){
  for(const species of candidates){const item=Object.keys(megaStones).find(item=>megaStones[item].species===species);if(item)return {rule:'mega',species,item};}
  return null;
 }
 for(const species of candidates){
  const item=Object.keys(zCrystals).find(item=>zCrystals[item].from && zCrystals[item].users?.includes(species) && moveLearnsets[species]?.legalMoves.includes(zCrystals[item].from!));
  if(item)return {rule:'z',species,item};
 }
 for(const species of candidates){
  const type=Showdown.Dex.species.get(species).types[0];
  const item=Object.keys(zCrystals).find(item=>!zCrystals[item].from && zCrystals[item].type===type);
  if(item && moveLearnsets[species]?.legalMoves.some(name=>{const move=Showdown.Dex.moves.get(name);return move.type===type && move.category!=='Status' && !!move.zMove;}))return {rule:'z',species,item};
 }
 return null;
}
export function equipNpcGimmick(team:OpponentEntry[],gimmick:NpcGimmick|null){
 if(!gimmick)return team;
 return team.map(entry=>{
  // One representative gimmick per NPC team, including adapted old boss builds.
  const clean={...entry,item:entry.item && (megaStones[entry.item] || zCrystals[entry.item] || entry.item===DYNAMAX_ITEM || primalOrbs[entry.item])?undefined:entry.item};
  if(entry.name!==gimmick.species)return clean;
  const moves=[...entry.moves];
  if(gimmick.rule==='z'){
   const crystal=zCrystals[gimmick.item!];
   if(!moves.some(name=>{const move=Showdown.Dex.moves.get(name);return crystal.from?move.name===crystal.from:move.type===crystal.type && !!move.zMove;})){
    const move=crystal.from ?? moveLearnsets[entry.name].legalMoves.filter(name=>{const move=Showdown.Dex.moves.get(name);return move.type===crystal.type && move.category!=='Status' && !!move.zMove && !move.flags.charge && !move.flags.recharge && !move.selfdestruct;}).sort((a,b)=>Showdown.Dex.moves.get(b).basePower-Showdown.Dex.moves.get(a).basePower)[0];
    if(!move)throw Error('NPC Z carrier has no compatible move');
    moves[0]=move;
   }
  }
  if(gimmick.rule==='dynamax' && !Showdown.Dex.species.get(entry.name).canGigantamax)throw Error('NPC Dynamax carrier must support Gigantamax');
  if(gimmick.rule==='primal' && primalOrbs[gimmick.item ?? '']?.species!==entry.name)throw Error('NPC Primal carrier must hold its matching orb');
  return {...clean,moves,...(gimmick.item?{item:gimmick.item}:{}),...(gimmick.rule==='dynamax'?{gigantamax:true}:{})};
 });
}
export function stripNpcGimmicks(team:OpponentEntry[]){return team.map(entry=>({...entry,gigantamax:false,item:entry.item && (megaStones[entry.item] || zCrystals[entry.item] || entry.item===DYNAMAX_ITEM || entry.item==='Red Orb' || entry.item==='Blue Orb')?undefined:entry.item}));}
export function packedNpcRule(team:{item:string}[],teraTickets:number):BattleRule{
 if(team.some(p=>megaStones[p.item]))return 'mega';
 if(team.some(p=>p.item===DYNAMAX_ITEM))return 'dynamax';
 if(team.some(p=>zCrystals[p.item]))return 'z';
 return teraTickets>0?'tera':'basic';
}
