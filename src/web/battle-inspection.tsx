import {MoveCategoryBadge} from './move-category-badge';
import {HeldItemLabel} from './held-item-label';
import type {BattleView} from './contracts';

import {moves,pokemonName} from './catalog';
import {moveInfo,moveCategoryNames} from '../data/move-info';
import {TypeBadge} from './type-badge';
import {natureLabel,statKeys,statNames} from '../data/training';

import {abilityNames} from './pokedex-data';

export function BattleInspection({battle,command,onClose,held=false}:{battle:BattleView;command:string;onClose:()=>void;held?:boolean}){
  const action=battle.actions.find(action=>action.command===command),pokemon=command.startsWith('switch ') ? battle.team[Number(command.split(' ')[1])-1] : null;
  const info=action ? moveInfo[action.label] : undefined,pp=battle.movePP?.[Number(command.split(' ')[1])-1];
  const title=pokemon ? `${pokemonName(pokemon.species)} · 배틀 정보` : info?.name ?? moves[action?.label ?? '']?.name ?? '기술 상세';
  return <aside className="battle-inspection-popover" role="dialog" aria-modal="false" aria-label={title}><div className="inspection-heading"><strong>{title}</strong>{held ? <small>C키를 놓으면 닫힘</small> : <button onClick={onClose} aria-label="상세정보 닫기">×</button>}</div>
    {pokemon ? <div className="battle-inspection"><p>특성 · {abilityNames[pokemon.ability ?? ''] ?? pokemon.ability ?? '정보 없음'}</p><p>성격 · {natureLabel(pokemon.nature ?? 'Serious')}</p><p>지닌 도구 · <HeldItemLabel item={pokemon.item || (pokemon.berryUsed ? 'Sitrus Berry' : null)}/>{pokemon.berryUsed && <small> · 이번 배틀 사용 완료 · 다음 층 재사용</small>}</p><div className="inspection-stats">{statKeys.map(key=><div key={key}><span>{statNames[key]}</span><strong>{pokemon.stats?.[key] ?? '—'}</strong></div>)}</div><h3>기술배치</h3><div className="inspection-moves">{pokemon.moves?.map(name=><p key={name}>{moves[name]?.name ?? name}</p>)}</div><small>능력치는 성격이 반영된 기본 수치입니다.</small></div>
    : info ? <div className="battle-inspection"><div className="inspection-stats"><div><span>타입</span><TypeBadge type={info.type}/></div><div><span>분류</span><MoveCategoryBadge category={info.category}/></div><div><span>위력</span><strong>{info.power || '—'}</strong></div><div><span>명중</span><strong>{info.accuracy===true ? '필중' : `${info.accuracy}%`}</strong></div><div><span>현재 PP</span><strong>{pp ? `${pp.pp} / ${pp.maxpp}` : '—'}</strong></div></div><p className="inspection-description">{info.description}</p></div> : <p>지금은 상세정보가 없습니다.</p>}
  </aside>;
}
export {FieldInspection} from './battle-field-overlay';

