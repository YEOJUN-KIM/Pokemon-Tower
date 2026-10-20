import rarity from '../data/music-rarity.json' with {type:'json'};
import type {BossView} from './contracts';
import type {MusicTrack} from './music-score';

export function trainerMusic(boss?:BossView|null):MusicTrack {
  return boss?.role ?? (boss?.id==='champion-lance' ? 'champion' : boss?.id==='gym-leader-falkner' ? 'gym' : 'trainer');
}
export function rareMusic(name?:string):MusicTrack|null {
  return name && (rarity as Record<string,string>)[name] ? 'rare' : null;
}
export function strongerRare(previous:MusicTrack|null,next:MusicTrack|null):MusicTrack|null {
  return previous==='rare' || next==='rare' ? 'rare' : null;
}
export function revealedRare(messages:readonly string[],opponent?:string):MusicTrack|null {
  let found=rareMusic(opponent);
  for(const line of messages){const [,event,actor,details]=line.split('|');if(['switch','drag','replace'].includes(event) && actor?.startsWith('p2'))found=strongerRare(found,rareMusic(details?.split(',')[0]));}
  return found;
}
export function arenaTheme(floor:number,total:number,role?:MusicTrack) {
  if(role==='villain')return 'facility';
  if(role==='champion' || floor===total)return 'summit';
  const progress=(floor-1)/Math.max(1,total-1);
  return progress<.3 ? 'meadow' : progress<.65 ? 'hall' : 'night';
}
export const arenaNames:Record<string,string>={meadow:'야외 경기장',hall:'타워 실내 경기장',night:'야간 전망 경기장',summit:'정상 챔피언 경기장',facility:'조직 시설 경기장'};
