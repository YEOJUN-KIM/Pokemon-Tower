'use client';
import {useLayoutEffect,useRef,type ReactNode} from 'react';
import styles from './styles/battle-messages.module.css';

/** One message confirmation owner for keyboard, gamepad and mouse input. */
export function GameDialogueConfirm({children,onConfirm,disabled=false,kind,label}:{children:ReactNode;onConfirm:()=>unknown;disabled?:boolean;kind:'intro'|'recruit'|'event';label:string}){
 const root=useRef<HTMLDivElement>(null);
 const locked=useRef(false),action=useRef({onConfirm,disabled});action.current={onConfirm,disabled};
 useLayoutEffect(()=>{if(!disabled)locked.current=false;},[disabled]);
 function confirm(){if(locked.current||action.current.disabled)return;const typing=root.current?.querySelector<HTMLElement>('[data-typing=true]');if(typing){typing.dispatchEvent(new Event('game-dialogue-reveal'));return;}locked.current=true;action.current.onConfirm();}
 const latest=useRef(confirm);latest.current=confirm;
 useLayoutEffect(()=>{
  const key=(event:KeyboardEvent)=>{if(document.querySelector('dialog[open]')||event.ctrlKey||event.altKey||event.metaKey||!['enter','z'].includes(event.key.toLowerCase()))return;event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)latest.current();};
  document.addEventListener('keydown',key,true);return()=>document.removeEventListener('keydown',key,true);
 },[]);
 return <div ref={root} data-dialogue-confirm className={styles.confirm} role="button" tabIndex={disabled?-1:0} aria-disabled={disabled||undefined} aria-label={label} data-intro-message={kind==='intro'||undefined} data-recruit-continue={kind==='recruit'||undefined} data-event-confirm={kind==='event'||undefined} onClick={()=>{if(window.getSelection()?.isCollapsed!==false)latest.current();}}>{children}</div>;
}
