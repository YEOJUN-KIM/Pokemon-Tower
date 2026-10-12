import {zCrystals} from './z-crystals';
import {megaStones,DYNAMAX_ITEM,type Gimmick} from './gimmicks';
export const battleRules={
 basic:{name:'기본 룰',description:'메가진화·다이맥스·테라스탈·Z기술 없이 배틀합니다.'},
 mega:{name:'메가진화 룰',description:'메가스톤을 지닌 포켓몬이 배틀당 한 번 메가진화할 수 있습니다.'},
 dynamax:{name:'다이맥스 룰',description:'다이버섯을 지닌 포켓몬이 배틀당 한 번 다이맥스할 수 있습니다.'},
 tera:{name:'테라스탈 룰',description:'팀 공용 테라권으로 배틀당 한 번 테라스탈할 수 있습니다.'},
 chaos:{name:'혼합 룰',description:'메가진화·다이맥스·테라스탈·Z기술을 기존 사용 조건에 따라 사용할 수 있습니다.'},
 z:{name:'Z기술 룰',description:'Z크리스탈을 지닌 포켓몬이 팀당 배틀 한 번 Z기술을 사용할 수 있습니다.'},
} as const;
export type BattleRule=keyof typeof battleRules;
export function isBattleRule(value:unknown):value is BattleRule{return typeof value==='string' && Object.hasOwn(battleRules,value);}
export function allowsGimmick(rule:BattleRule,kind:Gimmick){return rule==='chaos'||rule===(kind==='terastallize'?'tera':kind==='zmove'?'z':kind);}
export function allowsRuleItem(rule:BattleRule,item:string){return zCrystals[item]?allowsGimmick(rule,'zmove'):megaStones[item]?allowsGimmick(rule,'mega'):item===DYNAMAX_ITEM?allowsGimmick(rule,'dynamax'):true;}
