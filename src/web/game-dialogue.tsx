'use client';
import {useLayoutEffect,useRef,useState} from 'react';
import styles from './styles/game-dialogue.module.css';

// Text presentation only: it never delays or advances the parent game sequence.
export function GameDialogue({text,messageKey,animated=true,label='현재 배틀 상황',tone='normal'}:{text:string;messageKey?:string;animated?:boolean;label?:string;tone?:'normal'|'critical'}){
 return <DialogueText key={JSON.stringify([messageKey??label,text,animated])} messageKey={messageKey??label} text={text} animated={animated} label={label} tone={tone}/>;
}

function DialogueText({text,messageKey,animated,label,tone}:{text:string;messageKey:string;animated:boolean;label:string;tone:'normal'|'critical'}){
 const root=useRef<HTMLDivElement>(null);
 const characters=Array.from(text);
 const [progress,setProgress]=useState({text,count:animated?0:characters.length});
 useLayoutEffect(()=>{
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0,cancelled=false;
  const reveal=()=>{cancelled=true;cancelAnimationFrame(frame);setProgress({text,count:characters.length});};
  if(!animated||media.matches){reveal();return;}
  setProgress({text,count:0});
  const duration=Math.min(420,characters.length*18);
  let start:number|undefined;
  function tick(now:number){
   if(cancelled)return;
   // RAF reports the frame's start, which can precede this layout effect's performance.now().
   // A negative slice end would expose almost the whole sentence before the next frame.
   start??=now;
   const count=Math.max(0,Math.min(characters.length,Math.floor((now-start)/Math.max(1,duration)*characters.length)));
   setProgress(current=>current.text===text&&current.count===count?current:{text,count});
   if(count<characters.length)frame=requestAnimationFrame(tick);
  }
  frame=requestAnimationFrame(tick);
  const node=root.current;
  node?.addEventListener('game-dialogue-reveal',reveal);
  const key=(event:KeyboardEvent)=>{if(node?.closest('[data-dialogue-confirm]')||document.querySelector('dialog[open]')||node?.dataset.typing!=='true'||event.repeat||event.ctrlKey||event.altKey||event.metaKey||!['z','enter'].includes(event.key.toLowerCase()))return;event.preventDefault();event.stopImmediatePropagation();reveal();};
  document.addEventListener('keydown',key,true);
  const onMotionChange=()=>{if(media.matches)reveal();};media.addEventListener('change',onMotionChange);
  return()=>{node?.removeEventListener('game-dialogue-reveal',reveal);document.removeEventListener('keydown',key,true);cancelled=true;cancelAnimationFrame(frame);media.removeEventListener('change',onMotionChange);};
 },[text,animated]);
 const count=progress.text===text?progress.count:0,typing=count<characters.length;
 return <div ref={root} onClick={()=>{if(root.current?.dataset.typing==='true'&&!root.current.closest('[data-dialogue-confirm]'))root.current.dispatchEvent(new Event('game-dialogue-reveal'));}} className={`current-messages game-dialogue ${styles.scope} ${styles.dialogue}`} data-message-key={messageKey} data-tone={tone} data-typing={typing} role="log" aria-label={label} aria-live={typing?'off':'polite'} aria-atomic="true">
  <p className={`latest ${styles.text}`}><span data-dialogue-text>{characters.slice(0,count).join('')}</span></p>
  <span className={styles.caret} aria-hidden="true">{typing?'▍':'▾'}</span>
 </div>;
}
