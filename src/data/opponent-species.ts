import Showdown from 'pokemon-showdown';
export const retainedUnevolvedOpponents=new Set(['Porygon2','Chansey','Dusclops','Gligar','Scyther']);
export function allowedOpponentSpecies(name:string,red=false){
 return !Showdown.Dex.species.get(name).nfe || retainedUnevolvedOpponents.has(name) || (red && name==='Pikachu');
}
export function evolvedOpponentSpecies(name:string,red=false):string {
 if(allowedOpponentSpecies(name,red))return name;
 const evolution=Showdown.Dex.species.get(name).evos[0];
 if(!evolution)throw Error('Missing opponent evolution: '+name);
 return evolvedOpponentSpecies(evolution,red);
}
