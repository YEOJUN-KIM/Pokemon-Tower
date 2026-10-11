import Link from 'next/link';
import {SoundControls} from './audio-settings';

export default function SettingsScreen() {
  return <main className="settings-screen"><Link className="back-link" href="/">← 타이틀로</Link>
    <div className="eyebrow">YOUR PREFERENCES</div><h1>설정<span className="brand-dot">.</span></h1>
    <section className="settings-card" aria-labelledby="sound-heading"><h2 id="sound-heading">소리</h2><SoundControls /></section>
    <section className="settings-card" aria-labelledby="account-heading"><h2 id="account-heading">계정과 저장</h2>
      <div className="setting-row"><span>현재 이용 방식<small>이 브라우저의 게스트로 플레이합니다.</small></span><strong>게스트</strong></div>
      <p className="setting-note">이 브라우저에서 저장한 게임을 이어할 수 있습니다. 쿠키를 삭제하면 기존 저장에 접근할 수 없습니다.</p>
      <Link className="secondary-button" href="/battle">내 게임으로 돌아가기 ↗</Link>
    </section>
  </main>;
}
