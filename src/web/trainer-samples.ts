import type {BossView} from './contracts';
import {moveTypeNames} from '../data/move-info';
export function trainerLabel(boss:BossView){
  if(boss.id.startsWith('challenger-'))return boss.name;
  const named=boss.kind==='named'||/^(named-|gym-leader-|elite-four-|champion-)/.test(boss.id);
  if(!named)return boss.kind==='elite'||boss.title==='엘리트 트레이너'?'엘리트 트레이너':boss.title||boss.name;
  const title=boss.role==='gym'&&boss.specialty?`${moveTypeNames[boss.specialty] ?? boss.specialty}타입 관장`:boss.title;
  return `${title} ${boss.name}`.trim();
}

export const trainerSamples = [
  {id:'youngster-gen4',name:'반바지 소년'},
  {id:'hiker-gen4',name:'등산가'},
  {id:'fisherman-gen4',name:'낚시꾼'},
  {id:'acetrainer-gen4',name:'엘리트 트레이너'},
] as const;

// Presentation only: the saved random battle ID keeps the same portrait on reload.
// Class-specific parties and rare elite difficulty remain separate content work.
export function battleTrainer(battleId:string,boss?:BossView|null):BossView {
  if(boss)return boss;
  let hash=2166136261;
  for(const char of battleId)hash=Math.imul(hash^char.charCodeAt(0),16777619);
  return {...trainerSamples[(hash>>>0)%trainerSamples.length],title:'',introduction:'',victory:'',defeat:''};
}
