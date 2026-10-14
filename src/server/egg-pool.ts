import Showdown from 'pokemon-showdown';
import {pokemonRarity} from '../data/pokemon-rarity';
import type {RareEggCategory} from '../data/egg-kinds';
import type {EggGrade} from '../data/egg-grades';
// Check these tags first: a Paradox/Ultra Beast must not also enter another category.
export function rareEggSpeciesCategory(name:string):RareEggCategory|null{
 const tags=Showdown.Dex.species.get(name).tags;
 if(tags.includes('Paradox'))return 'paradox';
 if(tags.includes('Ultra Beast'))return 'ultrabeast';
 const rarity=pokemonRarity(name);
 return rarity==='normal'?null:rarity;
}

export function eggSpeciesGrade(name:string):EggGrade{
 const data=Showdown.Dex.species.get(name);
 if(!data.exists)throw Error(`Unknown egg species: ${name}`);
 const rarity=pokemonRarity(data.name);
 if(rarity==='legendary'||rarity==='mythical'||data.tags.includes('Restricted Legendary')||data.tags.includes('Mythical'))return 'superRare';
 return rareEggSpeciesCategory(data.name)!==null||data.tags.includes('Sub-Legendary')?'rare':'normal';
}

export function buildEggSpeciesPools(names:Iterable<string>):Record<EggGrade,string[]>{
 const pools:Record<EggGrade,string[]>={normal:[],rare:[],superRare:[]};
 for(const name of new Set(names))pools[eggSpeciesGrade(name)].push(name);
 return pools;
}
