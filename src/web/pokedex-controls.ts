import {isBattleRule,type BattleRule} from '../data/run-rules';
import type {PokedexEntry} from './pokedex-data';

/** UI boundary only: never changes a rule's battle behavior. */
export function challengeRule(value:unknown):BattleRule{return isBattleRule(value)?value:'chaos';}

export const specialFormOptions=[
 {value:'all',label:'특수 형태'},
 {value:'mega',label:'메가진화 가능'},
 {value:'gigantamax',label:'거다이맥스 가능'},
 {value:'alternate',label:'별도 폼 존재'},
 {value:'transformation',label:'기타 특수 변신'},
] as const;
export type SpecialFormFilter=typeof specialFormOptions[number]['value'];
export function matchesSpecialForm(entry:PokedexEntry,value:SpecialFormFilter){
 switch(value){
  case 'mega':return entry.canMega;
  case 'gigantamax':return entry.canGigantamax;
  case 'alternate':return !!entry.forms?.some(form=>form.kind==='selectable');
  case 'transformation':return !!entry.canPrimal||!!entry.forms?.some(form=>form.kind==='primal'||form.kind==='battle');
  default:return true;
 }
}
