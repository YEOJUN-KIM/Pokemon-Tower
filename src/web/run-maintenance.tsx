'use client';
import {useState} from 'react';
import {RunPokemonSettings} from './run-pokemon-settings';
import type {PokedexEntry} from './pokedex-data';
import type {TowerView} from './contracts';
import {TowerShop} from './tower-shop';
import {PokemonImage} from './pokemon-image';
import {TypeBadge} from './type-badge';
import styles from './styles/retry-preparation.module.css';
import {species,pokemonName} from './catalog';
import {moveTypeNames,moveInfo} from '../data/move-info';
import {PokedexDialog} from './pokedex-dialog';
import {RunPartnerList} from './run-partner-list';
import {BagButton} from './bag';

export function RunMaintenance({tower,entries,busy,error,submit,onContinue}:{entries:PokedexEntry[];tower:TowerView;busy:boolean;error?:string;submit:(body:Record<string,unknown>)=>Promise<void>;onContinue:()=>void}){
 const [screen,setScreen]=useState<'menu'|'shop'|'partners'>('menu'),[name,setName]=useState('');
 const run=tower.run!;
 return <section className={`run-maintenance ${styles.scope} ${run.retries?.preparing?styles.retry:''}`} data-testid="run-maintenance" aria-busy={busy}>
  {run.retries?.preparing?<h3 className={styles.heading}>상대 라인업</h3>:<div className="maintenance-heading"><span className="eyebrow">{run.floor-1}층 클리어</span><h2>잠깐의 정비</h2><span>보유 코인 · {tower.coins.toLocaleString()}코인</span></div>}
  {run.retries?.preparing&&<section className={styles.opponents} data-testid="retry-opponents" aria-label="재도전 상대 팀">{run.retries.opponents.map((pokemon,index)=>{const info=species[pokemon.species];return <article key={index} className={styles.card}>
   {info&&<PokemonImage id={info.id} spriteKey={info.spriteKey} name={pokemonName(pokemon.species)} width={80} height={80} fallback={<span>◇</span>}/>}
   <strong>{pokemonName(pokemon.species)}</strong><div className={styles.types}>{info?.types.map(type=><TypeBadge key={type} type={Object.keys(moveTypeNames).find(key=>moveTypeNames[key]===type)??type}/>)}</div>
   <div className={styles.moves}>{pokemon.moves.map(move=><span key={move}>{moveInfo[move]?.name??move}</span>)}</div>
  </article>;})}</section>}

  <div className="maintenance-menu" data-keyboard-list={!run.retries?.preparing||undefined} data-keyboard-horizontal={run.retries?.preparing||undefined}>
   {!run.retries?.preparing&&<button className="secondary-button" data-testid="maintenance-shop" data-initial-focus onClick={()=>setScreen('shop')}><strong>상점</strong><span aria-hidden="true">▸</span></button>}
   <button className="secondary-button" data-testid="maintenance-adjust" onClick={()=>setScreen('partners')}><strong>포켓몬 조정</strong><span aria-hidden="true">▸</span></button>
   <BagButton run={run} busy={busy} submit={submit} error={error}/>
   <button className="primary-button" disabled={busy} onClick={onContinue}>출전 팀 선택 →</button>
  </div>
  {screen==='shop' && <PokedexDialog title="정비 상점" context="maintenance-shop" controls={[{key:'← / → · Q / E',label:'탭'},{key:'↑ / ↓',label:'상품'},{key:'Enter / Z',label:'구매'},{key:'Esc / X',label:'뒤로'}]} large className="maintenance-dialog" onClose={()=>setScreen('menu')} returnFocus="[data-testid=maintenance-shop]" initialFocus="[data-keyboard-tab][aria-pressed=true]"><TowerShop run={run} coins={tower.coins} busy={busy} error={error} submit={submit} onContinue={onContinue}/></PokedexDialog>}
  {screen==='partners' && <PokedexDialog title="포켓몬 조정" context="maintenance-partners" controls={[{key:'방향키',label:'이동'},{key:'Enter / Z',label:'선택'},{key:'Esc / X',label:'뒤로'}]} large className="maintenance-dialog" onClose={()=>setScreen('menu')} returnFocus="[data-testid=maintenance-adjust]"><section data-testid="run-adjustment"><RunPartnerList run={run} attribute="data-adjust-partner" disabled={()=>busy} onChoose={setName}/></section></PokedexDialog>}
  {name&&<RunPokemonSettings tower={tower} entries={entries} name={name} returnFocus={`[data-adjust-partner="${name}"]`} onClose={()=>setName('')} submit={submit}/>}
 </section>;
}
