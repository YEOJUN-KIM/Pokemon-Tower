'use client';
import {TypeBadge} from './type-badge';
import {MoveCategoryBadge} from './move-category-badge';
import {useRef,useState} from 'react';
import {selectGameCursor} from './game-keyboard';
import {moveInfo} from '../data/move-info';
import {moves} from './catalog';
import type {TrainingView,TrainingProfile} from '../data/training';

export function MoveEditor({entry,onSave,inRun=false}:{inRun?:boolean;entry:TrainingView;onSave:(entry:TrainingView,profile:TrainingProfile)=>Promise<void>}) {
  const [draft,setDraft]=useState(Array.from({length:4},(_,i)=>entry.profile.moves[i] ?? '')),[slot,setSlot]=useState(0),[query,setQuery]=useState(''),[onlyKnown,setOnlyKnown]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const changed=draft.some((move,index)=>move!==(entry.profile.moves[index] ?? ''));
  const editor=useRef<HTMLElement>(null);
  function focusZone(zone:'slots'|'library',index=slot){requestAnimationFrame(()=>{
    const area=editor.current?.querySelector(`[data-keyboard-zone=${zone}]`);
    const button=zone==='slots' ? area?.querySelectorAll<HTMLButtonElement>('button')[index] : area?.querySelector<HTMLButtonElement>('button.selected:not(:disabled)') ?? area?.querySelector<HTMLButtonElement>('button:not(:disabled)');
    selectGameCursor(button);button?.scrollIntoView({block:'nearest',inline:'nearest'});
  });}
  const candidates=entry.learnableMoves.filter(move=>(!onlyKnown || entry.unlockedMoves.includes(move)) && `${moves[move]?.name ?? ''} ${move}`.toLowerCase().includes(query.trim().toLowerCase()));
  async function save(){setBusy(true);setError('');try{await onSave(entry,{...entry.profile,moves:draft.filter(Boolean)});}catch(e){setError(e instanceof Error ? e.message : '저장하지 못했습니다.');}finally{setBusy(false);}}
  return <section ref={editor} className="move-editor" data-keyboard-zones><p>교체할 기술 칸을 고른 뒤, 아래에서 배치할 기술을 선택하세요. 해금한 기술은 무료로 바꿀 수 있어요.</p>
    <p className="move-keyboard-hint">←/→ 기술 칸 이동 · Z 기술 선택 · ↓ 저장</p><div data-keyboard-zone="slots" className="move-slots" aria-label="기술배치">{draft.map((move,index)=><button key={index} disabled={busy} className={slot===index ? 'selected' : ''} aria-pressed={slot===index} onClick={()=>{setSlot(index);focusZone('library',index);}}><small>기술 {index+1}</small><strong>{moves[move]?.name ?? (move || '빈 기술 칸')}</strong>{moveInfo[move] && <span className="move-slot-badges"><TypeBadge type={moveInfo[move].type}/><MoveCategoryBadge category={moveInfo[move].category}/></span>}</button>)}</div>
    <div className="move-search"><input aria-label="기술 이름 검색" placeholder="기술 이름 검색" value={query} onChange={e=>setQuery(e.target.value)}/><label><input type="checkbox" checked={onlyKnown} onChange={e=>setOnlyKnown(e.target.checked)}/> 해금한 기술만</label><span>{entry.unlockedMoves.length} / {entry.learnableMoves.length} 해금</span></div>
    <div data-keyboard-zone="library" className="move-library" aria-label="배울 수 있는 기술">{candidates.map(move=>{const info=moveInfo[move],known=entry.unlockedMoves.includes(move),duplicate=draft.some((name,index)=>name===move && index!==slot);return <button key={move} disabled={busy || !known || duplicate} className={draft[slot]===move ? 'selected' : ''} onClick={()=>{setDraft(values=>values.map((name,index)=>index===slot ? move : name));focusZone('slots');}}><span className="move-library-heading"><strong>{moves[move]?.name ?? (move || '빈 기술 칸')}</strong><small>{!known ? '미해금' : entry.selfMoves.includes(move) ? '자력기' : '수집한 기술'}</small></span>{info && <><span className="move-metadata"><TypeBadge type={info.type}/> <MoveCategoryBadge category={info.category}/> · 위력 {info.power || '—'} · 명중 {info.accuracy===true ? '—' : info.accuracy} · PP {info.pp}</span><span className="move-description">{info.description}</span></>}</button>;})}{!candidates.length && <p>조건에 맞는 기술이 없습니다.</p>}</div>
    {error && <p role="alert">{error}</p>}<div data-keyboard-zone="save"><button data-game-focusable className="primary-button" disabled={busy || !changed} onClick={()=>void save()}>{busy ? '저장 중…' : '기술배치 저장 · 무료'}</button></div>
  </section>;
}
