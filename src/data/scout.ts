import Showdown from 'pokemon-showdown';
import {pokemonSets} from './teams';
import {isCollectibleSpecies} from './pokedex-roster';
import {pokemonRarity} from './pokemon-rarity';
import {scoutGroups,scoutGroupWeights,scoutPrices,SCOUT_COUNT,type ScoutGroup} from './run-economy';

export const STRONG_BST=500,PSEUDO_BST=580;
// One group per species. Special tags win over base stat total.
export function scoutGroup(name:string):ScoutGroup{
  const species=Showdown.Dex.species.get(name),rarity=pokemonRarity(species.name),tags=species.tags;
  if(rarity==='mythical'||tags.includes('Mythical'))return 'mythical';
  if(rarity==='legendary'||tags.includes('Restricted Legendary'))return 'restricted';
  if(tags.includes('Paradox'))return 'paradox';
  if(rarity==='sublegendary'||tags.includes('Sub-Legendary')||tags.includes('Ultra Beast'))return 'sublegendary';
  return species.bst>=PSEUDO_BST?'pseudo':species.bst>=STRONG_BST?'strong':'common';
}
let pools:Record<ScoutGroup,string[]>|undefined;
// Base species only: every entry can fight with a bundled set.
export function scoutPools():Record<ScoutGroup,string[]>{
  if(pools)return pools;
  const result=Object.fromEntries(scoutGroups.map(g=>[g,[] as string[]])) as Record<ScoutGroup,string[]>;
  for(const name of Object.keys(pokemonSets)){
    const species=Showdown.Dex.species.get(name);
    if(!species.exists||species.name!==name||species.forme||!isCollectibleSpecies(name))continue;
    result[scoutGroup(name)].push(name);
  }
  for(const g of scoutGroups)result[g].sort();
  return pools=result;
}
export type ScoutDraw={species:string;group:ScoutGroup;price:number};
// Draws distinct species; groups that are empty after exclusions are skipped.
export function rollScoutDraws(clearedFloor:number,random:()=>number,exclude:ReadonlySet<string>=new Set(),count=SCOUT_COUNT):ScoutDraw[]{
  const all=scoutPools(),weights=scoutGroupWeights(clearedFloor),taken=new Set(exclude),result:ScoutDraw[]=[];
  while(result.length<count){
    const live=scoutGroups.filter(g=>weights[g]>0&&all[g].some(n=>!taken.has(n)));
    if(!live.length)break;
    let pick=random()*live.reduce((s,g)=>s+weights[g],0),group=live.at(-1)!;
    for(const g of live){pick-=weights[g];if(pick<0){group=g;break;}}
    const candidates=all[group].filter(n=>!taken.has(n)),species=candidates[Math.floor(random()*candidates.length)];
    taken.add(species);result.push({species,group,price:scoutPrices[group]});
  }
  return result;
}
