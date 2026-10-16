import {useVitaminReward,vitaminBonus} from './reward-inventory-fixture';
import test from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {TowerService} from '../src/server/tower-service';
import {starters,packTeam} from '../src/data/teams';
import {DamagePolicy} from '../src/battle/policy';
import {runBattle,replayBattle} from '../src/battle/run';
import {installBattleItems} from '../src/battle/battle-items';

test('battle items respect rank caps, forced replacement, Contrary and guard/critical switch resets',()=>{
 const events=new Map<string,Function>(),pokemon={fainted:false,boosts:{atk:6},hasAbility:(name:string)=>name==='contrary'&&contrary};let contrary=false;
 const battle:any={format:{},p1:{requestState:'move',active:[pokemon]},onEvent:(name:string,_format:unknown,fn:Function)=>events.set(name,fn),add:()=>{},sendUpdates:()=>{},boost:()=>{}};
 const items=installBattleItems(battle,{attack:2,guard:2,critical:2});assert.ok(!items.legal().includes('attack'));
 contrary=true;assert.ok(items.legal().includes('attack'));pokemon.boosts.atk=-6;assert.ok(!items.legal().includes('attack'));
 battle.p1.requestState='switch';assert.deepEqual(items.legal(),[]);assert.throws(()=>items.use('guard'));assert.equal(items.bag.guard,2);
 battle.p1.requestState='move';items.use('guard');items.use('critical');assert.ok(!items.legal().includes('guard'));assert.ok(!items.legal().includes('critical'));
 const boosts={atk:-1};events.get('TryBoost')!(boosts,pokemon,{});assert.equal(boosts.atk,0);assert.equal(events.get('ModifyCritRatio')!(1,pokemon),2);
 events.get('SwitchOut')!(pokemon);assert.equal(events.get('ModifyCritRatio')!(1,pokemon),1);const later={atk:-1};events.get('TryBoost')!(later,pokemon,{});assert.equal(later.atk,-1);assert.ok(items.legal().includes('guard'));
});

test('free battle items consume stock, raise a native rank, preserve the turn and reset on switching with exact replay',async()=>{
 let step=0,rankAfter=false,reset=false;const attack=new DamagePolicy();
 const log=await runBattle({teams:{p1:packTeam(starters),p2:packTeam(['Snorlax','Golem','Pikachu'])},battleItems:{attack:1},seed:[1,2,3,4],player:{choose:o=>{
   if(o.legalActions[0]?.command.startsWith('team '))return 'team 123';
   if(step++===0)return 'item attack';
   if(step===2){assert.equal(o.turn,1);assert.ok(!o.legalActions.some(a=>a.command==='item attack'));return 'switch 2';}
   return attack.choose(o);
 }},opponent:attack,onPublicLine:line=>{if(line.startsWith('|-boost|p1')&&line.includes('|atk|1'))rankAfter=true;if(rankAfter&&line.startsWith('|switch|p1')&&line.includes('Venusaur'))reset=true;}});
 assert.ok(rankAfter&&reset);assert.equal(log.decisions.filter(d=>d.action==='item attack').length,1);await replayBattle(log);
});
test('item journal, inventory and current boosts survive reconstruction without a second deduction',async()=>{
 const store=new TowerStore(':memory:');let service=new TowerService(store);try{
  store.ensurePlayer('p');const id=store.battle(store.start('p',starters)).run_id;
  store.db.prepare("UPDATE runs SET floor=11,state='select' WHERE id=?").run(id);store.db.prepare('UPDATE players SET coins=10000 WHERE id=?').run('p');
  store.db.prepare('INSERT INTO consumable_shops VALUES (?,?,?)').run(id,11,JSON.stringify(['attack','speed','guard']));
  store.purchase('p',id,11,'attack');store.purchase('p',id,11,'attack');assert.equal(store.view('p').run!.battleItems!.attack,2);assert.deepEqual(store.view('p').run!.upgrades,[]);
  const battle=store.enter('p',id,11,starters),before=await service.state('p');
  const used=await service.action('p',battle,before.battle!.requestId,'item attack');
  assert.equal(used.battle!.turn,before.battle!.turn);assert.equal(used.battle!.field!.boosts!.p1.atk,1);assert.equal(used.tower.run!.battleItems!.attack,1);
  await assert.rejects(()=>service.action('p',battle,before.battle!.requestId,'item attack'),/행동/);
  await service.dispose();service=new TowerService(store);const restored=await service.state('p');assert.equal(restored.battle!.field!.boosts!.p1.atk,1);assert.equal(restored.tower.run!.battleItems!.attack,1);
  const switched=await service.action('p',battle,restored.battle!.requestId,'switch 2');assert.equal(switched.battle!.field!.boosts!.p1.atk??0,0);
 }finally{await service.dispose();store.close();}
});
test('maintenance saves current legal moves and permanent settings atomically, charges growth and preserves vitamins',()=>{
 const store=new TowerStore(':memory:');try{
  store.ensurePlayer('p');const id=store.battle(store.start('p',starters)).run_id;
  store.db.prepare("UPDATE runs SET floor=11,state='select' WHERE id=?").run(id);store.db.prepare('UPDATE players SET coins=10000,growth_points=100 WHERE id=?').run('p');
  const vitamin={stat:'spa' as const};useVitaminReward(store,'p',id,11,vitamin.stat,'Charizard');
  const adjustment=store.view('p').run!.adjustment!,entry=adjustment.entries.find(e=>e.species==='Charizard')!,draft=structuredClone(entry.profile);draft.evs.atk=8;draft.moves[0]=entry.unlockedMoves.find(m=>!draft.moves.includes(m))!;
  store.train('p','Charizard',entry.revision,draft,{id,floor:11,snapshot:adjustment.snapshot});assert.equal(store.view('p').growthPoints,92);assert.equal(store.trainingCollection('p').find(e=>e.species==='Charizard')!.profile.evs.atk,8);assert.deepEqual(store.view('p').run!.currentMoves.Charizard,draft.moves);assert.equal(vitaminBonus(store,id,'Charizard',vitamin.stat),5);
  assert.throws(()=>store.train('p','Charizard',entry.revision,draft,{id,floor:11,snapshot:adjustment.snapshot}),/변경/);assert.equal(store.view('p').growthPoints,92);
  const fresh=store.view('p').run!.adjustment!,saved=fresh.entries.find(e=>e.species==='Charizard')!;
  const request={id,floor:11,snapshot:fresh.snapshot},invalid=structuredClone(saved.profile);invalid.ivs.atk++;
  const unchanged=store.view('p');assert.throws(()=>store.train('p','Charizard',saved.revision,invalid,request));assert.deepEqual(store.view('p'),unchanged);
  assert.throws(()=>store.train('p','Charizard',saved.revision,saved.profile,{...request,floor:12}),/정비/);assert.deepEqual(store.view('p'),unchanged);
  store.db.prepare('UPDATE players SET growth_points=0 WHERE id=?').run('p');const expensive=structuredClone(saved.profile);expensive.evs.atk++;
  assert.throws(()=>store.train('p','Charizard',saved.revision,expensive,request),/부족/);assert.equal(store.trainingCollection('p').find(e=>e.species==='Charizard')!.revision,saved.revision);assert.equal(store.view('p').run!.adjustment!.snapshot,fresh.snapshot);
  const battle=store.enter('p',id,11,starters),team=Showdown.Teams.unpack(store.battle(battle).player_team)!;assert.deepEqual(team[0].moves.map(m=>Showdown.Dex.moves.get(m).name),draft.moves);assert.equal(team[0].evs!.atk,8);
 }finally{store.close();}
});
