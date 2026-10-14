import Showdown from 'pokemon-showdown';
// Training exceptions and Gigantamax-capable unevolved partners stay collectible.
export const evioliteSpecies=new Set(['Porygon2','Scyther']);
export const collectibleUnevolvedSpecies=new Set([...evioliteSpecies,'Pikachu','Duraludon']);
export function isCollectibleSpecies(name:string){
 const species=Showdown.Dex.species.get(name);
 return species.exists&&(!species.nfe||collectibleUnevolvedSpecies.has(species.name));
}
// Preserve unevolved members of original named trainer parties as well.
export const namedReferenceSpecies=new Set(['Girafarig','Dragonair','Onix','Haunter','Sealeo','Weepinbell','Ursaring']);
// Regional variants follow the same evolution policy and use separate collection entries.
