'use client';
import {useTutorial} from './tutorial-manager';
import {GameMenuBar,GameMenuProvider} from './game-menu-context';
import {BattleStage} from './battle-stage';
import {Ball,SendOut,PokemonFeedback,ShinySparkles,Sprite,HealthCard} from './battle-pokemon';
import {RunEventScene,RunEventPanel} from './run-event';
import {hiddenShopAvailability} from './hidden-shop';
import {BagButton} from './bag';
import {ItemAcquisitionDialog} from './item-acquisition-dialog';
import {TrainerEquipment} from './trainer-equipment';
import {collectionSpecies} from '../data/selectable-forms';
import {battleRules} from '../data/run-rules';
import {teraColors} from '../data/tera';
import {megaStones,type Gimmick} from '../data/gimmicks';


import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { BattleResponse, BattleView, PokemonView, TowerView, BossView } from './contracts';
import {BossPortrait,PlayerPortrait,trainerAppearance} from './boss-dialog';
import {battleTrainer,trainerLabel} from './trainer-samples';
import {BattleResultDialog} from './battle-result';
import {TowerClear} from './tower-clear';
import {useRouter} from 'next/navigation';
import { health, pokemonName, battlePokemonName, species } from './catalog';
import {MoveVisuals} from './move-visuals';
import {BattleMessages} from './battle-messages';
import {battleMessageEntries,currentBattleDialogue} from './battle-message-data';
import {recruitResultMessage} from './recruit-dialog';
import type {EffectNotice} from './battle-effects';
import {presentationFrames, type Motion} from './battle-presentation';
import {moveInfo} from '../data/move-info';
import {movePresentation} from './move-presentation';
import {effect,stopEffects, startMusic, stopMusic, updateAudio, playCry, stopCry} from './game-audio';
import {readAudio} from './audio-settings';
import {upgrades} from '../data/shop';
import {restartNotice} from './restart-notice';
import Pokedex from './pokedex';
import {useGameKeyboard,selectGameCursor} from './game-keyboard';
import {PokedexDialog} from './pokedex-dialog';
import type {PokedexEntry} from './pokedex-data';
import {FieldInspection} from './battle-field-overlay';
import {emptyField} from './battle-field';
import {sceneTheme,arenaNames,trainerMusic,revealedRare,strongerRare} from './encounter-presentation';
import type {MusicTrack} from './music-score';
import {BattleCommands,type CommandMode} from './battle-commands';
import {readPlaybackSpeed,playbackDuration,type PlaybackSpeed} from './playback-settings';
import {portalActivationDuration} from './portal-effects';
import {useTouchHold} from './use-touch-hold';

