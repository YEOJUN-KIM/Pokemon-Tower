'use client';

import {useEffect, useRef, useState} from 'react';
import {describeLine} from './catalog';

export function BattleMessages({messages, playing, turn, announcement,historyOnly=false}: {historyOnly?:boolean;messages: string[]; playing: boolean; turn: number; announcement?:string | null}) {
  const [expanded, setExpanded] = useState(historyOnly);
  const history = useRef<HTMLDivElement>(null);
  let currentTurn = 0;
  const entries = messages.flatMap((line, index) => {
    if (line.startsWith('|turn|')) currentTurn = Number(line.split('|')[2]);
    const text = describeLine(line);
    return text ? text.split('\n').map((text,part)=>({text,turn:currentTurn,key:`${index}-${part}-${line}`})) : [];
  });
  const lastEntry = entries.at(-1)?.key;
  useEffect(() => {
    if (expanded && history.current) history.current.scrollTop = history.current.scrollHeight;
  }, [lastEntry, expanded]);

  return <section className="battle-messages" aria-label="배틀 상황">
    <div className="message-heading"><span><i className="record-dot" />배틀 상황</span><span>{playing ? '진행 중' : turn ? `${turn}턴` : '출발 준비'}</span></div>
    {!historyOnly && <div className="current-messages" role="log" aria-label="현재 배틀 상황" aria-live="polite" aria-relevant="additions text">
      {announcement ? <p className="latest">{announcement}</p> : entries.length ? entries.slice(-2).map((entry, index, recent) => <p key={entry.key} className={index === recent.length - 1 ? 'latest' : ''}>{entry.text}</p>)
        : <p className="message-placeholder">파트너를 선택하고 배틀을 시작하세요.</p>}
    </div>}
    {!historyOnly && <button className="message-history-toggle" data-silent aria-expanded={expanded} aria-controls="battle-message-history" onClick={() => setExpanded(value => !value)}>{expanded ? '기록 접기' : '지난 기록 보기'}<span aria-hidden="true">{expanded ? '−' : '+'}</span></button>}
    <div id="battle-message-history" className="message-history" ref={history} hidden={!expanded} role="region" aria-label="배틀 기록">
      {entries.length ? entries.map(entry => <p key={entry.key}><span>{entry.turn ? `${entry.turn}턴` : '등장'}</span>{entry.text}</p>) : <p>배틀을 시작하면 기록이 표시됩니다.</p>}
    </div>
  </section>;
}
