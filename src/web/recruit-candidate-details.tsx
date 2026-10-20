'use client';
import {useEffect,useRef} from 'react';
import type {GameMenuKey} from './game-keyboard';
import type {RunView} from './contracts';
import {PokedexDialog} from './pokedex-dialog';
import {pokemonName,species} from './catalog';
import {PokemonSummary} from './pokemon-summary';
import type {PokedexEntry} from './pokedex-data';
import nationalDex from '../data/pokedex.json' with {type:'json'};
import {selectableForms} from '../data/selectable-forms';
import {moveTypeNames} from '../data/move-info';
import styles from './styles/post-battle.module.css';

export function RecruitCandidateDetails({name,run,onClose,owned=false,returnFocus}:{name:string;run:RunView;onClose:()=>void;owned?:boolean;returnFocus?:string}){
 const root=useRef<HTMLElement>(null);
 useEffect(()=>{
  const dialog=root.current?.closest('dialog');
  const scroll=(event:Event)=>{const {key}= (event as CustomEvent<GameMenuKey>).detail;if(['arrowup','arrowdown','pageup','pagedown'].includes(key)){event.preventDefault();dialog?.querySelector('.game-dialog-body')?.scrollBy({top:(key==='arrowup'||key==='pageup'?-1:1)*(key.startsWith('page')?300:90)});}};
  dialog?.addEventListener('game-menu-key',scroll);return()=>dialog?.removeEventListener('game-menu-key',scroll);
 },[]);
 const details=run.candidateDetails?.[name],display=details?.forme??name,form=selectableForms[display],catalog=species[display];
 const original=nationalDex.find(entry=>entry.species===(form?.baseSpecies??name));
 const entry: PokedexEntry|undefined=details&&catalog?{
  species:display,id:catalog.id,nationalId:form?.nationalId??original?.id,name:pokemonName(display),
  generation:form?.generation??original?.generation??1,region:form?.region,
  types:details.types?.map(type=>moveTypeNames[type]??type)??catalog.types,
  baseStats:details.baseStats,ability:details.ability,moves:details.moves,level:50,
  canMega:original?.canMega??false,canGigantamax:original?.canGigantamax??false,
 }:undefined;
 return <PokedexDialog title={pokemonName(display)+' · 영입 후보 정보'} large onClose={onClose} returnFocus={returnFocus} context="recruit-info" className={`${styles.scope} ${styles.panel} ${styles.infoPanel}`} controls={[{key:'↑ / ↓',label:'정보 확인'},{key:'Esc / X',label:'돌아가기'}]}>
  {entry&&details?<section ref={root} data-testid="recruit-candidate-details"><PokemonSummary key={name} entry={entry} profile={{evs:details.evs,ability:details.ability,nature:details.nature,moves:details.moves,teraType:details.teraType,shiny:details.shiny,gender:details.gender}} comparison={{ivs:run.candidateIVs[name],previousIVs:run.collectionIVs[name],knownMoves:run.collectionMoves[name]??[],owned}} showMoveDetails/></section>:<p>이 배틀의 후보 정보가 없습니다. 배틀을 다시 불러와 주세요.</p>}
 </PokedexDialog>;
}
