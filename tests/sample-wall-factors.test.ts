import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultProfile,validateProfile} from '../src/server/training';
import {moveBurdenMultiplier,reliableSampleMoves} from '../scripts/lib/reliable-samples';
import {selectCompositionMoves,evaluateTeam,recruitForComposition} from '../scripts/lib/paired-screen-composition';
import {selectCompositionMoves as originalMoves} from '../src/battle/team-composition';

test('sample burden discounts recharge and suicide and requires a sleep plan',()=>{
 const p=defaultProfile('Rotom');p.moves=['Thunderbolt','Shadow Ball','Dream Eater','Hyper Voice'];
 assert.equal(moveBurdenMultiplier('Dream Eater',p),0);
 assert(moveBurdenMultiplier('Hyper Beam',p)<moveBurdenMultiplier('Hyper Voice',p));
 assert(moveBurdenMultiplier('Explosion',p)<.3);
 p.moves.push('Hypnosis');assert.equal(moveBurdenMultiplier('Dream Eater',p),1);
 assert.equal(moveBurdenMultiplier('Fling',p),0);
});
test('reliable preparation preserves support and source while producing legal non-recharge primary attacks',()=>{
 for(const name of ['Charizard','Grimmsnarl','Rotom','Slowbro']){
  const p=defaultProfile(name);if(name==='Grimmsnarl')p.moves=['Reflect','Light Screen','Focus Punch','Foul Play'];
  if(name==='Slowbro')p.moves=['Trick Room','Psychic','Surf','Ice Beam'];
  const saved=structuredClone(p),moves=reliableSampleMoves(name,p);
  assert.deepEqual(p,saved);validateProfile(name,{...p,moves});
  if(name==='Grimmsnarl')assert(moves.includes('Reflect')&&moves.includes('Light Screen'));
  if(name==='Slowbro')assert(moves.includes('Trick Room'));
  if(name==='Charizard')assert(!moves.includes('Blast Burn')&&!moves.includes('Hyper Beam'));
 }
});
test('actual Rest offer keeps both Grimmsnarl walls and distinguishes paired utility',()=>{
 const profiles={Grimmsnarl:defaultProfile('Grimmsnarl'),Turtonator:defaultProfile('Turtonator'),Rotom:defaultProfile('Rotom')};
 profiles.Grimmsnarl.moves=['Reflect','Light Screen','Focus Punch','Foul Play'];
 const p=profiles.Grimmsnarl,pool=[...p.moves,'Rest'];
 const next=selectCompositionMoves('Grimmsnarl',p,pool,profiles);
 assert(next.includes('Reflect')&&next.includes('Light Screen'));assert(next.length===4&&next.includes('Foul Play'));
 const missing={...profiles,Grimmsnarl:{...p,moves:p.moves.filter(m=>m!=='Light Screen')}};
 assert.equal(evaluateTeam(Object.keys(profiles),profiles)-evaluateTeam(Object.keys(profiles),missing),4);
 assert(!originalMoves('Grimmsnarl',p,pool,profiles).includes('Light Screen'));
});
test('wall intervention leaves unrelated moves and no-gain recruitment untouched',()=>{
 const profiles={Slowbro:defaultProfile('Slowbro'),Snorlax:defaultProfile('Snorlax'),Torkoal:defaultProfile('Torkoal')};
 profiles.Slowbro.moves=['Trick Room','Surf','Psychic','Ice Beam'];
 assert.deepEqual(selectCompositionMoves('Slowbro',profiles.Slowbro,[...profiles.Slowbro.moves,'Rest'],profiles),originalMoves('Slowbro',profiles.Slowbro,[...profiles.Slowbro.moves,'Rest'],profiles));
 const before=structuredClone(profiles);const decision=recruitForComposition(profiles,[],defaultProfile);
 assert.equal(decision.selected,null);assert.deepEqual(profiles,before);
});
