'use client';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {RewardRevealPresentation} from './event-presentation';
import {RewardChest} from './reward-chest';
import {useDialogControls} from './game-menu-context';
import type {RewardResult} from '../data/rewards';
import {selectGameCursor} from './game-keyboard';
import {RewardPanel,type RewardPanelProps} from './reward-panel';
import styles from './styles/reward-panel.module.css';

export const rewardRevealDelay=650;

// A real top-layer dialog keeps all background controls inert, including those
// outside the battle panel. The game keyboard already scopes to open dialogs.
export function RewardModal({result,reveal,...props}:RewardPanelProps & {result:RewardResult;reveal?:RewardRevealPresentation}){
 const [phase,setPhase]=useState<'discovery'|'opening'|'reward'>(reveal?'discovery':'reward');
 useEffect(()=>{if(phase!=='opening')return;const timer=setTimeout(()=>setPhase('reward'),rewardRevealDelay);return()=>clearTimeout(timer);},[phase]);
 useDialogControls('event-reward',[...(result.selections?.some(selection=>selection.state==='pending')?[{key:'방향키',label:'선택'}]:[]),{key:'Enter / Z',label:'받기'}]);
 const ref=useRef<HTMLDialogElement>(null);
 useLayoutEffect(()=>{
  const dialog=ref.current;if(!dialog)return;
  const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
  dialog.showModal();
  const button=dialog.querySelector<HTMLButtonElement>('[data-initial-focus]:not(:disabled)')??dialog.querySelector<HTMLButtonElement>('button:not(:disabled)');
  button?.focus({preventScroll:true});selectGameCursor(button);
  return()=>{dialog.close();if(previous?.isConnected)previous.focus({preventScroll:true});};
 },[phase]);
 return <dialog ref={ref} className={`${styles.scope} ${styles.modal}`} data-testid="reward-modal" aria-label={props.heading??(result.tone==='good'||result.tone==='great'?'보상':'결과')} onCancel={event=>{event.preventDefault();event.stopPropagation();}} onKeyDown={event=>{
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();}
  if(event.key==='Tab'){
   event.preventDefault();event.stopPropagation();document.body.dataset.gameInput='native';
   const buttons=Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')??[]).filter(button=>button.getClientRects().length>0);
   const current=buttons.indexOf(document.activeElement as HTMLButtonElement);
   const next=buttons[current<0?(event.shiftKey?buttons.length-1:0):(current+(event.shiftKey?-1:1)+buttons.length)%buttons.length];
   next?.focus({preventScroll:true});selectGameCursor(next);
  }
  // Use the game's cursor when available, and consume Space so a native click
  // cannot confirm twice or activate a background shortcut.
  if(event.key===' '){
   event.preventDefault();event.stopPropagation();
   if(!event.repeat){
    const cursor=ref.current?.querySelector<HTMLButtonElement>('button[data-game-cursor=true]:not(:disabled)');
    const focused=document.activeElement instanceof HTMLButtonElement&&ref.current?.contains(document.activeElement)?document.activeElement:null;
    (cursor??focused)?.click();
   }
  }
 }}>
  {phase==='reward'?<RewardPanel result={result} {...props}/>:<div className={styles.reveal} data-testid="reward-reveal" data-reveal-phase={phase}>
   <p role="status">{phase==='opening'?'빛이 새어 나오고 있다...':reveal?.message}</p>
   <div className={styles.revealObject} data-opened={phase==='opening'} aria-hidden="true">{reveal?.object==='chest'?<RewardChest/>:<span>{reveal?.object==='sparkle'?'✧':reveal?.object==='drop'?'◆':'✦'}</span>}</div>
   <button data-initial-focus disabled={props.busy||phase==='opening'} onClick={()=>setPhase('opening')}>{phase==='opening'?'확인하는 중…':reveal?.action}</button>
  </div>}
 </dialog>;
}
