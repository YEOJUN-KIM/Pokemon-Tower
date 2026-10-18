import type {NpcAi} from '../data/npc-ai';
import type {Observation,Policy} from './policy';
import {TowerPolicy} from './tower-policy';
import {CautiousSwitchingPolicy} from './switch-policy';
import {ZMovePolicy,chooseZMove} from './z-move-policy';
import {tacticScoreBias} from './tactic-score';

class TacticalPolicy extends CautiousSwitchingPolicy {
 override choose(o:Observation):string {
  return chooseZMove(o,super.choose({...o,legalActions:o.legalActions.filter(a=>!a.command.endsWith(' zmove'))}));
 }
}

// v11 opts into existing policy capabilities; archived versions never use this.
export function createNpcPolicy(ai:NpcAi={tier:'basic',tactic:'balanced'}):Policy{
 const bias=tacticScoreBias(ai.tactic);
 if(ai.tier==='expert')return new ZMovePolicy('p2',bias);
 if(ai.tier==='tactical')return new TacticalPolicy(bias);
 const basic=new TowerPolicy(bias);
 return {choose(o){
  const moves=o.legalActions.filter(a=>/^move \d+$/.test(a.command));
  return basic.choose({...o,legalActions:moves.length?moves:o.legalActions});
 }};
}
