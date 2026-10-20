import test from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {applyPaldeaAuditVariant} from '../scripts/lib/paldea-audit-variant';
import {paldeaTrainers,paldeaSample} from '../src/data/paldea-trainers';
import {snapshotTrainerEventBattle} from '../src/server/trainer-event-battle';
import {CURRENT_PROGRESSION} from '../src/data/tower-progression';
import {packTeam} from '../src/data/teams';
import {FORMAT,type BattleLog} from '../src/battle/run';
import {paldeaRound2Telemetry} from '../scripts/lib/paldea-round2-telemetry';

test('historical audit variants alter baseline copies without modifying current NPC snapshots',()=>{
 for(const [id,variant]of [['named-tulip','tulip-no-item'],['named-rika','rika-toxic-spikes']] as const){
  const t=paldeaTrainers.find(t=>t.id===id)!,snap=snapshotTrainerEventBattle('audit-variant-test',paldeaSample(t),95,'basic',CURRENT_PROGRESSION),saved=snap.opponentTeam;
  const baseline=Showdown.Teams.unpack(saved)!;
  if(id==='named-tulip')baseline[1].item='Expert Belt';else baseline[2].moves[2]='Stone Edge';
  const original=Showdown.Teams.pack(baseline);
  assert.equal(applyPaldeaAuditVariant(original,'current'),original);
  const expected=Showdown.Teams.unpack(original)!;
  if(id==='named-tulip'){assert.equal(expected[1].item,'Expert Belt');expected[1].item='';}else{assert.equal(expected[2].moves[2],'Stone Edge');expected[2].moves[2]='Toxic Spikes';}
  assert.deepEqual(Showdown.Teams.unpack(applyPaldeaAuditVariant(original,variant)),expected);assert.equal(snap.opponentTeam,saved);
 }
});
test('actual engine applies Expert Belt only to super-effective attacks while preserving Sharpness',()=>{
 const own=Showdown.Teams.unpack(packTeam(['Gallade','Espathra','Florges']))!,foe=Showdown.Teams.unpack(packTeam(['Blissey','Snorlax','Venusaur']))!;own[0].ability='Sharpness';own[0].item='';
 const b=new Showdown.Battle({formatid:FORMAT,seed:'1,2,3,4'});
 try{
  b.setPlayer('p1',{name:'Player',team:foe});b.setPlayer('p2',{name:'Tower AI',team:own});b.makeChoices('team 123','team 123');
  const attacker=b.p2.active[0],defender=b.p1.active[0];
  for(const [name,effective]of [['Psycho Cut',false],['Sacred Sword',true]] as const){
   attacker.item=Showdown.toID('');const rng=b.prng.clone(),move=b.dex.getActiveMove(name);move.willCrit=false;const plain=b.actions.getDamage(attacker,defender,move) as number;
   b.prng=rng;attacker.item=Showdown.toID('Expert Belt');const boosted=b.actions.getDamage(attacker,defender,move) as number;
   if(effective)assert.ok(Math.abs(boosted/plain-1.2)<.03);else assert.equal(boosted,plain);
  }
  assert.equal(attacker.ability,'sharpness');
 }finally{b.destroy();}
});
test('Toxic Spikes candidate really poisons a grounded entry and is removed by Poison entry',()=>{
 const t=paldeaTrainers.find(t=>t.id==='named-rika')!,snap=snapshotTrainerEventBattle('candidate-mechanics',paldeaSample(t),95,'basic',CURRENT_PROGRESSION);
 const own=Showdown.Teams.unpack(snap.opponentTeam)!,foe=Showdown.Teams.unpack(packTeam(['Blissey','Blastoise','Venusaur']))!;
 const clodsire=own.find(p=>p.species==='Clodsire')!;clodsire.moves[2]='Toxic Spikes';
 own.sort((a,b)=>Number(b.species==='Clodsire')-Number(a.species==='Clodsire'));foe.forEach(p=>p.moves=['Protect']);
 const b=new Showdown.Battle({formatid:FORMAT,seed:'1,2,3,4'});
 try{
  b.setPlayer('p1',{name:'Player',team:foe});b.setPlayer('p2',{name:'Tower AI',team:own});b.makeChoices('team 123','team 123');
  b.makeChoices('move 1','move 3');assert.ok(b.p1.sideConditions.toxicspikes);
  b.makeChoices('switch 2','move 4');assert.equal(b.p1.active[0].status,'psn');
  b.makeChoices('switch 3','move 4');assert.equal(b.p1.active[0].baseSpecies.name,'Venusaur');assert.equal(b.p1.active[0].status,'');assert.ok(!b.p1.sideConditions.toxicspikes);
 }finally{b.destroy();}
});
test('post-hoc hazard audit separates Poison Jab from entry poison, removal and overstack',()=>{
 const log:BattleLog={schemaVersion:1,engineVersion:'fixture',format:'fixture',seed:[1,2,3,4],teams:{p1:packTeam(['Blastoise','Venusaur','Lapras']),p2:packTeam(['Clodsire','Donphan','Camerupt'])},decisions:[],winner:'Tower AI',turns:5,publicProtocol:[
  '|switch|p1a: Blastoise|Blastoise, L50|100/100','|switch|p2a: Clodsire|Clodsire, L50|100/100','|turn|1',
  '|move|p2a: Clodsire|Poison Jab|p1a: Blastoise','|-status|p1a: Blastoise|psn','|-damage|p1a: Blastoise|88/100|[from] psn',
  '|turn|2','|move|p2a: Clodsire|Toxic Spikes|p1a: Blastoise','|-sidestart|p1: Player|move: Toxic Spikes',
  '|switch|p1a: Venusaur|Venusaur, L50|100/100','|-sideend|p1: Player|move: Toxic Spikes',
  '|turn|3','|move|p2a: Clodsire|Toxic Spikes|p1a: Venusaur','|-sidestart|p1: Player|move: Toxic Spikes',
  '|switch|p1a: Lapras|Lapras, L50|100/100','|-status|p1a: Lapras|psn','|-damage|p1a: Lapras|88/100|[from] psn',
  '|turn|4','|move|p2a: Clodsire|Toxic Spikes|p1a: Lapras','|-sidestart|p1: Player|move: Toxic Spikes',
  '|turn|5','|move|p2a: Clodsire|Toxic Spikes|p1a: Lapras',
 ]};
 const r=paldeaRound2Telemetry(log);assert.equal(r.toxicSpikesPoisoned,1);assert.equal(r.toxicSpikesPoisonDamage,12);assert.equal(r.toxicSpikesInstalled,3);assert.equal(r.toxicSpikesPoisonAbsorptions,1);assert.equal(r.toxicSpikesOverstack,1);
});
