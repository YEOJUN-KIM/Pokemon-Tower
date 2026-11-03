import type {TowerProgression} from './tower-progression';
import type {NpcRank,NpcRankWeights} from './npc-ranks';

// Versioned encounter policy. Archived packed teams and v1 runs are never upgraded.
export const isBuildProgression=(version:TowerProgression)=>version==='hundred-floor-v2';
export function buildStage(floor:number){
 if(!Number.isInteger(floor)||floor<1||floor>100)throw Error('Invalid build progression floor');
 return floor<=10?0:floor<=20?1:floor<=30?2:floor<=40?3:floor<=49?4:floor<=60?5:floor<=70?6:floor<=80?7:floor<=90?8:9;
}
const anchors=[
 {floor:1,normal:.98,elite:.02,master:0},{floor:10,normal:.95,elite:.05,master:0},
 {floor:20,normal:.86,elite:.135,master:.005},{floor:40,normal:.64,elite:.33,master:.03},
 {floor:49,normal:.50,elite:.45,master:.05},{floor:60,normal:.45,elite:.48,master:.07},
 {floor:70,normal:.35,elite:.53,master:.12},{floor:80,normal:.25,elite:.57,master:.18},
 {floor:90,normal:.16,elite:.60,master:.24},{floor:100,normal:.10,elite:.60,master:.30},
] as const;
export function buildRankWeights(floor:number):NpcRankWeights{
 buildStage(floor);const hi=anchors.find(a=>a.floor>=floor)!,lo=anchors[anchors.indexOf(hi)-1]??hi,p=hi===lo?0:(floor-lo.floor)/(hi.floor-lo.floor);
 return Object.fromEntries((['normal','elite','master'] as const).map(k=>[k,lo[k]+(hi[k]-lo[k])*p])) as NpcRankWeights;
}
export function buildTraining(floor:number,rank:NpcRank){
 const stage=buildStage(floor),r=rank==='normal'?0:rank==='elite'?1:2;
 const points=[1,4,9,17,27,33,37,41,44,46][stage]+r*(stage<2?2:4);
 const iv=Math.min(28,Math.floor((floor-1)*.28));
 const slots:readonly [number,number]=stage===0?(rank==='master'?[1,1]:[0,0]):stage===1?[1,rank==='normal'?1:2]:stage===2?[1,2]:stage===3?[2,rank==='normal'?2:3]:[3,3];
 return {ivRange:[Math.max(0,iv-4),Math.min(31,iv+2+r)] as [number,number],evBudget:points,itemSlots:slots,gimmickChance:floor<=50||rank==='normal'?0:rank==='master'?(floor>=91?1:.95):Math.min(.55,.2+(floor-51)*.35/48)};
}
// All NPC ranks share the chapter gate, independently of the player's selected rule.
export function buildGimmicksEnabled(floor:number,normal=false){return floor>=50&&!normal;}
