'use client';
import {useLayoutEffect,useRef} from 'react';
import {eventDefinitions,type RunEventView} from '../data/run-events';
import {GameDialogue} from './game-dialogue';
import {selectGameCursor} from './game-keyboard';
import styles from './styles/run-event.module.css';

function Chest(){return <svg className={styles.chest} viewBox="0 0 160 140" role="img" aria-label="보물 상자" shapeRendering="crispEdges">
 <ellipse cx="80" cy="122" rx="62" ry="9" fill="#0c1725" opacity=".55"/>
 <g className={styles.lid}><path d="M23 62V37l14-15h86l14 15v25Z" fill="#a4693c" stroke="#30232b" strokeWidth="6"/><path d="M29 38h102M30 50h100" stroke="#784532" strokeWidth="4"/><path d="M43 24h12v36H43Zm62 0h12v36h-12Z" fill="#e7c477"/><path d="M24 56h112v10H24Z" fill="#f2d791"/></g>
 <path d="M24 65h112v48l-8 8H32l-8-8Z" fill="#925333" stroke="#30232b" strokeWidth="6"/>
 <path d="M30 83h100M30 101h100" stroke="#673b30" strokeWidth="4"/>
 <path d="M42 67h13v49H42Zm63 0h13v49h-13Z" fill="#d5ad62"/>
 <path d="M26 65h108v10H26Zm4 45h100v10H30Z" fill="#e7c477"/>
 <rect x="67" y="58" width="26" height="28" rx="2" fill="#f7dc91" stroke="#64472e" strokeWidth="4"/>
 <path d="M77 67h7v7h-2v6h-4v-6h-1Z" fill="#594337"/>
 </svg>;}

export function eventDialogue(event:RunEventView){
 const reward=event.reward;
 const name=reward?.kind==='coins'?`${reward.amount.toLocaleString()}코인`:`알 뽑기권 ${reward?.amount??1}장`;
 return event.phase==='reward'?(event.kind==='mystery-chest'?`${name}을 발견했다! ${reward?.kind==='coins'?'타워 코인에 더해졌다.':'알 뽑기에서 사용할 수 있다.'}`:`${eventDefinitions[event.kind].reward} 알 뽑기에서 사용할 수 있다.`):eventDefinitions[event.kind].intro;
}

export function RunEventScene({event}:{event:RunEventView}){
 const opened=event.phase==='reward',reward=event.reward,definition=eventDefinitions[event.kind];
 const rewardName=reward?.kind==='coins'?`${reward.amount.toLocaleString()}코인`:`알 뽑기권 ${reward?.amount??1}장`;
 return <><div className={`${styles.scope} ${styles.artwork}`} data-opened={opened} data-testid="event-artwork">
  <div className={styles.object}><span className={styles.glow} aria-hidden="true"/>{event.kind==='mystery-chest'?<Chest/>:<img className={styles.npc} src={`/sprites/trainers/${event.kind==='breeder-gift'?'aromalady-gen4':'hiker-gen4'}.png`} alt={event.kind==='breeder-gift'?'브리더':'여행 상인'} width="180" height="200"/>}
   {opened&&<div className={styles.stars} aria-hidden="true"><i>✦</i><i>✧</i><i>✦</i><i>✧</i></div>}
   {opened&&<strong className={styles.reward} data-testid="event-reward">{rewardName}</strong>}
  </div>
 </div>{!opened&&<aside className={`${styles.scope} ${styles.scene}`} role="region" aria-label="이벤트 설명" data-testid="event-info">
  <small>{event.afterFloor}층을 지나던 길 · 이벤트</small>
  <h2>{definition.title}</h2>
  <p className={styles.description}>{definition.summary}</p>
 </aside>}</>;
}

export function RunEventPanel({event,runId,busy,selecting,onChoose,submit}:{event:RunEventView;runId:string;busy:boolean;selecting:boolean;onChoose:()=>void;submit:(body:Record<string,unknown>)=>Promise<void>}){
 const mode=event.phase==='reward'?'reward':selecting?'choices':'intro';
 return <section className={`${styles.scope} ${styles.bottom} battle-messages`} data-event-step={mode} aria-label="이벤트 상황">
  <div className="message-heading"><span><i className="record-dot"/>이벤트</span><span>{mode==='choices'?'어떻게 할까요?':`${event.afterFloor}층을 지나던 길`}</span></div>
  {mode!=='choices'&&<GameDialogue text={eventDialogue(event)} label="이벤트 안내"/>}
  <RunEventChoices event={event} runId={runId} busy={busy} submit={submit} mode={mode} onChoose={onChoose}/>
 </section>;
}

function RunEventChoices({event,runId,busy,submit,mode,onChoose}:{event:RunEventView;runId:string;busy:boolean;submit:(body:Record<string,unknown>)=>Promise<void>;mode:'intro'|'choices'|'reward';onChoose:()=>void}){
 const ref=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{selectGameCursor(ref.current?.querySelector<HTMLButtonElement>('[data-initial-focus]'));},[event.id,event.phase,busy,mode]);
 return <div ref={ref} className={`${styles.scope} ${styles.actions} event-choices`} role="group" aria-label="이벤트 선택" aria-busy={busy} data-keyboard-list>
  {mode==='intro'?<button className={styles.choice} data-initial-focus disabled={busy} onClick={onChoose}><span className={styles.pointer} aria-hidden="true">{'>'}</span><span className={styles.label}>선택지 보기</span></button>:event.phase==='reward'?<button className={styles.choice} data-initial-focus disabled={busy} onClick={()=>void submit({type:'event-continue',runId,eventId:event.id})}><span className={styles.pointer} aria-hidden="true">{'>'}</span><span className={styles.label}>{busy?'잠시만요…':'계속하기'}</span></button>:<><button className={styles.choice} data-initial-focus disabled={busy} onClick={()=>void submit({type:'event-choice',runId,eventId:event.id,choice:'open'})}><span className={styles.pointer} aria-hidden="true">{'>'}</span><span className={styles.label}>{busy?'잠시만요…':eventDefinitions[event.kind].accept}</span></button><button className={styles.choice} disabled={busy} onClick={()=>void submit({type:'event-choice',runId,eventId:event.id,choice:'skip'})}><span className={styles.pointer} aria-hidden="true">{'>'}</span><span className={styles.label}>지나간다</span></button></>}
 </div>;
}
