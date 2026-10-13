import Showdown from 'pokemon-showdown';
// Only these unevolved species remain collectible.
export const evioliteSpecies=new Set(['Porygon2','Scyther']);
export function isCollectibleSpecies(name:string){
 const species=Showdown.Dex.species.get(name);
 return species.exists&&(!species.nfe||evioliteSpecies.has(species.name));
}
// Preserve unevolved members of original named trainer parties as well.
export const namedReferenceSpecies=new Set(['Girafarig','Dragonair','Onix','Haunter','Sealeo','Weepinbell','Ursaring']);
// Regional variants follow the same evolution policy and use separate collection entries.
