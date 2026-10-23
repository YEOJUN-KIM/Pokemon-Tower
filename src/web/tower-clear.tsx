'use client';
import type {TowerView} from './contracts';
import {pokemonName,spriteUrl} from './catalog';
import {BossPortrait} from './boss-dialog';
import {useEffect,useRef} from 'react';
import {useGameKeyboard,selectGameCursor} from './game-keyboard';

export function TowerClear({tower,onNewRun}: {tower:TowerView;onNewRun:()=>void}) {
  const run=tower.run!;
  const retry=useRef<HTMLButtonElement>(null);
  useGameKeyboard('.tower-clear .clear-actions a,.tower-clear .clear-actions button',2,true);
  useEffect(()=>{selectGameCursor(retry.current);},[]);
  return <main className="tower-clear" data-testid="tower-clear">
    <div className="clear-stars" aria-hidden="true">✦ <span/> ✦</div>
    <span className="clear-eyebrow">POKÉMON TOWER · HALL OF FAME</span>
    <div className="clear-crown" aria-hidden="true"><svg viewBox="0 0 120 90"><path d="M15 65L8 23l27 20L60 8l25 35 27-20-7 42z" fill="currentColor"/><rect x="15" y="73" width="90" height="10" rx="4" fill="currentColor"/><circle cx="60" cy="55" r="8" fill="#24473e"/></svg></div>
    <h1>{run.totalFloors}층 타워를 정복했어요!</h1>
    <p className="clear-subtitle">한 층씩, 함께 오른 끝에.<br/>당신과 파트너들이 새로운 챔피언이 되었습니다.</p>
    {run.boss && <div className="clear-champion"><BossPortrait boss={run.boss}/><span>{run.boss.title} {run.boss.name}</span></div>}
    <section className="clear-team" aria-labelledby="clear-team-title"><div className="clear-section-title"><span>OUR CHAMPIONS</span><h2 id="clear-team-title">정상에 함께한 파트너들</h2></div>
      <div className="clear-roster">{run.roster.map((name,index)=><div key={name}><span className="clear-partner-number">{String(index+1).padStart(2,'0')}</span><img src={spriteUrl(name)} alt={pokemonName(name)} width={110} height={110} onError={e=>{e.currentTarget.style.visibility='hidden';}}/><strong>{pokemonName(name)}</strong></div>)}</div>
    </section>
    <div className="clear-stats"><div><span>정복한 층</span><strong>{run.totalFloors}<small>층</small></strong></div><div><span>배틀 승리</span><strong>{run.victories}<small>회</small></strong></div><div><span>이번 도전에서 모은 보상</span><strong data-testid="clear-earned">{run.earnedCoins.toLocaleString()}<small>코인</small></strong></div></div>
    <p className="clear-saved">이번 도전 성장 포인트 총 {run.growthReward}P · 층별 지급분 포함 · 보유 {tower.growthPoints.toLocaleString()}P<br/>정복 기록과 도감 해금이 저장됐어요. 다음 도전은 타워 코인 0부터 시작합니다.</p>
    <div className="clear-actions"><a href="/" className="clear-home">타이틀로 돌아가기</a><button ref={retry} className="primary-button" onClick={onNewRun}>새로운 팀으로 다시 도전 ↗</button></div>
  </main>;
}
