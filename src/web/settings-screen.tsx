'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {PlaybackControls} from './playback-settings';
import {SoundControls} from './audio-settings';
import {useGameKeyboard,selectGameCursor} from './game-keyboard';

const tabs=['소리','배틀 설정','계정'];
export default function SettingsScreen({username}:{username:string}) {
  const router=useRouter(),root=useRef<HTMLElement>(null);
  const [tab,setTab]=useState(0);
  const back=()=>{if(window.history.length>1)router.back();else router.push('/');};
  const tabButton=()=>root.current?.querySelector<HTMLButtonElement>('[role=tab][aria-selected=true]');
  const controls=()=>Array.from(root.current?.querySelectorAll<HTMLElement>('[role=tabpanel] button:not(:disabled),[role=tabpanel] input:not(:disabled),[role=tabpanel] select:not(:disabled),[role=tabpanel] a[href]')??[]);
  const select=(element:HTMLElement|undefined|null)=>{if(!element)return;selectGameCursor(element);element.focus({preventScroll:true});element.scrollIntoView({block:'nearest'});};
  function keyboard(event:KeyboardEvent,cursor:HTMLElement|null){
    if(event.altKey||event.ctrlKey||event.metaKey||!cursor)return false;
    const key=event.key.toLowerCase();
    if(event.repeat&&['x','z','enter'].includes(key)){event.preventDefault();return true;}
    if(key==='x'){event.preventDefault();if(cursor.closest('[role=tabpanel]'))select(tabButton());else back();return true;}
    if(cursor.matches('[role=tab]')){
      if(key.startsWith('arrow')){event.preventDefault();if(key==='arrowleft'||key==='arrowright'){const next=(tab+(key==='arrowright'?1:tabs.length-1))%tabs.length;setTab(next);select(root.current?.querySelector<HTMLElement>(`#settings-tab-${next}`));}else if(key==='arrowup')select(root.current?.querySelector('.settings-back'));return true;}
      if(key==='z'||key==='enter'){event.preventDefault();const enter=()=>{const preferred=root.current?.querySelector<HTMLElement>('[data-settings-options] [aria-pressed=true]');if(preferred instanceof HTMLButtonElement&&preferred.disabled){requestAnimationFrame(enter);return;}select(preferred??controls()[0]);};requestAnimationFrame(enter);return true;}
    }
    if(cursor.closest('[role=tabpanel]')){
      const items=controls(),index=items.indexOf(cursor);
      const options=cursor.closest('[data-settings-options]');
      const row=cursor.closest('.setting-row');
      if(row&&(key==='arrowup'||key==='arrowdown')){event.preventDefault();const rows=Array.from(root.current?.querySelectorAll('.settings-panel>.setting-row')??[]),position=rows.indexOf(row),delta=key==='arrowup'?-1:1;let next:HTMLElement|null=null;for(let i=position+delta;i>=0&&i<rows.length;i+=delta){next=items.find(item=>rows[i].contains(item))??null;if(next)break;}select(next??(key==='arrowup'?tabButton():cursor));return true;}
      if(options&&(key==='arrowleft'||key==='arrowright')){event.preventDefault();const buttons=Array.from(options.querySelectorAll<HTMLElement>('button:not(:disabled),a[href]')),position=buttons.indexOf(cursor);select(buttons[(position+(key==='arrowright'?1:buttons.length-1))%buttons.length]);return true;}
      if(options&&(key==='arrowup'||key==='arrowdown')){event.preventDefault();const outside=items.filter(item=>!options.contains(item));select(key==='arrowup'?outside.filter(item=>items.indexOf(item)<index).at(-1)??tabButton():outside.find(item=>items.indexOf(item)>index)??cursor);return true;}
      if(key==='arrowup'||key==='arrowdown'){event.preventDefault();select(key==='arrowup'?items[index-1]??tabButton():items[index+1]??cursor);return true;}
      if(key==='z'||key==='enter'){
        if(cursor instanceof HTMLInputElement&&cursor.type==='range')return false;
        event.preventDefault();cursor.click();return true;
      }
    }
    if(cursor.matches('.settings-back')&&key.startsWith('arrow')){event.preventDefault();select(tabButton());return true;}
    return false;
  }
  useGameKeyboard('.settings-tabs button,.settings-back,.settings-panel button,.settings-panel input,.settings-panel select,.settings-panel a',1,true,(event,cursor)=>keyboard(event,cursor),cursor=>{const active=document.activeElement;if(active instanceof HTMLInputElement&&(active as HTMLElement)!==cursor&&root.current?.contains(active))active.blur();});
  useEffect(()=>{selectGameCursor(root.current?.querySelector('[role=tab][aria-selected=true]'));},[]);
  return <main ref={root} className="settings-screen settings-tabbed" onKeyDownCapture={event=>{const target=event.target as HTMLElement;if(!target.closest('dialog')&&target.matches('input,select')&&keyboard(event.nativeEvent,target))event.stopPropagation();}}>
    <header className="settings-heading"><h1>설정<span className="brand-dot">.</span></h1><button className="settings-back" onClick={back}>← 뒤로가기 <kbd>X</kbd></button></header>
    <nav className="settings-tabs" role="tablist" aria-label="설정 분류">{tabs.map((label,index)=><button key={label} id={`settings-tab-${index}`} role="tab" aria-selected={tab===index} aria-controls={`settings-panel-${index}`} tabIndex={tab===index?0:-1} onClick={()=>setTab(index)}>{label}</button>)}</nav>
    <section className="settings-card settings-panel" role="tabpanel" id={`settings-panel-${tab}`} aria-labelledby={`settings-tab-${tab}`}>
      {tab===0?<SoundControls/>:tab===1?<><PlaybackControls/><Link className="secondary-button" href="/pokedex">포켓몬 도감으로 이동 ↗</Link></>:<>
        <div className="setting-row"><span>로그인 계정<small>게임 진행과 도감이 계정에 저장됩니다.</small></span><strong>{username}</strong></div>
        <div className="settings-account-actions" data-settings-options><Link className="secondary-button" href="/account">계정 관리 ↗</Link><Link className="secondary-button" href="/battle">내 게임으로 돌아가기 ↗</Link></div>
      </>}
    </section>
    <footer className="settings-key-hints"><span><kbd>← / →</kbd> 탭 선택</span><span><kbd>Z / Enter</kbd> 세부 설정·결정</span><span><kbd>↑ / ↓</kbd> 항목 이동</span><span><kbd>X</kbd> 탭·뒤로가기</span></footer>
  </main>;
}
