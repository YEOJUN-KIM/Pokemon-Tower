import {MoveCategoryBadge} from './move-category-badge';

import {moves} from './catalog';
import {moveInfo,moveCategoryNames} from '../data/move-info';
import {TypeBadge} from './type-badge';
import {selectGameCursor} from './game-keyboard';

export function MoveDetails({name,label}:{name?:string;label:string}) {
  const info=name ? moveInfo[name] : undefined;
  return <article className="recruit-move-detail"><small>{label}</small><strong>{name ? moves[name]?.name ?? name : '빈 기술 칸'}</strong>{info && <><p><TypeBadge type={info.type}/> <MoveCategoryBadge category={info.category}/></p><dl><div><dt>위력</dt><dd>{info.power || '—'}</dd></div><div><dt>명중</dt><dd>{info.accuracy===true ? '필중' : `${info.accuracy}%`}</dd></div><div><dt>PP</dt><dd>{info.pp}</dd></div></dl><p>{info.description}</p></>}</article>;
}

export function RecruitMovePicker({incoming,known,current,equip,move,slot,onMode,onMove,onSlot}:{incoming:string[];known:string[];current:string[];equip:boolean;move:string;slot:number|null;onMode:(value:boolean)=>void;onMove:(value:string)=>void;onSlot:(value:number)=>void}) {
  const focus=(selector:string)=>requestAnimationFrame(()=>selectGameCursor(document.querySelector<HTMLButtonElement>(`[data-testid="recruit-confirmation"] ${selector}`)));
  return <section className="recruit-moves"><h3>상대의 기술</h3><div className="collected-moves">{incoming.map(name=><span key={name}>{moves[name]?.name ?? name}{!known.includes(name) && <b>NEW</b>}</span>)}</div><p>영입하면 새 기술은 모두 도감에 영구 등록됩니다.</p>
    <div className="recruit-mode-buttons" role="group" aria-label="기술 가져오기 방식"><button className="secondary-button" aria-pressed={!equip} onClick={()=>onMode(false)}>도감에만 저장</button><button className="secondary-button" aria-pressed={equip} disabled={incoming.every(name=>current.includes(name))} onClick={()=>{onMode(true);focus('.recruit-incoming button:not(:disabled)');}}>바로 장착</button></div>
    {!equip ? <p>현재 기술배치를 유지합니다. 모은 기술은 도감에서 무료로 배치할 수 있어요.</p> : <>
      <h4>1. 가져올 기술</h4><div className="recruit-move-options recruit-incoming" role="group" aria-label="가져올 기술">{incoming.map(name=><button key={name} className="secondary-button" disabled={current.includes(name)} aria-pressed={move===name} onClick={()=>{onMove(name);focus('.recruit-slots button');}}>{moves[name]?.name ?? name}<small>{current.includes(name) ? '배치 중' : !known.includes(name) ? 'NEW · 도감에 없는 기술' : '도감에 등록됨'}</small></button>)}</div>
      {move && <><h4>2. 바꿀 기술 칸</h4><div className="recruit-move-options recruit-slots" role="group" aria-label="교체할 기술">{[...current,...(current.length<4 ? [undefined] : [])].map((name,index)=><button key={index} className="secondary-button" aria-pressed={slot===index} onClick={()=>{onSlot(index);focus('.recruit-dialog-actions .primary-button');}}>{index+1}. {name ? moves[name]?.name ?? name : '빈 기술 칸'}</button>)}</div>
        {slot!==null && <div className="recruit-move-comparison" aria-label="기술 교체 비교"><MoveDetails name={current[slot]} label="현재 기술"/><MoveDetails name={move} label="가져올 기술"/></div>}
      </>}
      <p>장착은 이번 도전에만 적용됩니다. 도감에 저장한 기본 기술배치는 유지돼요.</p>
    </>}
  </section>;
}
