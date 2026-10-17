'use client';
import {useEffect,useRef} from 'react';
import type {RunView} from '../shared/contracts';
import {pokemonName,species} from './catalog';
import {PokemonImage} from './pokemon-image';
import {HeldItemLabel} from './held-item-label';
import {selectGameCursor} from './game-keyboard';
import styles from './styles/item-target-list.module.css';

/** Party rows share their layout while each action supplies its own eligibility. */
export function ItemTargetList({run,onChoose,disabled,attribute='data-bag-target',move,learnable,disabledReason,getStatus,showHeldItem=false}:{run:RunView;onChoose:(name:string)=>void;disabled:(name:string)=>boolean;attribute?:string;move?:string;learnable?:(name:string)=>boolean;disabledReason?:(name:string)=>string|undefined;getStatus?:(name:string)=>string;showHeldItem?:boolean}){
 const root=useRef<HTMLDivElement>(null),first=run.roster.find(name=>!disabled(name)&&!disabledReason?.(name));
 useEffect(()=>{selectGameCursor(first?root.current?.querySelector<HTMLButtonElement>('[data-initial-focus]'):root.current?.closest('dialog')?.querySelector<HTMLButtonElement>('[data-target-cancel]:not(:disabled)'));},[first]);
 return <div ref={root} className={styles.scope} data-keyboard-list aria-label="대상 포켓몬 선택">{run.roster.map(name=>{
  const displayName=run.partnerForms?.[name]??name,info=species[displayName],profile=run.adjustment?.entries.find(entry=>entry.species===name)?.profile;
  const level=run.bag?.partners[name]?.level??run.machineShop?.partners[name]?.level??50;
  const learned=!!move&&!!run.bag?.currentMoves[name]?.includes(move);
  const reason=disabledReason?.(name),unavailable=disabled(name)||!!reason,status=move?(learned?'이미 배우고 있음':!(learnable?.(name)??!unavailable)?'배울 수 없음':'배울 수 있음'):reason??getStatus?.(name)??'';
  return <button key={name} className={styles.card} {...{[attribute]:name}} data-initial-focus={name===first||undefined} disabled={unavailable} onPointerEnter={event=>{if(event.pointerType==='mouse'&&!unavailable)selectGameCursor(event.currentTarget);}} onClick={()=>{if(!unavailable)onChoose(name);}}>
   <span className={styles.sprite}><PokemonImage id={info.id} spriteKey={info.spriteKey} shiny={profile?.shiny} name={pokemonName(displayName)} width={64} height={64} fallback={<span>◇</span>}/></span>
   <span className={styles.identity}><strong>{pokemonName(displayName)}</strong><small>Lv.{level}</small></span>
   <span className={styles.status} data-target-status data-eligible={move?!learned&&(learnable?.(name)??!unavailable):undefined}>{status?status:showHeldItem&&run.heldItems?.[name]?<HeldItemLabel item={run.heldItems[name]}/>:null}</span>
  </button>;
 })}{!first&&<p role="status">사용할 수 있는 포켓몬이 없습니다.</p>}</div>;
}
