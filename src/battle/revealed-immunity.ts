import Showdown from 'pokemon-showdown';
import type {Observation,OwnPokemon} from './policy';
import {publicMoveEffectiveness} from '../data/type-effectiveness';

// Learns exclusively from the player's public event stream; never reads an enemy set.
export class RevealedImmunity {
 private ability='';
 private failed=new Set<string>();
 private lastAttack='';
 private turn=0;
 private enemyEntry=0;
 consume(line:string){
  const [,event,actor,value,extra]=line.split('|');
  if(event==='turn'){this.turn=Number(actor);this.lastAttack='';}
  const enemy=actor?.startsWith('p2a:');
  if(enemy&&['switch','drag','replace','-formechange','detailschange','-terastallize','-start','-end','-endability'].includes(event)){this.reset();}
  if(event==='-fieldstart'||event==='-fieldend')this.failed.clear();
  if(enemy&&event==='-ability'){this.ability=Showdown.toID(value);this.failed.clear();}
  if(event==='move')this.lastAttack=actor?.startsWith('p1a:')?Showdown.toID(value):'';
  if(enemy&&event==='-immune'&&this.lastAttack){
   const move=Showdown.Dex.moves.get(this.lastAttack);if(move.category==='Status')return;
   const revealed=(value??'').match(/ability: (.*)/)?.[1]??(extra??'').match(/ability: (.*)/)?.[1];
   if(revealed)this.ability=Showdown.toID(revealed);
   this.failed.add(this.lastAttack);
  }
 }
 private reset(){this.ability='';this.failed.clear();this.lastAttack='';this.enemyEntry++;}
 blocked(name:string,own:OwnPokemon,o:Observation){
  const move=Showdown.Dex.moves.get(name);if(move.category==='Status')return false;
  const types=o.switching?.opponentTypes.length?o.switching.opponentTypes:Showdown.Dex.species.get(o.opponent?.species??'').types;
  if(publicMoveEffectiveness({type:move.type,defending:types,ability:this.ability,ownAbility:own.ability,move:move.id,ignoreAbility:!!move.ignoreAbility})===0)return true;
  // Move-specific unknown immunity is scoped to this enemy entry. Revealed ability
  // immunities are evaluated above so a Mold Breaker ally can bypass them.
  return !this.ability&&this.failed.has(move.id);
 }
 context(){return {turn:this.turn,enemyEntry:this.enemyEntry,revealedAbility:this.ability,failedMoves:[...this.failed]};}
}
