'use client';
import {useEffect,useRef} from 'react';
import styles from './styles/reading-description.module.css';

// Manual reading always takes priority; short descriptions never move.
export function ReadingDescription({text}:{text:string}){
 const ref=useRef<HTMLParagraphElement>(null),paused=useRef(false),manualUntil=useRef(0);
 useEffect(()=>{
  const node=ref.current;if(!node)return;
  node.scrollTop=0;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0,last=performance.now(),holdUntil=last+1800,atEnd=false,position=0;
  const resize=new ResizeObserver(()=>{node.scrollTop=0;holdUntil=performance.now()+1800;atEnd=false;position=0;});resize.observe(node);
  const tick=(now:number)=>{
   const delta=Math.min(now-last,50);last=now;
   const maximum=node.scrollHeight-node.clientHeight;
   if(maximum>1&&!reduced.matches&&!paused.current&&now>manualUntil.current&&now>holdUntil){
    if(atEnd){node.scrollTop=0;position=0;atEnd=false;holdUntil=now+1800;}
    else {position=Math.min(maximum,position+delta*.018);node.scrollTop=position;if(node.scrollTop>=maximum-1){atEnd=true;holdUntil=now+2400;}}
   }else if(paused.current||now<manualUntil.current){holdUntil=now+1500;position=node.scrollTop;}
   frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);
  return()=>{cancelAnimationFrame(frame);resize.disconnect();};
 },[text]);
 return <p ref={ref} className={`${styles.scope} ${styles.description}`} tabIndex={0} aria-label="기술 설명" onPointerEnter={()=>{paused.current=true;}} onPointerLeave={()=>{paused.current=document.activeElement===ref.current;}} onFocus={()=>{paused.current=true;}} onBlur={()=>{paused.current=ref.current?.matches(':hover')??false;}} onWheel={()=>{manualUntil.current=performance.now()+4000;}} onTouchStart={()=>{manualUntil.current=performance.now()+4000;}}>{text}</p>;
}
