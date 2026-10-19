import {mkdirSync,writeFileSync} from 'node:fs';
import {villainCampaignTracks,campaignStage,villainChance,villainTrackEligible,type VillainOrganization} from '../src/data/villain-tracks';
// Same eligibility and probability functions as the persisted server track.
// Normal 100-floor climbs, no Teleport, all battles won; unavailable samples remain locked.
const runs=10_000,results=[];let seed=20261019;
function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
const mean=(xs:number[])=>xs.length?Number((xs.reduce((a,b)=>a+b,0)/xs.length).toFixed(2)):null;
const percentile=(xs:number[],p:number)=>xs.length?[...xs].sort((a,b)=>a-b)[Math.min(xs.length-1,Math.floor(xs.length*p))]:null;
for(const organization of Object.keys(villainCampaignTracks) as VillainOrganization[]){
 const floors:Record<string,number[]>={},intervals:number[]=[];let complete=0,bossEarly=0;
 for(let n=0;n<runs;n++){
  let index=0,pity=0,last:number|null=null;
  for(let floor=2;floor<=100;floor++){
   const stage=campaignStage(organization,index),order=floor-1;
   if(!villainTrackEligible(stage,floor,order,last))continue;
   if(random()*100>=villainChance(pity)){pity++;continue;}
   pity=0;if(last!==null)intervals.push(order-last);last=order;
   (floors[stage!.key]??=[]).push(floor);if(stage!.rank==='boss'&&floor<=78)bossEarly++;
   if(!campaignStage(organization,++index)){complete++;break;}
  }
 }
 const bosses=floors.boss??[];
 results.push({organization,runs,stageAverages:Object.fromEntries(Object.entries(floors).map(([key,xs])=>[key,mean(xs)])),bossP50:percentile(bosses,.5),bossP75:percentile(bosses,.75),bossP90:percentile(bosses,.9),completionPercent:100*complete/runs,bossMissingPercent:100*(runs-bosses.length)/runs,boss75To78Percent:bosses.length?100*bossEarly/bosses.length:null,meanInterval:mean(intervals),blockedAt:villainCampaignTracks[organization].stages.find(s=>!s.sampleId)?.key??null});
}
mkdirSync('artifacts/reports/villain-campaigns',{recursive:true});
writeFileSync('artifacts/reports/villain-campaigns/distribution.json',JSON.stringify({seed:20261019,runsPerOrganization:runs,assumptions:'All wins, floor 2..100 arrival, no Teleport, missing samples locked',results},null,2));
console.table(results.map(r=>({organization:r.organization,complete:r.completionPercent,p50:r.bossP50,p75:r.bossP75,p90:r.bossP90,early:r.boss75To78Percent,gap:r.meanInterval,blocked:r.blockedAt})));
