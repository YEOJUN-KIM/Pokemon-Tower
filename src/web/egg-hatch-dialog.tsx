'use client';
import {useEffect,useRef,useState} from 'react';
import type {PermanentResult} from '../data/permanent-upgrades';
import {eggKindInfo} from '../data/egg-kinds';
import {statKeys,statNames} from '../data/training';
import {pokemonRarity} from '../data/pokemon-rarity';
import type {PokedexEntry} from './pokedex-data';
import {moves} from './catalog';
import {PokedexDialog} from './pokedex-dialog';
import {PokemonImage} from './pokemon-image';
import {EggVisual} from './egg-visual';

export function EggHatchDialog({result,entries,onClose}:{result:PermanentResult;entries:PokedexEntry[];onClose:()=>void}){
 const eggs=result.eggs??[];
 const [revealed,setRevealed]=useState<number[]>([]),[opening,setOpening]=useState<number[]>([]);
 const started=useRef(new Set<number>()),timers=useRef<ReturnType<typeof setTimeout>[]>([]);
 useEffect(()=>()=>timers.current.forEach(clearTimeout),[]);
 function open(indices:number[]){
  const fresh=indices.filter(i=>!started.current.has(i));if(!fresh.length)return;
  fresh.forEach(i=>started.current.add(i));setOpening(values=>[...values,...fresh]);
  const duration=window.matchMedia('(prefers-reduced-motion: reduce)').matches?80:550;
  timers.current.push(setTimeout(()=>{setRevealed(values=>[...values,...fresh]);setOpening(values=>values.filter(i=>!fresh.includes(i)));},duration));
 }
 const allOpen=revealed.length===eggs.length,openAll=()=>open(eggs.map((_,i)=>i));
 return <PokedexDialog title="알 부화 결과" className="permanent-dialog egg-hatch-dialog" large onClose={()=>allOpen?onClose():openAll()}>
  <div className="egg-hatch-heading"><p role="status" aria-live="polite">{allOpen?result.message:`알을 터치해 부화하세요 · ${revealed.length} / ${eggs.length}`}</p></div>
  <div className={`egg-results ${eggs.length===1?'single-result':''}`} data-keyboard-grid>
   {eggs.map((egg,i)=>{
    const kind=egg.eggKind??(egg.shiny?'shiny':'normal');
    if(!revealed.includes(i))return <button key={i} className="egg-sealed" data-testid="sealed-egg" data-egg-kind={kind} aria-label={`${i+1}번째 ${eggKindInfo[kind].name} 열기`} disabled={opening.includes(i)} onClick={()=>open([i])}>
     <span className="egg-slot-number">{String(i+1).padStart(2,'0')}</span><EggVisual kind={kind} cracking={opening.includes(i)}/><strong>{eggKindInfo[kind].name}</strong><small>{opening.includes(i)?'부화 중…':'터치해서 열기'}</small>
    </button>;
    const entry=entries.find(e=>e.species===egg.species),rarity=pokemonRarity(egg.species);
    const category=egg.rareCategory??rarity;
    return <article key={i} className={`egg-opened ${egg.shiny?'shiny-result':''}`} data-rarity={category} data-testid="egg-result">
     {egg.isNew&&<span className="egg-new-badge">NEW!</span>}
     <div className="hatch-sprite">{category==='legendary'&&!egg.shiny&&<><span className="egg-legendary-radiance" aria-hidden="true"/><span className="egg-legendary-stars" aria-hidden="true">{[0,1,2,3,4,5].map(n=><i key={n}>✦</i>)}</span></>}{category==='mythical'&&!egg.shiny&&<span className="egg-mythical-stars" aria-hidden="true">{[0,1,2,3].map(n=><i key={n}>✧</i>)}</span>}{entry&&<PokemonImage id={entry.id} name={entry.name} shiny={egg.shiny} animated width={100} height={eggs.length===1?100:80} maxPixelScale={2} fallback={<span>◇</span>}/>} {egg.shiny&&<span className="shiny-sparkles" aria-hidden="true">{[0,1,2,3,4].map(n=><i key={n}>✦</i>)}</span>}</div>
     <h3>{entry?.name??egg.species}{egg.shiny?' ✦':''}</h3>
     {egg.newShiny&&<div className="egg-gains"><b>이로치 해금!</b></div>}
     <dl>{statKeys.map(stat=>{const gain=egg.isNew?undefined:egg.ivGain.changes.find(change=>change.stat===stat);return <div key={stat} className={gain?'egg-stat-improved':''}><dt>{statNames[stat]}</dt><dd>{egg.ivs[stat]}{gain&&<span className="egg-stat-delta" aria-label={`기존 ${gain.from}에서 ${gain.to-gain.from} 상승`}>↑{gain.to-gain.from}</span>}</dd></div>;})}</dl>
     <div className="egg-new-moves">{egg.newMoves.map(move=><span key={move}><b>새 기술</b> {moves[move]?.name??move}</span>)}</div>
    </article>;
   })}
  </div>
  <button data-initial-focus disabled={!allOpen&&started.current.size===eggs.length} onClick={()=>allOpen?onClose():openAll()}>{allOpen?'확인':'한 번에 열기'}</button>
 </PokedexDialog>;
}
