'use client';
import {useState} from 'react';
import {moveTypeNames} from '../data/move-info';
import {TypeSymbol} from './type-badge';
import styles from './styles/tm-icon.module.css';

const tmTypes=new Set(['Normal','Fire','Water','Electric','Grass','Ice','Fighting','Poison','Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy']);
export function tmIconPath(type:string){return tmTypes.has(type)?`/assets/items/tm/${type.toLowerCase()}.png`:undefined;}

/** Missing user-supplied artwork falls back to the shared type symbol. */
export function TmIcon({type,size='list'}:{type:string;size?:'list'|'detail'}){
 const src=tmIconPath(type),[failed,setFailed]=useState<string>(),missing=!src||failed===src,pixels=size==='detail'?64:28;
 return <span className={styles.scope} data-size={size} data-tm-type={type} data-missing={missing} role="img" aria-label={`${moveTypeNames[type]??type} 기술머신`}>
  {src&&<img src={src} alt="" aria-hidden="true" width={pixels} height={pixels} hidden={missing} onError={()=>setFailed(src)}/>}
  {missing&&<TypeSymbol type={type}/>}
 </span>;
}
