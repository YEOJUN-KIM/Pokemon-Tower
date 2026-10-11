import Showdown from 'pokemon-showdown';
import learnsets from '../data/move-learnsets.json' with {type:'json'};
import {pokemonSets} from '../data/teams';
import {FORMAT} from '../data/battle-rules';
export type MoveLearnset={version:string;selfMoves:string[];legalMoves:string[]};
export const moveLearnsets:Record<string,MoveLearnset>=learnsets;
const startingCache=new Map<string,string[]>();
export function startingMoves(name:string):string[] {
  const cached=startingCache.get(name);if(cached)return [...cached];
  const set=pokemonSets[name as keyof typeof pokemonSets],self=moveLearnsets[name].selfMoves;
  const species=Showdown.Dex.species.get(name);
  const score=(name:string)=>{const move=Showdown.Dex.moves.get(name);return move.basePower*(move.accuracy===true ? 1 : move.accuracy/100)
    *(species.types.includes(move.type) ? 1.5 : 1)*(move.category==='Physical' ? species.baseStats.atk : species.baseStats.spa)/100;};
  // Keep familiar self-taught moves, then fill missing slots with useful legal level-up attacks.
  const validator=new Showdown.TeamValidator(FORMAT),selected:string[]=[];
  for(const move of [...new Set([...set.moves.filter(move=>self.includes(move)),...[...self].sort((a,b)=>score(b)-score(a))])]) {
    if(!validator.validateSet({...structuredClone(set),moves:[...selected,move]},{}))selected.push(move);
    if(selected.length===4)break;
  }
  startingCache.set(name,selected);return [...selected];
}
