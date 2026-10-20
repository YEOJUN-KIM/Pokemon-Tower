import Showdown from 'pokemon-showdown';
import {isTowerTheme,towerThemes} from '../data/tower-themes';
import {isTeraType} from '../data/tera';
import {selectableForms} from '../data/selectable-forms';
import {rareEggWeights} from '../data/egg-kinds';
import {superRareCategoryWeights,type EggGrade} from '../data/egg-grades';
import {rareEggSpeciesCategory} from './egg-pool';
import {selectFocusedEggPool,selectWeightedEggPool} from '../game/egg-machine-tuning';
import {eggTuningEvents,type EggMachineTuning,type EggFocusTarget,type EggTuningEvent,type PokemonRegion} from '../data/egg-machine-tuning';
import {BattleRequestError} from './request-error';

// Prefer the form's existing geographic metadata over its base species. The
// nine supported regions group Hisui (including its new evolutions) with Sinnoh.
export function eggSpeciesRegion(name:string):PokemonRegion {
  const species=Showdown.Dex.species.get(name);
  if(!species.exists)throw new Error(`Unknown egg species: ${name}`);
  const region=selectableForms[species.name]?.region;
  if(region==='히스이'||species.forme.startsWith('Hisui')||(species.gen===8&&species.num>=899&&species.num<=905))return 'sinnoh';
  const explicit=(Object.keys(towerThemes) as PokemonRegion[]).find(key=>towerThemes[key].name===region);
  if(explicit)return explicit;
  // Engine form metadata also handles forms excluded from today's collection,
  // e.g. Meowth-Alola/Meowth-Galar, without making them new hatch candidates.
  if(species.forme.startsWith('Alola'))return 'alola';
  if(species.forme.startsWith('Galar'))return 'galar';
  if(species.forme.startsWith('Paldea'))return 'paldea';
  const introduced=(Object.keys(towerThemes) as PokemonRegion[]).find(key=>towerThemes[key].generation===species.gen);
  if(!introduced)throw new Error(`Unknown egg region: ${name}`);
  return introduced;
}

function matchesTarget(name:string,target:EggFocusTarget):boolean {
  switch(target.kind){
    case 'region':return eggSpeciesRegion(name)===target.region;
    case 'type':return Showdown.Dex.species.get(name).types.includes(target.pokemonType);
    case 'species':return target.species.includes(name);
  }
}

export function selectTunedEggSpecies(candidates:readonly string[],grade:EggGrade,matches:(name:string)=>boolean,roll:(max:number)=>number,focusWeight?:number):string {
  const focusedPool=selectFocusedEggPool(candidates,matches,roll,focusWeight);
  // Keep the original relative category weights wherever that category has
  // candidates. E.g. Hoenn focus must not try to draw a Hoenn Ultra Beast.
  const weights=grade==='superRare'?superRareCategoryWeights:rareEggWeights;
  const pool=grade==='normal'?focusedPool:selectWeightedEggPool(
    Object.entries(weights).map(([category,weight])=>({weight,candidates:focusedPool.filter(name=>rareEggSpeciesCategory(name)===category)})),roll,
  );
  return pool[roll(pool.length)];
}

export function parseEggMachineTuning(value:unknown):EggMachineTuning {
  const invalid=()=>{throw new BattleRequestError('뽑기기계 조정 설정이 올바르지 않습니다.',400);};
  if(value===undefined)return {kind:'none'};
  if(!value||typeof value!=='object'||Array.isArray(value))return invalid();
  const input=value as Record<string,unknown>;
  const keys=(...allowed:string[])=>Object.keys(input).every(key=>allowed.includes(key));
  if(input.kind==='none'&&keys('kind'))return {kind:'none'};
  if(input.kind==='region'&&keys('kind','region')&&isTowerTheme(input.region)){
    return {kind:'region',region:input.region};
  }
  if(input.kind==='type'&&keys('kind','pokemonType')&&isTeraType(input.pokemonType)){
    return {kind:'type',pokemonType:input.pokemonType};
  }
  if(input.kind==='event'&&keys('kind','eventId')&&typeof input.eventId==='string'&&input.eventId.length>0&&input.eventId.length<=80){
    return {kind:'event',eventId:input.eventId};
  }
  return invalid();
}

export function resolveEggMachineTuning(value:unknown,events:readonly EggTuningEvent[]=eggTuningEvents):{
  tuning:EggMachineTuning;matches:((name:string)=>boolean)|null;
} {
  const tuning=parseEggMachineTuning(value);
  if(tuning.kind==='none')return {tuning,matches:null};
  if(tuning.kind!=='event')return {tuning,matches:name=>matchesTarget(name,tuning)};
  const event=events.find(event=>event.id===tuning.eventId);
  if(!event)throw new BattleRequestError('뽑기기계 조정 이벤트를 찾을 수 없습니다.',400);
  return {tuning,matches:name=>event.targets.some(target=>matchesTarget(name,target))};
}
