import type {CSSProperties} from 'react';
import {TypeSymbol} from './type-badge';
import {teraColors} from '../data/tera';
// Original faceted artwork; battle controls add a familiar type symbol for recognition.
export function TeraCrystal({type,className='',showType=false}:{type:string;className?:string;showType?:boolean}){
 return <svg className={`tera-crystal ${className}`} style={{'--tera-color':teraColors[type] ?? '#a8a6b5'} as CSSProperties} viewBox="0 0 64 72" aria-hidden="true">
  <path fill="var(--tera-color)" stroke="#eeffff" strokeWidth="1.7" d="m32 4 8 14 13-8-2 21 9 13-28 24L4 44l9-13-2-21 13 8Z"/>
  <path fill="#fff" opacity=".7" d="m32 4-8 14 8 14 8-14Z M13 31 4 44l18 1 10-13Z M51 31 60 44l-18 1-10-13Z"/>
  <path fill="#10273e" opacity=".35" d="m22 45 10 23 10-23-10-13Z M11 10l2 21 11-13Z M53 10l-2 21-11-13Z"/>
  <path fill="none" stroke="#fff" strokeWidth="1.2" opacity=".75" d="m13 31 19 1 19-1M4 44l18 1 10-13 10 13 18-1M22 45l10 23 10-23"/>
  {showType ? <g data-tera-symbol={type}><circle cx="32" cy="32" r="16" fill="#171528" opacity=".8" stroke="#ffffff99" strokeWidth="1"/><g transform="translate(19 19) scale(1.08)" style={{color:'#fff'}}><TypeSymbol type={type}/></g></g> : <path fill="#fff" d="m32 21 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z"/>}
 </svg>;
}
