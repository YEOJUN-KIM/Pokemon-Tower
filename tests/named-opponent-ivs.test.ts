import test from 'node:test';
import assert from 'node:assert/strict';
import {namedOpponentIVs,namedOpponentIVBudget,namedOpponentRole} from '../src/server/named-opponent-ivs';
import {generateOpponentTeam} from '../src/server/opponent-team';
import {namedTrainerSamples,normalTrainerSamples,eliteTrainerSamples} from '../src/data/trainer-catalog';
import {statKeys,type StatBlock} from '../src/data/training';
import {towerDifficulty} from '../src/data/tower-progression';
import type {Seed} from '../src/battle/run';
import {defaultProfile} from '../src/server/training';

const physical=['Earthquake','Dragon Claw','Rock Slide','Swords Dance'];
test('named IV allocation is seeded, varied and legal across every floor',()=>{
 for(let floor=1;floor<=100;floor++)for(let n=0;n<12;n++){
  const seed:Seed=[n,2,3,4],ivs=namedOpponentIVs('Garchomp',physical,floor,seed);
  assert.deepEqual(ivs,namedOpponentIVs('Garchomp',physical,floor,seed));
  assert.ok(Object.values(ivs).every(value=>Number.isInteger(value)&&value>=0&&value<=31));
  assert.ok(new Set(Object.values(ivs)).size>1);
  const total=Object.values(ivs).reduce((sum,value)=>sum+value,0),budget=namedOpponentIVBudget(floor);
  assert.ok(total>=budget.min&&total<=budget.max);
  if(floor<=98)assert.ok(total>towerDifficulty(floor).ivCap*6);
 }
 const variants=Array.from({length:30},(_,n)=>JSON.stringify(namedOpponentIVs('Garchomp',physical,40,[n,2,3,4])));
 assert.ok(new Set(variants).size>25);
});

test('actual move roles prefer physical/special speed or wall durability without forcing a fixed spread',()=>{
 for(const [name,moves,role,preferred] of [
  ['Garchomp',physical,'physical',['atk','spe']],
  ['Alakazam',['Psychic','Shadow Ball','Focus Blast','Recover'],'special',['spa','spe']],
  ['Toxapex',['Scald','Toxic','Haze','Recover'],'wall',['hp','def','spd']],
  ['Skarmory',['Brave Bird','Stealth Rock','Roost','Whirlwind'],'wall',['hp','def','spd']],
 ] as const){
  assert.equal(namedOpponentRole(name,[...moves]),role);
  const totals=Object.fromEntries(statKeys.map(stat=>[stat,0])) as StatBlock;
  for(let n=0;n<300;n++){
   const ivs=namedOpponentIVs(name,[...moves],40,[n,2,3,4]);
   for(const stat of statKeys)totals[stat]+=ivs[stat];
  }
  const secondary=statKeys.filter(stat=>!(preferred as readonly string[]).includes(stat));
  for(const primary of preferred)assert.ok(secondary.every(stat=>totals[primary]>totals[stat]),name+': '+primary);
 }
 const room=namedOpponentIVs('Bronzong',['Trick Room','Gyro Ball','Body Press','Protect'],80,[1,2,3,4],defaultProfile('Bronzong'));
 assert.equal(room.spe,0);
});

test('only named encounters receive role IV profiles; ordinary and elite generation remains unchanged',()=>{
 for(const sample of [...normalTrainerSamples,...eliteTrainerSamples]){
  const team=generateOpponentTeam(40,[1,2,3,4],[],null,sample,'hundred-floor-v1');
  assert.ok(team.every(entry=>entry.profile===undefined),sample.id);
 }
 const cynthia=namedTrainerSamples.find(sample=>sample.id==='named-cynthia')!;
 const team=generateOpponentTeam(40,[1,2,3,4],[],null,cynthia,'hundred-floor-v1');
 assert.ok(team.every(entry=>entry.profile&&new Set(Object.values(entry.profile.ivs)).size>1));
 const legacy=generateOpponentTeam(40,[1,2,3,4],[],null,cynthia,'legacy');
 assert.ok(legacy.every(entry=>entry.profile===undefined));
});
