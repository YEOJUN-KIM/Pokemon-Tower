'use client';
import {useRef} from 'react';
import {eggKindInfo,type EggKind} from '../data/egg-kinds';
import type {PermanentView} from '../data/permanent-upgrades';
import {GameChoice} from './game-menu';
import {useGameKeyboard} from './game-keyboard';
import styles from './styles/egg-station-menu.module.css';

const padShortcuts=[[3,'y']] as const;
export const eggMenuControls=[{key:'← →',label:'이동'},{key:'Enter / Z',label:'결정'},{key:'X',label:'돌아가기'}];

export function EggStationMenu({permanent,points,blocked,spinning,dispensedKind,unitPrice,hatchCost,hatchLabel,onHatch,onRewardHatch,onOdds}:{
 permanent:PermanentView;points:number;blocked:boolean;spinning:boolean;dispensedKind:EggKind|null;unitPrice:number;
 hatchCost:(count:number)=>number;hatchLabel:(count:number)=>string;onHatch:(count:1|10)=>void;onRewardHatch:(kind:'superRare'|'shiny')=>void;onOdds:()=>void;
}){
 const root=useRef<HTMLElement>(null);
 useGameKeyboard('.egg-game-screen button:not([data-egg-utility])',2,true,(event,cursor,select)=>{
  const key=event.key.toLowerCase();
  if(key==='x'){event.preventDefault();if(!spinning)window.location.href='/';return true;}
  if(blocked){if(cursor?.closest('[role=alert]')&&['z','enter'].includes(key))return false;if(event.key.startsWith('Arrow')||['z','enter','y','a'].includes(key)){event.preventDefault();return true;}return false;}
  if(key==='y'||key==='a'){event.preventDefault();onOdds();return true;}
  if(!event.key.startsWith('Arrow')||!cursor)return false;
  event.preventDefault();
  const draws=Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[data-egg-draw]:not(:disabled)')??[]);
  const rewards=Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[data-egg-reward]:not(:disabled)')??[]);
  const items=cursor.matches('[data-egg-reward]')?rewards:draws,index=items.indexOf(cursor);
  let next:HTMLButtonElement|undefined;
  if(key==='arrowleft'||key==='arrowright')next=items[index+(key==='arrowright'?1:-1)];
  else if(key==='arrowdown'&&draws.includes(cursor))next=rewards[Math.min(index,rewards.length-1)];
  else if(key==='arrowup'&&rewards.includes(cursor))next=draws[Math.min(index,draws.length-1)];
  if(next){select(next);next.focus({preventScroll:true});}
  return true;
 },undefined,padShortcuts);
 return <section ref={root} className={`egg-station ${styles.station} ${spinning?'is-spinning':''}`} aria-label="알 뽑기 메뉴" aria-busy={spinning}>
  <div className={styles.machineSide}>
   <div className={`egg-machine ${styles.machine}`} aria-label="알 뽑기 기계" aria-busy={spinning}>
    <img className="egg-machine-art" src="/sprites/eggs/machine.png" alt="" width={1122} height={1402}/>
    {dispensedKind&&<span className="egg-machine-output" data-testid="dispensed-egg" data-egg-kind={dispensedKind}><img src={eggKindInfo[dispensedKind].image} alt=""/></span>}
   </div>
   {spinning&&<span className={styles.spinning} role="status">알을 뽑고 있어요…</span>}
  </div>
  <p className={styles.priceInfo}>뽑기권 {permanent.eggTickets}장 · 1회 {unitPrice.toLocaleString()}P</p>
  <div className={styles.draws}>{([1,10] as const).map(count=><GameChoice key={count} data-egg-draw={count} aria-label={hatchLabel(count)} disabled={blocked||points<hatchCost(count)} onClick={()=>onHatch(count)}><strong>{count}회 뽑기</strong><span>{hatchLabel(count).split(' · ')[1]}</span></GameChoice>)}</div>
  <div className={styles.rewards} aria-label="보상 알 티켓">{(['superRare','shiny'] as const).filter(kind=>(permanent.rewardEggTickets?.[kind]??0)>0).map(kind=><GameChoice key={kind} data-egg-reward disabled={blocked} onClick={()=>onRewardHatch(kind)}>{eggKindInfo[kind].name} 티켓 · {permanent.rewardEggTickets?.[kind]}장 · 1개 부화</GameChoice>)}</div>
 </section>;
}
