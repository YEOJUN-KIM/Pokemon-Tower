'use client';
import {useEffect, useState} from 'react';
import {effect, updateAudio, unlockAudio, pauseForVisibility,startMusic,stopMusic,stopEffects} from './game-audio';
import {SettingsChoice} from './settings-choice';
import {PokedexDialog} from './pokedex-dialog';
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
  const [volume,setVolume]=useState<'musicVolume'|'effectsVolume'|null>(null),[draftVolume,setDraftVolume]=useState(0);
  const openVolume=(key:'musicVolume'|'effectsVolume')=>{setDraftVolume(settings[key]);setVolume(key);};
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
    <label className="setting-row"><span>BGM 크기<small>배틀 · 보상 · 결과 음악</small></span><span className="volume-control"><input aria-label="BGM 크기" type="range" min="0" max="100" value={settings.musicVolume} onKeyDown={event=>{if(['z','enter'].includes(event.key.toLowerCase())){event.preventDefault();event.stopPropagation();openVolume('musicVolume');}}} disabled={!ready} onChange={e => save({...settings, musicVolume:Number(e.target.value)})} /><output>{settings.musicVolume}%</output></span></label>
    <label className="setting-row"><span>효과음 크기<small>메뉴 · 기술 · 피격 · 승패 소리</small></span><span className="volume-control"><input aria-label="효과음 크기" type="range" min="0" max="100" value={settings.effectsVolume} onKeyDown={event=>{if(['z','enter'].includes(event.key.toLowerCase())){event.preventDefault();event.stopPropagation();openVolume('effectsVolume');}}} disabled={!ready} onChange={e => save({...settings, effectsVolume:Number(e.target.value)})} /><output>{settings.effectsVolume}%</output></span></label>
    <div className="setting-row"><span>효과음 미리듣기<small>기술 타입 · 피격 · 변신을 비교해보세요.</small></span><div className="settings-preview-actions" data-settings-options><SettingsChoice name="effects" label="미리듣기 효과음" value={effectPreview} options={Object.entries(effectPreviews).map(([value,info])=>({value,label:info.name}))} onChange={setEffectPreview}/>
    <button className="secondary-button" data-silent disabled={!ready || settings.muted || !settings.effectsVolume} onClick={()=>{const sound=effectPreviews[effectPreview];effect(sound.kind,sound.color,sound.options);}}>효과음 들어보기</button></div></div>
    <div className="setting-row"><span>BGM 미리듣기<small>상황별 음악을 비교해보세요.</small></span><div className="settings-preview-actions" data-settings-options><SettingsChoice name="music" label="미리듣기 곡" value={preview} options={Object.entries(musicNames).map(([value,label])=>({value,label}))} onChange={value=>{const track=value as MusicTrack;setPreview(track);if(listening)startMusic(track);}}/>
    <button className="secondary-button" disabled={!ready || settings.muted || !settings.musicVolume} onClick={()=>{if(listening){stopMusic();setListening(false);}else{updateAudio(settings);startMusic(preview);setListening(true);}}}>{listening ? '미리듣기 정지' : 'BGM 들어보기'}</button></div></div>
    {volume&&<PokedexDialog title={volume==='musicVolume'?'BGM 음량':'효과음 음량'} onClose={()=>setVolume(null)} returnFocus={volume==='musicVolume'?'[aria-label="BGM 크기"]':'[aria-label="효과음 크기"]'} initialFocus="[data-initial-focus]" className="settings-volume-dialog"><div className="settings-volume-picker"><button aria-label="음량 10 낮추기" disabled={draftVolume===0} onClick={()=>setDraftVolume(Math.max(0,draftVolume-10))}>−</button><output aria-live="polite">{draftVolume}%</output><button aria-label="음량 10 높이기" disabled={draftVolume===100} onClick={()=>setDraftVolume(Math.min(100,draftVolume+10))}>＋</button></div><div className="dex-action-options"><button data-initial-focus onClick={()=>{save({...settings,[volume]:draftVolume});setVolume(null);}}>결정</button><button onClick={()=>setVolume(null)}>취소</button></div><p className="setting-note">±10으로 조절 · 결정하면 저장 · X로 취소</p></PokedexDialog>}
    {error && <p role="alert">{error}</p>}
  </>;
}
