import test from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {npcBuildAttackStat} from '../src/server/npc-builds';
import {npcTrainingProfile,trainNpcTeam} from '../src/server/npc-training';
import {npcRankTraining} from '../src/data/npc-ranks';
import {encounterRandom} from '../src/server/opponent-team';
import {npcSamples} from '../src/data/npc-samples';
import {generateNpcEncounter} from '../src/server/npc-encounters';
import type {TrainerTactic} from '../src/data/trainer-catalog';
const seed:[number,number,number,number]=[17,29,43,71];
const special=['Ludicolo','Charizard','Ursaluna-Bloodmoon','Walrein','Gardevoir','Alakazam'];
const physical=['Garchomp','Scizor','Hitmonchan','Hitmontop','Dodrio','Breloom'];

for(const [names,stat,conflict] of [[special,'spa','physical'],[physical,'atk','special']] as const){
 test(`${stat} builds override conflicting ${conflict} tactics only for new common Elite/Master`,()=>{
  for(const name of names)for(const floor of [5,20,40])for(const rank of ['elite','master'] as const){
   const target=npcRankTraining(floor,rank),entry=trainNpcTeam([{name,moves:[]}],floor,'standard',conflict,seed,'basic',target,{buildRank:rank})[0];
   const other=stat==='atk'?'spa':'atk',evs=entry.profile!.evs;
   assert.ok(entry.moves.filter(m=>Showdown.Dex.moves.get(m).category!=='Status').every(m=>Showdown.Dex.moves.get(m).category===(stat==='atk'?'Physical':'Special')));
   assert.ok(evs[stat]>0,`${name}/${rank}/${floor}`);assert.equal(evs[other],0);
   // Swapping only the attack destination retains the original tactic's HP/Speed weights and IV rolls.
   const old=trainNpcTeam([{name,moves:[]}],floor,'standard',conflict,seed,'basic',target)[0].profile!;
   assert.deepEqual(entry.profile!.ivs,old.ivs);assert.equal(evs.hp,old.evs.hp);assert.equal(evs.spe,old.evs.spe);
   assert.equal(evs.atk+evs.spa,old.evs.atk+old.evs.spa);
   const normal=trainNpcTeam([{name,moves:[]}],floor,'standard',conflict,seed,'basic',npcRankTraining(floor,'normal'))[0].profile!.evs;
   assert.ok(normal[other]>0);assert.equal(normal[stat],0);
   const legacy=trainNpcTeam([{name,moves:[]}],floor,'elite',conflict,seed,'basic')[0].profile!.evs;
   assert.ok(legacy[other]>0);assert.equal(legacy[stat],0);
  }
 });
}

test('Mixed uses final attack counts, then existing effective attack scoring and stats; ignores non-attack EV payoffs',()=>{
 assert.equal(npcBuildAttackStat('Wyrdeer',['Double-Edge','Earthquake','Psychic','Calm Mind']),'atk');
 assert.equal(npcBuildAttackStat('Wyrdeer',['Double-Edge','Psychic','Shadow Ball','Calm Mind']),'spa');
 assert.equal(npcBuildAttackStat('Charizard',['Scratch','Flamethrower','Roost']),'spa');
 assert.equal(npcBuildAttackStat('Garchomp',['Earthquake','Ember','Swords Dance']),'atk');
 assert.equal(npcBuildAttackStat('Wyrdeer',['Tackle','Swift']),'spa'); // equal counts: stronger effective move wins
 assert.equal(npcBuildAttackStat('Wyrdeer',['Tackle','Confusion']),'spa');
 assert.equal(npcBuildAttackStat('Wyrdeer',['Tackle','Water Gun']),'atk'); // equal power: higher STAB value
 assert.equal(npcBuildAttackStat('Wyrdeer',['Dragon Claw','Shadow Ball']),'atk'); // equal scores/stats: stable Atk fallback
 assert.equal(npcBuildAttackStat('Garchomp',['Body Press','Foul Play','Flamethrower']),'spa');
 assert.equal(npcBuildAttackStat('Wobbuffet',['Counter','Mirror Coat','Encore','Destiny Bond']),undefined);
});

test('bulk/status weights are unchanged and speed/balanced keep their roles with the selected attack stat',()=>{
 for(const tactic of ['bulk','status','speed','balanced'] as TrainerTactic[])for(const rank of ['elite','master'] as const){
  const target=npcRankTraining(40,rank),entry=trainNpcTeam([{name:'Charizard',moves:[]}],40,'standard',tactic,seed,'basic',target,{buildRank:rank})[0];
  const old=npcTrainingProfile('Charizard',entry.moves,40,'standard',tactic,encounterRandom(seed),target);
  assert.deepEqual(entry.profile!.evs,old.evs);
  if(tactic==='bulk'||tactic==='status'){assert.equal(entry.profile!.evs.atk,0);assert.equal(entry.profile!.evs.spa,0);}
  if(tactic==='speed')assert.ok(entry.profile!.evs.spe>entry.profile!.evs.spa);
 }
});

test('all sample classes at 5/20/40 align one-sided final attacks with their attacking EVs',()=>{
 for(const floor of [5,20,40])for(const sample of npcSamples)for(const rank of ['elite','master'] as const){
  const encounter=generateNpcEncounter(floor,seed,sample,rank);
  for(const p of encounter.team){
   const categories=new Set(p.moves.map(m=>Showdown.Dex.moves.get(m).category).filter(c=>c!=='Status'));
   const evs=p.profile!.evs;
   if(sample.tactic==='bulk'||sample.tactic==='status'){assert.equal(evs.atk+evs.spa,0);continue;}
   if(categories.size===1){
    if(categories.has('Physical'))assert.equal(evs.spa,0,`${p.name}/${sample.id}`);
    else assert.equal(evs.atk,0,`${p.name}/${sample.id}`);
   }
   assert.equal(Object.values(evs).reduce((a,b)=>a+b,0),encounter.training.evBudget);
  }
 }
});
