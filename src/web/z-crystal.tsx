import {teraColors} from '../data/tera';
import {TypeSymbol} from './type-badge';

// Faceted rhombus and type mark, based on the official Sun/Moon reference.
export function ZCrystal({type='Normal'}:{type?:string}){
 const color=teraColors[type] ?? '#e8d795';
 return <svg className="z-crystal" viewBox="0 0 64 80" aria-hidden="true">
  <path d="M49 3 57 49 15 77 7 31Z" fill={color} stroke="#fff3d0" strokeWidth="2"/>
  <path d="m49 3-9 25-24 40-1 9 42-28Z" fill="#182035" opacity=".24"/>
  <path d="M49 3 7 31l10 7 23-10Z" fill="#fff" opacity=".65"/>
  <path d="m7 31 8 46 2-39 23-10Z" fill="#fff" opacity=".18"/>
  <path d="m15 77 2-39 23-10 17 21" stroke="#fff" fill="none" opacity=".55"/>
  <g transform="translate(20 27)" style={{color:'#253045'}}><TypeSymbol type={type}/></g>
 </svg>;
}
