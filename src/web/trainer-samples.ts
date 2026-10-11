import type {BossView} from './contracts';

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
