import type {BossView} from '../shared/contracts';
import {namedTrainerSamples,legacyNamedTrainerSamples,trainerView,type TrainerTactic} from './trainer-catalog';
import {towerThemes,type TowerTheme} from './tower-themes';
export {towerThemes,type TowerTheme} from './tower-themes';

export type TrainerEncounter={boss:BossView;entries:readonly string[];tactic:TrainerTactic;ace?:string;champion?:boolean};
function trainer(id:string,sampleId:string):TrainerEncounter {
  const sample=namedTrainerSamples.find(sample=>sample.id===sampleId);
  if(!sample?.entries)throw Error(`Missing trainer entries: ${sampleId}`);
  return {boss:{id,name:sample.name,title:sample.title,introduction:'',victory:'',defeat:'',role:sample.role},entries:sample.entries,tactic:sample.tactic,ace:sample.ace,champion:sample.role==='champion'};
}

// Legacy identities retained for old presentation fixtures. Live encounters use the catalog below.
export const prototypeTrainers:Record<number,TrainerEncounter>={
  5:trainer('gym-leader-falkner','named-falkner'),
  10:trainer('champion-lance','named-lance'),
};

function shuffled(ids:string[],seed:string){
  const result=[...ids];let state=hash(seed);
  for(let i=result.length-1;i>0;i--){state=(state+0x6d2b79f5)>>>0;let value=state;value=Math.imul(value^(value>>>15),value|1);value^=value+Math.imul(value^(value>>>7),value|61);const j=Math.floor((((value^(value>>>14))>>>0)/4294967296)*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  return result;
}
function hash(value:string){let result=2166136261;for(const char of value)result=Math.imul(result^char.charCodeAt(0),16777619);return result>>>0;}
export function towerTrainerEncounter(floor:number,runId='prototype',theme:TowerTheme|null=null,splitRoute=false,hidden=false):TrainerEncounter|null {
  if(theme){
    if(floor<1 || floor>100 || floor%5!==0)return null;
    const localFloor=(floor-1)%50+1;
    const chapterRun=floor>50?`${runId}:chapter:2`:runId;
    let id:string;
    const config=towerThemes[theme];
    if(hidden)id=config.final;
    else if(localFloor===50)id=splitRoute?config.champion:config.final;
    else if(localFloor===40)id=splitRoute?shuffled([...config.elites],`${chapterRun}:${theme}:elite`)[3%config.elites.length]:config.champion;
    else if(localFloor%10===0)id=shuffled([...config.elites],`${chapterRun}:${theme}:elite`)[(localFloor/10-1)%config.elites.length];
    else id=shuffled([...config.gyms],`${chapterRun}:${theme}:gym`)[Math.floor(localFloor/10)];
    const sample=namedTrainerSamples.find(s=>s.id===id)!;
    const boss=trainerView(sample);
    if(theme==='johto' && id==='named-lance' && !splitRoute){boss.role='elite';boss.title='사천왕급 트레이너';}
    if(hidden)boss.title='히든 보스';
    if(theme==='galar' && localFloor===50)boss.title='챔피언 재대결';
    return {boss,entries:sample.entries!,tactic:sample.tactic,ace:sample.ace,champion:sample.role==='champion'};
  }
  const role=floor%10===0 ? 'champion' : floor%5===0 ? 'gym' : null;
  if(!role)return null;
  const candidates=legacyNamedTrainerSamples.filter(sample=>sample.role===role);
  let hash=2166136261;
  for(const char of `${runId}:${floor}`)hash=Math.imul(hash^char.charCodeAt(0),16777619);
  const sample=candidates[(hash>>>0)%candidates.length];
  return {boss:trainerView(sample),entries:sample.entries!,tactic:sample.tactic,ace:sample.ace,champion:sample.role==='champion'};
}
