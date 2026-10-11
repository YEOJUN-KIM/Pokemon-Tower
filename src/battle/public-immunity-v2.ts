import Showdown from 'pokemon-showdown';
import type {Observation,OwnPokemon} from './policy';
import {publicMoveEffectiveness} from '../data/type-effectiveness';

const known=new Set(['wonderguard','levitate','flashfire','waterabsorb','stormdrain','dryskin','voltabsorb','lightningrod','motordrive','sapsipper','wellbakedbody','eartheater','soundproof','bulletproof','windrider']);
// Experimental player only. Public revealed evidence; never consults opponent sets.
export class PublicImmunityV2 {
 private ability='';private failed=new Set<string>();private lastAttack='';private lastOwnAbility='';private turn=0;private enemyEntry=0;
 observeOwn(p:OwnPokemon|undefined){this.lastOwnAbility=Showdown.toID(p?.ability);}
 consume(line:string){
  const [,event,actor,value]=line.split('|');const enemy=actor?.startsWith('p2a:');
  if(event==='turn'){this.turn=Number(actor);this.lastAttack='';}
  if(enemy&&['switch','drag','replace','-formechange','detailschange'].includes(event)){this.ability='';this.failed.clear();this.lastAttack='';this.enemyEntry++;}
  if(enemy&&['-terastallize','-start','-end'].includes(event)){this.failed.clear();this.lastAttack='';}
  if(enemy&&event==='-endability'){this.ability='';this.failed.clear();}
  if(event==='-fieldstart'||event==='-fieldend')this.failed.clear();
  if(event==='move')this.lastAttack=actor?.startsWith('p1a:')?Showdown.toID(value):'';
  if(enemy&&event==='-ability'){this.ability=Showdown.toID(value);this.failed.clear();}
  if(enemy&&['-immune','-heal','-activate','-boost'].includes(event)){
   const reveal=line.match(/(?:\[from\] )?ability: ([^|]+)/)?.[1];if(reveal)this.ability=Showdown.toID(reveal);
   if(event==='-immune'&&this.lastAttack&&Showdown.Dex.moves.get(this.lastAttack).category!=='Status')this.failed.add(this.lastAttack+':'+this.lastOwnAbility);
  }
 }
 blocked(name:string,own:OwnPokemon,o:Observation){
  const m=Showdown.Dex.moves.get(name);if(m.category==='Status')return false;
  const defending=o.switching?.opponentTypes.length?o.switching.opponentTypes:Showdown.Dex.species.get(o.opponent?.species??'').types;
  const bypass=!!m.ignoreAbility||['moldbreaker','teravolt','turboblaze'].includes(Showdown.toID(own.ability));
  if(!bypass){
   if(this.ability==='wellbakedbody'&&m.type==='Fire'||this.ability==='eartheater'&&m.type==='Ground'||this.ability==='soundproof'&&m.flags.sound||this.ability==='bulletproof'&&m.flags.bullet||this.ability==='windrider'&&m.flags.wind)return true;
  }
  if(publicMoveEffectiveness({type:m.type,defending,ability:this.ability,ownAbility:own.ability,move:m.id,ignoreAbility:!!m.ignoreAbility})===0)return true;
  // Unknown revealed abilities must not erase a directly observed failure.
  return this.failed.has(m.id+':'+Showdown.toID(own.ability))&&(!this.ability||!known.has(this.ability)&&!bypass);
 }
 context(){return{turn:this.turn,enemyEntry:this.enemyEntry,revealedAbility:this.ability,failedMoves:[...this.failed]};}
}
