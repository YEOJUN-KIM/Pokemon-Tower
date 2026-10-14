import rows from '../data/normal-npc-templates.json' with {type:'json'};
import roster from '../data/battle-roster.json' with {type:'json'};
import {normalNpcCategory,normalNpcStage,type NormalModeStage} from '../data/normal-mode-stages';
import {towerDifficulty} from '../data/tower-progression';
import type {NpcGimmick} from '../data/npc-gimmicks';
import {statKeys,type TrainingProfile,type StatBlock} from '../data/training';
import {isCollectibleSpecies} from '../data/pokedex-roster';

type Template={id:string;stage:NormalModeStage;role:string;ace:string;signature:NpcGimmick;gimmickEnabled:boolean;legendaryMinFloor?:number;team:{species:string;item:string;gigantamax:boolean;profile:TrainingProfile}[]};
const templates=new Map((rows as unknown as Template[]).map(row=>[`${row.id}:${row.stage}`,row]));
const species=roster as Record<string,{legendary?:boolean;mythical?:boolean}>;
export function normalNpcTemplate(id:string,floor:number,role?:string):Template|null{
 const category=normalNpcCategory(role,id,'named');
 // Campaign bosses enter late and use their reviewed final roster, including
 // legendary aces. Champions keep the distinct 50/100-floor samples.
 const villainBoss=role==='villain' && !id.includes('-executive-');
 const stage=villainBoss&&floor>=75?'final-gate':normalNpcStage(floor,category);
 const row=templates.get(`${id}:${stage}`);
 if(!row)return null;
 if(row.team.some(p=>!isCollectibleSpecies(p.species)))return null;
 const difficulty=towerDifficulty(floor);
 if(row.legendaryMinFloor && floor<row.legendaryMinFloor)return null;
 if(row.team.some(p=>species[p.species]?.legendary&&!difficulty.legendary || species[p.species]?.mythical&&!difficulty.mythical))return null;
 return structuredClone(row);
}
export function templateProfile(profile:TrainingProfile,floor:number):TrainingProfile{
 const result=structuredClone(profile),difficulty=towerDifficulty(floor);
 result.ivs=Object.fromEntries(statKeys.map(k=>[k,Math.min(profile.ivs[k],difficulty.ivCap)])) as StatBlock;
 const total=statKeys.reduce((n,k)=>n+profile.evs[k],0),budget=Math.min(total,difficulty.points);
 result.evs=Object.fromEntries(statKeys.map(k=>[k,total?Math.floor(profile.evs[k]*budget/total):0])) as StatBlock;
 const priority=[...statKeys].sort((a,b)=>profile.evs[b]-profile.evs[a]);
 for(let remaining=budget-statKeys.reduce((n,k)=>n+result.evs[k],0);remaining>0;remaining--){const key=priority.find(k=>result.evs[k]<32)!;result.evs[key]++;}
 return result;
}
