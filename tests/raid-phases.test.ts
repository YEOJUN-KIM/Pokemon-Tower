import test from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {installRaid} from '../src/battle/raid';
import {raidFixture} from './raid-fixture';
import {FORMAT} from '../src/data/battle-rules';
import {packTeam} from '../src/data/teams';
import {describeLine} from '../src/web/catalog';

for(const [bossId,routeId] of [['garchomp','mega'],['mewtwo','x'],['mewtwo','y']])for(const fast of [true,false])test(`${bossId}/${routeId} ${fast?'player':'boss'} first: real simulator phase break, clean boss, cumulative player`,()=>{
 const f=raidFixture(':memory:','phase',bossId,routeId);
 const battle=new Showdown.Battle({formatid:FORMAT,seed:'1,2,3,4'});
 try{
  installRaid(battle,f.snapshot);
  const own=Showdown.Teams.unpack(packTeam(['Cloyster','Blastoise','Venusaur']))!;
  own[0].moves=['Icicle Spear'];own[0].ability='Skill Link';
  battle.setPlayer('p1',{name:'Player',team:Showdown.Teams.pack(own)});
  battle.setPlayer('p2',{name:'Tower AI',team:f.snapshot.opponentTeam});
  battle.makeChoices('team 123',f.snapshot.phases.length===2?'team 12':'team 123');
  const player=battle.p1.active[0];player.hp-=20;const startHP=player.hp;
  for(const hazard of ['Stealth Rock','Spikes','Toxic Spikes','Sticky Web'])battle.p2.addSideCondition(hazard,player);
  player.boosts.def=2;player.setStatus('brn');
  // Burn chip is normal end-of-turn damage; the adapter never clears it.
  for(let index=0;index<f.snapshot.phases.length-1;index++){
   const boss=battle.p2.active[0];assert.equal(boss.species.name,f.snapshot.phases[index].species);
   boss.hp=1;boss.boosts.def=-6;boss.boosts.accuracy=-6;boss.setStatus('par');
   player.storedStats.spe=fast?10000:1;boss.storedStats.spe=fast?1:10000;
   const pressure=boss.getAbility().id==='pressure';
   const pp=player.moveSlots[0].pp,turn=battle.turn,logStart=battle.log.length;
   // Always choose a damaging move, avoiding setup randomness in the mechanic fixture.
   battle.makeChoices('move 1','move 1');
   const chunk=battle.log.slice(logStart);
   const moves=chunk.filter(l=>l.startsWith('|move|p2'));
   assert.equal(moves.length,fast?0:1,'old phase has at most its already-completed action');
   assert.ok(chunk.some(l=>l.startsWith('|-hitcount|p2')&&l.endsWith('|1')),'multi-hit stops at phase KO');
   assert.ok(boss.fainted);assert.equal(player.moveSlots[0].pp,pp-(pressure?2:1));
   assert.equal(battle.requestState,'switch');
   battle.makeChoices('',`switch ${index+2}`);
   const next=battle.p2.active[0];
   assert.equal(next.species.name,f.snapshot.phases[index+1].species);
   assert.equal(next.hp,next.maxhp);assert.equal(next.status,'');assert.deepEqual(next.volatiles,{});
   assert.equal(next.boosts.def,0);assert.equal(next.boosts.accuracy,0);
   assert.equal(next.boosts.atk,f.snapshot.phases[index+1].buffs?.atk??0);
   assert.equal(next.boosts.spa,f.snapshot.phases[index+1].buffs?.spa??0);
   assert.equal(next.boosts.spe,f.snapshot.phases[index+1].buffs?.spe??0);
   assert.equal(player.status,'brn');assert.equal(player.boosts.def,2);assert.ok(player.hp<=startHP);
   assert.ok(battle.turn>turn);assert.equal(battle.log.slice(logStart).filter(l=>l.startsWith('|move|p2')).length,moves.length,'new boss cannot attack during transition');
   const phaseMessages=battle.log.slice(logStart).filter(l=>l.startsWith('|message|')).map(l=>l.slice(9));
   assert.deepEqual(phaseMessages,f.snapshot.phases[index+1].messages);
   assert.equal(battle.log.slice(logStart).filter(l=>l.includes('[raid]')&&describeLine(l)!==null).length,0);
   // Later turns re-evaluate the freshly installed form's speed.
  }
  const final=battle.p2.active[0];final.hp=1;final.boosts.def=-6;player.storedStats.spe=10000;
  battle.makeChoices('move 1','move 1');assert.equal(battle.winner,'Player');
 }finally{battle.destroy();f.store.close();}
});
