import type {TrainerSample,TrainerTactic} from './trainer-catalog';
import {npcRankNames,type NpcRank} from './npc-ranks';

export type NpcPool='normal'|'challenger';
export type NpcSample={id:string;displayName:string;portrait:string;tactic:TrainerTactic;specialty:string|null;defaultRank:NpcRank;minFloor:number;weight:number;pools:readonly NpcPool[]};
// Concept only: no reward, IV multiplier, floor offset, or battle-specific rank.
export const npcSamples:readonly NpcSample[]=[
 {id:'youngster-balanced',displayName:'반바지 소년',portrait:'youngster-gen4',tactic:'balanced',specialty:null,defaultRank:'normal',minFloor:1,weight:22,pools:['normal','challenger']},
 {id:'lass-special',displayName:'아가씨',portrait:'lass-gen3',tactic:'special',specialty:null,defaultRank:'normal',minFloor:1,weight:20,pools:['normal','challenger']},
 {id:'hiker-bulk',displayName:'등산가',portrait:'hiker-gen4',tactic:'bulk',specialty:'Rock',defaultRank:'normal',minFloor:1,weight:18,pools:['normal','challenger']},
 {id:'breeder-balanced',displayName:'포켓몬 브리더',portrait:'pokemonbreeder-gen3',tactic:'balanced',specialty:null,defaultRank:'normal',minFloor:1,weight:22,pools:['normal','challenger']},
 {id:'gentleman-balanced',displayName:'신사',portrait:'gentleman-gen4',tactic:'balanced',specialty:null,defaultRank:'normal',minFloor:1,weight:18,pools:['normal','challenger']},
 {id:'blackbelt-physical',displayName:'태권왕',portrait:'blackbelt-gen4',tactic:'physical',specialty:'Fighting',defaultRank:'elite',minFloor:1,weight:16,pools:['normal','challenger']},
 {id:'scientist-status',displayName:'연구원',portrait:'scientist-gen4',tactic:'status',specialty:'Poison',defaultRank:'elite',minFloor:1,weight:14,pools:['normal','challenger']},
 {id:'scientist-special',displayName:'연구원',portrait:'scientist-gen4',tactic:'special',specialty:'Electric',defaultRank:'normal',minFloor:1,weight:14,pools:['normal','challenger']},
 {id:'ranger-speed',displayName:'레인저',portrait:'pokemonranger-gen3',tactic:'speed',specialty:null,defaultRank:'elite',minFloor:1,weight:14,pools:['normal','challenger']},
 {id:'ace-setup',displayName:'에이스 트레이너',portrait:'acetrainer-gen4',tactic:'setup',specialty:null,defaultRank:'elite',minFloor:1,weight:12,pools:['normal','challenger']},
 {id:'ace-physical',displayName:'에이스 트레이너',portrait:'acetrainer-gen4',tactic:'physical',specialty:null,defaultRank:'elite',minFloor:1,weight:12,pools:['normal','challenger']},
 {id:'veteran-balanced',displayName:'베테랑',portrait:'veteran-gen4',tactic:'balanced',specialty:null,defaultRank:'master',minFloor:5,weight:10,pools:['normal','challenger']},
 {id:'veteran-bulk',displayName:'베테랑',portrait:'veteran-gen4',tactic:'bulk',specialty:null,defaultRank:'master',minFloor:5,weight:10,pools:['normal','challenger']},
 {id:'backpacker-speed',displayName:'여행자',portrait:'backpacker',tactic:'speed',specialty:null,defaultRank:'normal',minFloor:1,weight:18,pools:['normal','challenger']},
 {id:'schoolkid-balanced',displayName:'학생',portrait:'schoolkid-gen4',tactic:'balanced',specialty:null,defaultRank:'normal',minFloor:1,weight:20,pools:['normal','challenger']},
 {id:'psychic-setup',displayName:'초능력자',portrait:'psychic-gen4',tactic:'setup',specialty:'Psychic',defaultRank:'elite',minFloor:3,weight:12,pools:['normal','challenger']},
 {id:'beauty-special',displayName:'아로마 아가씨',portrait:'aromalady-gen4',tactic:'special',specialty:'Grass',defaultRank:'normal',minFloor:1,weight:16,pools:['normal','challenger']},
 {id:'fisherman-bulk',displayName:'낚시꾼',portrait:'fisherman-gen4',tactic:'bulk',specialty:'Water',defaultRank:'normal',minFloor:1,weight:18,pools:['normal','challenger']},
 {id:'worker-physical',displayName:'작업원',portrait:'worker-gen4',tactic:'physical',specialty:'Steel',defaultRank:'elite',minFloor:3,weight:14,pools:['normal','challenger']},
 {id:'collector-status',displayName:'포켓몬 수집가',portrait:'collector',tactic:'status',specialty:'Bug',defaultRank:'normal',minFloor:1,weight:14,pools:['normal','challenger']},
];
export const npcTacticHints:Record<TrainerTactic,string>={balanced:'균형 잡힌 팀이다.',physical:'공격적인 팀 구성이다.',special:'특수한 공격 기술을 선호한다.',setup:'변화기를 자주 활용하는 듯하다.',status:'변화기를 자주 활용하는 듯하다.',bulk:'오래 버티는 전투에 능해 보인다.',speed:'빠른 포켓몬이 눈에 띈다.'};
export function npcTrainerSample(sample:NpcSample,rank:NpcRank):TrainerSample{
 return {id:sample.id,name:sample.displayName,title:`${npcRankNames[rank]} 트레이너`,kind:rank==='normal'?'normal':'elite',npcRank:rank,generation:null,specialty:sample.specialty,tactic:sample.tactic,portrait:sample.portrait,minFloor:sample.minFloor,concept:npcTacticHints[sample.tactic]};
}
