import type {RewardOption,RewardSelectionDefinition} from './rewards';
import type {TrainerSample} from './trainer-catalog';
import type {NpcTrainingTier} from './npc-training';

export type ChallengerRewardProfile='low'|'medium'|'high';
export const rewards:Record<ChallengerRewardProfile,{rewardDefinition:RewardOption;selections?:readonly RewardSelectionDefinition[]}>= {
 low:{rewardDefinition:{id:'challenger-low',title:'전투 보상',tone:'good',entries:[{kind:'coins',amount:300}]}},
 medium:{rewardDefinition:{id:'challenger-medium',title:'전투 보상',tone:'good',entries:[{kind:'coins',amount:700},{kind:'egg-ticket',amount:1}]}},
 high:{rewardDefinition:{id:'challenger-high',title:'전투 보상',tone:'great',entries:[{kind:'coins',amount:1000}]},selections:[{id:'bonus',title:'고급 추가 보상',candidates:[
  {id:'coins',label:'타워 코인 1,000',effects:[{kind:'coins',amount:1000}]},
  {id:'tickets',label:'알 뽑기권 3장',effects:[{kind:'egg-ticket',amount:3}]},
  {id:'mixed',label:'타워 코인 500 + 알 뽑기권 1장',effects:[{kind:'coins',amount:500},{kind:'egg-ticket',amount:1}]},
 ]}]},
};
type Display={id:string;trainerId:string;title:string;difficulty:string;danger:number;battleStyle:string;rewardPreview:string;portrait:string;kind:TrainerSample['kind'];tactic:TrainerSample['tactic'];rewardDefinition:RewardOption;selections?:readonly RewardSelectionDefinition[]};
export type ChallengerDefinition=Display&{trainingTier:NpcTrainingTier;rewardProfile:ChallengerRewardProfile;weight:number;minFloor:number};
// Only previously saved snapshots may use these values. Never synthesize them for new samples.
export type LegacyChallengerDefinition=Display&{trainingTier?:undefined;floorOffset:number;trainingScale:number;hpPoints:number;attacksOnly?:boolean;fallbackItem?:string};
export type SavedChallengerDefinition=ChallengerDefinition|LegacyChallengerDefinition;
export const challengerSettings={weight:20,minFloor:1} as const;
type Sample=Pick<ChallengerDefinition,'id'|'trainerId'|'title'|'portrait'|'tactic'|'trainingTier'|'weight'|'minFloor'|'battleStyle'|'rewardProfile'>;
const samples:readonly Sample[]=[
 {id:'easy',trainerId:'challenger-breeder',title:'신중한 브리더',portrait:'aromalady-gen4',tactic:'physical',trainingTier:'casual',weight:25,minFloor:1,battleStyle:'공격적인 전투를 선호한다.',rewardProfile:'low'},
 {id:'medium',trainerId:'challenger-gentleman',title:'부유한 신사',portrait:'faba',tactic:'balanced',trainingTier:'standard',weight:25,minFloor:1,battleStyle:'균형 잡힌 팀 구성이다.',rewardProfile:'medium'},
 {id:'ace-physical',trainerId:'challenger-ace-physical',title:'에이스 트레이너',portrait:'acetrainer-gen4',tactic:'physical',trainingTier:'advanced',weight:14,minFloor:5,battleStyle:'공격적인 전투를 선호한다.',rewardProfile:'medium'},
 {id:'scientist-status',trainerId:'challenger-scientist',title:'연구원',portrait:'scientist-gen4',tactic:'status',trainingTier:'advanced',weight:14,minFloor:5,battleStyle:'변화기를 자주 활용한다.',rewardProfile:'medium'},
 {id:'veteran-bulk',trainerId:'challenger-veteran',title:'베테랑 트레이너',portrait:'hiker-gen4',tactic:'bulk',trainingTier:'advanced',weight:12,minFloor:5,battleStyle:'오래 버티는 전투에 능하다.',rewardProfile:'medium'},
 {id:'hard',trainerId:'challenger-tactician',title:'에이스 트레이너',portrait:'acetrainer-gen4',tactic:'setup',trainingTier:'elite',weight:4,minFloor:1,battleStyle:'변화기를 자주 활용한다.',rewardProfile:'high'},
 {id:'ranger-speed',trainerId:'challenger-ranger',title:'레인저',portrait:'birdkeeper-gen4',tactic:'speed',trainingTier:'elite',weight:6,minFloor:5,battleStyle:'빠른 포켓몬이 눈에 띈다.',rewardProfile:'high'},
 {id:'traveler-special',trainerId:'challenger-traveler',title:'여행자',portrait:'youngster-gen4',tactic:'special',trainingTier:'standard',weight:22,minFloor:1,battleStyle:'특수한 공격 기술을 선호한다.',rewardProfile:'low'},
];
export const challengers:readonly ChallengerDefinition[]=samples.map(sample=>({...sample,kind:'normal',difficulty:sample.trainingTier==='casual'?'쉬움':sample.trainingTier==='elite'?'어려움':'보통',danger:sample.trainingTier==='casual'?1:sample.trainingTier==='elite'?3:2,rewardPreview:sample.rewardProfile==='low'?'타워 코인 300':sample.rewardProfile==='medium'?'타워 코인 700 · 알 뽑기권 1장':'타워 코인 1,000 · 추가 보상 3개 중 1개',...rewards[sample.rewardProfile]}));

export function drawChallengers(floor:number,random:()=>number,pool:readonly ChallengerDefinition[]=challengers):ChallengerDefinition[]{
 let eligible=pool.filter(sample=>sample.minFloor<=floor&&sample.weight>0);
 const result:ChallengerDefinition[]=[];
 while(result.length<3){
  if(!eligible.length)throw Error('At least three distinct eligible challenger names are required');
  let ticket=random()*eligible.reduce((sum,sample)=>sum+sample.weight,0);
  const chosen=eligible.find(sample=>(ticket-=sample.weight)<0)??eligible.at(-1)!;
  result.push(chosen);
  eligible=eligible.filter(sample=>sample.id!==chosen.id&&sample.title!==chosen.title);
 }
 return result;
}
export type ChallengerCandidate=Pick<ChallengerDefinition,'id'|'trainerId'|'title'|'difficulty'|'danger'|'battleStyle'|'rewardPreview'|'portrait'>;
export function challengerCandidate(definition:SavedChallengerDefinition):ChallengerCandidate{
 const {id,trainerId,title,difficulty,danger,battleStyle,rewardPreview,portrait}=definition;
 return {id,trainerId,title,difficulty,danger,battleStyle,rewardPreview,portrait};
}
