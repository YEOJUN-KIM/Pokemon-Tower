'use client';
import type {TrainingView,TrainingProfile} from '../data/training';
import {PokemonImage} from './pokemon-image';
import {baseFormName,selectableForms} from '../data/selectable-forms';
import {profileForForm} from './form-editor-data';
import {settingForms} from './pokemon-settings-model';
import {species} from './catalog';
import {TypeBadge} from './type-badge';
import {moveTypeNames} from '../data/move-info';
import {GameChoice,GameChoiceList} from './game-menu';
import styles from './styles/pokemon-settings.module.css';
export function FormEditor({entry,onChange,disabled=false}:{entry:TrainingView;onChange:(profile:TrainingProfile)=>void;disabled?:boolean}){
 const chosen=entry.profile.forme??entry.species,options=settingForms(entry);
 return <GameChoiceList grid className={styles.formGrid} aria-label="모습 선택">{options.map(form=>{
  const name=baseFormName(form.species,form.name),current=chosen===form.species,types=(selectableForms[form.species]?.types??species[form.species]?.types??[]).map(type=>Object.keys(moveTypeNames).find(key=>moveTypeNames[key]===type)??type);
  return <GameChoice className={styles.formCard} key={form.species} data-form={form.species} aria-label={name} aria-pressed={current} data-initial-focus={current||undefined} disabled={disabled} onClick={()=>onChange(current?entry.profile:profileForForm(entry,form.species))}>
   <PokemonImage shiny={entry.profile.shiny} animated id={Number(form.spriteKey)} spriteKey={form.spriteKey} name={name} width={80} height={80} fallback={<span>◇</span>}/>
   <strong>{current&&<span aria-hidden>✓ </span>}{name}</strong><span className={styles.moveMeta}>{types.map(type=><TypeBadge key={type} type={type}/>)}</span>
  </GameChoice>;
 })}</GameChoiceList>;
}
