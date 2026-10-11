import {statKeys,type TrainingProfile} from '../data/training';

export function ivSummary(profile:TrainingProfile){
  const perfect=statKeys.filter(key=>profile.ivs[key]===31).length;
  const zero=statKeys.filter(key=>profile.ivs[key]===0).length;
  return `${perfect}V · ${zero}Z`;
}
