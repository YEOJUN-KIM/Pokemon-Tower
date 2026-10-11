'use client';
import {useState} from 'react';
import type {TowerView} from './contracts';
import {TowerShop} from './tower-shop';
import {TrainingEditor} from './training-editor';
import {MoveEditor} from './move-editor';
import {pokemonName} from './catalog';
import type {TrainingView,TrainingProfile} from '../data/training';
import {PokedexDialog} from './pokedex-dialog';
import {RunPartnerList} from './run-partner-list';

export function RunMaintenance({tower,busy,error,submit,onContinue}:{tower:TowerView;busy:boolean;error?:string;submit:(body:Record<string,unknown>)=>Promise<void>;onContinue:()=>void}){
 const [screen,setScreen]=useState<'menu'|'shop'|'partners'|'actions'|'moves'|'stats'>('menu'),[name,setName]=useState(tower.run!.roster[0]);
 const run=tower.run!,entry=run.adjustment?.entries.find(e=>e.species===name);
 async function save(entry:TrainingView,profile:TrainingProfile){await submit({type:'adjust-run',runId:run.id,floor:run.floor,snapshot:run.adjustment?.snapshot,species:entry.species,revision:entry.revision,profile});}
 return <section className="run-maintenance" data-testid="run-maintenance" aria-busy={busy}>
  <div className="maintenance-heading"><span className="eyebrow">{run.floor-1}층 클리어</span><h2>잠깐의 정비</h2><span>보유 코인 · {tower.coins.toLocaleString()}코인</span></div>
  <div className="maintenance-menu" data-keyboard-list>
   <button className="secondary-button" data-testid="maintenance-shop" data-initial-focus onClick={()=>setScreen('shop')}><strong>상점</strong><small>지닌 도구 · 배틀 아이템 · 기술머신 · 육성</small><span aria-hidden="true">▸</span></button>
   <button className="secondary-button" data-testid="maintenance-adjust" onClick={()=>setScreen('partners')}><strong>포켓몬 조정</strong><small>기술배치 · 능력치 조정</small><span aria-hidden="true">▸</span></button>
   <button className="primary-button" disabled={busy} onClick={onContinue}>출전 팀 선택 →</button>
  </div>
  {screen==='shop' && <PokedexDialog title="정비 상점" large className="maintenance-dialog" onClose={()=>setScreen('menu')} returnFocus="[data-testid=maintenance-shop]" initialFocus="[data-keyboard-tab][aria-pressed=true]"><TowerShop run={run} coins={tower.coins} busy={busy} error={error} submit={submit} onContinue={onContinue}/></PokedexDialog>}
  {screen==='partners' && <PokedexDialog title="포켓몬 조정" large className="maintenance-dialog" onClose={()=>setScreen('menu')} returnFocus="[data-testid=maintenance-adjust]"><section data-testid="run-adjustment"><RunPartnerList run={run} attribute="data-adjust-partner" disabled={()=>busy} onChoose={species=>{setName(species);setScreen('actions');}}/></section></PokedexDialog>}
  {screen==='actions' && <PokedexDialog title={pokemonName(name)+' 조정'} className="maintenance-dialog" onClose={()=>setScreen('partners')}><div className="maintenance-menu" data-keyboard-list><button data-initial-focus className="secondary-button" onClick={()=>setScreen('moves')}>기술배치</button><button className="secondary-button" onClick={()=>setScreen('stats')}>능력치 조정</button><button className="secondary-button" onClick={()=>setScreen('partners')}>포켓몬 선택으로 · X</button></div></PokedexDialog>}
  {(screen==='moves'||screen==='stats') && entry && <PokedexDialog title={pokemonName(name)+(screen==='moves'?' 기술배치':' 능력치 조정')} large className="maintenance-dialog dex-settings-dialog" initialFocus={screen==='moves'?'.move-slots button':'.training-tabs button'} onClose={()=>setScreen('actions')}>
   {screen==='moves'?<MoveEditor key={entry.species+':'+entry.revision} entry={entry} onSave={save} inRun/>:<TrainingEditor key={entry.species+':'+entry.revision} entry={entry} points={tower.growthPoints} onSave={save} showMoves={false} inRun/>}
   {error && <p role="alert">{error}</p>}
  </PokedexDialog>}
 </section>;
}
