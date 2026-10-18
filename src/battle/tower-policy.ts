import Showdown from 'pokemon-showdown';
import {DamagePolicy,estimateDamage,type Observation,type OwnPokemon} from './policy';
import type {MoveScoreBias} from './tactic-score';

function fraction(condition:string) {const [current,max]=condition.split(' ')[0].split('/').map(Number);return max>0 ? current/max : 0;}
const heals=new Set(['recover','roost','softboiled','slackoff','strengthsap']);
const setup=new Set(['dragondance','swordsdance','nastyplot','calmmind','bulkup','quiverdance','shellsmash']);
// Decisions use our own visible condition and public opponent information only.
// This is a deterministic heuristic, not usage statistics or a trained model.
export class TowerPolicy extends DamagePolicy {
  constructor(private readonly scoreBias?:MoveScoreBias){super();}
  private setupUsed=new Set<string>();
  private statusUsed=new Set<string>();
  private soaked=new Set<string>();
  // v12 can replace a speculative ordinary choice with another Z move. Archived
  // callers never invoke this hook and keep their original state transitions.
  protected checkpointDecisionState():()=>void {
    const setup=new Set(this.setupUsed),status=new Set(this.statusUsed),soaked=new Set(this.soaked);
    return ()=>{this.setupUsed=setup;this.statusUsed=status;this.soaked=soaked;};
  }
  override choose(observation:Observation):string {
    const own=observation.ownTeam.find(p=>p.active),enemy=observation.opponent;
    if(!own || !enemy)return super.choose(observation);
    const hp=fraction(own.condition),target=Showdown.Dex.species.get(enemy.species),enemyHP=fraction(enemy.condition);
    const last=Showdown.Dex.moves.get(observation.lastOpponentMove ?? ''),hasStatus=!!enemy.condition.split(' ')[1];
    const scores=observation.legalActions.map(action=>{
      if(!action.command.startsWith('move '))return {action,score:-1};
      const move=Showdown.Dex.moves.get(action.label),key=`${own.ident}:${enemy.species}:${move.id}`;
      let score=move.category==='Status' ? 0 : this.damage(move.name,own,enemy.species);
      if(move.id==='transform')score=100;
      if(move.id==='counter')score=last.category==='Physical' ? 90 : 1;
      if(move.id==='mirrorcoat')score=last.category==='Special' ? 90 : 1;
      if(move.id==='destinybond')score=hp<.3 && !this.statusUsed.has(key) ? 100 : 0;
      if(heals.has(move.id))score=hp<=.5 ? 85 : 0;
      if(setup.has(move.id))score=hp>.7 && enemyHP>.5 && !this.setupUsed.has(own.ident) ? 65 : 0;
      if(['toxic','willowisp','thunderwave','leechseed'].includes(move.id)) {
        const immune=move.id==='toxic' ? target.types.some(type=>['Poison','Steel'].includes(type)) && !this.soaked.has(enemy.species)
          : move.id==='willowisp' ? target.types.includes('Fire') : move.id==='thunderwave' ? target.types.some(type=>['Electric','Ground'].includes(type)) : target.types.includes('Grass');
        score=!immune && !hasStatus && !this.statusUsed.has(key) ? 55 : 0;
      }
      if(move.id==='soak')score=target.types.some(type=>['Steel','Poison'].includes(type)) && !this.soaked.has(enemy.species) ? 65 : 0;
      if(!Number.isFinite(score))score=0;
      if(this.scoreBias)score+=this.scoreBias(score,action,observation);
      return {action,score};
    }).sort((a,b)=>b.score-a.score);
    const best=scores[0];if(!best)throw Error('No legal actions');
    if(best.action.command.startsWith('move ')) {
      const move=Showdown.Dex.moves.get(best.action.label);
      if(setup.has(move.id))this.setupUsed.add(own.ident);
      if(move.category==='Status')this.statusUsed.add(`${own.ident}:${enemy.species}:${move.id}`);
      if(move.id==='soak')this.soaked.add(enemy.species);
    }
    return best.action.command;
  }
  private damage(name:string,own:OwnPokemon,opponent:string) {
    const move=Showdown.Dex.moves.get(name),target=Showdown.Dex.species.get(opponent);
    if(!Showdown.Dex.getImmunity(move.type,target.types))return 0;
    if(move.damage==='level')return 50;
    if(typeof move.damage==='number')return move.damage;
    if(move.id==='superfang' || move.id==='naturesmadness' || move.id==='ruination')return 65;
    let power=move.basePower;
    if(['grassknot','lowkick'].includes(move.id))power=target.weightkg>=200 ? 120 : target.weightkg>=100 ? 100 : target.weightkg>=50 ? 80 : target.weightkg>=25 ? 60 : target.weightkg>=10 ? 40 : 20;
    if(['heavyslam','heatcrash'].includes(move.id)){const ratio=Showdown.Dex.species.get(own.details.split(',')[0]).weightkg/target.weightkg;power=ratio>=5 ? 120 : ratio>=4 ? 100 : ratio>=3 ? 80 : ratio>=2 ? 60 : 40;}
    if(['eruption','waterspout','dragonenergy'].includes(move.id))power=Math.max(1,Math.floor(150*fraction(own.condition)));
    if(['return','frustration'].includes(move.id))power=move.id==='return' ? 102 : 1;
    if(move.multihit)power*=Array.isArray(move.multihit) ? (move.multihit[0]+move.multihit[1])/2 : move.multihit;
    if(move.id==='facade' && own.condition.split(' ')[1])power*=2;
    const approximate=estimateDamage(name,own,opponent);
    if(move.basePower>0)return approximate*power/move.basePower;
    const attack=move.category==='Physical' ? own.stats.atk : own.stats.spa,defense=(move.category==='Physical' ? target.baseStats.def : target.baseStats.spd)+20;
    return ((22*Math.max(power,50)*attack/defense)/50+2)*(Showdown.Dex.species.get(own.details.split(',')[0]).types.includes(move.type) ? 1.5 : 1)*2**Showdown.Dex.getEffectiveness(move.type,target.types);
  }
}
