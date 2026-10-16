'use client';
import {vitamins} from '../data/shop';
import {moveInfo} from '../data/move-info';
import {itemName} from '../data/held-items';
import {pokemonName} from '../data/pokemon-catalog';
import {useLayoutEffect,useRef,useState} from 'react';
import type {RewardEntry,RewardResult,RewardSelection} from '../data/rewards';
import {selectGameCursor} from './game-keyboard';
import styles from './styles/reward-panel.module.css';

export function rewardEntryText(entry:RewardEntry):string {
 switch(entry.kind){
  case 'pokemon-enhancement':return `${pokemonName(entry.species)} · ${entry.mode==='shiny'?'이로치 획득':entry.mode==='six-iv'?'6V 완성':'선택한 능력치 V 강화'}`;
  case 'growth-points':return `+ 성장 포인트 ${entry.amount.toLocaleString()}P`;
  case 'vitamin':return `+ ${vitamins[entry.stat].name} ${entry.amount}개 · 출전 준비에서 사용`;
  case 'machine':return `+ 기술머신 ${moveInfo[entry.move]?.name??entry.move} · 출전 준비에서 사용`;
  case 'item-exchange':return '+ 에픽 지닌 도구 교환권 1장 · 출전 준비에서 사용';
  case 'trainer-equipment':return `+ ${itemName(entry.item)}`;
  case 'typed-egg-ticket':return `+ ${entry.eggKind==='superRare'?'슈퍼레어':'이로치'} 알 티켓 ${entry.amount}장 · 알 뽑기에서 사용`;
  case 'coins':return `+ 타워 코인 ${entry.amount.toLocaleString()}`;
  case 'egg-ticket':return `+ 알 뽑기권 ${entry.amount.toLocaleString()}장`;
  case 'coin-loss':return `타워 코인 -${entry.percent}% · 실제 ${entry.amount.toLocaleString()}코인 손실`;
  case 'message':return entry.text;
 }
}

export type RewardPanelProps={result:RewardResult;busy:boolean;onConfirm:()=>void;heading?:string;onSelect?:(selectionId:string,candidateId:string)=>void};

export function RewardEntryList({entries}:{entries:readonly RewardEntry[]}){
 return <ul className={styles.entries} aria-label="결과 항목">{entries.map((entry,index)=><li key={index} data-reward-kind={entry.kind}><span className={styles.entryMark} aria-hidden="true">{entry.kind==='coin-loss'?'!':entry.kind==='message'?'·':'◆'}</span><span>{rewardEntryText(entry)}</span></li>)}</ul>;
}

export function RewardChoiceList({selections,busy,onSelect}:{selections:readonly RewardSelection[];busy:boolean;onSelect?:RewardPanelProps['onSelect']}){
 const [expanded,setExpanded]=useState<string|null>(()=>selections.find(selection=>selection.expanded)?.id??null);
 const [target,setTarget]=useState<Record<string,string>>({});
 return <div className={styles.selections}>{selections.map(selection=><section key={selection.id} className={styles.selection} aria-label={selection.title} data-selection-state={selection.state}>
  <h3>{selection.title}</h3>
  {selection.state==='selected'?<p>{selection.candidates.find(candidate=>candidate.id===selection.selectedId)?.label??selection.selectedId} · 선택 완료</p>:<>
   <button className={styles.choice} disabled={busy||!onSelect} aria-expanded={expanded===selection.id} onClick={()=>setExpanded(expanded===selection.id?null:selection.id)}>{onSelect?'선택하기 >':'선택 기능 준비 중'}</button>
   {expanded===selection.id&&<div className={styles.candidates} data-keyboard-list>{selection.targetMode==='one-iv'&&!target[selection.id]?[...new Set(selection.candidates.map(c=>c.species!))].map(species=><button className={styles.choice} key={species} disabled={busy} onClick={()=>setTarget({...target,[selection.id]:species})}>{pokemonName(species)}</button>):<>
    {selection.targetMode==='one-iv'&&<><p>V로 만들 능력치를 선택하세요.</p><button className={styles.choice} disabled={busy} onClick={()=>setTarget({...target,[selection.id]:''})}>포켓몬 다시 선택</button></>}
    {selection.candidates.filter(c=>selection.targetMode!=='one-iv'||c.species===target[selection.id]).map(candidate=><button key={candidate.id} className={styles.choice} disabled={busy} onClick={()=>onSelect?.(selection.id,candidate.id)}>{candidate.label}{candidate.description&&<small>{candidate.description}</small>}</button>)}
   </>}</div>}
  </>}
 </section>)}</div>;
}

// Presentation only: selections are controlled by the caller/server. No wallet
// changes or local "claimed" state happen when these buttons are clicked.
export function RewardPanel({result,busy,onConfirm,heading,onSelect}:RewardPanelProps){
 const ref=useRef<HTMLButtonElement>(null);
 const pending=result.selections?.some(selection=>selection.state==='pending')??false;
 useLayoutEffect(()=>{selectGameCursor(pending?ref.current?.closest('[data-testid="reward-panel"]')?.querySelector<HTMLButtonElement>('button:not(:disabled)'):ref.current);},[result,busy]);
 return <div className={`${styles.scope} ${styles.panel} reward-panel`} data-reward-tone={result.tone} data-testid="reward-panel">
  <header className={styles.heading}>{heading??(result.tone==='good'||result.tone==='great'?'보상':'결과')}</header>
  <div className={styles.contents}>
   <div className={styles.emblem} aria-hidden="true">{result.tone==='great'?'✦':result.tone==='loss'?'!':result.tone==='good'?'◆':'◇'}</div>
   <h2 className={styles.title}>{result.title}</h2>
   <RewardEntryList entries={result.entries}/>
   {result.selections&&<RewardChoiceList selections={result.selections} busy={busy} onSelect={onSelect}/>}
  </div>
  <div className={styles.actions} role="group" aria-label="보상 확인">
   {pending&&<p className={styles.pending}>보상을 선택한 뒤 확인할 수 있습니다.</p>}
   <button ref={ref} data-initial-focus className={styles.confirm} disabled={busy||pending} onClick={onConfirm}><span className={styles.pointer} aria-hidden="true">{'>'}</span>{busy?'잠시만요…':'확인'}</button>
  </div>
 </div>;
}
