import {TowerPolicy} from './tower-policy';
import type {Observation} from './policy';
// Opt-in policy version; old saved opponents keep tower-policy-v2 decisions.
export class LegacyGimmickPolicy extends TowerPolicy {
 override choose(observation:Observation){
  const action=super.choose(observation);
  if(!action.startsWith('move '))return action;
  for(const gimmick of ['mega','dynamax'])if(observation.legalActions.some(a=>a.command===action+' '+gimmick))return action+' '+gimmick;
  return action;
 }
}

// v4 uses only own requests and public HP/types. Preserve v3 for saved replays.
export class GimmickPolicy extends TowerPolicy {
 override choose(observation:Observation){
  const normal=observation.legalActions.filter(a=>!a.command.endsWith(' mega') && !a.command.endsWith(' dynamax'));
  const action=super.choose({...observation,legalActions:normal});
  if(!action.startsWith('move '))return action;
  if(observation.legalActions.some(a=>a.command===action+' mega'))return action+' mega';
  const selected=normal.find(a=>a.command===action)!;
  if(selected.label.startsWith('Max ')){
   const attacks=normal.filter(a=>a.command.startsWith('move ') && a.label!=='Max Guard' && a.estimatedDamage>0).sort((a,b)=>b.estimatedDamage-a.estimatedDamage);
   return attacks[0]?.command ?? action;
  }
  const max=observation.legalActions.find(a=>a.command===action+' dynamax');
  if(!max || max.label==='Max Guard' || selected.estimatedDamage<=0)return action;
  const own=observation.ownTeam.find(p=>p.active)!,enemy=observation.opponent;
  const fraction=(hp:string)=>{const [n,d]=hp.split(' ')[0].split('/').map(Number);return d>0?n/d:1;};
  // Save the three-turn window when a healthy ace can finish a nearly fainted foe.
  if(enemy && fraction(enemy.condition)<=.25 && fraction(own.condition)>.5)return action;
  return max.command;
 }
}

// Separate version: replayed v4 choices remain unchanged.
export class TeraPolicy extends GimmickPolicy {
 override choose(observation:Observation){
  const normal=observation.legalActions.filter(a=>!a.command.endsWith(' terastallize'));
  const action=super.choose({...observation,legalActions:normal});
  const tera=observation.legalActions.find(a=>a.command===action+' terastallize');
  return tera && tera.estimatedDamage>0 ? tera.command : action;
 }
}
