import test from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {installRaid} from '../src/battle/raid';
import {installTowerGimmicks} from '../src/battle/gimmicks';
import {installGolisopodMega,golisopodMegaDex} from '../src/battle/golisopod-mega';
import {validateRaidPhase} from '../src/battle/raid-transformation';
import {runBattle,replayBattle} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
import {FORMAT} from '../src/data/battle-rules';
import {packTeam} from '../src/data/teams';
import type {RaidPhaseDefinition,RaidSnapshot} from '../src/data/raids';
import {raidFixture} from './raid-fixture';
import {BattleSession} from '../src/server/battle-session';
import {presentationFrames} from '../src/web/battle-presentation';
import {currentTypes} from '../src/battle/public-types';

const f=raidFixture();
const template=structuredClone(f.snapshot);f.store.close();
const dex=golisopodMegaDex(Showdown.Dex);
function phase(species:string,transformation:RaidPhaseDefinition['transformation']='form',extra:Partial<RaidPhaseDefinition>={}):RaidPhaseDefinition{
 return {species,ability:dex.species.get(species).abilities[0],moves:['Rest'],transformation,...extra};
}
function snapshot(phases:RaidPhaseDefinition[]):RaidSnapshot{
 const species=dex.species.get(phases[0].species).baseSpecies;
 const base=Showdown.Teams.unpack(template.opponentTeam)![0];
 const opponentTeam=Showdown.Teams.pack(phases.map(p=>({...structuredClone(base),name:species,species,ability:dex.species.get(species).abilities[0],moves:[...p.moves]})));
 return {...structuredClone(template),raidHpMultiplier:undefined,species,phases,opponentTeam,transformationAdapter:1};
}
function start(phases:RaidPhaseDefinition[],player=packTeam(['Mew','Blastoise','Venusaur']),rule:'basic'|'chaos'='chaos'){
 const raid=snapshot(phases),battle=new Showdown.Battle({formatid:FORMAT,seed:'1,2,3,4'});
 const teams={p1:Showdown.Teams.unpack(player)!,p2:Showdown.Teams.unpack(raid.opponentTeam)!};
 installTowerGimmicks(battle,teams,undefined,rule,'basic',undefined,['Tera Orb','Dynamax Band'],true,true);
 installGolisopodMega(battle);installRaid(battle,raid);
 battle.setPlayer('p1',{name:'Player',team:player});battle.setPlayer('p2',{name:'Tower AI',team:raid.opponentTeam});
 battle.makeChoices('team 123','team '+phases.map((_,i)=>i+1).join(''));
 return {battle,raid};
}
function advance(battle:Showdown.Battle,index:number){
 const own=battle.p1.active[0],boss=battle.p2.active[0];
 own.hp=own.maxhp;own.storedStats.spa=100000;own.storedStats.spe=10000;
 boss.hp=1;boss.boosts.spd=-6;
 // A fixture-only deterministic phase KO still uses the real scheduler.
 own.moveSlots[0]={...own.moveSlots[0],id:Showdown.toID('Dark Pulse'),move:'Dark Pulse',pp:30,maxpp:30,disabled:false};
 battle.makeChoices('move 1','move 1');
 assert.equal(battle.requestState,'switch');battle.makeChoices('',`switch ${index+1}`);
}

for(const target of ['Metagross-Mega','Diancie-Mega','Zygarde-Mega','Rayquaza-Mega','Golisopod-Mega','Groudon-Primal','Kyogre-Primal','Necrozma-Ultra'])test(`Raid native transformation: ${target}`,()=>{
 const native=dex.species.get(target),kind=native.isMega?'mega':native.isPrimal?'primal':'ultraBurst';
 const source=target==='Necrozma-Ultra'?'Necrozma-Dusk-Mane':native.baseSpecies;
 const config=phase(target,kind,{sourceSpecies:source});validateRaidPhase(config,native.baseSpecies,dex);
 const {battle}=start([phase(source),config]);
 try{
  advance(battle,1);const boss=battle.p2.active[0];
  assert.equal(boss.species.name,target);assert.equal(boss.getAbility().name,config.ability);
  assert.deepEqual(boss.getTypes(),native.types);assert.equal(boss.hp,boss.maxhp);
  assert.equal(boss.storedStats.atk,battle.statModify(native.baseStats,boss.set,'atk'));
  assert.ok(battle.log.some(l=>l.startsWith('|detailschange|p2')&&l.includes(target)));
  assert.ok(battle.log.some(l=>l.startsWith(native.isMega?'|-mega|':native.isPrimal?'|-primal|':'|-burst|')));
 }finally{battle.destroy();}
});

