import type {RewardOption,RewardSelectionDefinition} from './rewards';
import type {TrainerSample} from './trainer-catalog';

export type ChallengerDefinition={id:string;trainerId:string;title:string;difficulty:string;danger:number;battleStyle:string;rewardPreview:string;portrait:string;kind:TrainerSample['kind'];tactic:TrainerSample['tactic'];floorOffset:number;trainingScale:number;hpPoints:number;attacksOnly?:boolean;fallbackItem?:string;rewardDefinition:RewardOption;selections?:readonly RewardSelectionDefinition[]};
export const challengerSettings={weight:20,minFloor:1} as const;
export const challengers:readonly ChallengerDefinition[]=[
 {id:'easy',trainerId:'challenger-breeder',title:'신중한 브리더',difficulty:'쉬움',danger:1,battleStyle:'기본 공격 위주 · 낮은 육성',rewardPreview:'타워 코인 300',portrait:'aromalady-gen4',kind:'normal',tactic:'physical',floorOffset:-3,trainingScale:.6,hpPoints:0,attacksOnly:true,rewardDefinition:{id:'challenger-easy',title:'전투 보상',tone:'good',entries:[{kind:'coins',amount:300}]}},
 {id:'medium',trainerId:'challenger-gentleman',title:'부유한 신사',difficulty:'보통',danger:2,battleStyle:'균형 잡힌 팀 · 높은 육성',rewardPreview:'타워 코인 700 · 알 뽑기권 1장',portrait:'faba',kind:'normal',tactic:'balanced',floorOffset:3,trainingScale:1.1,hpPoints:3,rewardDefinition:{id:'challenger-medium',title:'전투 보상',tone:'good',entries:[{kind:'coins',amount:700},{kind:'egg-ticket',amount:1}]}},
 {id:'hard',trainerId:'challenger-tactician',title:'숙련 전술가',difficulty:'어려움',danger:3,battleStyle:'상위급 팀 · 강화 기술과 도구',rewardPreview:'타워 코인 1,000 · 추가 보상 3개 중 1개',portrait:'acetrainer-gen4',kind:'elite',tactic:'setup',floorOffset:8,trainingScale:1.4,hpPoints:7,fallbackItem:'Leftovers',rewardDefinition:{id:'challenger-hard',title:'전투 보상',tone:'great',entries:[{kind:'coins',amount:1000}]},selections:[{id:'bonus',title:'고급 추가 보상',candidates:[
  {id:'coins',label:'타워 코인 1,000',effects:[{kind:'coins',amount:1000}]},
  {id:'tickets',label:'알 뽑기권 3장',effects:[{kind:'egg-ticket',amount:3}]},
  {id:'mixed',label:'타워 코인 500 + 알 뽑기권 1장',effects:[{kind:'coins',amount:500},{kind:'egg-ticket',amount:1}]},
 ]}]},
];
export type ChallengerCandidate=Pick<ChallengerDefinition,'id'|'trainerId'|'title'|'difficulty'|'danger'|'battleStyle'|'rewardPreview'|'portrait'>;
export function challengerCandidate(definition:ChallengerDefinition):ChallengerCandidate{
 const {id,trainerId,title,difficulty,danger,battleStyle,rewardPreview,portrait}=definition;
 return {id,trainerId,title,difficulty,danger,battleStyle,rewardPreview,portrait};
}
