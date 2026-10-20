'use client';
import {BagButton} from './bag';
import {RulePicker} from './rule-picker';
import {type BattleRule} from '../data/run-rules';
import {selectGameCursor,useGameMenuKeys} from './game-keyboard';
import {RunPokemonSettings} from './run-pokemon-settings';
import type {PokedexEntry} from './pokedex-data';

import {useState,useRef,useEffect} from 'react';
import type {TowerView} from './contracts';
import {pokemonName, species, spriteUrl} from './catalog';
import {RecruitChoices} from './recruit-choices';
import {RunMaintenance} from './run-maintenance';
import {isShopFloor} from '../data/shop';
import {HeldItemLabel} from './held-item-label';
import {TypeBadge} from './type-badge';
import {moveTypeNames,moveInfo} from '../data/move-info';
import styles from './styles/party-preparation.module.css';

export function TowerControls({tower, entries, selected, setSelected, busy, submit,error,onLeaveMaintenance}: {
  tower: TowerView; entries:PokedexEntry[]; selected: string[]; setSelected: (names: string[]) => void;
  onLeaveMaintenance?:()=>void;busy: boolean; submit: (body: Record<string, unknown>) => Promise<void>;error?:string;
}) {
  const [rule,setRule]=useState<BattleRule>('basic');
  const [shopping,setShopping]=useState(tower.run?.state==='select' && (isShopFloor(tower.run.floor,tower.run.totalFloors)||!!tower.run.retries?.preparing));
  const confirmButton=useRef<HTMLButtonElement>(null),root=useRef<HTMLElement>(null),[settingsName,setSettingsName]=useState('');
  useGameMenuKeys(root,({key,cursor})=>{const name=cursor?.dataset.partySpecies;if(key==='x'&&name&&!busy&&tower.run?.adjustment?.entries.some(entry=>entry.species===name)){setSettingsName(name);return true;}return false;},shopping);
  useEffect(()=>{if(tower.run?.state==='select' && selected.length===3 && !busy && !shopping){const frame=requestAnimationFrame(()=>selectGameCursor(tower.run?.retries?.preparing?root.current?.querySelector<HTMLButtonElement>('[data-party-species]'):confirmButton.current));return ()=>cancelAnimationFrame(frame);}},[tower.run?.state,selected.length,busy,shopping]);
  const run = tower.run;
  if (run?.state === 'battle') return null;
  const choosingNext = run?.state === 'select';
  const available = choosingNext ? run.roster : tower.unlocked;
  const pick = (name:string)=>setSelected(selected.includes(name)?selected.filter(p=>p!==name):selected.length<3?[...selected,name]:selected);
  if(run?.state==='recruit')return <RecruitChoices tower={tower} busy={busy} submit={submit} error={error}/>;
  const start = () => submit(choosingNext ? {type: 'enter', runId: run.id, floor: run.floor, selected} : {type: 'start', selected,rule});
  if(shopping && run?.state==='select' && (isShopFloor(run.floor,run.totalFloors)||run.retries?.preparing))return <RunMaintenance tower={tower} entries={entries} busy={busy} submit={submit} error={error} onContinue={()=>{setShopping(false);onLeaveMaintenance?.();}}/>;
  return <section ref={root} className={`tower-controls ${styles.scope}`} data-testid="team-selection" data-preparing={choosingNext||undefined}>
    {!choosingNext&&<div className="selection-title"><div><h2>함께 출발할 3마리를 선택하세요.</h2></div><span className="selection-count">{selected.length} / 3</span></div>}
    <div className={`pokemon-selection ${choosingNext?styles.roster:''}`} data-keyboard-grid>{available.map(name=>{
     const picked=selected.includes(name),display=run?.partnerForms?.[name]??name,index=selected.indexOf(name);
     return <button key={name} className={`pokemon-choice ${styles.card}`} data-party-species={name} data-game-focusable={!busy||undefined} aria-pressed={picked} aria-label={`${pokemonName(name)} 선택`} disabled={busy||(!picked&&selected.length>=3)} onClick={()=>pick(name)}>
      <span className={styles.order} data-party-order={picked?index+1:undefined}>{picked?String(index+1).padStart(2,'0'):'+'}</span>
      <img src={spriteUrl(display)} alt="" width={80} height={80} onError={event=>{event.currentTarget.style.visibility='hidden';}}/>
      <strong>{pokemonName(display)}</strong><span className={styles.types}>{species[display]?.types.map(type=><TypeBadge key={type} type={Object.keys(moveTypeNames).find(key=>moveTypeNames[key]===type)??type}/>)}</span>
      {run?.retries?.preparing&&<span className={styles.retryMoves} data-retry-moves>{run.currentMoves?.[name]?.map(move=><span key={move}>{moveInfo[move]?.name??move}</span>)}</span>}
      {choosingNext&&<small>지닌 도구 · <HeldItemLabel item={run.heldItems?.[name]}/></small>}
     </button>;
    })}{choosingNext&&Array.from({length:Math.max(0,6-available.length)},(_,index)=><div key={`empty-${index}`} className={styles.emptySlot} data-party-empty aria-label={`${available.length+index+1}번 빈 슬롯`}><span aria-hidden="true">＋</span><small>빈 슬롯</small></div>)}</div>
    {!choosingNext&&<RulePicker value={rule} onChange={setRule} disabled={busy}/>}
    <div className={`selection-actions ${styles.actions}`}>{choosingNext&&<span className={`selection-count ${styles.count}`}>{selected.length} / 3</span>}{choosingNext&&<BagButton run={run} busy={busy} submit={submit} error={error}/>}<button ref={confirmButton} data-keyboard-next className="primary-button" disabled={busy||selected.length!==3} onClick={()=>void start()}>{busy?'준비 중…':choosingNext?`${run.floor}층 ${run.hiddenBossPending?'히든 보스 도전':run.boss?'보스 도전':'배틀 시작'}`:'배틀 시작'} ↗</button></div>
    {settingsName&&<RunPokemonSettings tower={tower} entries={entries} name={settingsName} returnFocus={`[data-party-species="${settingsName}"]`} onClose={()=>setSettingsName('')} submit={submit}/>}
  </section>;
}
