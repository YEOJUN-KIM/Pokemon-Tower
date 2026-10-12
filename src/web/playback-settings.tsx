'use client';
import {useEffect,useState} from 'react';
export const PLAYBACK_KEY='tower-playback-speed-v1';
export type PlaybackSpeed=1|2|4;
export function playbackDuration(duration:number,speed:PlaybackSpeed,notice=false){return Math.max(duration/speed,notice?1200:0);}
export function readPlaybackSpeed():PlaybackSpeed{
  try{const value=Number(localStorage.getItem(PLAYBACK_KEY));return value===2||value===4?value:1;}catch{return 1;}
}
export function PlaybackControls(){
  const [speed,setSpeed]=useState<PlaybackSpeed>(1),[ready,setReady]=useState(false),[error,setError]=useState('');
  useEffect(()=>{setSpeed(readPlaybackSpeed());setReady(true);},[]);
  return <><div className="setting-row"><span>배틀 배속<small>좌우로 선택 · Z로 결정</small></span><div className="settings-options" data-settings-options role="group" aria-label="배틀 배속">{([1,2,4] as const).map(value=><button key={value} disabled={!ready} aria-pressed={speed===value} onClick={()=>{try{localStorage.setItem(PLAYBACK_KEY,String(value));setSpeed(value);setError('');}catch{setError('이 브라우저에서 배속을 저장할 수 없습니다.');}}}>{value}배</button>)}</div></div><p className="setting-note">메시지와 기술·변신 연출을 순서대로 빠르게 재생합니다. 이 브라우저에 자동 저장되며 Shift로 건너뛰기도 가능합니다.</p>{error&&<p role="alert">{error}</p>}</>;
}
