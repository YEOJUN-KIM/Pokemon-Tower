'use client';
import {useEffect, useRef} from 'react';
import {useDialogControls} from './game-menu-context';
import type {BattleView, TowerView} from './contracts';
import {VillainOutcome} from './villain-outcome';
import {BossPortrait} from './boss-dialog';

export function resultText(battle: BattleView) {
  return battle.winner === 'Player' ? {kind:'win', label:'승리!', english:'VICTORY', icon:'★'} : battle.winner === 'tie' ? {kind:'draw', label:'무승부', english:'DRAW', icon:'＝'} : {kind:'loss', label:'패배', english:'DEFEAT', icon:'↓'};
}

export function ResultBanner({battle, tower}: {battle: BattleView; tower: TowerView}) {
  const result = resultText(battle);
  return <section className={`result-banner ${result.kind}`} data-testid="battle-result" aria-label="배틀 결과" aria-live="polite">
    <strong>{result.label}</strong><span>{tower.run?.floor}층 · {battle.turn}턴{tower.run?.state === 'recruit' ? tower.run.raid?' · 특별한 보상 지급 완료':` · 승리 보상 ${tower.run.reward}코인 지급 완료` : result.kind === 'loss' ? tower.run?.retries?.canRetry?' · 다시하기 가능':' · 이번 도전 종료' : ''}</span>
  </section>;
}

export function BattleResultDialog({battle, tower, onContinue,onRetry,busy=false}: {battle: BattleView; tower: TowerView; onContinue: () => void;onRetry?:()=>void;busy?:boolean}) {
  useDialogControls('battle-result',[{key:'↑ / ↓',label:'선택'},{key:'Enter / Z',label:'결정'}]);
  const dialog = useRef<HTMLDialogElement>(null);
  const result = resultText(battle);
  const recruiting = tower.run?.state === 'recruit';
  const retry=tower.run?.retries?.canRetry;
  const halfway=recruiting && !tower.run!.raid && tower.run!.totalFloors>=100 && tower.run!.floor===50;
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return <dialog ref={dialog} className={`battle-result-dialog ${result.kind}`} data-testid="result-dialog" aria-labelledby="result-title" aria-describedby="result-description" onCancel={e => {e.preventDefault(); onContinue();}}>
    <div className="result-emblem" aria-hidden="true">{result.icon}</div><span className="result-english">{result.english}</span>
    <h2 id="result-title">{result.label}</h2>
    {(tower.run?.boss || tower.run?.villainEvent) && <div className="boss-result"><BossPortrait boss={tower.run.boss ?? tower.run.trainer ?? undefined}/><strong>{(tower.run.boss ?? tower.run.trainer)?.title} {(tower.run.boss ?? tower.run.trainer)?.name}</strong></div>}
    <p id="result-description">{result.kind==='win'&&tower.run?.hiddenBossNext ? '챔피언을 격파했습니다. 회복 후 히든보스 이벤트가 이어집니다.' : halfway ? '50층 관문을 넘었습니다! 다음은 잠시 숨을 고르는 구간입니다. 파트너들과 100층을 향해 계속 올라가세요.' : result.kind === 'win' ? '상대 팀을 모두 쓰러뜨렸습니다.' : result.kind === 'loss' ? retry?'우리 팀이 모두 쓰러졌습니다. 상대에 맞춰 팀을 다시 준비할 수 있습니다.':'우리 팀이 모두 쓰러졌습니다. 이번 타워 도전은 여기까지입니다.' : '승부를 가리지 못했습니다. 이번 도전이 종료되었습니다.'}</p>
    <div className="result-stats"><span>{tower.run?.floor}층 배틀</span><strong>{battle.turn}턴</strong></div>
    {recruiting && <VillainOutcome event={tower.run?.villainEvent}/>}
    {recruiting ? <div className="result-reward"><span>{tower.run!.raid?'특별한 보상 지급 완료':'타워 코인 지급 완료'}</span><strong>{tower.run!.raid?'포켓몬 영입 + 특별한 보상':`+${tower.run!.reward}코인`}</strong><small>{tower.run!.raid?'영입 선택 후 특별한 보상을 확인하세요.':'상대 포켓몬 1마리를 영입하거나 다음 층으로 진행할 수 있습니다.'}</small></div> : <p className="result-retained">{retry?'같은 상대에게 다시 도전할 수 있습니다. 도전을 종료하면 성장 포인트를 정산합니다.':`성장 포인트 +${tower.run?.growthReward ?? 0}P 지급 완료`}</p>}
    {retry&&<button className="primary-button" disabled={busy} autoFocus onClick={onRetry}>출전 설정부터 다시하기 · 남은 {tower.run!.retries!.remaining}회</button>}
    <button className={retry?'secondary-button':'primary-button'} disabled={busy} autoFocus={!retry} onClick={onContinue}>{recruiting ? '영입으로 계속' : retry?'도전 종료 · 새 도전 준비':'새 도전 준비'} <span aria-hidden="true">↗</span></button>
  </dialog>;
}
