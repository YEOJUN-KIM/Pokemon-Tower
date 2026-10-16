'use client';
import {useEffect,useRef} from 'react';
import type {RewardResult} from '../data/rewards';
import {selectGameCursor} from './game-keyboard';
import {RewardPanel,type RewardPanelProps} from './reward-panel';
import styles from './styles/reward-panel.module.css';

export const rewardRevealDelay=650;

// A real top-layer dialog keeps all background controls inert, including those
// outside the battle panel. The game keyboard already scopes to open dialogs.
export function RewardModal({result,...props}:RewardPanelProps & {result:RewardResult}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{
  const dialog=ref.current;if(!dialog)return;
  const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
  dialog.showModal();
  const button=dialog.querySelector<HTMLButtonElement>('[data-initial-focus]:not(:disabled)')??dialog.querySelector<HTMLButtonElement>('button:not(:disabled)');
  button?.focus({preventScroll:true});selectGameCursor(button);
  return()=>{dialog.close();if(previous?.isConnected)previous.focus({preventScroll:true});};
 },[]);
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
  <RewardPanel result={result} {...props}/>
 </dialog>;
}