test('Dawn Wings also reaches Ultra without an equipped item or button',()=>{
 const {battle}=start([phase('Necrozma-Dawn-Wings'),phase('Necrozma-Ultra','ultraBurst',{sourceSpecies:'Necrozma-Dawn-Wings'})]);
 try{advance(battle,1);assert.equal(battle.p2.active[0].species.name,'Necrozma-Ultra');assert.equal(battle.p2.active[0].item,'');}finally{battle.destroy();}
});

test('Terapagos enters Terastal natively, then applies real Stellar Tera state and damage rules',()=>{
 const {battle}=start([phase('Terapagos','none'),phase('Terapagos-Stellar','stellar',{moves:['Tera Starstorm']})]);
 try{
  assert.equal(battle.p2.active[0].species.name,'Terapagos-Terastal');assert.equal(battle.p2.active[0].ability,'terashell');
  assert.ok(!battle.p2.active[0].terastallized);
  advance(battle,1);const boss=battle.p2.active[0];
  assert.equal(boss.species.name,'Terapagos-Stellar');assert.equal(boss.terastallized,'Stellar');assert.equal(boss.ability,'teraformzero');
  assert.ok(battle.log.some(l=>l.startsWith('|-terastallize|p2')&&l.endsWith('|Stellar')));
  const move=battle.dex.getActiveMove('Tera Starstorm');
  battle.singleEvent('ModifyType',move,{},boss,battle.p1.active[0],move,move);
  battle.singleEvent('ModifyMove',move,{},boss,battle.p1.active[0],move,move);
  assert.equal(move.type,'Stellar');assert.equal(move.target,'allAdjacentFoes');
  assert.ok(battle.actions.getDamage(boss,battle.p1.active[0],move));
  assert.throws(()=>validateRaidPhase(phase('Terapagos-Stellar','form'),'Terapagos',dex),/requires battle state/);
 }finally{battle.destroy();}
});

test('persistent Gigantamax retains native HP and G-Max moves past three turns; next phase is clean',()=>{
 const phases=[phase('Snorlax'),phase('Snorlax-Gmax','gigantamax',{persistent:true,moves:['Body Slam']}),phase('Snorlax')];
 const {battle}=start(phases);
 try{
  advance(battle,1);const boss=battle.p2.active[0];
  assert.ok(boss.volatiles.dynamax);assert.equal(boss.gigantamax,true);
  assert.equal(boss.maxhp,boss.baseMaxhp*2);
  assert.equal(boss.getMoveRequestData().maxMoves?.maxMoves[0].move,'gmaxreplenish');
  for(let i=0;i<5;i++){
   const own=battle.p1.active[0];own.hp=own.maxhp;boss.hp=boss.maxhp;
   own.moveSlots[0]={...own.moveSlots[0],id:Showdown.toID('Splash'),move:'Splash',pp:30,maxpp:30};
   battle.makeChoices('move 1','move 1');assert.ok(boss.volatiles.dynamax);
  }
  assert.ok(battle.log.some(l=>l.includes('|G-Max Replenish|')));
  advance(battle,2);const next=battle.p2.active[0];
  assert.equal(next.species.name,'Snorlax');assert.ok(!next.terastallized);assert.equal(next.gigantamax,false);assert.deepEqual(next.volatiles,{});assert.equal(next.maxhp,next.baseMaxhp);
 }finally{battle.destroy();}
 const fresh=start([phase('Snorlax'),phase('Snorlax')]);
 try{assert.deepEqual(fresh.battle.p2.active[0].volatiles,{});}finally{fresh.battle.destroy();}
});

