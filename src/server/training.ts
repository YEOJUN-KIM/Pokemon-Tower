import Showdown from 'pokemon-showdown';
import {isTeraType,teraTypesForSpecies} from '../data/tera';
import {pokemonSets,trainedSet} from '../data/teams';
import {statKeys,natures,type StatBlock,type TrainingProfile} from '../data/training';
import {moveLearnsets,startingMoves} from './move-learnsets';
import {FORMAT} from '../battle/run';
import {BattleRequestError} from './battle-session';

export function defaultProfile(name:string):TrainingProfile {
  const set=trainedSet(name);
  return {ivs:{hp:0,atk:0,def:0,spa:0,spd:0,spe:0},evs:{hp:0,atk:0,def:0,spa:0,spd:0,spe:0},moves:startingMoves(name),ability:set.ability,nature:'Serious',teraType:set.teraType as import('../data/tera').TeraType,statSystem:'points'};
}
const optionsCache=new Map<string,{abilities:string[];learnableMoves:string[];baseStats:StatBlock}>();
export function trainingOptions(name:string) {
  const cached=optionsCache.get(name);if(cached)return cached;
  const validator=new Showdown.TeamValidator(FORMAT),base=trainedSet(name);
  const abilities=[...new Set(Object.values(Showdown.Dex.species.get(name).abilities))].filter(ability=>!validator.validateSet({...structuredClone(base),ability},{}));
  const learnableMoves=moveLearnsets[name].legalMoves.filter(move=>!validator.validateSet({...structuredClone(base),moves:[move]},{}));
  const options={abilities,learnableMoves,baseStats:{...Showdown.Dex.species.get(name).baseStats}};optionsCache.set(name,options);return options;
}
export function validateProfile(name:string,value:unknown):TrainingProfile {
  if(!Object.hasOwn(pokemonSets,name) || !value || typeof value!=='object')throw new BattleRequestError('포켓몬 설정이 올바르지 않습니다.',400);
  const profile=value as TrainingProfile;
  if(profile.teraType!==undefined && !isTeraType(profile.teraType))throw new BattleRequestError('올바른 테라 타입을 선택하세요.',400);
  if(profile.teraType && !teraTypesForSpecies(name).includes(profile.teraType))throw new BattleRequestError('이 포켓몬의 전용 테라 타입을 선택하세요.',400);
  for(const [block,max] of [[profile.ivs,31],[profile.evs,32]] as const) {
    if(!block || statKeys.some(key=>!Number.isSafeInteger(block[key]) || block[key]<0 || block[key]>max))throw new BattleRequestError('개체값은 0~31, 능력 포인트는 각 0~32여야 합니다.',400);
  }
  if(statKeys.reduce((sum,key)=>sum+profile.evs[key],0)>66)throw new BattleRequestError('능력 포인트는 총 66까지 배분할 수 있습니다.',400);
  if(!natures.some(nature=>nature.id===profile.nature))throw new BattleRequestError('올바른 성격을 선택하세요.',400);
  const options=trainingOptions(name);
  if(!Array.isArray(profile.moves) || profile.moves.length<1 || profile.moves.length>4 || new Set(profile.moves).size!==profile.moves.length || profile.moves.some(move=>!options.learnableMoves.includes(move)))throw new BattleRequestError('이 포켓몬이 배울 수 있는 서로 다른 기술을 1~4개를 선택하세요.',400);
  if(!options.abilities.includes(profile.ability))throw new BattleRequestError('이 포켓몬이 사용할 수 있는 특성을 선택하세요.',400);
  const clean:TrainingProfile={ivs:Object.fromEntries(statKeys.map(key=>[key,profile.ivs[key]])) as TrainingProfile['ivs'],evs:Object.fromEntries(statKeys.map(key=>[key,profile.evs[key]])) as TrainingProfile['evs'],moves:[...profile.moves],ability:profile.ability,nature:profile.nature,teraType:profile.teraType ?? defaultProfile(name).teraType,statSystem:'points'};
  const legality=trainedSet(name,clean);legality.ivs={hp:31,atk:31,def:31,spa:31,spd:31,spe:31};legality.pokeball='';legality.evs={hp:1,atk:0,def:0,spa:0,spd:0,spe:0};
  if(new Showdown.TeamValidator(FORMAT).validateSet(legality,{}))throw new BattleRequestError('현재 배틀 규칙에서 사용할 수 없는 설정입니다.',400);
  return clean;
}