function BattleGameContent({prepareNewRun = false,entries}: {prepareNewRun?: boolean;entries:PokedexEntry[]}) {
  const tutorial=useTutorial();
  const [battle, setBattle] = useState<BattleView | null>(null);
  const [tower, setTower] = useState<TowerView | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [eventSelection,setEventSelection]=useState<string|null>(null);
  const [portalActivation,setPortalActivation]=useState<{eventId:string;duration:number}|null>(null);
  const portalWait=useRef<(()=>void)|null>(null);
  useEffect(()=>()=>{portalWait.current?.();},[]);
  const [challengerFocus,setChallengerFocus]=useState<{eventId:string;id:string}|null>(null);
  const [shopFocus,setShopFocus]=useState<{eventId:string;id:string}|null>(null);
  const [acquireOfferId,setAcquireOfferId]=useState<string|null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [motion, setMotion] = useState<Motion | null>(null);
  const [notice, setNotice] = useState<EffectNotice | null>(null);
  const [commandMessage,setCommandMessage]=useState<string|null>(null);
  const [announcement,setAnnouncement] = useState<string | null>(null);
  const [frameNumber, setFrameNumber] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [trainerIntro,setTrainerIntro]=useState<{boss?:BossView;phase:'enter'|'throw'}|null>(null);
  const skip = useRef(false);
  const playbackWait=useRef<(()=>void)|null>(null);
  const introContinue=useRef<(()=>void)|null>(null);
  const [recruitMessage,setRecruitMessage]=useState('');
  function skipPlayback(){skip.current=true;introContinue.current?.();playbackWait.current?.();stopCry();stopEffects();}
  const playbackSpeed=useRef<PlaybackSpeed>(1);
  useEffect(()=>{if(!playing)return;const frame=requestAnimationFrame(()=>{document.querySelector('.arena')?.getAnimations({subtree:true}).forEach(animation=>{const target=(animation.effect as KeyframeEffect|null)?.target;animation.updatePlaybackRate(target instanceof Element && (target.closest('.effect-notice,.health-card'))?1:motion?.raidPhase?Math.min(2,playbackSpeed.current):playbackSpeed.current);});});return ()=>cancelAnimationFrame(frame);},[playing,frameNumber]);
  const waitPlayback=(duration:number,notice=false,dialogue='',timing:import('./playback-settings').PlaybackTiming={})=>new Promise<void>(resolve=>{const done=()=>{clearTimeout(timer);playbackWait.current=null;resolve();};const timer=setTimeout(done,playbackDuration(duration,playbackSpeed.current,notice,dialogue,timing));playbackWait.current=done;});
  const mounted = useRef(true);
  const [error, setError] = useState('');
  const [acknowledgedResult, setAcknowledgedResult] = useState<string | null>(null);
  const [battleMenu,setBattleMenu]=useState(false),[showLog,setShowLog]=useState(false),[stageOpen,setStageOpen]=useState(false),[abandonConfirm,setAbandonConfirm]=useState(false);
  const lastMove=useRef('move 1');
  const [tab, setTab] = useState<CommandMode>('root');
  const [gimmick,setGimmick]=useState<Gimmick|null>(null);
  const [focusedCommand,setFocusedCommand]=useState('move 1');
  const [showField,setShowField]=useState<'hold'|'open'|'touch'|null>(null);
  const fieldHeld=useRef(false);
  const fieldTouch=useTouchHold(()=>{if(battle&&!trainerIntro&&!document.querySelector('dialog[open]'))setShowField('touch');},()=>setShowField(current=>current==='touch'?null:current));
  useEffect(()=>{
    if(!playing||trainerIntro)return;
    let down:{x:number;y:number;time:number;id:number}|null=null,last:{x:number;y:number;time:number}|null=null;
    const press=(event:PointerEvent)=>{
      const target=event.target as HTMLElement;
      if(event.pointerType!=='touch'||!event.isPrimary||!window.matchMedia('(max-width:760px)').matches||!target.closest('.battle-panel')||target.closest('button,.battle-field-overlay')||document.querySelector('dialog[open]')){down=null;last=null;return;}
      down={x:event.clientX,y:event.clientY,time:performance.now(),id:event.pointerId};
    };
    const release=(event:PointerEvent)=>{
      if(!down||event.pointerId!==down.id)return;
      const now=performance.now(),tap=now-down.time<250&&Math.hypot(event.clientX-down.x,event.clientY-down.y)<12;down=null;
      if(!tap){last=null;return;}
      if(last&&now-last.time<320&&Math.hypot(event.clientX-last.x,event.clientY-last.y)<40){last=null;skipPlayback();}
      else last={x:event.clientX,y:event.clientY,time:now};
    };
    const cancel=()=>{down=null;last=null;};
    document.addEventListener('pointerdown',press);document.addEventListener('pointerup',release);document.addEventListener('pointercancel',cancel);
    return ()=>{document.removeEventListener('pointerdown',press);document.removeEventListener('pointerup',release);document.removeEventListener('pointercancel',cancel);};
  },[playing,trainerIntro]);
  useEffect(()=>{const reset=()=>{if(fieldHeld.current){fieldHeld.current=false;setShowField(null);}};const release=(event:KeyboardEvent)=>{if(event.key.toLowerCase()==='c')reset();};const hidden=()=>{if(document.hidden)reset();};window.addEventListener('keyup',release);window.addEventListener('blur',reset);document.addEventListener('visibilitychange',hidden);return ()=>{window.removeEventListener('keyup',release);window.removeEventListener('blur',reset);document.removeEventListener('visibilitychange',hidden);};},[]);
  const requestLock = useRef(false);
  const initialLoad = useRef(true);
  const refreshVersion = useRef(0);
  const ignoredResult = useRef<string | null>(null);
  const router = useRouter();
  const forceSwitch = !!battle && battle.status === 'waiting' && !battle.actions.some(a => a.command.startsWith('move '));
  const done = battle?.status === 'complete';
  const broken = battle?.status === 'error';
  const run = tower?.run;
  const currentEvent = !playing&&!recruitMessage ? run?.event : null;
  const floorPreparation=run?.state==='select'&&!currentEvent&&!playing&&!recruitMessage;
  const preparationMessage=floorPreparation?`${run.floor}층에 출전할 3마리를 선택하세요.`:null;
  const challengerId=challengerFocus?.eventId===currentEvent?.id?challengerFocus?.id:currentEvent?.challengers?.[0]?.id;
  const focusChallenger=(id:string)=>{if(currentEvent)setChallengerFocus(previous=>previous?.eventId===currentEvent.id&&previous.id===id?previous:{eventId:currentEvent.id,id});};
  const shopOfferId=shopFocus?.eventId===currentEvent?.id?shopFocus?.id:currentEvent?.hiddenShop?.offers[0]?.id;
  const focusShopOffer=(id:string)=>{if(currentEvent)setShopFocus(previous=>previous?.eventId===currentEvent.id&&previous.id===id?previous:{eventId:currentEvent.id,id});};
  const hasResult = !playing && done && battle?.winner!=='Player' && tower && run && ['recruit', 'lost', 'cleared'].includes(run.state);
  const preparing = !battle || !run || (!['battle', 'recruit'].includes(run.state));
  const team:PokemonView[] = (run?.roster ?? selected).map(name => (!preparing ? battle?.team.find(p=>collectionSpecies(p.species)===name) : undefined) ?? {species:name,displaySpecies:run?.partnerForms?.[name],condition:'1/1',active:false});
  const gimmickHint=({mega:'메가진화',dynamax:'다이맥스',tera:'테라스탈',z:'Z기술',chaos:'변신 선택',basic:''} as const)[run?.rule ?? 'chaos'];
  const active = battle?.team.find(p => p.active);
  const encounterMusic=trainerMusic(run?.boss ?? run?.trainer);
  const scenery=sceneTheme(run);
  const rareEncounter=useRef<{id:string;track:MusicTrack|null}>({id:'',track:null});

  async function refresh() {
    const version = ++refreshVersion.current;
    const response = await fetch('/api/battle', {cache: 'no-store'});
    const data: BattleResponse = await response.json();
    if(version !== refreshVersion.current || !mounted.current)return;
    if (!response.ok) throw new Error(data.error ?? '배틀 상태를 불러오지 못했습니다.');
    if (initialLoad.current) {
      initialLoad.current = false;
      if (prepareNewRun && data.battle?.status === 'complete' && ['lost','cleared'].includes(data.tower.run?.state ?? '')) ignoredResult.current = data.battle.id;
    }
    if(data.battle && sessionStorage.getItem('tower-pending-intro')===data.battle.id) {
      sessionStorage.removeItem('tower-pending-intro');
      setLoading(false);setBusy(true);
      try {await playBattle(data,false);} finally {if(mounted.current)setBusy(false);}
      return;
    }
    setBattle(data.battle?.id === ignoredResult.current ? null : data.battle);
    setTower(data.battle?.id === ignoredResult.current ? {...data.tower,run:null} : data.tower);
  }
  useEffect(() => { refresh().catch(e => setError(e.message)).finally(() => setLoading(false)); }, []);
  useEffect(() => {mounted.current=true;return () => {mounted.current=false;skipPlayback();};},[]);
  useEffect(()=>{if(!playing)return;const handle=(event:KeyboardEvent)=>{if(event.key==='Shift' && !event.repeat && !event.ctrlKey && !event.altKey && !event.metaKey){event.preventDefault();skipPlayback();}};document.addEventListener('keydown',handle);return ()=>document.removeEventListener('keydown',handle);},[playing]);
  useEffect(() => {
    updateAudio(readAudio());
    if(run?.state==='lost' && acknowledgedResult===battle?.id){stopMusic();return;}
    if(battle && rareEncounter.current.id!==battle.id){
      let saved:MusicTrack|null=null;try{const value=sessionStorage.getItem(`tower-rare-music:${battle.id}`);if(['rare','sublegendary','mythical','legendary'].includes(value ?? ''))saved='rare';}catch{}
      rareEncounter.current={id:battle.id,track:saved};
    }
    if(battle){const next=strongerRare(rareEncounter.current.track,revealedRare(battle.messages,battle.opponent?.species));rareEncounter.current.track=next;if(next)try{sessionStorage.setItem(`tower-rare-music:${battle.id}`,next);}catch{}}
    if(run?.state==='cleared' && !playing)startMusic('clear');
    else if((run?.state==='lost' || (battle?.status==='complete' && battle.winner!=='Player')) && !playing)startMusic('defeat');
    else if((run?.state==='recruit' || run?.state==='select' || (battle?.status==='complete' && battle.winner==='Player')) && !playing)startMusic('reward');
    else if(battle && (battle.status==='waiting' || playing))startMusic(rareEncounter.current.track ?? encounterMusic);
    else stopMusic();
  },[battle?.id,battle?.status,battle?.opponent?.species,battle?.messages,run?.state,encounterMusic,playing,acknowledgedResult]);
  useEffect(()=>()=>{stopMusic();stopEffects();},[]);
  useEffect(() => { setCommandMessage(null);setGimmick(null);setTab(forceSwitch ? 'switch' : 'root'); }, [forceSwitch, battle?.id, battle?.requestId]);
  useEffect(() => {
    if (tower && run?.state !== 'battle' && run?.state !== 'recruit') {
      setSelected(run?.state === 'select' ? run.suggestedTeam.slice(0, 3) : []);
    }
  }, [run?.id, run?.floor, run?.state, run?.suggestedTeam.join(','), tower?.unlocked.join(',')]);

  async function playBattle(data:BattleResponse,isAction:boolean) {
    if(!data.battle)return;
    if(!isAction)setTower(data.tower);
    const initialView={...data.battle,field:emptyField(),messages:[],opponent:null,team:data.battle.team.map(p=>({...p,active:false})),turn:0};
    const frames=presentationFrames(isAction && battle ? battle : initialView,data.battle);
    playbackSpeed.current=readPlaybackSpeed();skip.current=false;setPlaying(true);
    if(!isAction && !data.tower.run?.raid) {
      const boss=battleTrainer(data.battle.id,data.tower.run?.boss ?? data.tower.run?.trainer);
      setStageOpen(false);setBattle(initialView);setTrainerIntro({boss,phase:'enter'});setAnnouncement(boss.role==='villain'?trainerAppearance(boss):boss.introduction||trainerAppearance(boss));
      await new Promise<void>(resolve=>{introContinue.current=()=>{introContinue.current=null;resolve();};});
      if(!skip.current && mounted.current){setTrainerIntro({boss,phase:'throw'});await waitPlayback(550);}
      setTrainerIntro(null);
    }
    let previousDialogue=isAction && battle ? currentBattleDialogue(battleMessageEntries(battle.messages)).text : '';
    for(const frame of frames) {
      if(skip.current || !mounted.current)break;
      setBattle(frame.view);setMotion(frame.motion);setNotice(frame.notice ?? null);setAnnouncement(frame.announcement ?? null);setFrameNumber(n=>n+1);
      if(frame.motion) {
        const info=frame.motion.move ? moveInfo[frame.motion.move] : undefined;
        effect(frame.motion.kind,frame.motion.color,{category:info?.category,power:info?.power,impact:frame.motion.impact,cue:frame.motion.move?movePresentation(frame.motion.move).sound:undefined,speed:playbackSpeed.current});
        if(['switch','faint'].includes(frame.motion.kind)) {
          const name=frame.motion.side==='enemy' ? frame.view.opponent?.species : frame.view.team.find(p=>p.active)?.species;
          if(name && species[name])playCry(species[name].id);
        }
      }
      const dialogue=currentBattleDialogue(battleMessageEntries(frame.view.messages),frame.announcement).text;
      if(frame.duration || frame.notice)await waitPlayback(frame.duration,!!frame.notice,dialogue!==previousDialogue?dialogue:'',{important:frame.important??false,idle:!frame.motion&&dialogue===previousDialogue,minimumDuration:frame.minimumDuration});
      previousDialogue=dialogue;
    }
    if(skip.current)stopCry();
    if(mounted.current){setTower(data.tower);setMotion(null);setNotice(null);setAnnouncement(null);setPlaying(false);setBattle(data.battle);}
  }

  async function submit(body: Record<string, unknown>) {
    if (requestLock.current) return;
    requestLock.current = true;
    setBusy(true); setError('');
    try {
      if(body.type==='event-choice'&&body.choice==='teleport'&&currentEvent?.kind==='random-teleport'&&body.eventId===currentEvent.id&&currentEvent.phase==='choice'){
        const duration=portalActivationDuration(readPlaybackSpeed(),window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        setPortalActivation({eventId:currentEvent.id,duration});
        await new Promise<void>(resolve=>{const done=()=>{clearTimeout(timer);portalWait.current=null;resolve();};const timer=setTimeout(done,duration);portalWait.current=done;});
        if(!mounted.current)return;
      }
      const response = await fetch('/api/battle', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
      });
      const data: BattleResponse = await response.json();
      if (!response.ok) {
        await refresh();
        throw new Error(data.error ?? '행동을 처리하지 못했습니다.');
      }
      if(data.battle && (body.type === 'action' || body.type === 'start' || body.type === 'enter' || body.type==='event-choice'&&data.tower.run?.state==='battle')) {
        setRecruitMessage('');
        await playBattle(data,body.type==='action');
      }
      if(!mounted.current)return;
      setMotion(null);setNotice(null);setAnnouncement(null);setPlaying(false);setBattle(data.battle);
      setTower(data.tower);
      await tutorial.refresh();
      if(body.type==='finish-loss'&&data.battle)setAcknowledgedResult(data.battle.id);
      if(body.type === 'recruit' && typeof body.chosen === 'string' && data.tower.run && (body.collectOnly || data.tower.run.roster.includes(body.chosen))) {
        const display=run?.candidateDetails?.[body.chosen]?.forme??body.chosen;
        setRecruitMessage(recruitResultMessage(display,body.collectOnly===true));effect('partner');
      }
      if(body.type==='abandon')setRecruitMessage('');
      if(body.type === 'action' && data.battle?.status === 'complete') effect(data.battle.winner === 'Player' ? 'victory' : 'defeat');
      if (body.type === 'start' && prepareNewRun) router.replace('/battle', {scroll:false});
    } catch (e) { setError(e instanceof Error ? e.message : '서버에 연결할 수 없습니다. 새로고침해 주세요.');if(body.type==='adjust-run'||body.type==='bag-use')throw e; }
    finally { if(mounted.current){setPortalActivation(null);setBusy(false);setPlaying(false);setTrainerIntro(null);setMotion(null);setNotice(null);setAnnouncement(null);} requestLock.current = false; }
  }
  const send = (action: string) => {if(action.startsWith('move ') && gimmick && battle?.actions.some(a=>a.command===action+' '+gimmick))action+=' '+gimmick;setGimmick(null);setTab('root');if(action.startsWith('move '))lastMove.current=action.replace(/ (mega|dynamax|terastallize|zmove|ultra)$/,'');return submit({type: 'action', battleId: battle?.id, requestId: battle?.requestId, action});};
  const selectAction=()=>{if(document.querySelector('dialog[open]'))return;const buttons=Array.from(document.querySelectorAll<HTMLButtonElement>('.action-grid button:not(:disabled)'));selectGameCursor(buttons.find(button=>button.dataset.command===lastMove.current) ?? buttons[0] ?? document.querySelector<HTMLButtonElement>('.battle-panel .command-area>.primary-button'));};
  const focusAction=()=>requestAnimationFrame(selectAction);
  const acquireOffer=currentEvent?.hiddenShop?.offers.find(offer=>offer.id===acquireOfferId);
  useEffect(()=>{if(acquireOffer?.purchased)setAcquireOfferId(null);},[acquireOffer?.purchased]);
  const requestHiddenPurchase=(id:string)=>{const offer=currentEvent?.hiddenShop?.offers.find(o=>o.id===id);if(!offer||busy||!currentEvent||hiddenShopAvailability(currentEvent.hiddenShop!,offer,tower!.coins,tower!.growthPoints)!=='구매 가능')return;if(offer.category==='held-item'||offer.category==='vitamin')setAcquireOfferId(id);else void submit({type:'hidden-shop-purchase',runId:run!.id,eventId:currentEvent.id,productId:id});};
  useEffect(()=>{if(run?.state==='battle' && !busy && !playing && battle?.status==='waiting')selectAction();},[battle?.requestId,busy,playing,tab,run?.state]);
  useLayoutEffect(()=>{if(run && ['recruit','select'].includes(run.state) && !run.event && !playing && !recruitMessage && (!hasResult || acknowledgedResult===battle?.id))setStageOpen(true);else setStageOpen(false);},[run?.state,run?.floor,run?.event?.id,acknowledgedResult,battle?.id,playing,recruitMessage]);
  useGameKeyboard('.battle-room .event-choices button,.battle-room .action-grid button,.battle-room .battle-command-back,.battle-room .gimmick-toggle,.battle-room .tera-toggle,.battle-room .command-area>.primary-button',2,!!tower && !!run && (['battle','select','recruit'].includes(run.state) || (!!hasResult && acknowledgedResult!==battle?.id && run.state!=='cleared')),(event,cursor)=>{
    const key=event.key.toLowerCase();
    if(recruitMessage)return true;
    if(currentEvent?.hiddenShop && ['1','2','3','4','5','x','z','enter','b'].includes(key)){
      event.preventDefault();if(busy)return true;
      if(key==='b'||['z','enter'].includes(key)&&cursor?.hasAttribute('data-open-bag')){document.querySelector<HTMLButtonElement>('.battle-room [data-open-bag]')?.click();return true;}
      if(/^[1-5]$/.test(key)){const id=currentEvent.hiddenShop.offers[Number(key)-1]?.id;if(id){const button=document.querySelector<HTMLButtonElement>(`.battle-room [data-shop-offer="${id}"]`);selectGameCursor(button);button?.scrollIntoView({block:'nearest',inline:'nearest'});}return true;}
      if(key==='x'||cursor?.hasAttribute('data-hidden-shop-leave')){void submit({type:'event-choice',runId:run!.id,eventId:currentEvent.id,choice:'leave'});return true;}
      const offer=currentEvent.hiddenShop.offers.find(offer=>offer.id===(cursor?.dataset.shopOffer??shopOfferId));
      if(offer)requestHiddenPurchase(offer.id);
      return true;
    }
    if(currentEvent?.challengers && currentEvent.phase==='choice' && eventSelection===currentEvent.id && ['1','2','3','4','x','z','enter'].includes(key)){
      event.preventDefault();if(busy)return true;
      if(['1','2','3'].includes(key)){const button=document.querySelector<HTMLButtonElement>(`.battle-room [data-challenger="${currentEvent.challengers[Number(key)-1]?.id}"]`);selectGameCursor(button);return true;}
      const choice=key==='4'||key==='x'?'back':cursor?.dataset.challenger??challengerId;
      if(choice)void submit({type:'event-choice',runId:run!.id,eventId:currentEvent.id,choice});return true;
    }
    if(!['x','a','s','c'].includes(key))return false;
    if(currentEvent){event.preventDefault();if(key==='x')setEventSelection(null);return true;}
    event.preventDefault();if(event.repeat)return true;
    if(key==='c' && battle){fieldHeld.current=true;setShowField('hold');return true;}
    if(key==='s'){setShowLog(true);return true;}
    if(busy || playing)return true;
    if(key==='a' && tab==='moves' && battle){
      const kinds=Array.from(document.querySelectorAll<HTMLButtonElement>('.gimmick-dock button[data-gimmick]:not(:disabled)')).map(button=>button.dataset.gimmick as Gimmick);
      setGimmick(kinds[kinds.indexOf(gimmick as Gimmick)+1] ?? null);return true;
    }
    if(key==='x'){effect('cancel');if(showField){fieldHeld.current=false;setShowField(null);}else if(tab!=='root' && !forceSwitch){setGimmick(null);setTab('root');}else setBattleMenu(true);}
    return true;
  },cursor=>{if(cursor.dataset.command)setFocusedCommand(cursor.dataset.command);if(currentEvent?.challengers&&currentEvent.phase==='choice'&&cursor.dataset.challenger)focusChallenger(cursor.dataset.challenger);if(currentEvent?.hiddenShop&&cursor.dataset.shopOffer)focusShopOffer(cursor.dataset.shopOffer);});

  if(!tower) return <main className="settings-screen" aria-busy={loading}>
    {error ? <div className="error-banner" role="alert">{error}<button onClick={()=>{setLoading(true);refresh().then(()=>setError('')).catch(e=>setError(e.message)).finally(()=>setLoading(false));}}>다시 연결</button></div> : <p role="status">저장된 도전을 불러오는 중…</p>}
  </main>;
  if(tower && run?.state === 'cleared'&&!recruitMessage) return <><TowerClear tower={tower} onNewRun={()=>{ignoredResult.current=battle?.id ?? null;setBattle(null);setTower({...tower,run:null});setSelected([]);setAcknowledgedResult(null);setRecruitMessage('');}}/></>;
  if(tower && !['battle','recruit','select','cleared'].includes(run?.state ?? '') && !(hasResult && acknowledgedResult!==battle?.id)) {
    return <Pokedex mode="selection" entries={entries} initialTower={tower} startError={error} onStart={(names,rule)=>submit({type:'start',selected:names,rule})}/>;
  }

  return <div className="app-shell battle-room battle-live">
    <div className="workspace">
      <main>
        {acquireOffer&&currentEvent&&run&&<ItemAcquisitionDialog run={run} name={acquireOffer.name} item={acquireOffer.category==='held-item'?acquireOffer.id.replace(/^item-/,''):undefined} vitamin={acquireOffer.category==='vitamin'} busy={busy} error={error} onClose={()=>setAcquireOfferId(null)} onAcquire={(destination,species)=>void submit({type:'hidden-shop-purchase',runId:run.id,eventId:currentEvent.id,productId:acquireOffer.id,destination,species})}/>}
        {error && <div className="error-banner" role="alert">{error}<button onClick={() => { setLoading(true); refresh().then(() => setError('')).catch(e => setError(e.message)).finally(() => setLoading(false)); }}>다시 연결</button></div>}

        {hasResult && acknowledgedResult !== battle!.id && <BattleResultDialog key={battle!.id} battle={battle!} tower={tower} busy={busy} onRetry={()=>void submit({type:'retry',runId:run!.id,battleId:battle!.id})} onContinue={() => {if(run?.retries?.canRetry)void submit({type:'finish-loss',runId:run.id});else setAcknowledgedResult(battle!.id);}} />}

        {stageOpen && !recruitMessage && tower && run && !run.event && ['recruit','select'].includes(run.state) && <BattleStage entries={entries} key={`${run.id}-${run.floor}-${run.state}`} tower={tower} selected={selected} setSelected={setSelected} busy={busy} submit={submit} error={error}/>}
        {battleMenu && <PokedexDialog title="배틀 메뉴" onClose={()=>{setBattleMenu(false);}}><div className="dex-action-options"><button data-initial-focus onClick={()=>{setBattleMenu(false);}}>계속하기</button><button disabled={busy} onClick={()=>{setBattleMenu(false);setAbandonConfirm(true);}}>도전 포기</button><button onClick={()=>router.push('/pokedex?from=battle')}>포켓몬 도감</button><button onClick={()=>router.push('/settings')}>설정</button><button onClick={()=>router.push('/')}>타이틀</button></div></PokedexDialog>}
        {abandonConfirm && tower && run && <PokedexDialog title="도전을 포기할까요?" onClose={()=>setAbandonConfirm(false)}><p>{restartNotice(tower)}</p><div className="dex-action-options"><button onClick={()=>setAbandonConfirm(false)}>계속 도전</button><button disabled={busy} onClick={()=>{setAbandonConfirm(false);void submit({type:'abandon',runId:run.id});}}>포기하기</button></div></PokedexDialog>}
        {showLog && <PokedexDialog title="배틀 기록" large onClose={()=>{setShowLog(false);}}><BattleMessages messages={battle?.messages ?? []} playing={false} turn={battle?.turn ?? 0} historyOnly/></PokedexDialog>}
        <div className="game-grid">
          <section className="battle-panel" aria-label={currentEvent?'이벤트':'배틀'} data-command-mode={currentEvent?'event':tab} data-resolving={!currentEvent&&(busy || playing)} data-event={!!currentEvent} data-preparing={floorPreparation||!!recruitMessage||undefined} data-testid={currentEvent?'run-event':undefined} data-phase={currentEvent?.phase}>
            <div className="panel-top"><div className="battle-progress"><strong>{run ? `${run.floor} / ${run.totalFloors}층` : '타워 도전'}</strong><span data-testid="battle-rule">{battleRules[run?.rule??'chaos'].name}</span><span className="battle-coins">{tower?.coins.toLocaleString() ?? 0}코인</span><span data-testid="battle-growth-points">성장 {tower?.growthPoints.toLocaleString()??0}P</span></div><button className="battle-menu-trigger battle-settings-trigger" onClick={()=>setBattleMenu(true)} aria-label="배틀 메뉴 · 설정"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 3-1 3-3 1-2 3 2 2-1 3 2 3 3-1 3 2 3-2 3 1 2-3-1-3 2-2-2-3-3-1-1-3H9Z"/><circle cx="12" cy="12" r="3"/></svg></button></div>
            <div className="arena" data-playing={playing} data-raid-transition={motion?.raidPhase} data-raid-motion={motion?.raidPhase?motion.kind:undefined} data-scenery={scenery} {...fieldTouch} onPointerDown={event=>{if(!(event.target as HTMLElement).closest('.battle-field-overlay,button'))fieldTouch.onPointerDown(event);}}>
          {!currentEvent&&<aside className="right-column">
            <section className="team-panel" aria-label="보유 포켓몬 6칸"><div className="team-list">{Array.from({length:6},(_,i)=>{
              const pokemon=team[i];
              if(!pokemon)return <div className="team-member is-empty" key={i} aria-label={`${i+1}번 빈 슬롯`}><span className="team-empty">＋</span><span className="team-status">빈 슬롯</span></div>;
              const entered=preparing ? selected.includes(collectionSpecies(pokemon.species)) : !!battle?.team.some(p=>p.species===pokemon.species),fainted=entered && health(pokemon.condition).percent===0;
              const state=!entered?'미출전':fainted?'기절':pokemon.active?'출전 중':'출전';
              return <div className={`team-member ${!entered || fainted ? "is-muted" : ""} ${pokemon.active && !fainted ? "is-active" : ""}`} key={pokemon.species} title={`${battlePokemonName(pokemon.displaySpecies??pokemon.species)} · ${state}`} aria-label={`${battlePokemonName(pokemon.displaySpecies??pokemon.species)} · ${state}`} data-team-state={state}><Sprite shiny={pokemon.shiny} name={pokemon.displaySpecies??pokemon.species}/><span className="team-status">{state}</span></div>;
            })}</div><TrainerEquipment items={run?.trainerEquipment??[]}/></section>
            {battle && !currentEvent && <div className="opponent-heading"><div className="enemy-trainer" data-opponent-kind={run?.boss ? "boss" : run?.trainer?.kind ?? "normal"}><span className="opponent-marker" aria-hidden="true">VS</span><strong>{run?.raid?'레이드 포켓몬':trainerLabel(run?.boss ?? run?.trainer ?? battleTrainer(battle.id))}</strong></div></div>}
            <div className="tip"><span>TRAINER TIP</span><p>상대의 약점을 노려보세요.<br />타입 상성에 따라 공격의 효과가 달라집니다.</p></div>
          </aside>}
              {battle && !currentEvent && <FieldInspection battle={battle} open={!!showField} held={showField==='hold'} touchHeld={showField==='touch'} onClose={()=>{fieldHeld.current=false;setShowField(null);}}/>}
              <div className="stadium-backdrop" aria-hidden="true"><div className="stadium-lights"/><div className="field-horizon"/><div className="stadium-field"/><div className="stadium-details"><i/><i/><i/></div></div><span className="arena-label">{String(run?.floor ?? 1).padStart(2,'0')}F / {arenaNames[scenery]}</span>
              {!currentEvent&&<><div className="arena-orbit orbit-one" aria-hidden="true" /><div className="arena-orbit orbit-two" aria-hidden="true" /></>}
              {currentEvent ? <RunEventScene selecting={eventSelection===currentEvent.id} event={currentEvent} portalActivationMs={portalActivation?.eventId===currentEvent.id?portalActivation.duration:undefined} busy={busy} coins={tower.coins} growthPoints={tower.growthPoints} shopOfferId={shopOfferId} onShopFocus={focusShopOffer} challengerId={challengerId}/> : !trainerIntro && !preparing && battle && active && battle.opponent ? <>
                <HealthCard pokemon={battle.opponent} enemy raidReset={motion?.side==='enemy'&&!!motion.hpReset} field={battle.field} faintPending={battle.pendingFaints?.includes('enemy')} />
                {motion && ['dynamax-recall','dynamax-ball','dynamax-release','dynamax-grow'].includes(motion.kind) && <div className={`dynamax-atmosphere atmosphere-${motion.kind}`} aria-hidden="true"><i/><b/></div>}
                <div className="enemy-position"><span key={`enemy-${frameNumber}`} style={{['--tera-color' as string]:motion ? teraColors[motion.color[0].toUpperCase()+motion.color.slice(1)] : undefined}} className={`motion-wrap ${motion?.side === 'enemy' ? `motion-${motion.kind}` : ''}`}>{motion?.kind === 'switch' && motion.sendOut!==false && motion.side === 'enemy' && <SendOut />}<Sprite shiny={battle.opponent.shiny} name={battle.opponent.displaySpecies ?? battle.opponent.species} animated dynamax={battle.opponent.dynamax} terastallized={battle.opponent.terastallized} condition={battle.opponent.condition} className={health(battle.opponent.condition).percent === 0 && !battle.pendingFaints?.includes('enemy') ? 'fainted' : ''} /><PokemonFeedback motion={motion?.side === 'enemy' ? motion : null} /></span>{battle.opponent.shiny&&motion?.kind==='switch'&&motion.sendOut!==false&&(motion.side==='enemy'||battle.turn===0)&&<ShinySparkles key={'enemy-shiny-'+frameNumber}/>}</div>
                <div className="player-position"><span key={`player-${frameNumber}`} style={{['--tera-color' as string]:motion ? teraColors[motion.color[0].toUpperCase()+motion.color.slice(1)] : undefined}} className={`motion-wrap ${motion?.side === 'player' ? `motion-${motion.kind}` : ''}`}>{motion?.kind === 'switch' && motion.sendOut!==false && motion.side === 'player' && <SendOut />}<Sprite shiny={active.shiny} name={active.displaySpecies ?? active.species} back animated dynamax={active.dynamax} terastallized={active.terastallized} condition={active.condition} className={health(active.condition).percent === 0 && !battle.pendingFaints?.includes('player') ? 'fainted' : ''} /><PokemonFeedback motion={motion?.side === 'player' ? motion : null} /></span>{active.shiny&&motion?.kind==='switch'&&motion.sendOut!==false&&(motion.side==='player'||battle.turn===0)&&<ShinySparkles key={'player-shiny-'+frameNumber}/>}</div>
                {active.item && megaStones[active.item] && <div className="gimmick-preload" aria-hidden="true"><Sprite name={megaStones[active.item].forme} back animated/></div>}
                {motion?.kind.startsWith('tera-') && <div className={`tera-atmosphere atmosphere-${motion.kind}`} style={{['--tera-color' as string]:teraColors[motion.color[0].toUpperCase()+motion.color.slice(1)]}} aria-hidden="true"/>}
                {motion?.kind.startsWith('mega-') && <div className={`mega-atmosphere atmosphere-${motion.kind}`} aria-hidden="true"/>}
                {motion?.kind==='mega-flash' && <div className="mega-arena-flash" aria-hidden="true"/>}{motion?.raidPhase==='aura' && <div className={`raid-aura-atmosphere aura-${motion.kind}`} aria-hidden="true"/>}
                <MoveVisuals motion={motion} speed={playbackSpeed.current}/>
                <HealthCard pokemon={active} percentage={playing} team={battle.team} faintPending={battle.pendingFaints?.includes('player')} />
                {notice && <div key={`notice-${frameNumber}`} className={`effect-notice notice-${notice.side} notice-${notice.kind}`} role="status" data-testid="effect-notice"><span>{notice.kind === 'ability' ? '특성' : '도구'}</span><p>{notice.side === 'enemy' ? '상대 ' : ''}{pokemonName(notice.actor.split(': ')[1])}의<strong>{notice.label}</strong></p></div>}

              </> : null}
              {trainerIntro && <div className="trainer-entrance" data-testid="trainer-entrance" data-phase={trainerIntro.phase}><div className="intro-trainer intro-enemy"><BossPortrait boss={trainerIntro.boss}/><span className="trainer-thrown-ball"><Ball/></span></div><div className="intro-trainer intro-player"><PlayerPortrait/><span className="trainer-thrown-ball"><Ball/></span></div></div>}

            </div>
            {currentEvent && run ? <RunEventPanel key={currentEvent.id} event={currentEvent} runId={run.id} busy={busy} challengerId={challengerId} onHiddenPurchase={requestHiddenPurchase} bagButton={<BagButton run={run} busy={busy} submit={submit} error={error}/>} onChallengerFocus={focusChallenger} shopOfferId={shopOfferId} coins={tower.coins} growthPoints={tower.growthPoints} selecting={eventSelection===currentEvent.id} onChoose={()=>setEventSelection(currentEvent.id)} submit={submit}/> : <BattleMessages messageKey={`${run?.id}:${run?.floor}:${run?.state}:${battle?.id}:${trainerIntro?'intro':playing?'playback':preparationMessage?'preparation':recruitMessage?'recruit':'idle'}`} confirmation={recruitMessage?'recruit':'intro'} dialogueLabel={recruitMessage?'영입 결과':undefined} onConfirm={recruitMessage?()=>setRecruitMessage(''):trainerIntro?.phase==='enter'?()=>introContinue.current?.():undefined} onSkip={skipPlayback} key={`${run?.id}-${run?.floor}-${run?.state}-${battle?.id ?? 'preparing'}`} messages={battle?.messages ?? []} playing={playing} turn={battle?.turn ?? 0} announcement={commandMessage || preparationMessage || recruitMessage || (announcement ?? (!playing&&done&&battle?.winner==='Player'?'배틀에서 승리했다!':null) ?? (!busy && !done && tab==='root' && active ? `${pokemonName(active.species)}, 무엇을 할까요?` : null))} />}
            {!currentEvent && !floorPreparation && !recruitMessage && !hasResult && !(busy || playing) && <div className="command-area">
              {!battle || done || broken ? loading || !tower ? <p>저장된 도전을 불러오는 중…</p> : broken ? <div><p role="alert">{battle?.error}</p><button className="secondary-button" onClick={() => refresh().catch(e => setError(e.message))}>배틀 다시 불러오기</button></div> : <button className="primary-button" data-tutorial="recruit-open" onClick={()=>setStageOpen(true)}>{run?.state==='recruit' ? '영입 선택' : '다음 층 준비'}</button>
              : <BattleCommands onRun={()=>setCommandMessage("안 돼! 다른 사람과의 배틀 중에 도망칠 순 없어!")} equipment={run?.trainerEquipment??[]} rule={run?.rule} itemBag={run?.battleItems} battle={battle} mode={tab} busy={busy} forceSwitch={forceSwitch} focused={focusedCommand} gimmick={gimmick} onGimmick={setGimmick} onMode={mode=>{setCommandMessage(null);setGimmick(null);setTab(mode);}} onFocus={setFocusedCommand} onSend={command=>{setCommandMessage(null);send(command);}}/>}
            </div>}
          </section>


        </div>
        <GameMenuBar context={recruitMessage?'recruit-result':currentEvent?'run-event':trainerIntro?.phase==='enter'?'battle-intro':'battle'} controls={recruitMessage||trainerIntro?.phase==='enter'||currentEvent?.phase==='reward'||currentEvent?.phase==='choice'&&!currentEvent.choiceId&&(!!(currentEvent.villain||currentEvent.hiddenBoss||currentEvent.raid)||!!currentEvent.challengers&&eventSelection!==currentEvent.id)?[{key:'Enter / Z',label:'계속'}]:currentEvent?.challengers&&currentEvent.phase==='choice'?[{key:'↑ / ↓',label:'선택'},{key:'1–3',label:'확인'},{key:'Enter / Z',label:'도전'},{key:'X',label:'돌아가기'}]:currentEvent?[{key:'방향키',label:'선택'},{key:'Enter / Z',label:'결정'}]:[{key:'방향키',label:'이동'},{key:'Enter / Z',label:'결정'},{key:'X',label:'취소/메뉴'},...(gimmickHint?[{key:'A',label:gimmickHint}]:[]),{key:'S',label:'로그'},{key:'C',label:'필드'},{key:'Shift',label:'건너뛰기'}]}/><footer><span>Fan-made · <a href="https://github.com/PokeAPI/sprites" target="_blank" rel="noreferrer">Sprites: PokéAPI</a> / <a href="https://play.pokemonshowdown.com/sprites/" target="_blank" rel="noreferrer">Smogon</a> · <a href="https://github.com/smogon/pokemon-showdown" target="_blank" rel="noreferrer">Battle: Showdown</a></span></footer>
      </main>
    </div>
  </div>;
}

export default function BattleGame(props:Parameters<typeof BattleGameContent>[0]){
 return <GameMenuProvider><BattleGameContent {...props}/></GameMenuProvider>;
}
