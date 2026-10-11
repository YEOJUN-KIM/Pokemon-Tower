'use client';
import {useState} from 'react';
import type {BossView} from './contracts';
import {trainerSamples} from './trainer-samples';

export function BossPortrait({boss}: {boss?: BossView}) {
  const [failed,setFailed]=useState<string|null>(null);
  const sprite=boss?.portrait ?? boss?.id.replace(/^(gym-leader-|elite-four-|champion-)/,'');
  const supported=!!sprite && /^[a-z0-9-]+$/.test(sprite) && (!!boss?.portrait || ['falkner','lance',...trainerSamples.map(sample=>sample.id)].includes(sprite));
  const champion=boss?.role==='champion' || boss?.id.startsWith('champion-');
  if(supported && failed!==sprite)return <img className="boss-portrait npc-portrait" src={`/sprites/trainers/${sprite}.png`} alt={`${boss!.title} ${boss!.name}`} onError={()=>setFailed(sprite!)}/>;
  return <svg className={`boss-portrait ${champion ? 'champion-portrait' : ''}`} viewBox="0 0 160 180" role="img" aria-label={`${boss ? `${boss.title} ${boss.name}` : '트레이너'}의 임시 이미지`}>
    <circle cx="80" cy="82" r="72" fill={champion ? '#f5dda0' : '#dfd5ff'}/><path d="M22 180v-35q5-35 58-35t58 35v35" fill={champion ? '#263d49' : '#44325f'}/>
    <path d="M58 112l22 27 22-27-10-12H68" fill="#f5c9a6"/><path d="M50 48q0-32 30-32t30 32v29q-3 35-30 35T50 77" fill="#ffd9b8"/>
    <path d={champion ? 'M42 92V41q0-32 38-32 40 0 40 35v65l-17-22V43L81 31 55 51v40z' : 'M44 69V44q0-35 39-35 36 0 36 38l-8 35-8-36-14-11-35 26-1 21z'} fill={champion ? '#73513d' : '#29213e'}/>
    <path d="M60 69h12m17 0h12" stroke="#29213e" strokeWidth="4" strokeLinecap="round"/><path d="M73 91q7 6 14 0" fill="none" stroke="#a15f57" strokeWidth="3"/>
    <path d="M48 124l19 56H40m72-56l-19 56h27" fill={champion ? '#d4af62' : '#7964a6'}/><circle cx="111" cy="143" r="11" fill="#f3da8e"/><path d="M101 143h20" stroke="#44325f" strokeWidth="3"/><circle cx="111" cy="143" r="4" fill="#fff"/>
    {champion && <path d="M64 21l-3-12 12 6 7-11 7 11 12-6-3 12z" fill="#e4bc55"/>}
  </svg>;
}

export function trainerAppearance(boss?:BossView) {
  if(!boss)return '상대 트레이너가 나타났다!';
  const last=boss.name.charCodeAt(boss.name.length-1)-0xac00;
  return `${boss.title==='체육관 관장' ? '관장' : boss.title} ${boss.name}${last>=0 && last<=11171 && last%28!==0 ? '이' : '가'} 나타났다!`.trim();
}

export function PlayerPortrait(){
  return <span className="player-trainer-portrait ash-back-sprite" role="img" aria-label="플레이어 지우 (성도편 뒷모습)"/>;
}
