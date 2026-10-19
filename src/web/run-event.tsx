'use client';
import {isVillainAmbush} from '../data/villain-tracks';
import {isRocketStage} from '../data/villain-campaigns';
import {campaignRewardTitle} from '../data/villain-campaigns';
import {readPlaybackSpeed,playbackDuration} from './playback-settings';
import {TeleportPortal} from './teleport-portal';
import {ChallengerCandidates,ChallengerDetail} from './challenger-candidates';
import {RaidScene,RaidVictoryScene} from './raid-scene';
import {HiddenShop,HiddenShopDetail} from './hidden-shop';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {eventDefinition,type EventChoice,type RunEventView} from '../data/run-events';
import {getEventPresentation} from './event-presentation';
import {GameDialogue} from './game-dialogue';
import {RewardModal,rewardRevealDelay} from './reward-modal';
import {selectGameCursor} from './game-keyboard';
import styles from './styles/run-event.module.css';

export function AmbushNotice(){
 const [duration,setDuration]=useState(1200);
 useEffect(()=>{setDuration(playbackDuration(1200,readPlaybackSpeed(),false,'',{minimumDuration:800}));},[]);
 return <strong className={styles.ambushNotice} style={{animationDuration:`${duration}ms`}} role="status" aria-label="발견당했다!" data-testid="rocket-ambush-notice">!</strong>;
}

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
 if(event.kind==='villain-campaign'&&event.phase==='choice')return event.villain?.stage==='boss'?`폐쇄된 지휘실.\n${event.villain.name}를 발견했다.`:event.villain?.stage==='officer'||event.villain?.stage==='executive'?`기록에 남은 보안 구역.\n${event.villain.name}를 발견했다.`:'조직원이 앞을 가로막았다.';
 if(event.result)return event.villain&&isRocketStage(event.villain.stage)?campaignRewardTitle(event.villain.stage,event.villain.clues??1):event.result.title;
 const reward=event.reward;
 const name=reward?.kind==='coins'?`${reward.amount.toLocaleString()}코인`:`알 뽑기권 ${reward?.amount??1}장`;
 const definition=eventDefinition(event.kind,undefined,event.rulesVersion);
 if(event.phase!=='reward')return definition?.intro??'';
 const choice=definition?.choices.find(choice=>choice.id===(event.choiceId??'open'));
 return choice?.outcome==='reward'?choice.message.replaceAll('{reward}',name).replaceAll('{detail}',reward?.kind==='coins'?'타워 코인에 더해졌다.':'알 뽑기에서 사용할 수 있다.'):name;
}

export function RunEventScene({event,portalActivationMs,busy=false,challengerId,coins=0,growthPoints=0,shopOfferId,onShopFocus=()=>{}}:{event:RunEventView;portalActivationMs?:number;busy?:boolean;challengerId?:string;coins?:number;growthPoints?:number;shopOfferId?:string;onShopFocus?:(id:string)=>void}){
 if(event.kind==='raid-encounter'&&event.raid){
  if(event.phase==='choice'&&!event.choiceId)return <RaidScene raid={event.raid}/>;
  return event.phase==='reward'?<RaidVictoryScene/>:null;
 }
 if(event.hiddenBoss&&event.phase==='reward')return null;
 if(isVillainAmbush(event.villain?.stage??'')&&event.phase==='reward')return null;
 if(event.villain&&event.phase==='reward')return <div className={`${styles.scope} ${styles.facility}`} aria-hidden="true"/>;
 if(event.hiddenShop)return <HiddenShop shop={event.hiddenShop} coins={coins} growthPoints={growthPoints} busy={busy} selectedId={shopOfferId} onFocus={onShopFocus}/>;
 if(event.challengers && event.phase==='choice')return <ChallengerDetail candidate={event.challengers.find(candidate=>candidate.id===(challengerId??event.challengers?.[0]?.id))}/>;
 const opened=event.phase==='reward',reward=event.reward,definition=eventDefinition(event.kind,undefined,event.rulesVersion),presentation=getEventPresentation(event.kind);
 if(!definition || !presentation || presentation.artwork==='raid')return null;
 const rewardName=reward?.kind==='coins'?`${reward.amount.toLocaleString()}코인`:`알 뽑기권 ${reward?.amount??1}장`;
 return <>{event.villain&&!isVillainAmbush(event.villain.stage)&&<div className={`${styles.scope} ${styles.facility}`} aria-hidden="true"/>}<div className={`${styles.scope} ${styles.artwork}`} data-opened={opened} data-teleport={event.kind==='random-teleport'} data-reward-tone={event.result?.tone} data-testid="event-artwork">
  <div className={styles.object}>{(isVillainAmbush(event.villain?.stage??'')||!!event.hiddenBoss)&&!opened&&<AmbushNotice/>}<span className={styles.glow} aria-hidden="true"/>{event.villain?.stage==='rocket-intro'&&!opened?<div className={styles.managementDoor} role="img" aria-label="열려 있는 관리 구역"><span>직원 전용</span><i/></div>:presentation.artwork==='teleport'?<TeleportPortal activationMs={portalActivationMs} arrived={opened}/>:presentation.artwork==='chest'?<Chest/>:<img className={styles.npc} src={`/sprites/trainers/${event.hiddenBoss?.portrait??event.villain?.portrait??presentation.sprite}.png`} alt={event.hiddenBoss?.name??event.villain?.name??presentation.alt} width="180" height="200"/>}
   {opened&&(!event.result||['good','great'].includes(event.result.tone))&&<div className={styles.stars} aria-hidden="true"><i>✦</i><i>✧</i><i>✦</i><i>✧</i></div>}
   {opened&&!event.result&&<strong className={styles.reward} data-testid="event-reward">{rewardName}</strong>}
  </div>
 </div>{!opened&&<aside className={`${styles.scope} ${styles.scene}`} role="region" aria-label="이벤트 설명" data-testid="event-info">
  <small>{event.afterFloor}층을 지나던 길 · 이벤트</small>
  <h2>{definition.title}</h2>
  <p className={styles.description}>{definition.summary}</p>
 </aside>}</>;
}

