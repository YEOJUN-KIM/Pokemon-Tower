import type {NpcAi} from '../data/npc-ai';
import type {Observation,Policy} from './policy';
import {LearningOpponentPolicy} from './learning-opponent-policy';
import {CautiousSwitchingPolicy} from './switch-policy';
import {createNpcPolicy as archivedNpcPolicy} from './npc-policy-v11';
import {chooseResourceZ} from './z-decision';
import {PublicImmunityV2} from './public-immunity-v2';
import {tacticScoreBias} from './tactic-score';

class TacticalPolicy extends CautiousSwitchingPolicy {
 private zMemory=new PublicImmunityV2();
 observePublicLine(line:string){this.zMemory.consume(line.replace(/\bp([12])(?=[a-z]?:)/g,(_,n)=>'p'+(n==='1'?'2':'1')));}
 override choose(o:Observation):string {
  const undo=o.legalActions.some(a=>a.command.endsWith(' zmove'))?this.checkpointDecisionState():null;
  const ordinary=super.choose({...o,legalActions:o.legalActions.filter(a=>!a.command.endsWith(' zmove'))});
  const own=o.ownTeam.find(p=>p.active);this.zMemory.observeOwn(own);
  const chosen=chooseResourceZ(own?{...o,legalActions:o.legalActions.filter(a=>!a.command.startsWith('move ')||a.label.startsWith('Z-')||!this.zMemory.blocked(a.label,own,o))}:o,ordinary,'tactical');
  if(chosen!==ordinary&&chosen!==ordinary+' zmove')undo?.();
  return chosen;
 }
}

class ExpertZPolicy extends LearningOpponentPolicy {
 private zMemory=new PublicImmunityV2();
 override observePublicLine(line:string){
  super.observePublicLine(line);
  this.zMemory.consume(line.replace(/\bp([12])(?=[a-z]?:)/g,(_,n)=>'p'+(n==='1'?'2':'1')));
 }
 override choose(o:Observation){
  const undo=o.legalActions.some(a=>a.command.endsWith(' zmove'))?this.checkpointDecisionState():null;
  const ordinary=super.choose({...o,legalActions:o.legalActions.filter(a=>!a.command.endsWith(' zmove'))});
  const own=o.ownTeam.find(p=>p.active);this.zMemory.observeOwn(own);
  const filtered=own?{...o,legalActions:o.legalActions.filter(a=>!a.command.startsWith('move ')||a.label.startsWith('Z-')||!this.zMemory.blocked(a.label,own,o))}:o;
  const chosen=chooseResourceZ(filtered,ordinary,'expert');
  if(chosen!==ordinary&&chosen!==ordinary+' zmove')undo?.();
  return chosen;
 }
}
// v12 changes only Z resource decisions. v11 remains frozen separately.
export function createNpcPolicy(ai:NpcAi={tier:'basic',tactic:'balanced'}):Policy{
 const bias=tacticScoreBias(ai.tactic);
 if(ai.tier==='expert')return new ExpertZPolicy('p2',bias);
 if(ai.tier==='tactical')return new TacticalPolicy(bias);
 return archivedNpcPolicy(ai);
}
