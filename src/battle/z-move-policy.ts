import {LearningOpponentPolicy} from './learning-opponent-policy';
import type {Observation} from './policy';
import Showdown from 'pokemon-showdown';

// v9 keeps the existing public-information policy and its archived versions.
export class ZMovePolicy extends LearningOpponentPolicy {
 override choose(observation:Observation):string {
  const ordinary={...observation,legalActions:observation.legalActions.filter(action=>!action.command.endsWith(' zmove'))};
  const action=super.choose(ordinary);
  return chooseZMove(observation,action);
 }
}

// Shared timing for the new Tactical tier and the archived v9/v10 policy.
export function chooseZMove(observation:Observation,action:string):string {
  const z=observation.legalActions.find(candidate=>candidate.command===action+' zmove');
  if(!z)return action;
  const fraction=(condition:string)=>{const [hp,max]=condition.split(' ')[0].split('/').map(Number);return max>0?hp/max:1;};
  const own=observation.ownTeam.find(p=>p.active),enemy=observation.opponent;
  if(z.label.startsWith('Z-') && own){
    const extra=Showdown.Dex.moves.get(z.label.slice(2)).zMove;
    if(extra?.boost || extra?.effect==='heal' && fraction(own.condition)<=.5)return z.command;
  }
  if(z.estimatedDamage>0 && enemy && own && (fraction(enemy.condition)>.25 || fraction(own.condition)<.35))return z.command;
  return action;
}
