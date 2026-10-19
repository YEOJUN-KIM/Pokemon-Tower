import {statKeys,type TrainingProfile,type TrainingView,type StatKey} from '../data/training';

export const settingsKeys={min:'q',max:'e'} as const;
export const statPointLimit=32,totalPointLimit=66;
export function totalPoints(profile:TrainingProfile){return statKeys.reduce((sum,key)=>sum+profile.evs[key],0);}
export function pointMaximum(profile:TrainingProfile,key:StatKey){return Math.max(0,Math.min(statPointLimit,totalPointLimit-totalPoints(profile)+profile.evs[key]));}
export function withStatPoints(profile:TrainingProfile,key:StatKey,value:number):TrainingProfile{
 if(!Number.isFinite(value))return profile;
 return {...profile,evs:{...profile.evs,[key]:Math.max(0,Math.min(pointMaximum(profile,key),Math.round(value)))}};
}
export function ownedSettingMoves(entry:TrainingView){return [...new Set(entry.unlockedMoves)].filter(move=>entry.learnableMoves.includes(move));}
