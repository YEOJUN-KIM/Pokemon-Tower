'use client';
import {useId} from 'react';
import styles from './styles/player-mirror-portrait.module.css';

export function PlayerMirrorPortrait({className=''}:{className?:string}){
 const shadow=`mirror-face-${useId().replaceAll(':','')}`;
 return <span className={`${styles.scope} ${styles.portrait} ${className}`} role="img" aria-label="모자 아래 얼굴에 그늘이 진 트레이너" data-player-mirror-portrait>
  <svg viewBox="0 0 96 144" width="100%" height="100%" aria-hidden="true">
   <defs><linearGradient id={shadow} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#111e2b" stopOpacity=".8"/><stop offset=".65" stopColor="#172735" stopOpacity=".55"/><stop offset="1" stopColor="#203340" stopOpacity=".12"/></linearGradient></defs>
   <image href="/sprites/trainers/player-front.png" width="96" height="144"/>
   <path d="M38 40 56 39 56 45 52 49 45 50 38 46Z" fill={`url(#${shadow})`} data-mirror-face-shadow/>
  </svg>
 </span>;
}
