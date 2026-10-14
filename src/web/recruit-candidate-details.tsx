'use client';
import type {RunView} from './contracts';
import {PokedexDialog} from './pokedex-dialog';
import {pokemonName,species} from './catalog';
import {PokemonSummary} from './pokemon-summary';
import type {PokedexEntry} from './pokedex-data';
import nationalDex from '../data/pokedex.json' with {type:'json'};
import {selectableForms} from '../data/selectable-forms';
import {moveTypeNames} from '../data/move-info';

export function RecruitCandidateDetails({name,run,onClose}:{name:string;run:RunView;onClose:()=>void}){
 const details=run.candidateDetails?.[name],form=selectableForms[name],catalog=species[name];
 const original=nationalDex.find(entry=>entry.species===(form?.baseSpecies??name));
 const entry: PokedexEntry|undefined=details&&catalog?{
  species:name,id:catalog.id,nationalId:form?.nationalId??original?.id,name:pokemonName(name),
  generation:form?.generation??original?.generation??1,region:form?.region,
  types:details.types?.map(type=>moveTypeNames[type]??type)??catalog.types,
  baseStats:details.baseStats,ability:details.ability,moves:details.moves,level:50,
  canMega:original?.canMega??false,canGigantamax:original?.canGigantamax??false,
 }:undefined;
 return <PokedexDialog title={pokemonName(name)+' · 영입 후보 정보'} large onClose={onClose} returnFocus="[data-recruit-details]">
  {entry&&details?<section data-testid="recruit-candidate-details"><PokemonSummary key={name} entry={entry} profile={{ability:details.ability,nature:details.nature,moves:details.moves,teraType:details.teraType,shiny:details.shiny}} showMoveDetails/></section>:<p>이 배틀의 후보 정보가 없습니다. 배틀을 다시 불러와 주세요.</p>}
  <button className="secondary-button" onClick={onClose}>돌아가기</button>
 </PokedexDialog>;
}
