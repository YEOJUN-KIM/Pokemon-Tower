import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {gateBattle} from './raid-gate-fixture';
import {raidFixture} from './raid-fixture';
import {TowerStore} from '../src/server/tower-store';
import {RaidEvents} from '../src/server/raid-events';
import {runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
import {raidBossDefinitions} from '../src/data/raids';

for(const route of ['x','y'])test(`Mewtwo ${route}: half-bar multi-hit gate, one Mega, no Aura/ranks, then KO`,()=>{
 const f=raidFixture(':memory:','final','mewtwo',route),b=gateBattle(f.snapshot);
 try{
  assert.equal(f.snapshot.phases.length,2);assert.equal(b.p2.pokemonLeft,1);
  const boss=b.p2.active[0];
  b.makeChoices('move 1','move 1');
  assert.equal(b.p2.active[0],boss);assert.equal(boss.species.name,route==='x'?'Mewtwo-Mega-X':'Mewtwo-Mega-Y');
  assert.equal(boss.hp,Math.round(boss.maxhp*.5));
  assert.deepEqual([boss.boosts.atk,boss.boosts.spa,boss.boosts.spe],[0,0,0]);
  assert.equal(b.log.filter(l=>l.startsWith('|-mega|p2')).length,1);
  assert.equal(b.log.filter(l=>l.startsWith('|message|')&&/방출|더욱 강해/.test(l)).length,0);
  for(const message of f.snapshot.phases[1].messages!)assert.equal(b.log.filter(l=>l==='|message|'+message).length,1);
  assert.equal(b.log.filter(l=>l.startsWith('|-boost|p2')).length,0);
  b.makeChoices('move 1','move 1');assert.equal(b.winner,'Player');
  assert.equal(b.log.filter(l=>l.startsWith('|switch|p2')).length,4);
 }finally{b.destroy();f.store.close();}
});

test('Zacian Intrepid Sword applies one entry boost, not another at Crowned/synthetic switch',()=>{
 const f=raidFixture(':memory:','sword','zacian','crowned'),b=gateBattle(f.snapshot);
 try{
  const boss=b.p2.active[0],count=()=>b.log.filter(l=>l.startsWith('|-ability|p2')&&l.includes('|Intrepid Sword|boost')).length;
  assert.equal(count(),1);assert.equal(boss.boosts.atk,1);
  b.makeChoices('move 1','move 1');assert.equal(boss.species.name,'Zacian-Crowned');
  assert.equal(count(),1);assert.equal(boss.boosts.atk,1);assert.equal(b.p2.active[0],boss);
  assert.equal(f.snapshot.individual.ivs.atk,0);assert.equal(f.snapshot.individual.ivs.spe,0);
 }finally{b.destroy();f.store.close();}
});

for(const route of ['x','y'])test(`saved Tune2 Mewtwo ${route} still plays all three phases and its original Aura`,()=>{
 const baseline=JSON.parse(readFileSync('tests/fixtures/raid/tune2-definitions.json','utf8'));
 const f=raidFixture(':memory:','saved-old','mewtwo',route),old=structuredClone(f.snapshot);
 old.phases=baseline.definitions.find((d:{id:string})=>d.id==='mewtwo').routes.find((r:{id:string})=>r.id===route).phases;
 const set=Showdown.Teams.unpack(old.opponentTeam)![0];
 old.opponentTeam=Showdown.Teams.pack(old.phases.map(p=>({...structuredClone(set),moves:[...p.moves],item:p.item??''})));
 const b=gateBattle(old);
 try{
  b.makeChoices('move 1','move 1');b.makeChoices('move 1','move 1');
  assert.equal(b.p2.active[0].boosts[route==='x'?'atk':'spa'],1);
  assert.equal(b.p2.active[0].boosts.spe,0);
  assert.ok(b.log.some(l=>l.startsWith('|message|')&&l.includes('힘을 방출')));
 }finally{b.destroy();f.store.close();}
});

for(const [boss,route] of [['mewtwo','x'],['mewtwo','y'],['zacian','crowned']])test(`${boss}/${route} final snapshot survives disk reload and native replay`,async()=>{
 const path=`.data/tests/raid-final-${randomUUID()}.sqlite`,f=raidFixture(path,'final-replay',boss,route);
 let store=f.store;
 try{
  store.chooseEvent(f.owner,f.run,f.event.id,'challenge');const id=store.currentBattle(f.owner)!.id;
  const raw=store.db.prepare('SELECT snapshot_json FROM raid_encounters WHERE event_id=?').get(f.event.id)!.snapshot_json;
  store.close();store=new TowerStore(path);
  const events=new RaidEvents(store.db),snapshot=events.snapshot(events.forBattle(id)!);
  assert.equal(JSON.stringify(snapshot),raw);assert.equal(snapshot.phases.length,2);
  const row=store.battle(id),log=await runBattle({raid:snapshot,teams:{p1:row.player_team,p2:row.opponent_team},seed:JSON.parse(row.seed),format:row.format,rule:row.rule,player:new DamagePolicy(),opponent:new DamagePolicy()});
  assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
 }finally{store.close();}
});

test('only Mewtwo phases and Zacian battle IV/training differ from Tune2 definitions',()=>{
 const baseline=JSON.parse(readFileSync('tests/fixtures/raid/tune2-definitions.json','utf8'));
 for(const boss of raidBossDefinitions){
  const before=baseline.definitions.find((b:{id:string})=>b.id===boss.id),after=structuredClone(boss);
  if(boss.id==='mewtwo'){
   assert.equal(after.battleTraining,before.battleTraining);assert.deepEqual(after.ivRule,before.ivRule);
   for(let i=0;i<after.routes.length;i++)after.routes[i].phases=before.routes[i].phases;
  }else if(boss.id==='zacian'){after.ivRule=before.ivRule;after.battleTraining=before.battleTraining;}
  assert.deepEqual(after,before);
 }
});
