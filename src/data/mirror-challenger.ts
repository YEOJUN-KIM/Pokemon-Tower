import type {BattleRule} from './run-rules';
import type {NpcGimmick} from './npc-gimmicks';
export const mirrorChallengerSettings={mirrorCandidateChance:.03,sampleIds:['ace-setup','ace-physical','veteran-balanced','veteran-bulk','psychic-setup','ranger-speed','scientist-status','scientist-special','blackbelt-physical']} as const;
export const mirrorRewardProfile={
 pool:[{id:'eggs',weight:30},{id:'superRare',weight:15},{id:'shiny-ticket',weight:2},{id:'growth',weight:30},{id:'equipment',weight:15},{id:'one-iv',weight:7},{id:'six-iv',weight:.5},{id:'shiny',weight:.5}],
 tickets:10,growth:1500,equipmentFallback:1500,
} as const;
export type MirrorRewardKind=typeof mirrorRewardProfile.pool[number]['id'];
export type MirrorTeamSnapshot={version:1;baseSampleId:string;sourceBattleId:string;sourcePlayerTeam:string;opponentTeam:string;opponentRule:BattleRule;gimmick:NpcGimmick|null;rewardKind:MirrorRewardKind};
