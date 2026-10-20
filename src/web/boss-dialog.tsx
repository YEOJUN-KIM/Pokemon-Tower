'use client';
import type {BossView} from './contracts';
import {trainerLabel} from './trainer-samples';
import {TrainerPortrait} from './trainer-portrait';
import {PlayerMirrorPortrait} from './player-mirror-portrait';

export function BossPortrait({boss}: {boss?: BossView}) {
 if(boss?.mirror)return <PlayerMirrorPortrait className="boss-portrait npc-portrait"/>;
 return <TrainerPortrait className="boss-portrait npc-portrait" sprite={boss?.portrait??boss?.id.replace(/^(gym-leader-|elite-four-|champion-)/,'')} alt={boss?`${boss.title} ${boss.name}`:'트레이너'}/>;
}

export function trainerAppearance(boss?:BossView) {
 if(!boss)return '상대 트레이너가 나타났다!';
 const label=trainerLabel(boss),last=label.charCodeAt(label.length-1)-0xac00;
 return `${label}${last>=0&&last<=11171&&last%28!==0?'이':'가'} 나타났다!`;
}

export function PlayerPortrait(){
  return <span className="player-trainer-portrait player-back-sprite" role="img" aria-label="플레이어 트레이너 (뒷모습)"/>;
}
