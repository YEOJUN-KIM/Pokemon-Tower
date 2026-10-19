import {test} from 'node:test';
import assert from 'node:assert/strict';
import {battleRules} from '../src/data/run-rules';
import {challengeRule,matchesSpecialForm} from '../src/web/pokedex-controls';
import {pokedexEntries} from '../src/server/pokedex-entries';

test('challenge selection preserves every defined rule and falls back to the mixed rule',()=>{
 for(const value of Object.keys(battleRules))assert.equal(challengeRule(value),value);
 for(const value of [undefined,null,'','unknown','CHAOS',0,{},[], '__proto__'])assert.equal(challengeRule(value),'chaos');
});
test('special form filters use catalog capabilities and existing form kinds',()=>{
 const entries=pokedexEntries();
 for(const entry of entries){
  assert.equal(matchesSpecialForm(entry,'all'),true);
  assert.equal(matchesSpecialForm(entry,'mega'),entry.canMega);
  assert.equal(matchesSpecialForm(entry,'gigantamax'),entry.canGigantamax);
  assert.equal(matchesSpecialForm(entry,'alternate'),!!entry.forms?.some(form=>form.kind==='selectable'));
  assert.equal(matchesSpecialForm(entry,'transformation'),!!entry.canPrimal||!!entry.forms?.some(form=>form.kind==='battle'||form.kind==='primal'));
 }
 for(const value of ['mega','gigantamax','alternate','transformation'] as const)assert.ok(entries.some(entry=>matchesSpecialForm(entry,value)),`${value} has catalog data`);
});
