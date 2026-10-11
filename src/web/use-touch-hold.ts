'use client';
import {useEffect,useRef,type PointerEvent,type MouseEvent} from 'react';

/** Scrolling cancels a hold. A held touch must never also activate a command. */
export function useTouchHold(onHold:(target:HTMLElement)=>void,onRelease:()=>void=()=>{}){
  const callback=useRef({onHold,onRelease});callback.current={onHold,onRelease};
  const held=useRef(false);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const start=useRef({x:0,y:0,id:0});
  const suppressUntil=useRef(0);
  const cancel=()=>{if(timer.current!==null)clearTimeout(timer.current);timer.current=null;};
  const release=()=>{cancel();if(held.current){held.current=false;suppressUntil.current=Date.now()+1000;callback.current.onRelease();}};
  useEffect(()=>{
    const end=(event:globalThis.PointerEvent)=>{if(event.pointerId===start.current.id)release();};
    const hidden=()=>{if(document.hidden)release();};
    window.addEventListener('pointerup',end,true);window.addEventListener('pointercancel',end,true);window.addEventListener('blur',release);document.addEventListener('visibilitychange',hidden);
    return ()=>{cancel();window.removeEventListener('pointerup',end,true);window.removeEventListener('pointercancel',end,true);window.removeEventListener('blur',release);document.removeEventListener('visibilitychange',hidden);};
  },[]);
  return {
    onPointerDown:(event:PointerEvent<HTMLElement>)=>{
      if(event.pointerType!=='touch'||!event.isPrimary||!window.matchMedia('(max-width:760px)').matches)return;
      cancel();start.current={x:event.clientX,y:event.clientY,id:event.pointerId};
      const target=event.currentTarget;
      timer.current=setTimeout(()=>{timer.current=null;held.current=true;suppressUntil.current=Infinity;callback.current.onHold(target);},450);
    },
    onPointerMove:(event:PointerEvent<HTMLElement>)=>{if(event.pointerId===start.current.id&&Math.hypot(event.clientX-start.current.x,event.clientY-start.current.y)>12)cancel();},
    onPointerUp:release,
    onPointerCancel:release,
    onLostPointerCapture:release,
    onClickCapture:(event:MouseEvent<HTMLElement>)=>{if(Date.now()<suppressUntil.current){event.preventDefault();event.stopPropagation();suppressUntil.current=0;}},
    onContextMenu:(event:MouseEvent<HTMLElement>)=>{if(window.matchMedia('(max-width:760px)').matches)event.preventDefault();},
  };
}
