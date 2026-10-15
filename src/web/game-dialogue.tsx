'use client';
import {useEffect,useState} from 'react';
import styles from './styles/game-dialogue.module.css';

// Text presentation only: it never delays or advances the parent game sequence.
export function GameDialogue({text,animated=true,label='현재 배틀 상황',tone='normal'}:{text:string;animated?:boolean;label?:string;tone?:'normal'|'critical'}){
 const characters=Array.from(text);
 const [progress,setProgress]=useState({text,count:animated?0:characters.length});
 useEffect(()=>{
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0,cancelled=false;
  const reveal=()=>{cancelled=true;cancelAnimationFrame(frame);setProgress({text,count:characters.length});};
  if(!animated||media.matches){reveal();return;}
  setProgress({text,count:0});
  const start=performance.now(),duration=Math.min(420,characters.length*18);
  function tick(now:number){
   if(cancelled)return;
   const count=Math.min(characters.length,Math.floor((now-start)/Math.max(1,duration)*characters.length));
   setProgress(current=>current.text===text&&current.count===count?current:{text,count});
   if(count<characters.length)frame=requestAnimationFrame(tick);
  }
  frame=requestAnimationFrame(tick);
  const onMotionChange=()=>{if(media.matches)reveal();};media.addEventListener('change',onMotionChange);
  return()=>{cancelled=true;cancelAnimationFrame(frame);media.removeEventListener('change',onMotionChange);};
 },[text,animated]);
 const count=progress.text===text?progress.count:0,typing=count<characters.length;
 return <div className={`current-messages game-dialogue ${styles.scope} ${styles.dialogue}`} data-tone={tone} data-typing={typing} role="log" aria-label={label} aria-live="polite" aria-atomic="true">
  <span className={styles.accessible}>{text}</span>
  <p className={`latest ${styles.text}`} data-full-text={text} aria-hidden="true"><span data-dialogue-text>{characters.slice(0,count).join('')}</span></p>
  <span className={styles.caret} aria-hidden="true">{typing?'▍':'▾'}</span>
 </div>;
}
