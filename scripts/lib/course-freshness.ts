import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

type Course={id:string;theme?:string;organization?:string;encounters?:{floor:number;seed:number[];enemy:string}[]};
const signature=(c:Course)=>createHash('sha256').update(JSON.stringify({theme:c.theme,organization:c.organization,encounters:c.encounters})).digest('hex');
const seedKey=(e:{seed:number[]})=>JSON.stringify(e.seed);
// Offline dataset check only. These comparisons never become policy input.
export function assertFreshCourses(current:Course[],prior:Course[]){
 const ids=new Set(prior.map(c=>c.id)),signatures=new Set(prior.map(signature)),seeds=new Set(prior.flatMap(c=>(c.encounters??[]).map(seedKey)));
 const newIds=new Set<string>(),newSignatures=new Set<string>(),newSeeds=new Set<string>();
 for(const c of current){
  assert(c.encounters?.length===100,'Expected 100-floor course');
  assert(c.encounters.every((e,i)=>e.floor===i+1),'Nonsequential floors');
  assert(!ids.has(c.id)&&!newIds.has(c.id),'Reused course id');newIds.add(c.id);
  const s=signature(c);assert(!signatures.has(s)&&!newSignatures.has(s),'Reused course content');newSignatures.add(s);
  for(const e of c.encounters){const k=seedKey(e);assert(!seeds.has(k)&&!newSeeds.has(k),'Reused battle seed');newSeeds.add(k);}
 }
 return {priorCourses:prior.length,priorUniqueBattleSeeds:seeds.size,newCourses:current.length,newBattleSeeds:newSeeds.size,idOverlap:0,contentOverlap:0,battleSeedOverlap:0};
}
