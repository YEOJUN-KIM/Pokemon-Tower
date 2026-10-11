'use client';
import {useEffect, useState} from 'react';
import {effect, updateAudio, unlockAudio, pauseForVisibility,startMusic,stopMusic,stopEffects} from './game-audio';
import {effectPreviews} from './sound-design';
import {musicNames,type MusicTrack} from './music-score';

export const AUDIO_KEY = 'tower-audio-v1';
export type AudioSettings = {muted: boolean; effectsVolume: number; musicVolume:number};
export const defaultAudio: AudioSettings = {muted:true, effectsVolume:40, musicVolume:30};
export function readAudio(): AudioSettings {
  try {
    const value = JSON.parse(localStorage.getItem(AUDIO_KEY) ?? 'null');
    return {muted: typeof value?.muted === 'boolean' ? value.muted : true, effectsVolume: typeof value?.effectsVolume === 'number' && Number.isFinite(value.effectsVolume) ? Math.max(0, Math.min(100, value.effectsVolume)) : 40, musicVolume:typeof value?.musicVolume === 'number' && Number.isFinite(value.musicVolume) ? Math.max(0,Math.min(100,value.musicVolume)) : 30};
  } catch {return defaultAudio;}
}
export function playClick(settings: AudioSettings) {
  updateAudio(settings); effect('click');
}
export async function syncAccountAudio(uploadIfEmpty=false) {
  const response=await fetch('/api/account',{cache:'no-store'});
  if(!response.ok)return;
  const data=await response.json();
  if(data.audio){localStorage.setItem(AUDIO_KEY,JSON.stringify(data.audio));updateAudio(readAudio());window.dispatchEvent(new Event('tower-audio-sync'));}
  else if(data.username&&uploadIfEmpty)await fetch('/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'settings',audio:readAudio()})});
}
export function ClickSounds() {
  useEffect(() => {
    updateAudio(readAudio());
    void syncAccountAudio().catch(()=>{});
    const click = (event: MouseEvent) => {
      updateAudio(readAudio()); void unlockAudio();
      if (event.target instanceof Element && event.target.closest('button:not(:disabled), a[href]') && !event.target.closest('[data-silent]')) {const button=event.target.closest('button,a[href]');if(button && /취소|닫기|뒤로/.test(button.getAttribute('aria-label')??button.textContent??''))effect('cancel');else playClick(readAudio());}
    };
    const sync = () => updateAudio(readAudio());
    document.addEventListener('click', click);
    document.addEventListener('visibilitychange',pauseForVisibility);
    window.addEventListener('storage',sync);
    return () => {document.removeEventListener('click', click);document.removeEventListener('visibilitychange',pauseForVisibility);window.removeEventListener('storage',sync);};
  }, []);
  return null;
}
export function SoundControls() {
  const [loggedIn,setLoggedIn]=useState(false);
  const [settings, setSettings] = useState(defaultAudio);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [effectPreview,setEffectPreview]=useState('hit');
  const [preview,setPreview]=useState<MusicTrack>('trainer'),[listening,setListening]=useState(false);
  useEffect(()=>()=>{stopMusic();stopEffects();},[]);
  useEffect(()=>{let alive=true;fetch('/api/account',{cache:'no-store'}).then(r=>r.json()).then(data=>{if(alive)setLoggedIn(!!data.username);}).catch(()=>{});return ()=>{alive=false;};},[]);
  useEffect(() => {setSettings(readAudio()); setReady(true);const sync=()=>setSettings(readAudio());window.addEventListener('tower-audio-sync',sync);return ()=>window.removeEventListener('tower-audio-sync',sync);}, []);
  const save = (next: AudioSettings) => {
    try {localStorage.setItem(AUDIO_KEY, JSON.stringify(next)); updateAudio(next); setSettings(next); setError('');}
    catch {setError('이 브라우저에서 설정을 저장할 수 없습니다.');}
    if(loggedIn)void fetch('/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'settings',audio:next})}).then(response=>{if(!response.ok)setError('계정에 소리 설정을 저장하지 못했습니다.');}).catch(()=>setError('계정에 소리 설정을 저장하지 못했습니다.'));
  };
  return <>
    <label className="setting-row"><span>전체 음소거<small>처음에는 소리가 꺼져 있습니다.</small></span><input type="checkbox" checked={settings.muted} disabled={!ready} onChange={e => save({...settings, muted:e.target.checked})} /></label>
    <label className="setting-row"><span>BGM 크기<small>배틀 · 보상 · 결과 음악</small></span><span className="volume-control"><input aria-label="BGM 크기" type="range" min="0" max="100" value={settings.musicVolume} disabled={!ready} onChange={e => save({...settings, musicVolume:Number(e.target.value)})} /><output>{settings.musicVolume}%</output></span></label>
    <label className="setting-row"><span>효과음 크기<small>메뉴 · 기술 · 피격 · 승패 소리</small></span><span className="volume-control"><input aria-label="효과음 크기" type="range" min="0" max="100" value={settings.effectsVolume} disabled={!ready} onChange={e => save({...settings, effectsVolume:Number(e.target.value)})} /><output>{settings.effectsVolume}%</output></span></label>
    <label className="setting-row"><span>효과음 미리듣기<small>기술 타입 · 피격 · 변신을 비교해보세요.</small></span><select aria-label="미리듣기 효과음" value={effectPreview} onChange={e=>setEffectPreview(e.target.value)}>{Object.entries(effectPreviews).map(([id,info])=><option key={id} value={id}>{info.name}</option>)}</select></label>
    <button className="secondary-button" data-silent disabled={!ready || settings.muted || !settings.effectsVolume} onClick={()=>{const sound=effectPreviews[effectPreview];effect(sound.kind,sound.color,sound.options);}}>효과음 들어보기</button>
    <label className="setting-row"><span>BGM 미리듣기<small>상황별 음악을 비교해보세요.</small></span><select aria-label="미리듣기 곡" value={preview} onChange={e=>{const track=e.target.value as MusicTrack;setPreview(track);if(listening)startMusic(track);}}>{Object.entries(musicNames).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
    <button className="secondary-button" disabled={!ready || settings.muted || !settings.musicVolume} onClick={()=>{if(listening){stopMusic();setListening(false);}else{updateAudio(settings);startMusic(preview);setListening(true);}}}>{listening ? '미리듣기 정지' : 'BGM 들어보기'}</button>
    <p className="setting-note">설정은 이 브라우저에 자동 저장됩니다. 음악은 배틀·보상·승패에 따라 바뀌고, 화면을 떠나면 멈춥니다.</p>
    {error && <p role="alert">{error}</p>}
  </>;
}
