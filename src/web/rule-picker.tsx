 'use client';
import {battleRules,type BattleRule} from '../data/run-rules';
export function RulePicker({value,onChange,disabled=false}:{value:BattleRule;onChange:(rule:BattleRule)=>void;disabled?:boolean}){
 return <fieldset data-tab-scope className="rule-picker" data-testid="rule-picker"><legend>배틀 룰</legend><div data-game-tabs className="rule-picker-options">{(Object.keys(battleRules) as BattleRule[]).map(rule=><button key={rule} type="button" data-rule={rule} aria-pressed={value===rule} disabled={disabled} onClick={()=>onChange(rule)}>{battleRules[rule].name}</button>)}</div><p>{battleRules[value].description} 상대에게도 같은 룰이 적용되며 도전 중에는 바꿀 수 없습니다.</p></fieldset>;
}
