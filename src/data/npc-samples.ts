import type {TrainerSample,TrainerTactic} from './trainer-catalog';
import {npcRankNames,type NpcRank,type NpcRankWeights} from './npc-ranks';

export type NpcPool='normal'|'challenger';
export type NpcTeamConcept={mode:'specialty';types:readonly string[];requiredCount:1|2|3}|{mode:'competitive'}|{mode:'mixed-theme'};
export type NpcSample={id:string;displayName:string;portrait:string;tactic:TrainerTactic;specialty:string|null;rankWeights:NpcRankWeights;teamConcept:NpcTeamConcept;minFloor:number;weight:number;pools:readonly NpcPool[]};
// Concept only: no reward, IV multiplier, floor offset, or battle-specific rank.
export const npcSamples:readonly NpcSample[]=[
 {id:'youngster-balanced',displayName:'반바지 소년',portrait:'youngster-gen4',tactic:'balanced',specialty:'Bug',rankWeights:{normal:.9,elite:.1,master:0},teamConcept:{mode:'specialty',types:['Bug'],requiredCount:3},minFloor:1,weight:22,pools:['normal','challenger']},
 {id:'lass-special',displayName:'아가씨',portrait:'lass-gen3',tactic:'special',specialty:null,rankWeights:{normal:.85,elite:.15,master:0},teamConcept:{mode:'mixed-theme'},minFloor:1,weight:20,pools:['normal','challenger']},
 {id:'hiker-bulk',displayName:'등산가',portrait:'hiker-gen4',tactic:'bulk',specialty:'Rock',rankWeights:{normal:.75,elite:.25,master:0},teamConcept:{mode:'specialty',types:['Rock','Ground'],requiredCount:3},minFloor:1,weight:18,pools:['normal','challenger']},
 {id:'breeder-balanced',displayName:'포켓몬 브리더',portrait:'pokemonbreeder-gen3',tactic:'balanced',specialty:null,rankWeights:{normal:.9,elite:.1,master:0},teamConcept:{mode:'mixed-theme'},minFloor:1,weight:22,pools:['normal','challenger']},
 {id:'gentleman-balanced',displayName:'신사',portrait:'gentleman-gen4',tactic:'balanced',specialty:null,rankWeights:{normal:.7,elite:.3,master:0},teamConcept:{mode:'mixed-theme'},minFloor:1,weight:18,pools:['normal','challenger']},
 {id:'blackbelt-physical',displayName:'태권왕',portrait:'blackbelt-gen4',tactic:'physical',specialty:'Fighting',rankWeights:{normal:.3,elite:.65,master:.05},teamConcept:{mode:'specialty',types:['Fighting'],requiredCount:3},minFloor:1,weight:16,pools:['normal','challenger']},
 {id:'scientist-status',displayName:'연구원',portrait:'scientist-gen4',tactic:'status',specialty:'Poison',rankWeights:{normal:.35,elite:.6,master:.05},teamConcept:{mode:'specialty',types:['Poison'],requiredCount:3},minFloor:1,weight:14,pools:['normal','challenger']},
 {id:'scientist-special',displayName:'연구원',portrait:'scientist-gen4',tactic:'special',specialty:'Electric',rankWeights:{normal:.3,elite:.6,master:.1},teamConcept:{mode:'specialty',types:['Electric'],requiredCount:3},minFloor:1,weight:14,pools:['normal','challenger']},
 {id:'ranger-speed',displayName:'레인저',portrait:'pokemonranger-gen3',tactic:'speed',specialty:null,rankWeights:{normal:.15,elite:.75,master:.1},teamConcept:{mode:'mixed-theme'},minFloor:1,weight:14,pools:['normal','challenger']},
 {id:'ace-setup',displayName:'에이스 트레이너',portrait:'acetrainer-gen4',tactic:'setup',specialty:null,rankWeights:{normal:0,elite:.7,master:.3},teamConcept:{mode:'competitive'},minFloor:1,weight:12,pools:['normal','challenger']},
 {id:'ace-physical',displayName:'에이스 트레이너',portrait:'acetrainer-gen4',tactic:'physical',specialty:null,rankWeights:{normal:0,elite:.7,master:.3},teamConcept:{mode:'competitive'},minFloor:1,weight:12,pools:['normal','challenger']},
 {id:'veteran-balanced',displayName:'베테랑',portrait:'veteran-gen4',tactic:'balanced',specialty:null,rankWeights:{normal:0,elite:.4,master:.6},teamConcept:{mode:'competitive'},minFloor:5,weight:10,pools:['normal','challenger']},
 {id:'veteran-bulk',displayName:'베테랑',portrait:'veteran-gen4',tactic:'bulk',specialty:null,rankWeights:{normal:0,elite:.4,master:.6},teamConcept:{mode:'competitive'},minFloor:5,weight:10,pools:['normal','challenger']},
 {id:'backpacker-speed',displayName:'여행자',portrait:'backpacker',tactic:'speed',specialty:null,rankWeights:{normal:.85,elite:.15,master:0},teamConcept:{mode:'mixed-theme'},minFloor:1,weight:18,pools:['normal','challenger']},
 {id:'schoolkid-balanced',displayName:'학생',portrait:'schoolkid-gen4',tactic:'balanced',specialty:null,rankWeights:{normal:.9,elite:.1,master:0},teamConcept:{mode:'mixed-theme'},minFloor:1,weight:20,pools:['normal','challenger']},
 {id:'psychic-setup',displayName:'초능력자',portrait:'psychic-gen4',tactic:'setup',specialty:'Psychic',rankWeights:{normal:.25,elite:.6,master:.15},teamConcept:{mode:'specialty',types:['Psychic'],requiredCount:3},minFloor:3,weight:12,pools:['normal','challenger']},
 {id:'beauty-special',displayName:'아로마 아가씨',portrait:'aromalady-gen4',tactic:'special',specialty:'Grass',rankWeights:{normal:.85,elite:.15,master:0},teamConcept:{mode:'specialty',types:['Grass'],requiredCount:3},minFloor:1,weight:16,pools:['normal','challenger']},
 {id:'fisherman-bulk',displayName:'낚시꾼',portrait:'fisherman-gen4',tactic:'bulk',specialty:'Water',rankWeights:{normal:.85,elite:.15,master:0},teamConcept:{mode:'specialty',types:['Water'],requiredCount:3},minFloor:1,weight:18,pools:['normal','challenger']},
 {id:'worker-physical',displayName:'작업원',portrait:'worker-gen4',tactic:'physical',specialty:'Steel',rankWeights:{normal:.35,elite:.6,master:.05},teamConcept:{mode:'specialty',types:['Steel'],requiredCount:3},minFloor:3,weight:14,pools:['normal','challenger']},
 {id:'collector-status',displayName:'포켓몬 수집가',portrait:'collector',tactic:'status',specialty:'Bug',rankWeights:{normal:.8,elite:.2,master:0},teamConcept:{mode:'specialty',types:['Bug'],requiredCount:3},minFloor:1,weight:14,pools:['normal','challenger']},
];
export const npcTacticHints:Record<TrainerTactic,string>={balanced:'균형 잡힌 팀이다.',physical:'공격적인 팀 구성이다.',special:'특수한 공격 기술을 선호한다.',setup:'변화기를 자주 활용하는 듯하다.',status:'변화기를 자주 활용하는 듯하다.',bulk:'오래 버티는 전투에 능해 보인다.',speed:'빠른 포켓몬이 눈에 띈다.'};
export type LegacyNpcSample=Omit<NpcSample,'rankWeights'|'teamConcept'>&{defaultRank:NpcRank};
export function npcTrainerSample(sample:Pick<NpcSample,'id'|'displayName'|'portrait'|'tactic'|'specialty'|'minFloor'>,rank:NpcRank):TrainerSample{
 return {id:sample.id,name:sample.displayName,title:`${npcRankNames[rank]} 트레이너`,kind:rank==='normal'?'normal':'elite',npcRank:rank,generation:null,specialty:sample.specialty,tactic:sample.tactic,portrait:sample.portrait,minFloor:sample.minFloor,concept:npcTacticHints[sample.tactic]};
}
