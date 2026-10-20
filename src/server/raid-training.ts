import {raidBattleTrainingProfiles,type RaidBattleTraining} from '../data/raid-training';
import {statKeys,type StatBlock} from '../data/training';

export function raidTrainingPoints(elite:StatBlock,training:RaidBattleTraining):StatBlock{
 if(training==='elite')return {...elite};
 const total=statKeys.reduce((sum,k)=>sum+elite[k],0),budget=Math.round(total*raidBattleTrainingProfiles[training].eliteRatio);
 const points={...elite};
 // Preserve bulk first; remove attack points before speed. Never add a point.
 let remove=total-budget;
 const order=['atk','spa','spe','hp','def','spd'] as const;
 // Attack and speed share the reduction (2:1) rather than emptying attack entirely.
 while(remove>0){
  for(const k of ['atk','spa','atk','spa','spe'] as const){
   if(remove&&points[k]>0){points[k]--;remove--;}
  }
  if(!points.atk&&!points.spa&&!points.spe)break;
 }
 for(const k of order)while(remove>0&&points[k]>0){points[k]--;remove--;}
 return points;
}
