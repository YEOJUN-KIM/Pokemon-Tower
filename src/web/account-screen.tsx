'use client';
import {useRouter} from 'next/navigation';
import {useEffect,useState,type FormEvent} from 'react';
import {useGameKeyboard} from './game-keyboard';
import {syncAccountAudio} from './audio-settings';

type Mode='login'|'register'|'reset';
type ResetIdentity={username:string;recoveryKey:string};
type Completion={kind:'register'|'reset';username:string;recoveryKey:string};

export default function AccountScreen() {
  const router=useRouter();
  const [loading,setLoading]=useState(true),[mode,setMode]=useState<Mode>('login');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[showClaim,setShowClaim]=useState(false);
  const [resetIdentity,setResetIdentity]=useState<ResetIdentity|null>(null),[completion,setCompletion]=useState<Completion|null>(null);
  useGameKeyboard('.account-screen button',1,true);
  useEffect(()=>{
    let alive=true;
    // Prepare the existing guest save before signup so account linking is unchanged.
    Promise.all([fetch('/api/account',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json();}),fetch('/api/battle?view=collection',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();})])
      .then(([data])=>{if(!alive)return;if(data.username){router.replace('/');router.refresh();}else setLoading(false);})
      .catch(()=>{if(alive){setError('서버에 연결할 수 없습니다.');setLoading(false);}});
    return ()=>{alive=false;};
  },[router]);
  function changeMode(value:Mode) {setMode(value);setResetIdentity(null);setShowClaim(false);setError('');}
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();if(busy)return;setError('');
    const fields=new FormData(event.currentTarget);
    if(mode==='reset'&&!resetIdentity){
      // Stage the form only; the existing reset API verifies the key when changing the password.
      setResetIdentity({username:String(fields.get('username')),recoveryKey:String(fields.get('recoveryKey'))});return;
    }
    if(mode!=='login'&&fields.get('password')!==fields.get('confirm')){setError('비밀번호가 서로 다릅니다.');return;}
    setBusy(true);
    try {
      const response=await fetch('/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:mode,username:resetIdentity?.username??fields.get('username'),password:fields.get('password'),claimCode:fields.get('claimCode')??'',recoveryKey:resetIdentity?.recoveryKey})});
      const data=await response.json();
      if(!response.ok){if(mode==='reset'&&response.status===401)setResetIdentity(null);throw new Error(data.error);}
      await syncAccountAudio(true).catch(()=>{});
      if(mode==='login'){router.replace('/');router.refresh();}
      else {setCompletion({kind:mode,username:data.username,recoveryKey:data.recoveryKey??''});setResetIdentity(null);}
    }catch(error){setError(error instanceof Error?error.message:'서버에 연결할 수 없습니다.');}
    finally{setBusy(false);}
  }
  const title=completion?(completion.kind==='register'?'회원가입이 완료되었습니다!':'비밀번호가 변경되었습니다!'):mode==='login'?'트레이너 로그인':mode==='register'?'트레이너 회원가입':resetIdentity?'새 비밀번호':'비밀번호 찾기';
  const passwordFields=mode!=='reset'||resetIdentity!==null;
  return <main className="account-screen"><section className="account-card" aria-busy={busy}><h1>{title}</h1>
    {loading?<p>계정 확인 중…</p>:completion?<>
      <p>{completion.kind==='register'?`${completion.username}님, 환영합니다.`:`${completion.username}님의 비밀번호를 변경했습니다.`}</p>
      {completion.recoveryKey&&<div className="account-recovery"><h2>계정 복구 키</h2><p>비밀번호를 잊었을 때 필요합니다. 아래 키를 복사해 안전하게 보관해 주세요.{completion.kind==='reset'?' 이전 키는 더 이상 사용할 수 없습니다.':''}</p><code>{completion.recoveryKey}</code></div>}
      <button className="primary-button" onClick={()=>{router.replace('/');router.refresh();}}>게임 시작하기</button>
    </>:<>
      <nav aria-label="계정 메뉴">{(['login','register','reset'] as const).map(value=><button type="button" className="secondary-button" aria-pressed={mode===value} key={value} disabled={busy} onClick={()=>changeMode(value)}>{value==='login'?'로그인':value==='register'?'회원가입':'비밀번호 찾기'}</button>)}</nav>
      <form key={mode+(resetIdentity?'password':'identity')} onSubmit={e=>void submit(e)}>
        {!resetIdentity&&<>
          <label>아이디<input name="username" autoComplete="username" required minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]+" autoCapitalize="none" spellCheck={false}/></label>
          {mode==='register'&&<small className="account-field-help">영문·숫자·밑줄 3~24자</small>}
          {mode==='reset'&&<label>계정 복구 키<input name="recoveryKey" required autoComplete="off" maxLength={128}/></label>}
        </>}
        {passwordFields&&<>
          <label>{mode==='reset'?'새 비밀번호':'비밀번호'}<input name="password" type="password" autoComplete={mode==='login'?'current-password':'new-password'} required minLength={8} maxLength={128}/></label>
          {mode!=='login'&&<label>비밀번호 확인<input name="confirm" type="password" autoComplete="new-password" required minLength={8} maxLength={128}/></label>}
        </>}
        {mode==='reset'&&!resetIdentity&&<p className="account-note">입력한 아이디와 복구 키는 비밀번호 변경 시 함께 확인합니다.</p>}
        <button className="primary-button" disabled={busy}>{busy?'처리 중…':mode==='login'?'로그인':mode==='register'?'회원가입':resetIdentity?'비밀번호 변경':'계정 확인'}</button>
        {mode==='register'&&<><p className="account-note">현재 게스트 플레이 기록은 새 계정에 자동으로 연결됩니다.</p><div className="account-claim"><p className="account-note">기존 저장 데이터를 복구하시나요?</p><button type="button" className="secondary-button" aria-expanded={showClaim} aria-controls="account-claim-code" onClick={()=>setShowClaim(value=>!value)}>{showClaim?'복구 코드 입력 닫기':'복구 코드 입력하기'}</button>{showClaim&&<label id="account-claim-code">기존 저장 복구 코드 (선택)<input name="claimCode" autoComplete="off" maxLength={128}/></label>}</div></>}
      </form>
      {mode!=='register'&&<p className="account-note">한 번 로그인하면 이 브라우저에서 30일 동안 유지됩니다.</p>}
    </>}
    {error&&<p role="alert">{error}</p>}
  </section></main>;
}