export function RunEventPanel({event,runId,busy,selecting,onChoose,submit,challengerId,onChallengerFocus=()=>{},shopOfferId,coins=0,growthPoints=0,onHiddenPurchase,bagButton}:{event:RunEventView;runId:string;busy:boolean;selecting:boolean;onChoose:()=>void;submit:(body:Record<string,unknown>)=>Promise<void>;challengerId?:string;onChallengerFocus?:(id:string)=>void;shopOfferId?:string;coins?:number;growthPoints?:number;onHiddenPurchase?:(id:string)=>void;bagButton?:import('react').ReactNode}){
 const result=event.result&&event.villain?{...event.result,title:eventDialogue(event)}:event.result;
 const mode=event.phase==='reward'?'reward':selecting||event.raid||event.villain||event.hiddenBoss||event.kind==='random-teleport'?'choices':'intro';
 const [revealed,setRevealed]=useState<string|null>(null);
 const latestSubmit=useRef(submit);latestSubmit.current=submit;
 useEffect(()=>{
  if((!event.hiddenBoss&&event.kind!=='villain-campaign')||event.phase!=='choice'||event.choiceId||busy)return;
  const delay=event.kind==='villain-campaign'?playbackDuration(1400,readPlaybackSpeed(),false,'',{minimumDuration:1000}):1000;
  const timer=setTimeout(()=>void latestSubmit.current({type:'event-choice',runId,eventId:event.id,choice:'challenge'}),delay);
  return()=>clearTimeout(timer);
 },[event.id,event.phase,event.choiceId,busy]);
 useEffect(()=>{
  if(mode!=='reward'||!event.result)return;
  const timer=setTimeout(()=>setRevealed(event.id),window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:event.teleport||event.villain?0:rewardRevealDelay);
  return()=>clearTimeout(timer);
 },[event.id,mode,!!event.result]);
 if(event.hiddenShop)return <HiddenShopDetail shop={event.hiddenShop} selectedId={shopOfferId} coins={coins} growthPoints={growthPoints} busy={busy} bagButton={bagButton} onPurchase={productId=>onHiddenPurchase?onHiddenPurchase(productId):void submit({type:'hidden-shop-purchase',runId,eventId:event.id,productId})} onLeave={()=>void submit({type:'event-choice',runId,eventId:event.id,choice:'leave'})}/>;
 return <><section className={`${styles.scope} ${styles.bottom} battle-messages`} data-event-step={mode} data-villain={!!event.villain||!!event.hiddenBoss} data-teleport={event.kind==='random-teleport'} data-challenger-selection={!!event.challengers&&mode!=='reward'} aria-label="이벤트 상황">
  <div className="message-heading"><span><i className="record-dot"/>{event.raid&&mode==='reward'?'레이드 승리':'이벤트'}</span><span>{event.raid&&mode==='reward'?'특별한 보상':mode==='choices'?'어떻게 할까요?':`${event.afterFloor}층을 지나던 길`}</span></div>
  {event.challengers && mode!=='reward'?<><GameDialogue text="도전할 트레이너를 선택하세요." label="이벤트 안내"/><ChallengerCandidates candidates={event.challengers} selectedId={challengerId??event.challengers[0]?.id} busy={busy} onFocus={onChallengerFocus} onConfirm={choice=>void submit({type:'event-choice',runId,eventId:event.id,choice})}/></>:mode==='reward'&&event.teleport?<GameDialogue text={revealed===event.id?eventDialogue(event):'공간이 일그러지고 있다…'} label="이벤트 안내"/>:mode==='reward'&&event.result?<GameDialogue text={event.raid?"승리했다! 특별한 보상을 확인하자.":event.villain||event.hiddenBoss?"전투에서 승리했다.":event.challengers?"승리했다! 전투 보상을 확인하자.":"상자를 열었다. 결과를 확인해 보자."} label="이벤트 안내"/>:<>
   {(mode!=='choices'||!!event.villain||!!event.hiddenBoss||event.kind==='random-teleport')&&<GameDialogue text={eventDialogue(event)} label="이벤트 안내"/>}
   {!event.hiddenBoss&&event.kind!=='villain-campaign'&&<RunEventChoices event={event} runId={runId} busy={busy} submit={submit} mode={mode} onChoose={onChoose}/>}
  </>}
 {mode==='reward'&&event.teleport&&<RunEventChoices event={event} runId={runId} busy={busy||revealed!==event.id} submit={submit} mode="reward" onChoose={onChoose}/>}</section>{mode==='reward'&&event.result&&!event.teleport&&revealed===event.id&&<RewardModal result={result!} heading={event.raid?event.result.title:event.result.tone==='good'||event.result.tone==='great'?'이벤트 보상':'이벤트 결과'} busy={busy} onSelect={(selectionId,candidateId)=>void submit({type:'event-reward-select',runId,eventId:event.id,selectionId,candidateId})} onConfirm={()=>void submit({type:'event-continue',runId,eventId:event.id})}/>}</>;
}

