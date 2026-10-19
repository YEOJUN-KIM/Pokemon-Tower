import type {RaidPhaseDefinition} from '../data/raids';
import {pokemonName} from '../data/pokemon-catalog';

// Resolve once before persisting the encounter, never from the live turn loop.
export function resolveRaidPhases(phases:readonly RaidPhaseDefinition[],boss:string,random:()=>number):RaidPhaseDefinition[]{
 const used=new Map<string,Set<string>>();
 return phases.map((definition,index)=>{
  const {randomBranch,...plain}=structuredClone(definition);
  let phase: RaidPhaseDefinition=plain;
  if(randomBranch){
   const previous=used.get(randomBranch.id)??new Set<string>();
   const options=randomBranch.options.filter(p=>!randomBranch.excludePrevious||!previous.has(p.species));
   if(!options.length)throw Error('No eligible raid branch');
   const choice=options[Math.min(options.length-1,Math.floor(random()*options.length))];
   phase={...plain,...structuredClone(choice),branchChoice:randomBranch.id+':'+choice.species};
   previous.add(choice.species);used.set(randomBranch.id,previous);
  }
  if(index>0&&!phase.messages)phase.messages=[`Raid Phase ${index+1} · ${pokemonName(boss)}의 기운이 바뀌고 있다...`,`${pokemonName(phase.species)} · Phase ${index+1}`];
  return phase;
 });
}
