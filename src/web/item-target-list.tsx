'use client';
import type {RunView} from '../shared/contracts';
import {pokemonName,species} from './catalog';
import {PokemonImage} from './pokemon-image';
import {HeldItemLabel} from './held-item-label';
import {selectGameCursor} from './game-keyboard';
import styles from './styles/item-target-list.module.css';

/** Party rows share their layout while each action supplies its own eligibility. */
export function ItemTargetList({run,onChoose,disabled,attribute='data-bag-target',move,learnable,showHeldItem=false}:{run:RunView;onChoose:(name:string)=>void;disabled:(name:string)=>boolean;attribute?:string;move?:string;learnable?:(name:string)=>boolean;showHeldItem?:boolean}){
 return <div className={styles.scope} data-keyboard-list aria-label="대상 포켓몬 선택">{run.roster.map((name,index)=>{
  const displayName=run.partnerForms?.[name]??name,info=species[displayName],profile=run.adjustment?.entries.find(entry=>entry.species===name)?.profile;
  const level=run.bag?.partners[name]?.level??run.machineShop?.partners[name]?.level??50;
  const learned=!!move&&!!run.bag?.currentMoves[name]?.includes(move);
  const unavailable=disabled(name),status=move?(learned?'이미 배우고 있음':!(learnable?.(name)??!unavailable)?'배울 수 없음':'배울 수 있음'):'';
  return <button key={name} className={styles.card} {...{[attribute]:name}} data-initial-focus={index===0||undefined} disabled={unavailable} onPointerEnter={event=>{if(event.pointerType==='mouse'&&!unavailable)selectGameCursor(event.currentTarget);}} onClick={()=>onChoose(name)}>
   <span className={styles.sprite}><PokemonImage id={info.id} spriteKey={info.spriteKey} shiny={profile?.shiny} name={pokemonName(displayName)} width={64} height={64} fallback={<span>◇</span>}/></span>
   <span className={styles.identity}><strong>{pokemonName(displayName)}</strong><small>Lv.{level}</small></span>
   <span className={styles.status} data-target-status data-eligible={move?!learned&&(learnable?.(name)??!unavailable):undefined}>{move?status:showHeldItem&&run.heldItems?.[name]?<HeldItemLabel item={run.heldItems[name]}/>:null}</span>
  </button>;
 })}</div>;
}