function RunEventChoices({event,runId,busy,submit,mode,onChoose}:{event:RunEventView;runId:string;busy:boolean;submit:(body:Record<string,unknown>)=>Promise<void>;mode:'intro'|'choices'|'reward';onChoose:()=>void}){
 const ref=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{selectGameCursor(ref.current?.querySelector<HTMLButtonElement>('[data-initial-focus]'));},[event.id,event.phase,busy,mode]);
 return <div ref={ref} className={`${styles.scope} ${styles.actions} event-choices`} role="group" aria-label="이벤트 선택" aria-busy={busy} data-keyboard-list>
  {mode==='intro'?<button className={styles.choice} data-initial-focus disabled={busy} onClick={onChoose}><span className={styles.pointer} aria-hidden="true">{'>'}</span><span className={styles.label}>선택지 보기</span></button>:event.phase==='reward'?<button className={styles.choice} data-initial-focus disabled={busy} onClick={()=>void submit({type:'event-continue',runId,eventId:event.id})}><span className={styles.pointer} aria-hidden="true">{'>'}</span><span className={styles.label}>{busy?'잠시만요…':'계속하기'}</span></button>:<EventChoiceButtons choices={eventDefinition(event.kind,undefined,event.rulesVersion)?.choices??[]} busy={busy} onSelect={choice=>void submit({type:'event-choice',runId,eventId:event.id,choice})}/>}
 </div>;
}

export function EventChoiceButtons({choices,busy,onSelect}:{choices:readonly EventChoice[];busy:boolean;onSelect:(id:string)=>void}){
 return <>{choices.map((choice,index)=><button key={choice.id} className={styles.choice} data-initial-focus={index===0?true:undefined} data-event-choice={choice.id} disabled={busy} onClick={()=>onSelect(choice.id)}><span className={styles.pointer} aria-hidden="true">{'>'}</span><span className={styles.label}>{busy?'잠시만요…':choice.label}</span></button>)}</>;
}
