import type {NpcTrainingDefinition} from './npc-training';

export type NpcRank='normal'|'elite'|'master';
export const npcRankNames:Record<NpcRank,string>={normal:'일반',elite:'엘리트',master:'마스터'};
export type NpcRankWeights=Record<NpcRank,number>;
export const npcRankProfiles:Record<NpcRank,NpcTrainingDefinition&{lateBudget:number;gimmickChance:number}>={
 normal:{ivRange:[0,8],evBudget:2,lateBudget:15,itemTier:'basic',buildQuality:'balanced',gimmickChance:0},
 elite:{ivRange:[10,18],evBudget:22,lateBudget:45,itemTier:'competitive',buildQuality:'optimized',gimmickChance:.4},
 master:{ivRange:[16,24],evBudget:45,lateBudget:66,itemTier:'premium',buildQuality:'optimized',gimmickChance:1},
};
export type NpcRankTraining=NpcTrainingDefinition&{rank:NpcRank;gimmickChance:number};
export function npcRankTraining(floor:number,rank:NpcRank):NpcRankTraining{
 if(!Number.isSafeInteger(floor)||floor<1||floor>100)throw Error('Unsupported NPC rank floor');
 const profile=npcRankProfiles[rank],progress=Math.max(0,(floor-5)/95);
 return {rank,ivRange:profile.ivRange.map(v=>Math.floor(v+(31-v)*progress)) as [number,number],evBudget:Math.floor(profile.evBudget+(profile.lateBudget-profile.evBudget)*progress),itemTier:rank==='normal'&&floor<15?'none':profile.itemTier,buildQuality:profile.buildQuality,gimmickChance:profile.gimmickChance};
}
// Explicit interpolation anchors keep encounter balance independent of sample concepts.
export const normalRankCurve:readonly {floor:number;weights:NpcRankWeights}[]=[
 {floor:1,weights:{normal:.94,elite:.06,master:0}},
 {floor:20,weights:{normal:.78,elite:.21,master:.01}},
 {floor:50,weights:{normal:.55,elite:.40,master:.05}},
 {floor:60,weights:{normal:.60,elite:.36,master:.04}},
 {floor:100,weights:{normal:.20,elite:.60,master:.20}},
];
export function rankWeights(floor:number):NpcRankWeights{
 if(!Number.isSafeInteger(floor)||floor<1||floor>100)throw Error('Unsupported NPC rank floor');
 const hi=normalRankCurve.find(p=>p.floor>=floor)!,lo=normalRankCurve[normalRankCurve.indexOf(hi)-1]??hi;
 const p=hi===lo?0:(floor-lo.floor)/(hi.floor-lo.floor);
 return Object.fromEntries((['normal','elite','master'] as const).map(rank=>[rank,lo.weights[rank]+(hi.weights[rank]-lo.weights[rank])*p])) as NpcRankWeights;
}
export const challengerRankWeights:NpcRankWeights={normal:.5,elite:.42,master:.08};
export function drawNpcRank(weights:NpcRankWeights,random:()=>number):NpcRank{
 let ticket=random()*(weights.normal+weights.elite+weights.master);
 return (['normal','elite','master'] as const).find(rank=>(ticket-=weights[rank])<0)??'master';
}
