import rarity from './music-rarity.json';
export type PokemonRarity='normal'|'sublegendary'|'legendary'|'mythical';
export const pokemonRarityNames:Record<PokemonRarity,string>={normal:'일반',sublegendary:'준전설',legendary:'전설',mythical:'환상'};
export const eggRarityWeights:Record<PokemonRarity,number>={normal:9500,sublegendary:350,legendary:100,mythical:50};
export function pokemonRarity(species:string):PokemonRarity{
 const value=(rarity as Record<string,string>)[species];
 return value==='sublegendary'||value==='legendary'||value==='mythical'?value:'normal';
}
export function eggRarity(roll:number):PokemonRarity{
 let total=0;
 for(const [kind,weight] of Object.entries(eggRarityWeights)){total+=weight;if(roll<total)return kind as PokemonRarity;}
 return 'mythical';
}
