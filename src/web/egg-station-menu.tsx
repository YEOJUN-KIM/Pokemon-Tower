'use client';
import {useRef} from 'react';
import {towerThemes,type TowerTheme} from '../data/tower-themes';
import {teraTypes,teraNames,type TeraType} from '../data/tera';
import {eggMachineTuningRules,type EggMachineTuning} from '../data/egg-machine-tuning';
import {eggKindInfo,type EggKind} from '../data/egg-kinds';
import type {PermanentView} from '../data/permanent-upgrades';
import {GameChoice} from './game-menu';
import {selectGameCursor,useGameKeyboard} from './game-keyboard';
import styles from './styles/egg-station-menu.module.css';

type Category='none'|'region'|'type';
const categories=[{id:'none',name:'기본'},{id:'region',name:'지역'},{id:'type',name:'타입'}] as const;
const padShortcuts=[[3,'y']] as const;
const pokemonTypes=teraTypes.filter(type=>type!=='Stellar');
export const eggMenuControls=[{key:'↑ ↓ ← →',label:'이동'},{key:'Q / E · L / R',label:'탭'},{key:'Enter / Z',label:'결정'},{key:'X',label:'뒤로'}];

export function EggStationMenu({tuning,onTuning,permanent,points,blocked,spinning,dispensedKind,unitPrice,hatchCost,hatchLabel,onHatch,onRewardHatch,onOdds}:{
 tuning:EggMachineTuning;onTuning:(tuning:EggMachineTuning)=>void;permanent:PermanentView;points:number;blocked:boolean;spinning:boolean;dispensedKind:EggKind|null;unitPrice:number;
 hatchCost:(count:number)=>number;hatchLabel:(count:number)=>string;onHatch:(count:1|10)=>void;onRewardHatch:(kind:'superRare'|'shiny')=>void;onOdds:()=>void;
}){
 const root=useRef<HTMLElement>(null),remembered=useRef<{region:TowerTheme;pokemonType:TeraType}>({region:'kanto',pokemonType:'Normal'});
 const category:Category=tuning.kind==='region'?'region':tuning.kind==='type'?'type':'none';
 const targetId=tuning.kind==='region'?tuning.region:tuning.kind==='type'?tuning.pokemonType:'none';
 const targetName=tuning.kind==='region'?towerThemes[tuning.region].name:tuning.kind==='type'?teraNames[tuning.pokemonType]:'전체 · 기본 뽑기';
 const base=eggMachineTuningRules.focusWeight,bonus=Math.max(0,(permanent.eggFocusWeight??base)-base);
 function choose(next:EggMachineTuning){if(next.kind==='region')remembered.current.region=next.region;if(next.kind==='type')remembered.current.pokemonType=next.pokemonType;onTuning(next);}
 function changeTab(next:Category){
  choose(next==='region'?{kind:'region',region:remembered.current.region}:next==='type'?{kind:'type',pokemonType:remembered.current.pokemonType}:{kind:'none'});
  requestAnimationFrame(()=>{const target=root.current?.querySelector<HTMLButtonElement>('[data-egg-target][aria-pressed=true]');selectGameCursor(target);target?.focus({preventScroll:true});});
 }
 useGameKeyboard('.egg-game-screen button:not([data-egg-utility])',1,true,(event,cursor,select)=>{
  const key=event.key.toLowerCase();
  if(key==='x'){event.preventDefault();if(!spinning)window.location.href='/';return true;}
  if(blocked){if(cursor?.closest('[role=alert]')&&['z','enter'].includes(key))return false;if(event.key.startsWith('Arrow')||['z','enter','q','e','y','a'].includes(key)){event.preventDefault();return true;}return false;}
  if(key==='y'||key==='a'){event.preventDefault();onOdds();return true;}
  if(key==='q'||key==='e'){event.preventDefault();const index=categories.findIndex(c=>c.id===category);changeTab(categories[(index+(key==='e'?1:2))%3].id);return true;}
  if(!event.key.startsWith('Arrow')||!cursor)return false;
  event.preventDefault();
  const grid=root.current?.querySelector<HTMLElement>('[data-egg-grid]'),targets=Array.from(grid?.querySelectorAll<HTMLButtonElement>('[data-egg-target]:not(:disabled)')??[]);
  const actions=Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[data-egg-draw]:not(:disabled)')??[]);
  const tabs=Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[role=tab]')??[]);
  const move=(next:HTMLButtonElement|undefined)=>{if(next){select(next);next.focus({preventScroll:true});}};
  if(cursor.matches('[role=tab]')){
   if(key==='arrowdown')move(targets.find(b=>b.getAttribute('aria-pressed')==='true')??targets[0]);
   else if(key==='arrowleft'||key==='arrowright')changeTab(categories[(categories.findIndex(c=>c.id===category)+(key==='arrowright'?1:2))%3].id);
   return true;
  }
  if(cursor.matches('[data-egg-target]')&&grid){
   const index=targets.indexOf(cursor),columns=getComputedStyle(grid).gridTemplateColumns.split(' ').length;
   if(key==='arrowdown')move(targets[index+columns]??actions[Math.min(actions.length-1,Math.floor(index%columns/(columns/2)))]);
   else if(key==='arrowup')move(targets[index-columns]??tabs.find(b=>b.getAttribute('aria-selected')==='true'));
   else if(key==='arrowleft')move(index%columns>0?targets[index-1]:root.current?.querySelector<HTMLButtonElement>('[data-egg-reward]:not(:disabled)')??undefined);
   else if(key==='arrowright'&&index%columns<columns-1)move(targets[index+1]);
   return true;
  }
  if(cursor.matches('[data-egg-draw]')){
   const index=actions.indexOf(cursor);
   if(key==='arrowup')move(targets.find(b=>b.getAttribute('aria-pressed')==='true')??targets.at(-1));
   else if(key==='arrowleft'||key==='arrowright')move(actions[index+(key==='arrowright'?1:-1)]);
   return true;
  }
  // Bonus ticket actions live beside the machine; return to the main grid to the right.
  if(key==='arrowright'||key==='arrowup')move(targets.find(b=>b.getAttribute('aria-pressed')==='true')??targets[0]);
  else{const rewards=Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[data-egg-reward]:not(:disabled)')??[]);move(rewards[rewards.indexOf(cursor)+(key==='arrowdown'?1:-1)]);}
  return true;
 },undefined,padShortcuts);
 return <section ref={root} className={`egg-station ${styles.station} ${spinning?'is-spinning':''}`} aria-label="알 뽑기 메뉴" aria-busy={spinning}>
  <div className={styles.machineSide}>
   <div className={`egg-machine ${styles.machine} ${spinning?'is-spinning':''}`} aria-label="알 뽑기 기계" aria-busy={spinning}>
    <img className="egg-machine-art" src="/sprites/eggs/machine.png" alt="" width={1122} height={1402}/>
    {dispensedKind&&<span className="egg-machine-output" data-testid="dispensed-egg" data-egg-kind={dispensedKind}><img src={eggKindInfo[dispensedKind].image} alt=""/></span>}
   </div>
   <div className={styles.rewards} aria-label="보상 알 티켓">{(['superRare','shiny'] as const).filter(kind=>(permanent.rewardEggTickets?.[kind]??0)>0).map(kind=><GameChoice key={kind} data-egg-reward disabled={blocked} onClick={()=>onRewardHatch(kind)}>{eggKindInfo[kind].name} 티켓 · {permanent.rewardEggTickets?.[kind]}장 · 1개 부화</GameChoice>)}</div>
   {spinning&&<span className={styles.spinning} role="status">알을 뽑고 있어요…</span>}
  </div>
  <div className={styles.controls}>
   <div className={styles.tabs} role="tablist" aria-label="알 탐색 종류">{categories.map(tab=><GameChoice key={tab.id} id={`egg-tab-${tab.id}`} role="tab" aria-selected={category===tab.id} aria-controls="egg-target-panel" disabled={blocked} onClick={()=>changeTab(tab.id)}>{tab.name}</GameChoice>)}</div>
   <div className={styles.selection} aria-live="polite"><span>현재 선택 대상</span><strong>{targetName}</strong>{category!=='none'&&<span className={styles.focusOdds}>지정 대상 비중 <b>{base}</b>{bonus>0&&<em> + {bonus}</em>}%</span>}</div>
   <div id="egg-target-panel" className={styles.targets} role="tabpanel" aria-labelledby={`egg-tab-${category}`}>
    <div data-egg-grid className={`${styles.grid} ${category==='type'?styles.types:category==='region'?styles.regions:styles.basic}`}>
     {category==='none'?<GameChoice data-egg-target="none" aria-pressed disabled={blocked} onClick={()=>choose({kind:'none'})}><strong>전체 · 기본 뽑기</strong><small>다양한 포켓몬과 새로운 기술을 수집</small></GameChoice>
      :category==='region'?(Object.keys(towerThemes) as TowerTheme[]).map(region=><GameChoice key={region} data-egg-target={region} aria-pressed={targetId===region} disabled={blocked} onClick={()=>choose({kind:'region',region})}>{towerThemes[region].name}</GameChoice>)
      :pokemonTypes.map(type=><GameChoice key={type} data-egg-target={type} aria-pressed={targetId===type} disabled={blocked} onClick={()=>choose({kind:'type',pokemonType:type})}>{teraNames[type]}</GameChoice>)}
    </div>
   </div>
   <div className={styles.priceInfo}><span>뽑기권 {permanent.eggTickets}장</span><span>1회 {unitPrice.toLocaleString()}P</span></div>
   <div className={styles.draws}>{([1,10] as const).map(count=><GameChoice key={count} data-egg-draw={count} aria-label={hatchLabel(count)} disabled={blocked||points<hatchCost(count)} onClick={()=>onHatch(count)}><strong>{count}회 뽑기</strong><span>{hatchLabel(count).split(' · ')[1]}</span></GameChoice>)}</div>
  </div>
 </section>;
}
