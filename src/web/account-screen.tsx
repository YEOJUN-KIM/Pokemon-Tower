'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect,useState,type FormEvent} from 'react';
import {useGameKeyboard} from './game-keyboard';
import {syncAccountAudio} from './audio-settings';

export default function AccountScreen({destination='/'}:{destination?:string}) {
  const router=useRouter();
  const [account,setAccount]=useState<string|null>(null),[loading,setLoading]=useState(true);
  const [mode,setMode]=useState<'login'|'register'|'reset'>('login');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[recoveryKey,setRecoveryKey]=useState('');
  useGameKeyboard('.account-screen button,.account-screen a',1,true);
  useEffect(()=>{
    let alive=true;
    Promise.all([fetch('/api/account',{cache:'no-store'}).then(r=>r.json()),fetch('/api/battle?view=collection',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('저장을 불러오지 못했습니다.');})])
      .then(([data])=>{if(alive)setAccount(data.username);}).catch(()=>{if(alive)setError('서버에 연결할 수 없습니다.');}).finally(()=>{if(alive)setLoading(false);});
    return ()=>{alive=false;};
  },[]);
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();if(busy)return;
    const fields=new FormData(event.currentTarget);
    if(mode!=='login'&&fields.get('password')!==fields.get('confirm')){setError('비밀번호가 서로 다릅니다.');return;}
    await send({action:mode,username:fields.get('username'),password:fields.get('password'),claimCode:fields.get('claimCode')??'',recoveryKey:fields.get('recoveryKey')});
  }
  async function send(body:Record<string,unknown>) {
    setBusy(true);setError('');
    try {
      const response=await fetch('/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error);
      setAccount(data.username);setRecoveryKey(data.recoveryKey??'');
      if(data.username)await syncAccountAudio(true).catch(()=>{});
      if(body.action==='login'){router.replace(destination);router.refresh();}
      else if(body.action==='logout')router.refresh();
    }catch(error){setError(error instanceof Error?error.message:'서버에 연결할 수 없습니다.');}
    finally{setBusy(false);}
  }
  function downloadKey() {
    const blob=new Blob([`Pokémon Tower\n아이디: ${account}\n계정 복구 키: ${recoveryKey}\n비밀번호를 잊었을 때 사용합니다. 다른 사람에게 공유하지 마세요.\n`],{type:'text/plain;charset=utf-8'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download='pokemon-tower-account-key.txt';link.click();URL.revokeObjectURL(url);
  }
  return <main className="account-screen"><section className="account-card"><h1>{account?'트레이너 계정':'트레이너 로그인'}</h1>
    {loading?<p>계정 확인 중…</p>:account?<>
      <p><strong>{account}</strong>님으로 로그인했습니다.</p>
      {recoveryKey&&<div className="account-recovery"><h2>계정 복구 키</h2><p>비밀번호를 잊었을 때 사용합니다. 지금 저장해 주세요.</p><code>{recoveryKey}</code><button className="secondary-button" onClick={downloadKey}>복구 키 파일 저장</button></div>}
      <Link className="primary-button" href={destination}>게임으로 들어가기</Link>
      <button className="secondary-button" disabled={busy} onClick={()=>void send({action:'logout'})}>로그아웃</button>
    </>:<>
      <nav aria-label="계정 메뉴">{(['login','register','reset'] as const).map(value=><button className="secondary-button" aria-pressed={mode===value} key={value} disabled={busy} onClick={()=>{setMode(value);setError('');}}>{value==='login'?'로그인':value==='register'?'회원가입':'비밀번호 찾기'}</button>)}</nav>
      <form onSubmit={e=>void submit(e)}>
        <label>아이디<input name="username" autoComplete="username" required minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]+" autoCapitalize="none" spellCheck={false}/></label>
        <small>영문·숫자·밑줄 3~24자</small>
        {mode==='reset'&&<label>계정 복구 키<input name="recoveryKey" required autoComplete="off"/></label>}
        <label>{mode==='reset'?'새 비밀번호':'비밀번호'}<input name="password" type="password" autoComplete={mode==='login'?'current-password':'new-password'} required minLength={8} maxLength={128}/></label>
        {mode!=='login'&&<label>비밀번호 확인<input name="confirm" type="password" autoComplete="new-password" required minLength={8} maxLength={128}/></label>}
        {mode==='register'&&<><p className="account-note">현재 게스트 저장을 계정에 연결합니다.</p><label>기존 저장 복구 코드 (선택)<input name="claimCode" autoComplete="off" maxLength={128}/></label></>}
        <button className="primary-button" disabled={busy}>{busy?'처리 중…':mode==='login'?'로그인':mode==='register'?'회원가입':'비밀번호 재설정'}</button>
      </form><p className="account-note">한 번 로그인하면 이 브라우저에서 30일 동안 유지됩니다.</p>
    </>}
    {error&&<p role="alert">{error}</p>}
  </section></main>;
}
