'use client';
import {useLayoutEffect,useRef} from 'react';
import type {RewardEntry,RewardResult} from '../data/rewards';
import {GameDialogue} from './game-dialogue';
import {selectGameCursor} from './game-keyboard';
import styles from './styles/reward-panel.module.css';

export function rewardEntryText(entry:RewardEntry):string {
 switch(entry.kind){
  case 'coins':return `+ 타워 코인 ${entry.amount.toLocaleString()}`;
  case 'egg-ticket':return `+ 알 뽑기권 ${entry.amount.toLocaleString()}장`;
  case 'coin-loss':return `타워 코인 -${entry.percent}% · 실제 ${entry.amount.toLocaleString()}코인 손실`;
  case 'message':return entry.text;
 }
}

// Displays an already committed result; confirmation never grants its entries.
export function RewardPanel({result,busy,onConfirm,dialogueLabel='보상 안내'}:{result:RewardResult;busy:boolean;onConfirm:()=>void;dialogueLabel?:string}){
 const ref=useRef<HTMLButtonElement>(null);
 useLayoutEffect(()=>{selectGameCursor(ref.current);},[result,busy]);
 return <div className={`${styles.scope} ${styles.panel} reward-panel`} data-reward-tone={result.tone} data-testid="reward-panel">
  <GameDialogue text={result.title} label={dialogueLabel}/>
  <ul className={styles.entries} aria-label="결과 항목">{result.entries.map((entry,index)=><li key={index} data-reward-kind={entry.kind}>{rewardEntryText(entry)}</li>)}</ul>
  <div className={`${styles.actions} event-choices`} data-keyboard-list>
   <button ref={ref} className={styles.confirm} disabled={busy} onClick={onConfirm}><span className={styles.pointer} aria-hidden="true">{'>'}</span>{busy?'잠시만요…':'확인'}</button>
  </div>
 </div>;
}
