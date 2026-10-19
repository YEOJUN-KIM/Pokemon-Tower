'use client';
import {useEffect,useRef,type ComponentProps,type ReactNode} from 'react';
import {useManagedGameMenu} from './game-menu-context';

export type GameControl={key:string;label:string};
export const menuControls:GameControl[]=[{key:'방향키',label:'이동'},{key:'Enter / Z',label:'결정'},{key:'X',label:'뒤로'}];

/** Shared geometry; buttons retain native semantics and the existing game cursor. */
export function GameChoice({className='',...props}:ComponentProps<'button'>){
 return <button type="button" {...props} className={`game-choice ${className}`}/>;
}
export function GameChoiceList({className='',grid=false,...props}:ComponentProps<'div'>&{grid?:boolean}){
 return <div {...props} className={`game-choice-list ${grid?'game-choice-grid':''} ${className}`} data-keyboard-list={!grid||undefined} data-keyboard-grid={grid||undefined}/>;
}
/** Left/right keyboard and pad input use the same adjustment as the row's two halves. */
export function GameAdjustRow({onAdjust,children,...props}:Omit<ComponentProps<'button'>,'onClick'>&{onAdjust:(delta:number)=>void}){
 const ref=useRef<HTMLButtonElement>(null);
 useEffect(()=>{const row=ref.current;const adjust=(event:Event)=>onAdjust((event as CustomEvent<number>).detail);row?.addEventListener('game-adjust',adjust);return()=>row?.removeEventListener('game-adjust',adjust);},[onAdjust]);
 return <button type="button" {...props} ref={ref} data-adjustable onClick={event=>{const box=event.currentTarget.getBoundingClientRect();onAdjust(event.detail===0||event.clientX>=box.left+box.width/2?1:-1);}}>{children}</button>;
}
export function GameMenuFooter({controls=menuControls,hidden=false,className='',outlet=false}:{controls?:GameControl[];hidden?:boolean;className?:string;outlet?:boolean}){
 const managed=useManagedGameMenu();
 if(hidden||(managed&&!outlet))return null;
 return <div className={`game-menu-footer ${className}`} role="note" aria-label="조작 안내">{controls.map(control=><span key={control.key}><kbd>{control.key}</kbd>{control.label}</span>)}</div>;
}
export function GameStatus({children,className=''}:{children:ReactNode;className?:string}){
 return <span className={`game-status ${className}`}>{children}</span>;
}
export function GamePrice({amount,unit='코인'}:{amount:number;unit?:string}){
 return <span className="game-price" aria-label={`가격 ${amount.toLocaleString()}${unit}`}>{amount.toLocaleString()}<small>{unit}</small></span>;
}
