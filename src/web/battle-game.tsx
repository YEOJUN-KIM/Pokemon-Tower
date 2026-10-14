'use client';
import {TrainerEquipment} from './trainer-equipment';
import {currentTypes} from './battle-types';
import {collectionSpecies} from '../data/selectable-forms';
import {TypeBadge} from './type-badge';
import {battleRules} from '../data/run-rules';
import {themeLabel} from '../data/tower-themes';
import {progressionLabel} from '../data/tower-progression';
import {teraColors} from '../data/tera';
import {TeraCrystal} from './tera-crystal';
import {megaStones,type Gimmick} from '../data/gimmicks';


import { useEffect, useRef, useState } from 'react';
import type { BattleResponse, BattleView, PokemonView, TowerView, BossView } from './contracts';
import {BossPortrait,PlayerPortrait,trainerAppearance} from './boss-dialog';
import {battleTrainer,trainerLabel} from './trainer-samples';
import {TowerControls} from './tower-controls';
import {BattleResultDialog, ResultBanner} from './battle-result';
import {TowerClear} from './tower-clear';
import {useRouter} from 'next/navigation';
import { health, pokemonName, battlePokemonName, species } from './catalog';
import {PokemonImage} from './pokemon-image';
import {MoveVisuals} from './move-visuals';
import {pokemonBattleScale} from '../data/pokemon-size';
import {BattleMessages} from './battle-messages';
import {RecruitCelebration,type Recruitment} from './recruit-dialog';
import type {EffectNotice} from './battle-effects';
import {presentationFrames, type Motion} from './battle-presentation';
import {moveInfo} from '../data/move-info';
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
import {battleStatus,battleStatusNames} from './battle-status';
import {arenaTheme,arenaNames,trainerMusic,revealedRare,strongerRare} from './encounter-presentation';
import type {MusicTrack} from './music-score';
import {BattleCommands,type CommandMode} from './battle-commands';
import {readPlaybackSpeed,playbackDuration,type PlaybackSpeed} from './playback-settings';
import {useTouchHold} from './use-touch-hold';

function Ball({small = false}: {small?: boolean}) {
  return <span className={`pokeball ${small ? 'small' : ''}`} aria-hidden="true"><i /></span>;
}

function SendOut() {
  return <span className="send-out" aria-hidden="true"><span className="release-ball"><i /><b /></span><span className="release-ring" /></span>;
}

function PokemonFeedback({motion}: {motion:Motion | null}) {
  if(!motion || !['heal','stat-up','stat-down'].includes(motion.kind))return null;
  const glyph=motion.kind === 'heal' ? '+' : motion.kind === 'stat-down' ? '↓' : '↑';
  return <span className={`pokemon-feedback feedback-${motion.kind}`} role="status"><span className="feedback-particles" aria-hidden="true"><i>{glyph}</i><i>{glyph}</i><i>{glyph}</i></span><strong>{motion.label}</strong></span>;
}

function ShinySparkles(){return <span className="shiny-sparkles shiny-sendout" aria-label="이로치 등장"><b className="shiny-light-ring"/><b className="shiny-entry-flash"/>{Array.from({length:9},(_,i)=><i key={i}>✦</i>)}</span>;}

function Sprite({shiny=false,name, back = false, animated=false,className = '',condition='',dynamax=false,terastallized}: {shiny?:boolean;name: string; back?: boolean;animated?:boolean; className?: string;condition?:string;dynamax?:boolean;terastallized?:string}) {
  const [crownTop,setCrownTop]=useState(32);
  const id=species[name]?.id,fallback=<span className="sprite-fallback"><Ball /><small>{pokemonName(name)}</small></span>;
  const status=battleStatus(condition),scale=pokemonBattleScale(name),growth=Math.min(1.85,(back ? .88 : .61)/(.88*(back ? .74 : .60)*scale));
  return <span className={`sprite ${className} ${dynamax ? 'dynamaxed' : ''} ${terastallized ? 'terastallized' : ''}`} style={{['--dynamax-scale' as string]:growth,['--tera-color' as string]:teraColors[terastallized ?? ''],['--tera-crown-top' as string]:crownTop+'%'}} data-tera={terastallized || undefined} data-dynamax={dynamax || undefined} data-status={status || undefined} title={status ? `${pokemonName(name)} · ${battleStatusNames[status]}` : undefined}>{id ? <PokemonImage shiny={shiny} id={id} spriteKey={species[name]?.spriteKey} name={pokemonName(name)} back={back} animated={animated} sizeScale={animated ? pokemonBattleScale(name) : 1} stableFrame={animated} onVisibleTop={terastallized ? setCrownTop : undefined} matchBaseHeight={animated && name.includes("-Mega")} fallback={fallback}/> : fallback}{terastallized && <span className="tera-crown"><TeraCrystal type={terastallized}/></span>}</span>;
}

