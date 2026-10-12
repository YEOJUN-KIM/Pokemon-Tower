'use client';
import Link from 'next/link';
import {useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import type {BattleResponse, TowerView} from './contracts';
import {PokedexDialog} from './pokedex-dialog';
import {useGameKeyboard} from './game-keyboard';

export default function TitleScreen() {
  const [tower, setTower] = useState<TowerView | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [restartOpen,setRestartOpen]=useState(false);
  const [username,setUsername]=useState<string|null>(null);
  const requestLock = useRef(false);
  const router = useRouter();
  useGameKeyboard('.title-menu a,.title-menu button',1,true);
  useEffect(() => {
    let alive = true;
    fetch('/api/account',{cache:'no-store'}).then(r=>r.json()).then(data=>{if(alive)setUsername(data.username);}).catch(()=>{});
    fetch('/api/battle', {cache:'no-store'}).then(async response => {
      const data: BattleResponse = await response.json();
      if (!response.ok) throw new Error(data.error ?? '저장된 도전을 불러오지 못했습니다.');
      if (alive) setTower(data.tower);
    }).catch(e => {if (alive) setError(e.message);});
    return () => {alive = false;};
  }, []);
  const continuing = tower?.run && ['battle','select','recruit'].includes(tower.run.state);
  async function startFresh() {
    if (!continuing || !tower?.run || requestLock.current) return;
    requestLock.current = true;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/battle', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({type:'abandon',runId:tower.run.id}),
      });
      const data: BattleResponse = await response.json();
      if (!response.ok) throw new Error(data.error ?? '새 도전을 준비하지 못했습니다.');
      setTower(data.tower);
      setRestartOpen(false);
      router.push('/battle');
    } catch (e) {setError(e instanceof Error ? e.message : '서버에 연결할 수 없습니다.');}
    finally {requestLock.current = false; setBusy(false);}
  }
  return <main className="title-screen">
    <div className="title-scene" aria-hidden="true"><span>01</span><div className="title-tower">{[0,1,2,3,4].map(i => <i key={i} />)}</div></div>
    <section className="title-content">
      <span className="eyebrow">ONE TEAM. A NEW CHALLENGE.</span>
      <h1><span>POKÉMON</span>TOWER<span className="brand-dot">.</span></h1>
      <p className="title-description">세 마리의 파트너와 함께.<br />한 층씩, 더 높이.</p>
      <div className="title-menu">
        <Link className="primary-button title-play" href={continuing ? '/battle' : '/battle?prepare=1'} aria-disabled={busy} onClick={e => {if (busy) e.preventDefault();}}>{continuing ? '이어하기' : '게임 시작'}{continuing && <span className="title-run-progress">{tower.run!.floor} / {tower.run!.totalFloors}층</span>}<span aria-hidden="true">↗</span></Link>
        {continuing && <button className="secondary-button title-new-game" disabled={busy} onClick={() => {setError('');setRestartOpen(true);}}>{busy ? '새 도전 준비 중…' : '새로하기'}</button>}
        <Link className="secondary-button" href="/pokedex">포켓몬 도감</Link>
        <Link className="secondary-button" href="/upgrades">영구 업그레이드</Link>
        <Link className="secondary-button" href="/settings">설정</Link>
        <Link className="secondary-button" href="/account">{username?`계정 · ${username}`:'로그인 · 회원가입'}</Link>
      </div>
      {(!continuing || error) && <div className="title-save" aria-live="polite">{error ? <p role="alert">{error} 새로고침하거나 배틀룸에서 다시 연결해 주세요.</p> : !tower ? '저장된 도전을 확인하는 중…' : <><strong>다음 도전을 준비하세요.</strong><span>성장 포인트 {tower.growthPoints.toLocaleString()}P · 영구 도감 {tower.unlocked.length}종 · 현재 {tower.totalFloors}층 타워</span></>}</div>}
    </section>
    {restartOpen && continuing && <PokedexDialog title="새로하기" className="title-restart-dialog" returnFocus=".title-new-game" initialFocus=".restart-cancel" onClose={()=>{if(!busy)setRestartOpen(false);}}>
      <p>현재 도전을 종료하고 새로 시작할까요?</p>
      <p className="restart-growth">받을 성장 포인트 <strong>+{(tower?.run?.restartReward??0).toLocaleString()}P</strong></p>
      <div className="restart-actions"><button className="secondary-button restart-cancel" data-initial-focus disabled={busy} onClick={()=>setRestartOpen(false)}>취소</button><button className="primary-button" disabled={busy} onClick={()=>void startFresh()}>{busy?'준비 중…':'종료하고 새로 시작'}</button></div>
      {error && <p role="alert">{error}</p>}
    </PokedexDialog>}
  </main>;
}
