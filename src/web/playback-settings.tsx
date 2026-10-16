'use client';
import {useEffect,useState} from 'react';
export const PLAYBACK_KEY='tower-playback-speed-v1';
export type PlaybackSpeed=1|2|4;
export type PlaybackTiming={important?:boolean;idle?:boolean};
export function playbackDuration(duration:number,speed:PlaybackSpeed,notice=false,dialogue='',timing:PlaybackTiming={}){
  const readingTime=speed>1 && dialogue ? Math.min(duration,Math.max(800,Math.min(1600,Array.from(dialogue).length*28+450))) : 0;
  if(speed===4){
    const readable=timing.important!==false ? readingTime : dialogue?Math.min(duration,Math.max(450,Math.min(850,Array.from(dialogue).length*18+250))):0;
    const pause=timing.idle&&!notice&&!dialogue?Math.min(duration/speed,60):duration/speed;
    return Math.max(pause,notice?700:0,readable);
  }
  return Math.max(duration/speed,notice?1200:0,readingTime);
}
export function readPlaybackSpeed():PlaybackSpeed{
  try{const value=Number(localStorage.getItem(PLAYBACK_KEY));return value===2||value===4?value:1;}catch{return 1;}
}
export function PlaybackControls(){
  const [speed,setSpeed]=useState<PlaybackSpeed>(1),[ready,setReady]=useState(false),[error,setError]=useState('');
  useEffect(()=>{setSpeed(readPlaybackSpeed());setReady(true);},[]);
  return <><div className="setting-row"><span>배틀 배속<small>좌우로 선택 · Z로 결정</small></span><div className="settings-options" data-settings-options role="group" aria-label="배틀 배속">{([1,2,4] as const).map(value=><button key={value} disabled={!ready} aria-pressed={speed===value} onClick={()=>{try{localStorage.setItem(PLAYBACK_KEY,String(value));setSpeed(value);setError('');}catch{setError('이 브라우저에서 배속을 저장할 수 없습니다.');}}}>{value}배</button>)}</div></div><p className="setting-note">기술·변신 연출은 빠르게 재생하되, 새 메시지는 읽을 시간을 확보합니다. 이 브라우저에 자동 저장되며 Shift로 건너뛰기도 가능합니다.</p>{error&&<p role="alert">{error}</p>}</>;
}
