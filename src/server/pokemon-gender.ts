import Showdown from 'pokemon-showdown';
import {createHash} from 'node:crypto';
import type {PokemonGender} from '../data/gender';
export function genderOptions(name:string):PokemonGender[]{const fixed=Showdown.Dex.species.get(name).gender;return fixed?[fixed as PokemonGender]:['M','F'];}
export function speciesGender(name:string,sample:number):PokemonGender{const species=Showdown.Dex.species.get(name);return species.gender as PokemonGender || (sample<(species.genderRatio.F ?? .5)?'F':'M');}
export function collectionGender(name:string,owner:string){return speciesGender(name,createHash('sha256').update(`${owner}:gender:${name}`).digest().readUInt32BE()/4294967296);}
