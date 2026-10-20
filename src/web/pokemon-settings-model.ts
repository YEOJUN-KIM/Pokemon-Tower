import {formItemFor} from '../data/form-items';
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

// Equipment forms belong to the run bag, not permanent collection settings.
export function settingForms(entry:TrainingView){return (entry.formOptions??[]).filter(form=>!formItemFor(form.species));}
export function withSettingMove(profile:TrainingProfile,slot:number,move:string):TrainingProfile{
 if(!Number.isInteger(slot)||slot<0||slot>=4||slot>profile.moves.length)return profile;
 const next=[...profile.moves],other=next.indexOf(move);
 if(other===slot)return profile;
 if(other>=0){
  // Moving into the next empty slot keeps the stored move array compact.
  if(slot===next.length){next.splice(other,1);next.push(move);return {...profile,moves:next};}
  next[other]=next[slot];
 }
 next[slot]=move;
 return {...profile,moves:next};
}
