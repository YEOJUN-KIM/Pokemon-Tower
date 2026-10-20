'use client';

import {useEffect, useId,useRef, useState} from 'react';
import {battleMessageEntries,currentBattleDialogue} from './battle-message-data';
import {GameDialogue} from './game-dialogue';
import {GameDialogueConfirm} from './game-dialogue-confirm';

export function BattleMessages({messages, playing, turn, announcement,historyOnly=false,onSkip,onConfirm,dialogueLabel='현재 배틀 상황',confirmation='intro'}: {confirmation?:'intro'|'recruit';dialogueLabel?:string;historyOnly?:boolean;messages: string[]; playing: boolean; turn: number; announcement?:string | null;onSkip?:()=>void;onConfirm?:()=>void}) {
  const [expanded, setExpanded] = useState(historyOnly);
  const history = useRef<HTMLDivElement>(null);
  const historyId=useId();
  const entries=battleMessageEntries(messages);
  const lastEntry = entries.at(-1)?.key;
  const groups=entries.reduce<{turn:number;entries:typeof entries}[]>((groups,entry)=>{
   const last=groups.at(-1);if(last?.turn===entry.turn)last.entries.push(entry);else groups.push({turn:entry.turn,entries:[entry]});return groups;
  },[]);
  const current=currentBattleDialogue(entries,announcement);
  useEffect(() => {
    if(!expanded)return;
    // The parent dialog opens after child effects; scroll after it has a layout.
    const frame=requestAnimationFrame(()=>{if(history.current)history.current.scrollTop=history.current.scrollHeight;});
    return ()=>cancelAnimationFrame(frame);
  }, [lastEntry, expanded]);

  return <section className="battle-messages" aria-label="배틀 상황">
    <div className="message-heading"><span><i className="record-dot" />배틀 상황</span><div className="message-controls"><span>{playing ? '진행 중' : turn ? `${turn}턴` : '출발 준비'}</span>{playing && onSkip && !historyOnly && <button className="skip-motion" aria-label="연출 건너뛰기" data-silent onClick={onSkip}>건너뛰기</button>}</div></div>
    {!historyOnly && (onConfirm?<GameDialogueConfirm onConfirm={onConfirm} kind={confirmation} label={confirmation==='recruit'?'영입 결과 · 계속':'배틀 시작 메시지 · 결정'}><GameDialogue text={current.text} tone={current.tone} label={dialogueLabel}/></GameDialogueConfirm>:<GameDialogue text={current.text} tone={current.tone} label={dialogueLabel}/>) }
    {!historyOnly && <button className="message-history-toggle" data-silent aria-expanded={expanded} aria-controls={historyId} onClick={() => setExpanded(value => !value)}>{expanded ? '기록 접기' : '지난 기록 보기'}<span aria-hidden="true">{expanded ? '−' : '+'}</span></button>}
    <div id={historyId} className="message-history" ref={history} hidden={!expanded} role="region" aria-label="배틀 기록">
      {entries.length ? groups.map((group,index)=><section className="message-turn-group" key={`${group.turn}-${index}`}><h3>{group.turn?`${group.turn}턴`:'배틀 시작'}</h3>{group.entries.map(entry=><p key={entry.key}>{entry.text}</p>)}</section>) : <p>배틀을 시작하면 기록이 표시됩니다.</p>}
    </div>
  </section>;
}
