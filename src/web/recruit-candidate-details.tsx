'use client';
import type {RunView} from './contracts';
import {PokedexDialog} from './pokedex-dialog';
import {pokemonName} from './catalog';
import {abilityNames} from './pokedex-data';
import {statKeys,statNames,natureLabel} from '../data/training';
import {moveInfo} from '../data/move-info';
import {TypeBadge} from './type-badge';
import {MoveCategoryBadge} from './move-category-badge';
import abilityDescriptions from '../data/ability-descriptions.json';

export function RecruitCandidateDetails({name,run,onClose}:{name:string;run:RunView;onClose:()=>void}){
 const details=run.candidateDetails?.[name];
 return <PokedexDialog title={pokemonName(name)+' · 영입 후보 정보'} large onClose={onClose} returnFocus="[data-recruit-details]">
  {details?<section data-testid="recruit-candidate-details"><p>이번 배틀에서 상대가 사용한 구성입니다. 영입 후 설정은 도감·포켓몬 조정에서 확인할 수 있습니다.</p><h3>특성 · {abilityNames[details.ability]??details.ability}</h3><p>{(abilityDescriptions as Record<string,string>)[details.ability]}</p><p>성격 · {natureLabel(details.nature)}</p><h3>종족값 · 합계 {statKeys.reduce((sum,key)=>sum+details.baseStats[key],0)}</h3><dl className="summary-stat-list">{statKeys.map(key=><div key={key}><dt>{statNames[key]}</dt><dd>{details.baseStats[key]}</dd></div>)}</dl><h3>현재 기술</h3>{details.moves.map(name=>{const move=moveInfo[name];return <div key={name} className="selection-note"><strong>{move?.name??name}</strong>{move&&<><TypeBadge type={move.type}/><MoveCategoryBadge category={move.category}/><p>위력 {move.power||'—'} · 명중 {move.accuracy===true?'필중':move.accuracy+'%'} · PP {move.pp}</p><p>{move.description}</p></>}</div>})}</section>:<p>이 배틀의 후보 정보가 없습니다. 배틀을 다시 불러와 주세요.</p>}
  <button className="secondary-button" onClick={onClose}>돌아가기</button>
 </PokedexDialog>;
}
