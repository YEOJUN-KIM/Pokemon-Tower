import {MoveCategoryBadge} from './move-category-badge';
import {moves} from './catalog';
import {moveInfo} from '../data/move-info';
import {TypeBadge} from './type-badge';

export function MoveDetails({name,label}:{name?:string;label:string}) {
  const info=name ? moveInfo[name] : undefined;
  return <article className="recruit-move-detail"><small>{label}</small><strong>{name ? moves[name]?.name ?? name : '빈 기술 칸'}</strong>{info && <><p><TypeBadge type={info.type}/> <MoveCategoryBadge category={info.category}/></p><dl><div><dt>위력</dt><dd>{info.power || '—'}</dd></div><div><dt>명중</dt><dd>{info.accuracy===true ? '필중' : `${info.accuracy}%`}</dd></div><div><dt>PP</dt><dd>{info.pp}</dd></div></dl><p>{info.description}</p></>}</article>;
}
