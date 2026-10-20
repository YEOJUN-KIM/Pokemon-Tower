'use client';
import Link from 'next/link';
import {useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import type {BattleResponse, TowerView} from './contracts';
import {PokedexDialog} from './pokedex-dialog';
import {useGameKeyboard} from './game-keyboard';

function MenuIcon({kind}:{kind:'play'|'dex'|'upgrade'|'egg'|'settings'}) {
  const paths = {
    play: <><path d="M2 12h6m8 0h6M4 7l3-3h10l3 3v10l-3 3H7l-3-3Z"/><path d="M9 9h6v6H9Z"/></>,
    dex: <><path d="M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3ZM12 6v16M6 8h3m-3 4h3m-3 4h3m6-8h3m-3 4h3m-3 4h3"/></>,
    upgrade: <><path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/><path d="M12 8v8m-4-4h8"/></>,
    egg: <><path d="M6 20 3 15l1-6 4-6h8l4 6 1 6-3 5Z"/><path d="m5 10 5 2 3-4 6 3M8 18l3-3 4 3"/></>,
    settings: <><path d="M9 2h6v4l3 1 3-1 2 5-3 2v3l1 2-4 4-3-3h-4l-3 3-4-4 2-3v-3l-3-2 2-5 3 1 2-1Z"/><path d="M9 9h6v6H9Z"/></>,
  };
  return <svg className="title-menu-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="miter">{paths[kind]}</svg>;
}

export default function TitleScreen() {
  const [tower, setTower] = useState<TowerView | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [restartOpen,setRestartOpen]=useState(false);
  const [username,setUsername]=useState<string|null>(null);
  const requestLock = useRef(false);
  const router = useRouter();
  useGameKeyboard('.title-menu a,.title-menu button,.title-utilities a,.title-utilities button',1,true);
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
    <div className="title-stage">
    <div className="title-backdrop" aria-hidden="true" />
    <section className="title-content">
      <h1 className="title-logo" aria-label="POKÉMON TOWER."><span aria-hidden="true">POKÉMON</span><strong aria-hidden="true">TOWER<span>.</span></strong></h1>
      <nav className="title-menu" aria-label="타이틀 메뉴">
        <Link className="title-option title-play" href={continuing ? '/battle' : '/battle?prepare=1'} aria-disabled={busy} onClick={e => {if (busy) e.preventDefault();}}><MenuIcon kind="play"/><span>{continuing ? '이어하기' : '게임 시작'}</span><span className="title-arrow" aria-hidden="true">▹</span></Link>
        <Link className="title-option" href="/pokedex"><MenuIcon kind="dex"/><span>포켓몬 도감</span><span className="title-arrow" aria-hidden="true">▹</span></Link>
        <Link className="title-option" href="/upgrades"><MenuIcon kind="upgrade"/><span>업그레이드</span><span className="title-arrow" aria-hidden="true">▹</span></Link>
        <Link className="title-option" href="/eggs"><MenuIcon kind="egg"/><span>알뽑기</span><span className="title-arrow" aria-hidden="true">▹</span></Link>
        <Link className="title-option" href="/settings"><MenuIcon kind="settings"/><span>설정</span><span className="title-arrow" aria-hidden="true">▹</span></Link>
      </nav>
      {error && <p className="title-error" role="alert">{error} 새로고침하거나 배틀룸에서 다시 연결해 주세요.</p>}
    </section>
    </div>
    <div className="title-utilities">
      {continuing && <button className="title-new-game" disabled={busy} onClick={() => {setError('');setRestartOpen(true);}}>{busy ? '새 도전 준비 중…' : '새로하기'}</button>}
      <Link href="/account">{username?`계정 · ${username}`:'로그인 · 회원가입'}</Link>
    </div>
    {restartOpen && continuing && <PokedexDialog title="새로하기" className="title-restart-dialog" returnFocus=".title-new-game" initialFocus=".restart-cancel" onClose={()=>{if(!busy)setRestartOpen(false);}}>
      <p>현재 도전을 종료하고 새로 시작할까요?</p>
      <p className="restart-growth">받을 성장 포인트 <strong>+{(tower?.run?.restartReward??0).toLocaleString()}P</strong></p>
      <div className="restart-actions"><button className="secondary-button restart-cancel" data-initial-focus disabled={busy} onClick={()=>setRestartOpen(false)}>취소</button><button className="primary-button" disabled={busy} onClick={()=>void startFresh()}>{busy?'준비 중…':'종료하고 새로 시작'}</button></div>
      {error && <p role="alert">{error}</p>}
    </PokedexDialog>}
  </main>;
}
