'use client';
import type {ReactNode} from 'react';
import type {RunView} from './contracts';
import {pokemonName,species} from './catalog';
import {PokemonImage} from './pokemon-image';
import {HeldItemLabel} from './held-item-label';

export function RunPartnerList({run,onChoose,disabled=()=>false,detail,attribute='data-partner',label='포켓몬 선택'}:{run:RunView;onChoose:(name:string)=>void;disabled?:(name:string)=>boolean;detail?:(name:string)=>ReactNode;attribute?:string;label?:string}){
 return <div className="run-partner-list" data-keyboard-list aria-label={label}>{run.roster.map((name,index)=>{
  const info=species[name],profile=run.adjustment?.entries.find(entry=>entry.species===name)?.profile;
  const level=run.machineShop?.partners[name]?.level ?? run.vitaminShop?.partners[name]?.level ?? 50;
  return <button className="run-partner-card" key={name} {...{[attribute]:name}} data-initial-focus={index===0 || undefined} disabled={disabled(name)} onClick={()=>onChoose(name)}>
   <span className="run-partner-sprite"><PokemonImage id={info.id} spriteKey={info.spriteKey} shiny={profile?.shiny} name={pokemonName(name)} width={80} height={80} fallback={<span>◇</span>}/></span>
   <span className="run-partner-details"><span className="run-partner-name"><strong>{pokemonName(name)}</strong><small>Lv.{level}</small></span><span className="run-partner-item">지닌 도구 · <HeldItemLabel item={run.heldItems?.[name]}/></span>{detail && <span className="run-partner-note">{detail(name)}</span>}</span><span className="run-partner-arrow" aria-hidden="true">▸</span>
  </button>;
 })}</div>;
}
