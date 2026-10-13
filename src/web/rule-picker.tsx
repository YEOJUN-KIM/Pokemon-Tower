 'use client';
import {battleRules,type BattleRule} from '../data/run-rules';
export function RulePicker({value,onChange,disabled=false}:{value:BattleRule;onChange:(rule:BattleRule)=>void;disabled?:boolean}){
 return <fieldset data-tab-scope className="rule-picker" data-testid="rule-picker"><legend>플레이어 배틀 룰</legend><div data-game-tabs className="rule-picker-options">{(Object.keys(battleRules) as BattleRule[]).map(rule=><button key={rule} type="button" data-rule={rule} aria-pressed={value===rule} disabled={disabled} onClick={()=>onChange(rule)}>{battleRules[rule].name}</button>)}</div><p>{battleRules[value].description} 선택한 룰은 플레이어에게 적용됩니다. NPC는 자신의 대표 기믹을 사용하며 도전 중에는 룰을 바꿀 수 없습니다.</p></fieldset>;
}