test('nonpersistent Dynamax expires through the ordinary three-turn engine scheduler',()=>{
 const {battle}=start([phase('Snorlax'),phase('Snorlax','dynamax',{moves:['Rest']})]);
 try{
  advance(battle,1);const boss=battle.p2.active[0];assert.ok(boss.volatiles.dynamax);
  for(let i=0;i<3;i++){
   const own=battle.p1.active[0];own.moveSlots[0]={...own.moveSlots[0],id:Showdown.toID('Splash'),move:'Splash',pp:30,maxpp:30};
   battle.makeChoices('move 1','move 1');
  }
  assert.equal(boss.volatiles.dynamax,undefined);assert.equal(boss.maxhp,boss.baseMaxhp);
 }finally{battle.destroy();}
});

test('four phases clear Tera/Dynamax state while forced boss transformations leave player charges alone',()=>{
 const player=Showdown.Teams.unpack(packTeam(['Blastoise','Charizard','Venusaur']))!;player[0].item='Blastoisinite';player[1].item='Charizardite X';
 const {battle}=start([phase('Blastoise'),phase('Blastoise','terastallize',{teraType:'Fire'}),phase('Blastoise-Gmax','gigantamax',{persistent:true,moves:['Body Slam']}),phase('Blastoise-Mega','mega')],Showdown.Teams.pack(player));
 try{
  assert.ok(battle.p1.active[0].canMegaEvo);
  advance(battle,1);assert.equal(battle.p2.active[0].terastallized,'Fire');assert.ok(battle.p1.active[0].canMegaEvo);
  advance(battle,2);assert.ok(!battle.p2.active[0].terastallized);assert.ok(battle.p2.active[0].volatiles.dynamax);
  advance(battle,3);assert.equal(battle.p2.active[0].species.name,'Blastoise-Mega');assert.ok(!battle.p2.active[0].terastallized);assert.deepEqual(battle.p2.active[0].volatiles,{});
  assert.ok(battle.p1.active[0].canMegaEvo);battle.actions.runMegaEvo(battle.p1.active[0]);
  assert.equal(battle.p1.pokemon[1].canMegaEvo,null);assert.equal(battle.p1.active[0].canTerastallize,null);
 }finally{battle.destroy();}
});

for(const [species,move] of [
 ['Hoopa-Unbound','Hyperspace Fury'],['Kyurem-Black','Freeze Shock'],['Kyurem-White','Ice Burn'],
 ['Necrozma-Dusk-Mane','Sunsteel Strike'],['Necrozma-Dawn-Wings','Moongeist Beam'],
 ['Necrozma-Ultra','Sunsteel Strike'],['Necrozma-Ultra','Moongeist Beam'],
] as const)test(`current phase legality and replay: ${species} + ${move}`,async()=>{
 const config=phase(species,species==='Necrozma-Ultra'?'ultraBurst':'form',{moves:[move]});
 const raid=snapshot([config,config]);
 const log=await runBattle({raid,teams:{p1:packTeam(['Mewtwo','Rayquaza','Arceus']),p2:raid.opponentTeam},player:new DamagePolicy(),opponent:new DamagePolicy()});
 assert.ok(log.winner);assert.ok(log.publicProtocol.some(l=>l.includes(species)));
 await replayBattle(log);
});

test('illegal current-form moves and abilities still fail; ordinary battles retain validation',async()=>{
 assert.throws(()=>validateRaidPhase(phase('Kyurem-Black','form',{moves:['Moongeist Beam']}),'Kyurem',dex));
 assert.throws(()=>validateRaidPhase(phase('Hoopa-Unbound','form',{ability:'Pressure'}),'Hoopa',dex));
 const own=Showdown.Teams.unpack(packTeam(['Mew','Blastoise','Venusaur']))!;own[0].moves=['Hyperspace Fury'];
 await assert.rejects(runBattle({teams:{p1:Showdown.Teams.pack(own),p2:packTeam(['Mew','Blastoise','Venusaur'])},player:new DamagePolicy(),opponent:new DamagePolicy()}));
});

