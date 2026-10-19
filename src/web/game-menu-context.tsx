'use client';
import {createContext,useContext,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {GameMenuFooter,menuControls,type GameControl} from './game-menu';
import styles from './styles/game-menu-context.module.css';

type Layer={id:symbol;context:string;controls:GameControl[]};
const Context=createContext<{layers:Layer[];register:(layer:Layer)=>()=>void}|null>(null);

/** Optional screen owner: dialogs publish help instead of creating another footer. */
export function GameMenuProvider({children}:{children:ReactNode}){
 const [layers,setLayers]=useState<Layer[]>([]);
 const register=useMemo(()=> (layer:Layer)=>{setLayers(current=>[...current,layer]);return()=>setLayers(current=>current.filter(item=>item.id!==layer.id));},[]);
 return <Context.Provider value={useMemo(()=>({layers,register}),[layers,register])}>{children}</Context.Provider>;
}
export function useManagedGameMenu(){return useContext(Context)!==null;}
export function useDialogControls(context:string,controls:GameControl[]=menuControls){
 const owner=useContext(Context),register=owner?.register;
 const signature=JSON.stringify(controls);
 useEffect(()=>register?.({id:Symbol(context),context,controls:JSON.parse(signature)}),[register,context,signature]);
}

/** The existing screen footer stays in one place, even above native modal backdrops. */
export function GameMenuBar({controls,children}:{controls:GameControl[];children?:ReactNode}){
 const owner=useContext(Context),active=owner?.layers.at(-1),ref=useRef<HTMLElement>(null);
 useEffect(()=>{
  const frame=requestAnimationFrame(()=>{const footer=ref.current;if(!footer)return;if(footer.matches(':popover-open'))footer.hidePopover();if(active)footer.showPopover();});
  return()=>cancelAnimationFrame(frame);
 },[active]);
 return <><div className={styles.space} aria-hidden/><footer ref={ref} popover="manual" className={`dex-bottom ${styles.scope}`} data-menu-context={active?.context??'dex'}>{!active&&children}<GameMenuFooter outlet controls={active?.controls??controls}/></footer></>;
}
