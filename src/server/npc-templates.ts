import {towerThemes} from '../data/tower-themes';
import rows from '../data/normal-npc-templates.json' with {type:'json'};
import roster from '../data/battle-roster.json' with {type:'json'};
import {normalNpcCategory,normalNpcStage,normalNpcFloorRules,type NormalModeStage} from '../data/normal-mode-stages';
import {towerDifficulty,type TowerProgression} from '../data/tower-progression';
import {isBuildProgression,buildTraining} from '../data/opponent-progression';
import type {NpcGimmick} from '../data/npc-gimmicks';
import {statKeys,type TrainingProfile,type StatBlock} from '../data/training';
import {isCollectibleSpecies} from '../data/pokedex-roster';
import {canonicalNpcId} from '../data/npc-review-presets';
import {validateSelectionRules,type SelectionRules} from '../data/npc-selection-rules';

type Template={gate50?:boolean;id:string;stage:NormalModeStage;allFloors?:boolean;select?:boolean;required?:string[];selectionRules?:SelectionRules;role:string;ace:string;signature:NpcGimmick|null;gimmickEnabled:boolean;legendaryMinFloor?:number;team:{species:string;item:string;gigantamax:boolean;special?:'hidden';profile:TrainingProfile}[]};
for(const row of rows as unknown as Template[])validateSelectionRules(row.team.map(p=>p.species),row.selectionRules,[...row.required??[],...row.ace?[row.ace]:[],...row.signature?[row.signature.species]:[]]);
const templates=new Map((rows as unknown as Template[]).map(row=>[`${row.id}:${row.allFloors?'all':row.stage}`,row]));
const species=roster as Record<string,{legendary?:boolean;mythical?:boolean}>;
export function normalNpcTemplate(id:string,floor:number,role?:string,progression:TowerProgression='hundred-floor-v1'):Template|null{
 const category=normalNpcCategory(role,id,'named');
 const finish=(source:Template)=>{
  const result=structuredClone(source);
  // Tower adaptation: preserve Cynthia's Garchomp / Iris's Haxorus and their
  // native moves/partners. Tera showcases the ace's own type without inventing a Mega.
  if(isBuildProgression(progression)&&floor>=50&&role==='champion'&&!result.signature){result.signature={rule:'tera',species:result.ace};result.gimmickEnabled=true;}
  return result;
 };
 const gate50=floor===50&&Object.values(towerThemes).some(theme=>theme.champion===id||theme.final===id);
 if(gate50){
  const source=templates.get(`${id}:final-gate`)??templates.get(`${canonicalNpcId(id)}:all`)??templates.get(`${id}:all`);
  if(source&&source.team.every(p=>isCollectibleSpecies(p.species))){
   const gate=structuredClone(source);gate.gate50=true;
   // Preserve the final roster's signature and its characteristic rare partners.
   gate.required=[...new Set([...(gate.required??[]),...gate.team.filter(p=>species[p.species]?.legendary||species[p.species]?.mythical).map(p=>p.species)])];
   return finish(gate);
  }
 }
 // Campaign bosses enter late and use their reviewed final roster, including
 // legendary aces. Champions keep the distinct 50/100-floor samples.
 const villainBoss=role==='villain' && !id.includes('-executive-');
 const stage=villainBoss&&floor>=normalNpcFloorRules.villainBoss?'final-gate':normalNpcStage(floor,category);
 const row=templates.get(`${canonicalNpcId(id)}:all`)??templates.get(`${id}:all`)??templates.get(`${id}:${stage}`);
 if(!row)return null;
 if(row.team.some(p=>!isCollectibleSpecies(p.species)))return null;
 const difficulty=towerDifficulty(floor);
 if(row.legendaryMinFloor && floor<row.legendaryMinFloor)return null;
 if(row.team.some(p=>species[p.species]?.legendary&&!difficulty.legendary || species[p.species]?.mythical&&!difficulty.mythical))return null;
 return finish(row);
}
export function templateProfile(profile:TrainingProfile,floor:number,gate50=false,progression:TowerProgression='hundred-floor-v1'):TrainingProfile{
 const modern=buildTraining(floor,'elite');
 const result=structuredClone(profile),difficulty=isBuildProgression(progression)?{ivCap:modern.ivRange[1],points:modern.evBudget}:gate50?{ivCap:24,points:46}:towerDifficulty(floor);
 result.ivs=Object.fromEntries(statKeys.map(k=>[k,Math.min(profile.ivs[k],difficulty.ivCap)])) as StatBlock;
 const total=statKeys.reduce((n,k)=>n+profile.evs[k],0),budget=Math.min(total,difficulty.points);
 result.evs=Object.fromEntries(statKeys.map(k=>[k,total?Math.floor(profile.evs[k]*budget/total):0])) as StatBlock;
 const priority=[...statKeys].sort((a,b)=>profile.evs[b]-profile.evs[a]);
 for(let remaining=budget-statKeys.reduce((n,k)=>n+result.evs[k],0);remaining>0;remaining--){const key=priority.find(k=>result.evs[k]<32)!;result.evs[key]++;}
 return result;
}