for(const config of [phase('Terapagos-Stellar','stellar',{moves:['Tera Starstorm']}),phase('Snorlax-Gmax','gigantamax',{persistent:true,moves:['Body Slam']})])test(`live UI and native playback expose ${config.species} battle state`,async()=>{
 const raid=snapshot([config,config]);
 const session=new BattleSession(async()=>{},[1,2,3,4],{raid,teams:{p1:packTeam(['Mew','Blastoise','Venusaur']),p2:raid.opponentTeam}});
 try{
  const view=await session.ready();assert.equal(view.status,'waiting');
  assert.equal(view.opponent?.displaySpecies,config.species);
  if(config.transformation==='stellar'){
   assert.equal(view.opponent?.terastallized,'Stellar');assert.deepEqual(currentTypes(view.opponent!),['Normal']);
  }else assert.equal(view.opponent?.dynamax,true);
  const before={...structuredClone(view),messages:[],opponent:null};
  const frames=presentationFrames(before,view),state=frames.at(-1)!.view.opponent;
  assert.equal(state?.displaySpecies,config.species);
  assert.equal(state?.terastallized,view.opponent?.terastallized);assert.equal(state?.dynamax,view.opponent?.dynamax);
 }finally{await session.dispose();}
});

test('validated four-phase battle keeps all slots, reaches later states and replays',async()=>{
 const raid=snapshot([phase('Blastoise','form',{moves:['Tackle']}),phase('Blastoise','terastallize',{teraType:'Fire',moves:['Tackle']}),phase('Blastoise-Gmax','gigantamax',{persistent:true,moves:['Tackle']}),phase('Blastoise-Mega','mega',{moves:['Tackle']})]);
 const own=Showdown.Teams.unpack(packTeam(['Mewtwo','Rayquaza','Arceus']))!;for(const p of own)p.moves=['Thunderbolt'];
 const log=await runBattle({raid,teams:{p1:Showdown.Teams.pack(own),p2:raid.opponentTeam},player:new DamagePolicy(),opponent:new DamagePolicy()});
 assert.equal(log.publicProtocol.filter(l=>l.startsWith('|switch|p2')).length,4);
 assert.ok(log.publicProtocol.some(l=>l.startsWith('|-start|p2')&&l.endsWith('|Dynamax|Gmax')));
 assert.ok(log.publicProtocol.some(l=>l.startsWith('|-mega|p2')));await replayBattle(log);
});

test('unversioned saved Raid snapshots retain their original replay path',async()=>{
 const raid=structuredClone(template);delete raid.transformationAdapter;
 const log=await runBattle({raid,teams:{p1:packTeam(['Mewtwo','Rayquaza','Arceus']),p2:raid.opponentTeam},player:new DamagePolicy(),opponent:new DamagePolicy()});
 assert.ok(!log.publicProtocol.some(l=>l.includes('[raid-adapter]')));await replayBattle(log);
});

for(const count of [2,3,4])test(`${count} phases enforce the basic player rule without blocking a forced boss Mega`,()=>{
 const own=Showdown.Teams.unpack(packTeam(['Blastoise','Charizard','Venusaur']))!;own[0].item='Blastoisinite';
 const {battle}=start([...Array.from({length:count-1},()=>phase('Metagross')),phase('Metagross-Mega','mega')],Showdown.Teams.pack(own),'basic');
 try{
  for(let i=0;i<count;i++){
   const player=battle.p1.active[0];
   assert.equal(player.canMegaEvo,null);assert.equal(player.canTerastallize,null);assert.equal(player.canUltraBurst,null);assert.equal(player.getDynamaxRequest(),undefined);
   if(i<count-1)advance(battle,i+1);
  }
  assert.equal(battle.p2.active[0].species.name,'Metagross-Mega');
 }finally{battle.destroy();}
});

test('forced Mega entry activates only the current Phase ability, and battle-local Dex stays isolated',()=>{
 const {battle}=start([phase('Gyarados'),phase('Gyarados-Mega','mega')]);
 try{
  const before=battle.log.filter(l=>l.includes('ability: Intimidate')).length;
  advance(battle,1);assert.equal(battle.p2.active[0].ability,'moldbreaker');
  assert.equal(battle.log.filter(l=>l.includes('ability: Intimidate')).length,before);
  assert.equal(battle.dex.species.get('Golisopod-Mega').abilities[0],'Tough Claws');
  assert.notEqual(Showdown.Dex.species.get('Golisopod-Mega').abilities[0],'Tough Claws');
 }finally{battle.destroy();}
});