function HealthCard({pokemon, enemy = false, percentage = false,field,team,faintPending=false}: {pokemon: Pick<PokemonView, 'species' | 'displaySpecies' | 'condition' | 'gender' | 'types' | 'terastallized'>; enemy?: boolean; percentage?:boolean;field?:BattleView['field'];team?:PokemonView[];faintPending?:boolean}) {
  const hp = health(pokemon.condition);
  const critical=hp.percent>0 && hp.percent<=30;
  return <div className={`health-card ${enemy ? 'enemy-health' : 'player-health'}`} data-hp-state={hp.percent===0&&!faintPending?'fainted':critical||faintPending?'critical':hp.percent<50?'caution':'healthy'}>
    <div className="health-heading"><strong>{battlePokemonName(pokemon.displaySpecies ?? pokemon.species)}{pokemon.gender && pokemon.gender!=='N' && <i className="pokemon-gender" data-gender={pokemon.gender} aria-label={pokemon.gender==='M'?'수컷':'암컷'}>{pokemon.gender==='M'?'♂':'♀'}</i>}<span className="health-types" aria-label="현재 타입">{currentTypes(pokemon).map(type=><TypeBadge key={type} type={type}/>)}</span></strong><span>Lv. 50</span></div>
    {hp.status && <div className="health-status"><b data-status={battleStatus(pokemon.condition)}>{hp.status}</b></div>}
    <div className="hp-row"><span>HP</span><div className="hp-track" role="progressbar" aria-label={`${battlePokemonName(pokemon.displaySpecies ?? pokemon.species)} HP`} aria-valuenow={Math.round(hp.percent)} aria-valuemin={0} aria-valuemax={100}>
      <i style={{width: `${hp.percent}%`, background: hp.percent <= 30 ? '#ef6661' : hp.percent < 50 ? '#e7ad47' : '#55bd98'}} /></div></div>
    <div className="hp-number"><span>{enemy || percentage ? `${Math.ceil(hp.percent)}%` : hp.text}</span></div>
    {(enemy || team) && <div className={enemy ? 'opponent-balls' : 'opponent-balls player-balls'} role="group" aria-label={enemy ? `상대 남은 포켓몬 ${(field?.opponentSize ?? 3)-(field?.faintedOpponents.length ?? 0)} / ${field?.opponentSize ?? 3}` : `내 남은 포켓몬 ${team!.filter(member=>health(member.condition).percent>0).length} / ${team!.length}`}>{Array.from({length:enemy ? field?.opponentSize ?? 3 : team!.length},(_,index)=>{const fainted=enemy ? index>=(field?.opponentSize ?? 3)-(field?.faintedOpponents.length ?? 0) : health(team![index].condition).percent===0;return <span key={index} className={fainted ? 'ball-fainted' : ''} aria-label={fainted ? '기절' : '생존'}><Ball small/></span>;})}</div>}
  </div>;
}

