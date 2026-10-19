'use client';
import {GameMenuFooter,GameStatus} from './game-menu';
import {TypeBadge} from './type-badge';
import {MoveCategoryBadge} from './move-category-badge';
import {useEffect,useRef,useState} from 'react';
import {selectGameCursor} from './game-keyboard';
import {moveInfo} from '../data/move-info';
import {moves} from './catalog';
import type {TrainingView,TrainingProfile} from '../data/training';

export function MoveEditor({entry,onSave,inRun=false}:{inRun?:boolean;entry:TrainingView;onSave:(entry:TrainingView,profile:TrainingProfile)=>Promise<void>}) {
  const [draft,setDraft]=useState(Array.from({length:4},(_,i)=>entry.profile.moves[i] ?? '')),[slot,setSlot]=useState(0),[query,setQuery]=useState(''),[onlyKnown,setOnlyKnown]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const saving=useRef(false);
  useEffect(()=>setDraft(Array.from({length:4},(_,i)=>entry.profile.moves[i] ?? '')),[entry.profile.moves]);
  const editor=useRef<HTMLElement>(null);
  function focusZone(zone:'slots'|'library',index=slot){requestAnimationFrame(()=>{
    const area=editor.current?.querySelector(`[data-keyboard-zone=${zone}]`);
    const button=zone==='slots' ? area?.querySelectorAll<HTMLButtonElement>('button')[index] : area?.querySelector<HTMLButtonElement>('button.selected:not(:disabled)') ?? area?.querySelector<HTMLButtonElement>('button:not(:disabled)');
    selectGameCursor(button);button?.scrollIntoView({block:'nearest',inline:'nearest'});
  });}
  const candidates=entry.learnableMoves.filter(move=>(!onlyKnown || entry.unlockedMoves.includes(move)) && `${moves[move]?.name ?? ''} ${move}`.toLowerCase().includes(query.trim().toLowerCase()));
  async function choose(move:string){
    if(saving.current)return;
    const next=[...draft],other=next.indexOf(move);
    if(other===slot){focusZone('slots');return;}
    if(other>=0)next[other]=next[slot];next[slot]=move;
    saving.current=true;setDraft(next);setBusy(true);setError('');
    try{await onSave(entry,{...entry.profile,moves:next.filter(Boolean)});}
    catch(e){setDraft(Array.from({length:4},(_,i)=>entry.profile.moves[i] ?? ''));setError(e instanceof Error ? e.message : '저장하지 못했습니다. 다시 선택해 주세요.');}
    finally{saving.current=false;setBusy(false);focusZone('slots');}
  }
  return <section ref={editor} className="move-editor" aria-busy={busy} data-keyboard-zones><p>교체할 기술 칸을 고른 뒤, 아래에서 배치할 기술을 선택하세요. 이미 배치한 기술을 고르면 두 칸의 위치가 바뀝니다. 해금한 기술은 무료이며 바꾸면 바로 저장됩니다.</p>
    <div data-keyboard-zone="slots" className="move-slots" aria-label="기술배치">{draft.map((move,index)=><button key={index} disabled={busy} className={slot===index ? 'selected' : ''} aria-pressed={slot===index} onClick={()=>{setSlot(index);focusZone('library',index);}}><small>기술 {index+1}</small><strong>{moves[move]?.name ?? (move || '빈 기술 칸')}</strong>{moveInfo[move] && <span className="move-slot-badges"><TypeBadge type={moveInfo[move].type}/><MoveCategoryBadge category={moveInfo[move].category}/></span>}</button>)}</div>
    <div className="move-search"><input aria-label="기술 이름 검색" placeholder="기술 이름 검색" value={query} onChange={e=>setQuery(e.target.value)}/><label><input type="checkbox" checked={onlyKnown} onChange={e=>setOnlyKnown(e.target.checked)}/> 해금한 기술만</label><span>{entry.unlockedMoves.length} / {entry.learnableMoves.length} 해금</span></div>
    <div data-keyboard-zone="library" className="move-library" aria-label="배울 수 있는 기술">{candidates.map(move=>{const info=moveInfo[move],known=entry.unlockedMoves.includes(move);return <button key={move} disabled={busy || !known} className={draft[slot]===move ? 'selected' : ''} onClick={()=>void choose(move)}><span className="move-library-heading"><strong>{moves[move]?.name ?? (move || '빈 기술 칸')}</strong><GameStatus>{!known ? '미해금' : entry.selfMoves.includes(move) ? '자력기' : '수집한 기술'}</GameStatus></span>{info && <><span className="move-metadata"><TypeBadge type={info.type}/> <MoveCategoryBadge category={info.category}/> · 위력 {info.power || '—'} · 명중 {info.accuracy===true ? '—' : info.accuracy} · PP {info.pp}</span><span className="move-description">{info.description}</span></>}</button>;})}{!candidates.length && <p>조건에 맞는 기술이 없습니다.</p>}</div>
    {busy && <p role="status">저장 중…</p>}{error && <p role="alert">{error}</p>}
    <GameMenuFooter controls={[{key:'← / →',label:'기술 칸'},{key:'↑ / ↓',label:'목록'},{key:'Enter / Z',label:'배치·저장'},{key:'X',label:'뒤로'}]}/>
  </section>;
}
