'use client';
import type {TrainingView} from '../data/training';
import {selectedPokedexEntry,type PokedexEntry,typeColors} from './pokedex-data';
import {species} from './catalog';
import {PokemonImage} from './pokemon-image';

const roles=['선봉','중견','마무리'];
export function PokedexParty({party,entries,training,disabled,onOpen,onBrowse}:{party:string[];entries:PokedexEntry[];training:TrainingView[];disabled:boolean;onOpen:(name:string)=>void;onBrowse:()=>void}){
 return <aside className="dex-right-panel"><section className="dex-start-party" data-testid="team-selection" aria-label="출발 파티"><div className="dex-catalog-heading"><h2>출발 파티</h2><span>{party.length} / 3</span></div><div className="dex-party-slots" data-testid="team-preview">{roles.map((role,slot)=>{
  const entry=entries.find(entry=>entry.species===party[slot]),profile=training.find(value=>value.species===entry?.species)?.profile;
  const shown=entry?selectedPokedexEntry(entry,profile?.forme):null;
  return <button key={slot} className={`dex-party-slot ${entry?'':'preview-empty'}`} data-party-slot={slot} data-empty={!entry||undefined} aria-label={entry?`${entry.name} 파티 메뉴`:`${slot+1}번 ${role} 포켓몬 선택`} disabled={disabled} onClick={()=>entry?onOpen(entry.species):onBrowse()}>
   <span className="dex-party-role"><b>{String(slot+1).padStart(2,'0')}</b>{role}</span>
   {entry&&shown?<><span className="dex-party-picture"><PokemonImage shiny={profile?.shiny} id={entry.id} spriteKey={entry.forms?.find(form=>form.species===profile?.forme)?.spriteKey??species[entry.species]?.spriteKey??entry.id} name={entry.name} width={88} height={88} maxPixelScale={2} fallback={<span>◇</span>}/></span><span className="dex-party-identity"><strong>{entry.name}</strong><span className="dex-party-types">{shown.types.map(type=><span key={type} style={{color:typeColors[type]}}>{type}</span>)}</span></span></>:<span className="dex-party-empty"><i aria-hidden="true">＋</i>포켓몬 선택</span>}
  </button>;
 })}</div></section></aside>;
}
