// Support planning shared by the late-game probes: chooses supports for one battle like a cautious player.
import Showdown from 'pokemon-showdown';
import {GimmickPolicy} from '../../src/battle/gimmick-policy';
import type {Observation} from '../../src/battle/policy';
import {isAbilitySupport,supportCatalog} from '../../src/data/run-economy';
import {topThree,type PolicyName,type RunState} from './run-model';
const SETUP=new Set(['swordsdance','dragondance','nastyplot','calmmind','bulkup','quiverdance','shellsmash','coil','agility','bellydrum','workup']);
// Chooses supports for one battle from the stock, like a cautious human would: only when the fight looks risky.
export function planSupport(state:RunState,policy:PolicyName,floor:number,role:string,enemy:string,allowedTiers:readonly string[]=['basic','advanced','special']):string[]{
  const stock={...state.support},have=(k:string)=>(stock[k]??0)>0&&!!supportCatalog[k]&&allowedTiers.includes(supportCatalog[k].tier),plan:string[]=[];
  const boss=['champion','elite','gym','villain'].includes(role)||floor%50===0;
  const cap=policy==='aggressive'?3:policy==='balanced'?(boss||floor>=60?2:0):policy==='conservative'?(floor>=80||floor%50===0?1:0):2;
  if(!cap)return plan;
  const team=topThree(state),lead=team[0],leadDex=Showdown.Dex.species.get(lead),sets=Showdown.Teams.unpack(enemy)??[];
  const enemyMoves=sets.flatMap(s=>s.moves.map(m=>Showdown.toID(m)));
  const hasGround=sets.some(s=>s.moves.some(m=>Showdown.Dex.moves.get(m).type==='Ground'&&Showdown.Dex.moves.get(m).category!=='Status'));
  const add=(k:string)=>{if(plan.length<cap&&have(k)&&!plan.includes(k)){plan.push(k);}};
  const abilityPick=()=>{
    if(hasGround&&!leadDex.types.includes('Flying')&&leadDex.abilities[0]!=='Levitate')return 'abilityLevitate';
    if(enemyMoves.some(m=>SETUP.has(m)))return 'abilityUnaware';
    if(leadDex.baseStats.hp+leadDex.baseStats.def+leadDex.baseStats.spd>=280)return 'abilityMultiscale';
    return 'abilityRegenerator';
  };
  const ab=abilityPick();if(have(ab))add(ab);else for(const k of ['abilityMultiscale','abilityRegenerator','abilityMagicGuard','abilityUnaware','abilityLevitate'])if(have(k)&&plan.length<cap){add(k);break;}
  add(leadDex.baseStats.atk>=leadDex.baseStats.spa?'attack':'specialAttack');add('critical');
  const slow=sets.filter(s=>Showdown.Dex.species.get(s.species).baseStats.spe>leadDex.baseStats.spe).length>=2;if(slow)add('speed');
  add('defense');add('specialDefense');add('guard');
  return plan.filter(k=>supportCatalog[k]&&allowedTiers.includes(supportCatalog[k].tier)&&(supportCatalog[k]||isAbilitySupport(k)));
}
export class SupportingPolicy extends GimmickPolicy{
  constructor(private queue:string[]){super();}
  override choose(observation:Observation){
    const items=observation.legalActions.filter(a=>a.command.startsWith('item ')),rest=observation.legalActions.filter(a=>!a.command.startsWith('item '));
    const next=this.queue[0];
    if(next&&items.some(a=>a.command==='item '+next)){this.queue.shift();return 'item '+next;}
    if(rest.some(a=>a.command.startsWith('move ')))this.queue.length=0;
    return super.choose({...observation,legalActions:rest});
  }
}