export default function BattleGame({prepareNewRun = false,entries}: {prepareNewRun?: boolean;entries:PokedexEntry[]}) {
  const [battle, setBattle] = useState<BattleView | null>(null);
  const [tower, setTower] = useState<TowerView | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [motion, setMotion] = useState<Motion | null>(null);
  const [notice, setNotice] = useState<EffectNotice | null>(null);
  const [announcement,setAnnouncement] = useState<string | null>(null);
  const [frameNumber, setFrameNumber] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [trainerIntro,setTrainerIntro]=useState<{boss?:BossView;phase:'enter'|'throw'}|null>(null);
  const skip = useRef(false);
  const playbackWait=useRef<(()=>void)|null>(null);
  const introContinue=useRef<(()=>void)|null>(null);
  useEffect(()=>{
    if(trainerIntro?.phase!=='enter')return;
    const tap=(event:MouseEvent)=>{if(!window.matchMedia('(max-width:760px)').matches||document.querySelector('dialog[open]'))return;event.preventDefault();event.stopImmediatePropagation();introContinue.current?.();};
    document.addEventListener('click',tap,true);return ()=>document.removeEventListener('click',tap,true);
  },[trainerIntro?.phase]);
  function skipPlayback(){skip.current=true;introContinue.current?.();playbackWait.current?.();stopCry();stopEffects();}
  useEffect(()=>{if(trainerIntro?.phase!=='enter')return;const confirm=(event:KeyboardEvent)=>{if(!['enter','z'].includes(event.key.toLowerCase()) || event.ctrlKey || event.altKey || event.metaKey)return;event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)introContinue.current?.();};document.addEventListener('keydown',confirm,true);return ()=>document.removeEventListener('keydown',confirm,true);},[trainerIntro?.phase]);
  const playbackSpeed=useRef<PlaybackSpeed>(1);
  useEffect(()=>{if(!playing)return;const frame=requestAnimationFrame(()=>{document.querySelector('.arena')?.getAnimations({subtree:true}).forEach(animation=>{const target=(animation.effect as KeyframeEffect|null)?.target;animation.updatePlaybackRate(target instanceof Element && (target.closest('.effect-notice')||target.matches('.health-card'))?1:playbackSpeed.current);});});return ()=>cancelAnimationFrame(frame);},[playing,frameNumber]);
  const waitPlayback=(duration:number,notice=false)=>new Promise<void>(resolve=>{const done=()=>{clearTimeout(timer);playbackWait.current=null;resolve();};const timer=setTimeout(done,playbackDuration(duration,playbackSpeed.current,notice));playbackWait.current=done;});
  const mounted = useRef(true);
  const [error, setError] = useState('');
  const [acknowledgedResult, setAcknowledgedResult] = useState<string | null>(null);
  const [recruitment,setRecruitment]=useState<Recruitment | null>(null);
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
  const hasResult = done && tower && run && ['recruit', 'lost', 'cleared'].includes(run.state);
  const preparing = !battle || !run || !['battle', 'recruit'].includes(run.state);
  const team:PokemonView[] = (run?.roster ?? selected).map(name => (!preparing ? battle?.team.find(p=>collectionSpecies(p.species)===name) : undefined) ?? {species:name,displaySpecies:run?.partnerForms?.[name],condition:'1/1',active:false});
  const gimmickHint=({mega:'메가진화',dynamax:'다이맥스',tera:'테라스탈',z:'Z기술',chaos:'변신 선택',basic:''} as const)[run?.rule ?? 'chaos'];
  const active = battle?.team.find(p => p.active);
  const encounterMusic=trainerMusic(run?.boss ?? run?.trainer);
  const scenery=arenaTheme(run?.floor ?? 1,run?.totalFloors ?? 10,encounterMusic);
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
  useEffect(() => { setGimmick(null);setTab(forceSwitch ? 'switch' : 'root'); }, [forceSwitch, battle?.requestId]);
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
    if(!isAction) {
      const boss=battleTrainer(data.battle.id,data.tower.run?.boss ?? data.tower.run?.trainer);
      setStageOpen(false);setBattle(initialView);setTrainerIntro({boss,phase:'enter'});setAnnouncement(trainerAppearance(boss));
      await new Promise<void>(resolve=>{introContinue.current=()=>{introContinue.current=null;resolve();};});
      if(!skip.current && mounted.current){setTrainerIntro({boss,phase:'throw'});setAnnouncement('트레이너들이 포켓몬을 내보냈다!');await waitPlayback(550);}
      setTrainerIntro(null);
    }
    for(const frame of frames) {
      if(skip.current || !mounted.current)break;
      setBattle(frame.view);setMotion(frame.motion);setNotice(frame.notice ?? null);setAnnouncement(frame.announcement ?? null);setFrameNumber(n=>n+1);
      if(frame.motion) {
        const info=frame.motion.move ? moveInfo[frame.motion.move] : undefined;
        effect(frame.motion.kind,frame.motion.color,{category:info?.category,power:info?.power,impact:frame.motion.impact});
        if(['switch','faint'].includes(frame.motion.kind)) {
          const name=frame.motion.side==='enemy' ? frame.view.opponent?.species : frame.view.team.find(p=>p.active)?.species;
          if(name && species[name])playCry(species[name].id);
        }
      }
      if(frame.duration || frame.notice)await waitPlayback(frame.duration,!!frame.notice);
    }
    if(skip.current)stopCry();
    if(mounted.current){setMotion(null);setNotice(null);setAnnouncement(null);setPlaying(false);setBattle(data.battle);}
  }

  async function submit(body: Record<string, unknown>) {
    if (requestLock.current) return;
    requestLock.current = true;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/battle', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
      });
      const data: BattleResponse = await response.json();
      if (!response.ok) {
        await refresh();
        throw new Error(data.error ?? '행동을 처리하지 못했습니다.');
      }
      if(data.battle && (body.type === 'action' || body.type === 'start' || body.type === 'enter')) {
        await playBattle(data,body.type==='action');
      }
      if(!mounted.current)return;
      setMotion(null);setNotice(null);setAnnouncement(null);setPlaying(false);setBattle(data.battle);
      setTower(data.tower);
      if(body.type==='finish-loss'&&data.battle)setAcknowledgedResult(data.battle.id);
      if(body.type === 'recruit' && typeof body.chosen === 'string' && data.tower.run && (body.collectOnly || data.tower.run.roster.includes(body.chosen))) {
        setRecruitment({archiveOnly:body.collectOnly===true,chosen:body.chosen,replaced:typeof body.replaced === 'string' ? body.replaced : null,roster:data.tower.run.roster,cleared:data.tower.run.state === 'cleared',ivGain:data.tower.run.lastIVGain,moveGain:data.tower.run.lastMoveGain,alreadyOwned:run?.roster.includes(body.chosen),newSpecies:!tower?.unlocked.includes(body.chosen),hiddenBossPending:data.tower.run.hiddenBossPending});
      }
      if(body.type === 'action' && data.battle?.status === 'complete') effect(data.battle.winner === 'Player' ? 'victory' : 'defeat');
      if (body.type === 'start' && prepareNewRun) router.replace('/battle', {scroll:false});
    } catch (e) { setError(e instanceof Error ? e.message : '서버에 연결할 수 없습니다. 새로고침해 주세요.'); }
    finally { if(mounted.current){setBusy(false);setPlaying(false);setTrainerIntro(null);setMotion(null);setNotice(null);setAnnouncement(null);} requestLock.current = false; }
  }
  const send = (action: string) => {if(action.startsWith('move ') && gimmick && battle?.actions.some(a=>a.command===action+' '+gimmick))action+=' '+gimmick;setGimmick(null);setTab('root');if(action.startsWith('move '))lastMove.current=action.replace(/ (mega|dynamax|terastallize|zmove)$/,'');return submit({type: 'action', battleId: battle?.id, requestId: battle?.requestId, action});};
  const selectAction=()=>{if(document.querySelector('dialog[open]'))return;const buttons=Array.from(document.querySelectorAll<HTMLButtonElement>('.action-grid button:not(:disabled)'));selectGameCursor(buttons.find(button=>button.dataset.command===lastMove.current) ?? buttons[0] ?? document.querySelector<HTMLButtonElement>('.battle-panel .command-area>.primary-button'));};
  const focusAction=()=>requestAnimationFrame(selectAction);
  useEffect(()=>{if(run?.state==='battle' && !busy && !playing && battle?.status==='waiting')selectAction();},[battle?.requestId,busy,playing,tab,run?.state]);
  useEffect(()=>{if(run && ['recruit','select'].includes(run.state) && !recruitment && (!hasResult || acknowledgedResult===battle?.id))setStageOpen(true);else setStageOpen(false);},[run?.state,run?.floor,recruitment,acknowledgedResult,battle?.id]);
  useGameKeyboard('.battle-room .action-grid button,.battle-room .battle-command-back,.battle-room .gimmick-toggle,.battle-room .tera-toggle,.battle-room .command-area>.primary-button',2,!!tower && !!run && (['battle','select','recruit'].includes(run.state) || (!!hasResult && acknowledgedResult!==battle?.id && run.state!=='cleared')),(event,cursor)=>{
    const key=event.key.toLowerCase();if(!['x','a','s','c'].includes(key))return false;
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
  },cursor=>{if(cursor.dataset.command)setFocusedCommand(cursor.dataset.command);});

  if(!tower) return <main className="settings-screen" aria-busy={loading}>
    {error ? <div className="error-banner" role="alert">{error}<button onClick={()=>{setLoading(true);refresh().then(()=>setError('')).catch(e=>setError(e.message)).finally(()=>setLoading(false));}}>다시 연결</button></div> : <p role="status">저장된 도전을 불러오는 중…</p>}
  </main>;
  if(tower && run?.state === 'cleared' && !recruitment) return <TowerClear tower={tower} onNewRun={()=>{ignoredResult.current=battle?.id ?? null;setBattle(null);setTower({...tower,run:null});setSelected([]);setAcknowledgedResult(null);}}/>;
  if(tower && !['battle','recruit','select','cleared'].includes(run?.state ?? '') && !(hasResult && acknowledgedResult!==battle?.id)) {
    return <Pokedex entries={entries} initialTower={tower} startError={error} onStart={(names,rule)=>submit({type:'start',selected:names,rule})}/>;
  }

  return <div className={`app-shell battle-room ${run && ['battle','recruit','select'].includes(run.state) ? 'battle-live' : 'battle-between'}`}>
    <div className="workspace">
      <nav className="battle-nav" aria-label="메인 메뉴"><a href="/" aria-label="포켓몬 타워 홈"><Ball /><strong>POKÉMON TOWER</strong></a><div><a href="/pokedex">포켓몬 도감</a><a href="/settings">설정</a><a href="/">타이틀</a></div></nav>
      <main>
        {tower && <section className="tower-summary" aria-label="타워 진행"><div><span>{themeLabel(run?.theme)}</span><strong>{run ? `${run.floor} / ${run.totalFloors}층` : '출발 준비'}</strong><small>{run?.boss ? `${run.boss.title} ${run.boss.name}` : run ? (progressionLabel(run.floor,run.totalFloors) ?? '다음 층을 향해 도전하세요.') : '팀을 선택하고 타워에 도전하세요.'}</small></div><div><span>타워 코인</span><strong data-testid="wallet">{tower.coins.toLocaleString()}코인</strong></div><div><span>성장 포인트</span><strong data-testid="growth-wallet">{tower.growthPoints.toLocaleString()}P</strong></div><div><span>영구 도감</span><strong>{tower.unlocked.length}종 해금</strong></div>{run && ['battle','recruit','select'].includes(run.state) && <button className="text-button" disabled={busy} onClick={() => { if (window.confirm(restartNotice(tower))) void submit({type: 'abandon', runId: run.id}); }}>도전 종료</button>}</section>}
        {error && <div className="error-banner" role="alert">{error}<button onClick={() => { setLoading(true); refresh().then(() => setError('')).catch(e => setError(e.message)).finally(() => setLoading(false)); }}>다시 연결</button></div>}
        {run && ['select','battle','recruit'].includes(run.state) && run.upgrades.length>0 && <div className="upgrade-status" aria-label="구매한 강화">{run.upgrades.map(upgrade=><span key={upgrade.kind}>{upgrades[upgrade.kind].name} · {upgrade.remainingFloors>0 ? `${upgrade.remainingFloors}개 층 남음${run.state==='battle' ? ' (현재 층 포함)' : ''}` : '사용 완료'}</span>)}</div>}
        {hasResult && <ResultBanner battle={battle!} tower={tower} />}
        {hasResult && acknowledgedResult !== battle!.id && <BattleResultDialog key={battle!.id} battle={battle!} tower={tower} busy={busy} onRetry={()=>void submit({type:'retry',runId:run!.id,battleId:battle!.id})} onContinue={() => {if(run?.retries?.canRetry)void submit({type:'finish-loss',runId:run.id});else setAcknowledgedResult(battle!.id);}} />}
        {recruitment && <RecruitCelebration recruitment={recruitment} onContinue={()=>setRecruitment(null)} />}
        {stageOpen && tower && run && ['recruit','select'].includes(run.state) && <PokedexDialog title={run.state==='recruit' ? '승리 · 동료 영입' : `${run.floor}층 출전 준비`} large onClose={()=>{setStageOpen(false);focusAction();}}><TowerControls key={`${run.id}-${run.floor}-${run.state}`} tower={tower} selected={selected} setSelected={setSelected} busy={busy} submit={submit} error={error}/></PokedexDialog>}
        {battleMenu && <PokedexDialog title="배틀 메뉴" onClose={()=>{setBattleMenu(false);}}><div className="dex-action-options"><button data-initial-focus onClick={()=>{setBattleMenu(false);}}>계속하기</button><button disabled={busy} onClick={()=>{setBattleMenu(false);setAbandonConfirm(true);}}>도전 포기</button><button onClick={()=>router.push('/pokedex?from=battle')}>포켓몬 도감</button><button onClick={()=>router.push('/settings')}>설정</button><button onClick={()=>router.push('/')}>타이틀</button></div></PokedexDialog>}
        {abandonConfirm && tower && run && <PokedexDialog title="도전을 포기할까요?" onClose={()=>setAbandonConfirm(false)}><p>{restartNotice(tower)}</p><div className="dex-action-options"><button onClick={()=>setAbandonConfirm(false)}>계속 도전</button><button disabled={busy} onClick={()=>{setAbandonConfirm(false);void submit({type:'abandon',runId:run.id});}}>포기하기</button></div></PokedexDialog>}
        {showLog && <PokedexDialog title="배틀 기록" large onClose={()=>{setShowLog(false);}}><BattleMessages messages={battle?.messages ?? []} playing={false} turn={battle?.turn ?? 0} historyOnly/></PokedexDialog>}
        <div className="game-grid">
          <section className="battle-panel" aria-label="배틀" data-command-mode={tab} data-resolving={busy || playing}>
            <div className="panel-top"><div className="battle-progress"><strong>{run ? `${run.floor} / ${run.totalFloors}층` : '타워 도전'}</strong><span data-testid="battle-rule">{battleRules[run?.rule??'chaos'].name}</span><span className="battle-coins">{tower?.coins.toLocaleString() ?? 0}코인</span></div><button className="battle-menu-trigger battle-settings-trigger" onClick={()=>setBattleMenu(true)} aria-label="배틀 메뉴 · 설정"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 3-1 3-3 1-2 3 2 2-1 3 2 3 3-1 3 2 3-2 3 1 2-3-1-3 2-2-2-3-3-1-1-3H9Z"/><circle cx="12" cy="12" r="3"/></svg></button></div>
            <div className="arena" data-playing={playing} data-scenery={scenery} {...fieldTouch} onPointerDown={event=>{if(!(event.target as HTMLElement).closest('.battle-field-overlay,button'))fieldTouch.onPointerDown(event);}}>
          <aside className="right-column">
            <section className="team-panel" aria-label="보유 포켓몬 6칸"><div className="team-list">{Array.from({length:6},(_,i)=>{
              const pokemon=team[i];
              if(!pokemon)return <div className="team-member is-empty" key={i} aria-label={`${i+1}번 빈 슬롯`}><span className="team-empty">＋</span><span className="team-status">빈 슬롯</span></div>;
              const entered=preparing ? selected.includes(collectionSpecies(pokemon.species)) : !!battle?.team.some(p=>p.species===pokemon.species),fainted=entered && health(pokemon.condition).percent===0;
              const state=!entered?'미출전':fainted?'기절':pokemon.active?'출전 중':'출전';
              return <div className={`team-member ${!entered || fainted ? "is-muted" : ""} ${pokemon.active && !fainted ? "is-active" : ""}`} key={pokemon.species} title={`${battlePokemonName(pokemon.displaySpecies??pokemon.species)} · ${state}`} aria-label={`${battlePokemonName(pokemon.displaySpecies??pokemon.species)} · ${state}`} data-team-state={state}><Sprite shiny={pokemon.shiny} name={pokemon.displaySpecies??pokemon.species}/><span className="team-status">{state}</span></div>;
            })}</div><TrainerEquipment items={run?.trainerEquipment??[]}/></section>
            {battle && <div className="opponent-heading"><div className="enemy-trainer" data-opponent-kind={run?.boss ? "boss" : run?.trainer?.kind ?? "normal"}><span className="opponent-marker" aria-hidden="true">VS</span><strong>{trainerLabel(run?.boss ?? run?.trainer ?? battleTrainer(battle.id))}</strong></div></div>}
            <div className="tip"><span>TRAINER TIP</span><p>상대의 약점을 노려보세요.<br />타입 상성에 따라 공격의 효과가 달라집니다.</p></div>
          </aside>
              {battle && <FieldInspection battle={battle} open={!!showField} held={showField==='hold'} touchHeld={showField==='touch'} onClose={()=>{fieldHeld.current=false;setShowField(null);}}/>}
              <div className="stadium-backdrop" aria-hidden="true"><div className="stadium-lights"/><div className="field-horizon"/><div className="stadium-field"/><div className="stadium-details"><i/><i/><i/></div></div><span className="arena-label">{String(run?.floor ?? 1).padStart(2,'0')}F / {arenaNames[scenery]}</span>
              <div className="arena-orbit orbit-one" aria-hidden="true" /><div className="arena-orbit orbit-two" aria-hidden="true" />
              {!trainerIntro && !preparing && battle && active && battle.opponent ? <>
                <HealthCard pokemon={battle.opponent} enemy field={battle.field} faintPending={battle.pendingFaints?.includes('enemy')} />
                {motion && ['dynamax-recall','dynamax-ball','dynamax-release','dynamax-grow'].includes(motion.kind) && <div className={`dynamax-atmosphere atmosphere-${motion.kind}`} aria-hidden="true"><i/><b/></div>}
                <div className="enemy-position"><span key={`enemy-${frameNumber}`} style={{['--tera-color' as string]:motion ? teraColors[motion.color[0].toUpperCase()+motion.color.slice(1)] : undefined}} className={`motion-wrap ${motion?.side === 'enemy' ? `motion-${motion.kind}` : ''}`}>{motion?.kind === 'switch' && motion.sendOut!==false && motion.side === 'enemy' && <SendOut />}<Sprite shiny={battle.opponent.shiny} name={battle.opponent.displaySpecies ?? battle.opponent.species} animated dynamax={battle.opponent.dynamax} terastallized={battle.opponent.terastallized} condition={battle.opponent.condition} className={health(battle.opponent.condition).percent === 0 && !battle.pendingFaints?.includes('enemy') ? 'fainted' : ''} /><PokemonFeedback motion={motion?.side === 'enemy' ? motion : null} /></span>{battle.opponent.shiny&&motion?.kind==='switch'&&motion.sendOut!==false&&(motion.side==='enemy'||battle.turn===0)&&<ShinySparkles key={'enemy-shiny-'+frameNumber}/>}</div>
                <div className="player-position"><span key={`player-${frameNumber}`} style={{['--tera-color' as string]:motion ? teraColors[motion.color[0].toUpperCase()+motion.color.slice(1)] : undefined}} className={`motion-wrap ${motion?.side === 'player' ? `motion-${motion.kind}` : ''}`}>{motion?.kind === 'switch' && motion.sendOut!==false && motion.side === 'player' && <SendOut />}<Sprite shiny={active.shiny} name={active.displaySpecies ?? active.species} back animated dynamax={active.dynamax} terastallized={active.terastallized} condition={active.condition} className={health(active.condition).percent === 0 && !battle.pendingFaints?.includes('player') ? 'fainted' : ''} /><PokemonFeedback motion={motion?.side === 'player' ? motion : null} /></span>{active.shiny&&motion?.kind==='switch'&&motion.sendOut!==false&&(motion.side==='player'||battle.turn===0)&&<ShinySparkles key={'player-shiny-'+frameNumber}/>}</div>
                {active.item && megaStones[active.item] && <div className="gimmick-preload" aria-hidden="true"><Sprite name={megaStones[active.item].forme} back animated/></div>}
                {motion?.kind.startsWith('tera-') && <div className={`tera-atmosphere atmosphere-${motion.kind}`} style={{['--tera-color' as string]:teraColors[motion.color[0].toUpperCase()+motion.color.slice(1)]}} aria-hidden="true"/>}
                {motion?.kind.startsWith('mega-') && <div className={`mega-atmosphere atmosphere-${motion.kind}`} aria-hidden="true"/>}
                {motion?.kind==='mega-flash' && <div className="mega-arena-flash" aria-hidden="true"/>}
                <MoveVisuals motion={motion} speed={playbackSpeed.current}/>
                <HealthCard pokemon={active} percentage={playing} team={battle.team} faintPending={battle.pendingFaints?.includes('player')} />
                {notice && <div key={`notice-${frameNumber}`} className={`effect-notice notice-${notice.side} notice-${notice.kind}`} role="status" data-testid="effect-notice"><span>{notice.kind === 'ability' ? '특성' : '도구'}</span><p>{notice.side === 'enemy' ? '상대 ' : ''}{pokemonName(notice.actor.split(': ')[1])}의<strong>{notice.label}</strong></p></div>}

              </> : run && ['battle','recruit','select'].includes(run.state) ? null : <div className="arena-preview"><span className="preview-number">{String(run?.floor ?? 1).padStart(2, '0')}</span><div className="preview-sprites" data-testid="team-preview" role="group" aria-label="선택한 출전 팀">
                {[0, 1, 2].map(slot => selected[slot] ? <Sprite key={slot} name={selected[slot]} /> : <span key={slot} className="sprite preview-empty" aria-label={`${slot + 1}번 미선택`}><span><Ball /><small>{slot + 1}번 미선택</small></span></span>)}
              </div><div className="preview-caption"><span>YOUR SELECTED THREE</span><strong>준비됐나요, 트레이너?</strong></div></div>}
              {trainerIntro && <div className="trainer-entrance" data-testid="trainer-entrance" data-phase={trainerIntro.phase}><div className="intro-trainer intro-enemy"><BossPortrait boss={trainerIntro.boss}/><span className="trainer-thrown-ball"><Ball/></span></div><div className="intro-trainer intro-player"><PlayerPortrait/><span className="trainer-thrown-ball"><Ball/></span></div></div>}
              {trainerIntro?.phase==='enter' && <button className="trainer-intro-confirm" onClick={()=>introContinue.current?.()}>포켓몬 내보내기</button>}

            </div>
            <BattleMessages onSkip={skipPlayback} key={battle?.id ?? 'preparing'} messages={battle?.messages ?? []} playing={playing} turn={battle?.turn ?? 0} announcement={announcement ?? (!busy && !done && tab==='root' && active ? `${pokemonName(active.species)}, 무엇을 할까요?` : null)} />
            {!(busy || playing) && <div className="command-area">
              {!battle || done || broken ? loading || !tower ? <p>저장된 도전을 불러오는 중…</p> : broken ? <div><p role="alert">{battle?.error}</p><button className="secondary-button" onClick={() => refresh().catch(e => setError(e.message))}>배틀 다시 불러오기</button></div> : <button className="primary-button" onClick={()=>setStageOpen(true)}>{run?.state==='recruit' ? '영입 선택' : '다음 층 준비'}</button>
              : <BattleCommands equipment={run?.trainerEquipment??[]} rule={run?.rule} itemBag={run?.battleItems} battle={battle} mode={tab} busy={busy} forceSwitch={forceSwitch} focused={focusedCommand} gimmick={gimmick} onGimmick={setGimmick} onMode={mode=>{setGimmick(null);setTab(mode);}} onFocus={setFocusedCommand} onSend={send}/>}
            </div>}
          </section>


        </div>
        <footer><span className="battle-keyboard-hints"><span><kbd>Enter / Z</kbd> 결정</span><span><kbd>X</kbd> 취소/메뉴</span>{gimmickHint && <span title="기술 선택 화면에서 사용 · 기술 결정 시 발동"><kbd>A</kbd> {gimmickHint}</span>}<span><kbd>S</kbd> 로그</span><span><kbd>C</kbd> 필드</span><span><kbd>Shift</kbd> 건너뛰기</span></span><span>Fan-made · <a href="https://github.com/PokeAPI/sprites" target="_blank" rel="noreferrer">Sprites: PokéAPI</a> / <a href="https://play.pokemonshowdown.com/sprites/" target="_blank" rel="noreferrer">Smogon</a> · <a href="https://github.com/smogon/pokemon-showdown" target="_blank" rel="noreferrer">Battle: Showdown</a></span></footer>
      </main>
    </div>
  </div>;
}
