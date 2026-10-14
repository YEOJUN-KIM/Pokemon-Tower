import Showdown from 'pokemon-showdown';
import {collectibleUnevolvedSpecies,isCollectibleSpecies} from './pokedex-roster';
export const retainedUnevolvedOpponents=new Set(collectibleUnevolvedSpecies);
export function allowedOpponentSpecies(name:string,_red=false){
 return isCollectibleSpecies(name);
}
export function evolvedOpponentSpecies(name:string,red=false):string {
 if(allowedOpponentSpecies(name,red))return name;
 const evolution=Showdown.Dex.species.get(name).evos[0];
 if(!evolution)throw Error('Missing opponent evolution: '+name);
 return evolvedOpponentSpecies(evolution,red);
}
