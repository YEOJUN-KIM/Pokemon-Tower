import type {RewardEntry} from '../data/rewards';
import {RewardChest} from './reward-chest';

export type RewardIconName='coin'|'ticket'|'gift'|'gem'|'sparkle'|'bag'|'star'|'chest';

// Pixel icons share one 16x16 grid and the reward palette so every event object
// reads as the same game asset family. Decorative: callers carry the text.
const icons:Record<Exclude<RewardIconName,'chest'>,React.ReactNode>={
 coin:<><path d="M5 1h6v1h2v2h1v8h-1v2h-2v1H5v-1H3v-2H2V4h1V2h2Z" fill="#7a5a22"/><path d="M5 2h6v1h2v2h-1v6h1v1h-2v2H5v-2H3v-1h1V5H3V3h2Z" fill="#f2c94c"/><path d="M5 3h6v1H5Zm-1 2h1v6H4Z" fill="#fff0a8"/><path d="M7 5h2v6H7Z" fill="#b8862b"/></>,
 ticket:<><path d="M1 4h14v3h-1v2h1v3H1V9h1V7H1Z" fill="#54362b"/><path d="M2 5h12v1h-1v4h1v1H2v-1h1V6H2Z" fill="#f2d79b"/><path d="M5 5h1v6H5Zm1 0h1v1H6Zm0 2h1v1H6Zm0 2h1v1H6Z" fill="#c4504a"/><path d="M8 7h4v2H8Z" fill="#a8791c"/></>,
 gift:<><path d="M2 5h12v3H2Zm1 3h10v7H3Z" fill="#30232b"/><path d="M3 6h10v1H3Zm1 2h8v6H4Z" fill="#c4504a"/><path d="M7 6h2v8H7Z" fill="#f2d79b"/><path d="M5 3h3v3H5Zm3 0h3v3H8Z" fill="#30232b"/><path d="M6 4h2v1H6Zm2 0h2v1H8Z" fill="#f2d79b"/></>,
 gem:<><path d="M4 2h8l3 4-7 9L1 6Z" fill="#1f3b5c"/><path d="M5 3h6l2 3-5 7-5-7Z" fill="#79d7e8"/><path d="M5 3h3L6 6H3Zm3 0h3l2 3h-3Z" fill="#d6f6ff"/><path d="M8 13 6 6h4Z" fill="#3aa7c9"/></>,
 sparkle:<><path d="M7 0h2v5h-2Zm0 11h2v5H7ZM0 7h5v2H0Zm11 0h5v2h-5Z" fill="#f4e5ac"/><path d="M6 5h4v1h1v4h-1v1H6v-1H5V6h1Z" fill="#fff6c8"/></>,
 bag:<><path d="M5 1h6v2h2v2l2 2v7H1V7l2-2V3h2Z" fill="#30232b"/><path d="M6 2h4v1H6Zm-2 2h8v1l2 2v6H2V7l2-2Z" fill="#9b6b43"/><path d="M5 8h6v2H5Z" fill="#e7c477"/><path d="M3 7h1v6H3Z" fill="#c9915c"/></>,
 star:<><path d="M7 0h2v5h5v2l-3 3 1 5h-2l-3-2-3 2H4l1-5-3-3V5h5Z" fill="#7a5a22"/><path d="M7 2h2v4h4v1l-3 3 1 3-3-2-3 2 1-3-3-3V6h4Z" fill="#f2c94c"/></>,
};

export function RewardIcon({name,className}:{name:RewardIconName;className?:string}){
 if(name==='chest')return <span className={className} aria-hidden="true"><RewardChest/></span>;
 return <svg className={className} viewBox="0 0 16 16" aria-hidden="true" shapeRendering="crispEdges">{icons[name]}</svg>;
}

export type RewardEntryParts={icon:RewardIconName;label:string;value?:string};

// Splits an entry into icon / name / headline value for the Reward Screen. The
// full sentence from rewardEntryText stays available to assistive tech.
export function rewardEntryParts(entry:RewardEntry,fallbackLabel:string):RewardEntryParts{
 switch(entry.kind){
  case 'coins':return {icon:'coin',label:'타워 코인',value:`+${entry.amount.toLocaleString()}`};
  case 'egg-ticket':return {icon:'ticket',label:'알 뽑기권',value:`+${entry.amount.toLocaleString()}`};
  case 'typed-egg-ticket':return {icon:'ticket',label:entry.eggKind==='superRare'?'슈퍼레어 알 티켓':'이로치 알 티켓',value:`+${entry.amount.toLocaleString()}`};
  case 'growth-points':return {icon:'gem',label:'성장 포인트',value:`+${entry.amount.toLocaleString()}P`};
  case 'tool-voucher':return {icon:'gift',label:`${entry.rarity==='epic'?'에픽':entry.rarity} 도구 교환권`,value:`+${entry.amount}`};
  case 'vitamin':return {icon:'gift',label:fallbackLabel.replace(/^\+\s*/,'').replace(/\s*\d+개$/,''),value:`+${entry.amount}`};
  case 'pokemon-enhancement':return {icon:'star',label:fallbackLabel};
  case 'item-exchange':case 'trainer-equipment':return {icon:'bag',label:fallbackLabel.replace(/^\+\s*/,'')};
  default:return {icon:'sparkle',label:fallbackLabel.replace(/^\+\s*/,'')};
 }
}
