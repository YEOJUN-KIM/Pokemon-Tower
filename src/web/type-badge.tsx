import type {CSSProperties} from 'react';
import {moveTypeNames} from '../data/move-info';
import {teraNames} from '../data/tera';

// Small local symbols, shared by battle and move detail screens.
const styles:Record<string,[string,string]>={
  Normal:['#a8a8a0','M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16 M8 12h8'],
  Fire:['#f58a42','M13 2c2 6-3 6-1 10 2-1 3-3 3-5 5 5 6 13-3 15C3 20 4 12 8 8c0 4 1 5 2 5-2-5 3-7 3-11Z'],
  Water:['#67a8f2','M12 2C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-13Z M8 15c0 2 1 3 3 3'],
  Electric:['#f3cd3c','M14 2 5 14h6l-1 8 9-13h-6l1-7Z'],
  Grass:['#88c857','M20 3C7 3 3 8 5 16c8 6 15-1 15-13Z M4 21 16 9 M9 16v-5'],
  Ice:['#79d7d5','M12 2v20 M3 7l18 10 M3 17 21 7 M9 4l3 3 3-3 M9 20l3-3 3 3'],
  Fighting:['#e57b55','M5 12V6h4v6-8h4v8-6h4v7h3v7l-4 3H8l-4-7v-4h4'],
  Poison:['#c789da','M7 14C2 8 7 3 12 3s10 5 5 11v6H7v-6Z M9 10h1 M14 10h1 M10 17h4'],
  Ground:['#d9ac69','M2 19 8 8l4 6 4-11 6 16H2Z M3 22h18'],
  Flying:['#a9b8f5','M3 18C3 6 11 3 22 3l-6 6h-5l7 1-5 5H8l5 2-5 4H3v-3Z'],
  Psychic:['#f580a1','M20 12a8 8 0 1 0-8 8 M12 16a4 4 0 1 1 4-4 M12 12h1'],
  Bug:['#b2c54d','M8 8h8v9a4 4 0 0 1-8 0V8Z M9 8V5h6v3 M8 11 3 8 M16 11l5-3 M8 16H2 M16 16h6 M9 5 7 2 M15 5l2-3'],
  Rock:['#cbb77c','M7 4h10l5 9-4 8H6l-4-8 5-9Z M7 4l5 9 10 0 M12 13l-6 8 M12 13l6 8'],
  Ghost:['#a292cd','M4 21V11a8 8 0 0 1 16 0v10l-4-3-4 3-4-3-4 3Z M8 10h1 M15 10h1'],
  Dragon:['#8f9cf5','M4 19 8 10l-3-4 7 1 5-5 3 7-7 5 5 7-7-3-7 1Z M14 8h1'],
  Dark:['#a99a96','M15 3a9 9 0 1 0 6 13C10 20 6 9 15 3Z'],
  Steel:['#b2c9d2','M7 3h10l5 9-5 9H7l-5-9 5-9Z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8'],
  Fairy:['#f3aed8','M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z'],
  Stellar:['#a8f4f0','M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z'],
};
export function TypeSymbol({type,className=''}:{type:string;className?:string}){
 const [,path]=styles[type] ?? styles.Normal;
 return <svg className={className} width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={path}/></svg>;
}
export function TypeBadge({type}:{type:string}){
  const [color]=styles[type] ?? styles.Normal;
  return <span className="move-type-badge" data-type={type} style={{'--type-accent':color} as CSSProperties}><TypeSymbol type={type}/><span>{moveTypeNames[type] ?? teraNames[type] ?? type}</span></span>;
}
