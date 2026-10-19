'use client';
import {battleRules,type BattleRule} from '../data/run-rules';
import {challengeRule} from './pokedex-controls';
import {SettingsChoice} from './settings-choice';
import styles from './styles/challenge-rule-choice.module.css';

/** Temporary placement belongs to the parent; this small control is easy to move. */
export function ChallengeRuleChoice({value,onChange}:{value:unknown;onChange:(rule:BattleRule)=>void}){
 return <section className={styles.rule} aria-label="도전 룰" data-testid="challenge-rule-choice"><span>도전 룰</span><SettingsChoice name="challenge-rule" label="도전 룰 선택" value={challengeRule(value)} options={(Object.keys(battleRules) as BattleRule[]).map(value=>({value,label:battleRules[value].name}))} onChange={value=>onChange(challengeRule(value))}/></section>;
}
