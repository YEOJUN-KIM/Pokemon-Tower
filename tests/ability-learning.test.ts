import test from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {abilityLearningCases,runAbilityLearningCase} from '../scripts/lib/ability-learning-cases';
import {PublicImmunityV2} from '../src/battle/public-immunity-v2';
import {battleEvents,replayBattle} from '../src/battle/run';
import type {Observation} from '../src/battle/policy';

for(const [index,c] of abilityLearningCases.entries()){
 test(`${c.target}: learns ${c.ability} from real events and attacks with another type`,async()=>{
  const result=await runAbilityLearningCase(index,[10+index,22,33,44]);
  assert(result.lines.some(l=>l.includes('ability: '+c.ability)||l.includes('|-ability|p2a: '+c.target+'|'+c.ability)), 'engine must publicly reveal the ability: '+result.lines.slice(0,45).join('\n'));
  const next=result.choices.find(d=>d.turn===2);
  assert(next,'must survive long enough to make the next decision');
  assert(next.action.startsWith('move '),'a usable alternative should not require switching');
  const action=next.observation.legalActions.find(a=>a.command===next.action)!;
  assert.notEqual(Showdown.Dex.moves.get(action.label).type,c.blockedType,'avoid the entire blocked type');
  for(const d of result.log.decisions)assert(d.observation.legalActions.some(a=>a.command===d.action));
  assert.deepEqual(battleEvents(result.log.publicProtocol),battleEvents((await replayBattle(result.log)).publicProtocol));
 });
 test(`${c.target}: does not infer ${c.ability} from the species alone`,async()=>{
  const result=await runAbilityLearningCase(index,[10+index,22,33,44],true);
  assert(!result.lines.some(l=>l.includes('ability: '+c.ability)||l.includes('|-ability|p2a: '+c.target+'|'+c.ability)));
  const next=result.choices.find(d=>d.turn===2)!;
  assert(next);
  const memory=new PublicImmunityV2();
  const own=next.observation.ownTeam.find(p=>p.active)!;
  memory.observeOwn(own);
  for(const line of result.lines.slice(0,result.lines.indexOf('|turn|2')+1))memory.consume(line);
  assert.equal(memory.blocked(c.moves[0],own,next.observation),false,'successful probe remains available');
  assert.deepEqual(battleEvents(result.log.publicProtocol),battleEvents((await replayBattle(result.log)).publicProtocol));
 });
}

test('revealed Water Absorb rejects every water move, allows bypass, and clears for a new opponent',()=>{
 const memory=new PublicImmunityV2();
 const own={ident:'p1: Starmie',details:'Starmie',condition:'100/100',active:true,ability:'Natural Cure',stats:{atk:100,def:100,spa:100,spd:100,spe:100}};
 const o:Observation={turn:2,ownTeam:[own],opponent:{species:'Quagsire',condition:'100/100'},legalActions:[]};
 assert(!memory.blocked('Surf',own,o));
 memory.observeOwn(own);memory.consume('|move|p1a: Starmie|Surf|p2a: Quagsire');
 memory.consume('|-heal|p2a: Quagsire|100/100|[from] ability: Water Absorb');
 assert(memory.blocked('Surf',own,o));assert(memory.blocked('Hydro Pump',own,o));
 assert(!memory.blocked('Psychic',own,o));assert(!memory.blocked('Surf',{...own,ability:'Mold Breaker'},o));
 memory.consume('|switch|p2a: Quagsire|Quagsire, L50|100/100');
 assert(!memory.blocked('Surf',own,o));
});
