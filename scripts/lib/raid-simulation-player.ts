import Showdown from 'pokemon-showdown';
import {CautiousSwitchingPolicy} from '../../src/battle/switch-policy';
import {chooseZMove} from '../../src/battle/z-move-policy';
import type {Observation,Policy} from '../../src/battle/policy';

// A bounded public-information player, not a prediction/search agent. The
// existing policy handles damage, status, recovery, forced switches and gimmicks.
// Only some clearly unfavourable turns permit a voluntary switch.
export class RaidSimulationPlayerPolicy implements Policy {
 readonly switchingInformation=true;
 private delegate=new CautiousSwitchingPolicy();
 constructor(private random:()=>number){}
 choose(original:Observation):string {
  const moving=original.legalActions.some(a=>a.command.startsWith('move '));
  const own=original.ownTeam.find(p=>p.active),enemy=original.opponent;
  const danger=own&&enemy&&(original.switching?.opponentTypes??Showdown.Dex.species.get(enemy.species).types).some(type=>{
   const defending=own.terastallized&&own.terastallized!=='Stellar'?[own.terastallized]:Showdown.Dex.species.get(own.details.split(',')[0]).types;
   return Showdown.Dex.getImmunity(type,defending)&&Showdown.Dex.getEffectiveness(type,defending)>0;
  });
  const lowHP=own?Number(own.condition.split('/')[0])/Number(own.condition.split('/')[1]?.split(' ')[0])<.3:false;
  const permit=!moving||((danger||lowHP)&&this.random()<.55);
  const observation=permit?original:{...original,legalActions:original.legalActions.filter(a=>!a.command.startsWith('switch '))};
  return chooseZMove(observation,this.delegate.choose(observation));
 }
}
