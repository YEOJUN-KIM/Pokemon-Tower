import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {registerHooks} from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {BattleSession} from '../src/server/battle-session';
import {packTeam,packPlayerTeam,starters} from '../src/data/teams';
import {runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
import {itemShopRule} from '../src/data/held-item-shop';
import type {TrainerEquipment} from '../src/data/trainer-equipment';

function teams(){
 const p1=Showdown.Teams.unpack(packTeam(starters,{},{Charizard:'Leftovers',Blastoise:'Sitrus Berry',Venusaur:'Life Orb'}))!;
 p1.forEach(p=>p.moves=['Protect','Rest']);
 const p2=Showdown.Teams.unpack(packTeam(['Snorlax','Shuckle','Blissey']))!;p2.forEach(p=>p.moves=['Rest']);
 return {p1:Showdown.Teams.pack(p1),p2:Showdown.Teams.pack(p2)};
}

test('equipment purchases occupy no Pokemon slot, coexist, persist, and reject duplicates and equipment forging',()=>{
 const store=new TowerStore(':memory:');try{
  store.ensurePlayer('equipment');const first=store.battle(store.start('equipment',starters)),id=first.run_id;
  assert.deepEqual(store.trainerEquipment(id),[]);assert.equal(store.view('equipment').run!.teraShop,null);
  store.db.prepare("UPDATE runs SET state='select',floor=11 WHERE id=?").run(id);
  store.db.prepare('UPDATE players SET coins=20000 WHERE id=?').run('equipment');
  store.db.prepare('INSERT OR REPLACE INTO item_shops VALUES (?,?,?)').run(id,11,JSON.stringify(['Dynamax Band','Tera Orb','Leftovers','Sitrus Berry']));
  for(const item of ['Dynamax Band','Tera Orb'] as const){
   assert.equal(itemShopRule(item).rarity,'legendary');
   assert.throws(()=>store.purchaseItem('equipment',id,11,item,'Charizard'),/트레이너/);
   store.purchaseItem('equipment',id,11,item,null);
   const paid=store.view('equipment').coins;store.purchaseItem('equipment',id,11,item,null);assert.equal(store.view('equipment').coins,paid);
   assert.throws(()=>store.equipItem('equipment',id,11,'Charizard',item),/트레이너/);
  }
  assert.deepEqual(store.trainerEquipment(id),['Dynamax Band','Tera Orb']);
  assert.deepEqual(store.view('equipment').run!.heldItems,{});assert.deepEqual(store.view('equipment').run!.itemBag,{});
  assert.equal(store.view('equipment').coins,10000);
  const battle=store.battle(store.enter('equipment',id,11,starters));
  assert.deepEqual(JSON.parse(battle.trainer_equipment!),['Dynamax Band','Tera Orb']);
  assert.ok(Showdown.Teams.unpack(battle.player_team)!.every(p=>!p.item));
  assert.ok(Showdown.Teams.unpack(battle.player_team)!.every(p=>p.gigantamax));
  assert.equal(JSON.parse(battle.tera_tickets).p1,0);
 }finally{store.close();}
});

for(const [item,suffix]of [['Dynamax Band','dynamax'],['Tera Orb','terastallize']] as const)test(`${item} is usable by any eligible partner with a held item, once per battle`,async()=>{
 const equipment:TrainerEquipment[]=[item],options={teams:teams(),trainerEquipment:equipment,teraTickets:{p1:0,p2:0},rule:'chaos' as const};
 const session=new BattleSession(async()=>{},[1,2,3,4],options);
 try{
  const first=await session.ready();assert.ok(first.actions.some(a=>a.command.endsWith(' '+suffix)));
  const second=await session.submit(first.id,first.requestId,'switch 2');assert.ok(second.actions.some(a=>a.command.endsWith(' '+suffix)));
  const used=await session.submit(second.id,second.requestId,'move 1 '+suffix);
  const bench=await session.submit(used.id,used.requestId,'switch 3');assert.ok(!bench.actions.some(a=>a.command.endsWith(' '+suffix)));
  assert.deepEqual(bench.trainerEquipment,equipment);
  const next=new BattleSession(async()=>{},[1,2,3,4],options);try{assert.ok((await next.ready()).actions.some(a=>a.command.endsWith(' '+suffix)));}finally{await next.dispose();}
 }finally{await session.dispose();}
});

test('absent equipment cannot be bypassed by old tickets or a held band in a new battle',async()=>{
 const session=new BattleSession(async()=>{},[1,2,3,4],{teams:teams(),trainerEquipment:[],teraTickets:{p1:9,p2:0}});
 try{const view=await session.ready();assert.ok(!view.actions.some(a=>/ (dynamax|terastallize)$/.test(a.command)));}finally{await session.dispose();}
});

test('old inventory migrates once while the active battle stays frozen',()=>{
 const path=`.data/tests/trainer-equipment-${randomUUID()}.sqlite`;let store=new TowerStore(path);let id:string,packed:string;
 try{
  store.ensurePlayer('migration');const row=store.battle(store.start('migration',starters));id=row.run_id;packed=row.player_team;
  store.db.prepare('INSERT INTO run_held_items VALUES (?,?,?)').run(id,'Charizard','Dynamax Band');
  store.db.prepare('UPDATE run_tera_tickets SET quantity=2 WHERE run_id=?').run(id);
  store.db.prepare('UPDATE battles SET trainer_equipment=NULL WHERE id=?').run(row.id);
  store.db.exec('PRAGMA user_version=28');store.close();store=new TowerStore(path);
  assert.deepEqual(store.trainerEquipment(id),[]);
  assert.deepEqual(store.view('migration').run!.heldItems,{});
  assert.equal(store.battle(row.id).player_team,packed);assert.equal(store.battle(row.id).trainer_equipment,null);
  store.close();store=new TowerStore(path);assert.deepEqual(store.trainerEquipment(id),[]);
  assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{store.close();}
});

test('equipment capability is recorded and deterministic battle replay preserves it',async()=>{
 const log=await runBattle({teams:{p1:packTeam(starters),p2:packTeam(['Unown','Luvdisc','Delibird'])},trainerEquipment:['Dynamax Band','Tera Orb'],teraTickets:{p1:0,p2:0},player:new DamagePolicy(),opponent:new DamagePolicy(),seed:[1,2,3,4]});
 const replay=await replayBattle(log);assert.deepEqual(battleEvents(replay.publicProtocol),battleEvents(log.publicProtocol));
 assert.deepEqual(replay.trainerEquipment,['Dynamax Band','Tera Orb']);
});


test('v29 repair removes automatically granted equipment but preserves actual purchases and battle history',()=>{
 const path=`.data/tests/trainer-equipment-repair-${randomUUID()}.sqlite`;let store=new TowerStore(path);
 try{
  store.ensurePlayer('unpaid');const unpaid=store.battle(store.start('unpaid',starters));
  store.ensurePlayer('paid');const paid=store.battle(store.start('paid',starters));
  for(const row of [unpaid,paid]){
   for(const item of ['Dynamax Band','Tera Orb'])store.db.prepare('INSERT INTO run_trainer_equipment VALUES (?,?)').run(row.run_id,item);
   store.db.prepare('UPDATE battles SET trainer_equipment=? WHERE id=?').run('["Dynamax Band","Tera Orb"]',row.id);
  }
  store.db.prepare('INSERT INTO item_purchases VALUES (?,?,?)').run(paid.run_id,11,'Dynamax Band');
  store.db.prepare('INSERT INTO shop_receipts VALUES (?,?,?,?,?,?)').run(paid.run_id,11,'items',0,'Dynamax Band',null);
  store.db.prepare('INSERT INTO item_purchases VALUES (?,?,?)').run(unpaid.run_id,11,'Dynamax Band');
  store.db.prepare('INSERT INTO shop_receipts VALUES (?,?,?,?,?,?)').run(unpaid.run_id,11,'items',0,'Dynamax Band','Charizard');
  store.db.prepare('INSERT INTO shop_receipts VALUES (?,?,?,?,?,?)').run(paid.run_id,11,'items',1,'Tera Orb',null);
  const frozen=store.battle(unpaid.id);
  store.db.exec('PRAGMA user_version=29');store.close();store=new TowerStore(path);
  assert.deepEqual(store.trainerEquipment(unpaid.run_id),[]);
  assert.deepEqual(store.trainerEquipment(paid.run_id),['Dynamax Band','Tera Orb']);
  assert.deepEqual(store.battle(unpaid.id),frozen);
  assert.throws(()=>store.input('unpaid',unpaid.id,1,'move 1 dynamax'),/구매/);
  assert.throws(()=>store.input('unpaid',unpaid.id,1,'move 1 terastallize'),/구매/);
  assert.deepEqual(store.history(unpaid.id),[]);
  store.close();store=new TowerStore(path);
  assert.deepEqual(store.trainerEquipment(unpaid.run_id),[]);
  assert.deepEqual(store.trainerEquipment(paid.run_id),['Dynamax Band','Tera Orb']);
 }finally{store.close();}
});


test('trainer band with a held Mega Stone keeps the team valid and restores accepted switches',async()=>{
 const own=packPlayerTeam(['Gengar','Charizard','Blastoise'],{},{Gengar:'Gengarite'},true);
 const unpacked=Showdown.Teams.unpack(own)!;
 assert.ok(!unpacked[0].gigantamax);assert.ok(unpacked[1].gigantamax);assert.ok(unpacked[2].gigantamax);
 const enemy=Showdown.Teams.unpack(packTeam(['Snorlax','Shuckle','Blissey']))!;enemy.forEach(p=>p.moves=['Rest']);
 const session=new BattleSession(async()=>{},[1,2,3,4],{teams:{p1:own,p2:Showdown.Teams.pack(enemy)},rule:'chaos',trainerEquipment:['Dynamax Band','Tera Orb'],history:['switch 2','switch 2']});
 try{const view=await session.ready();assert.equal(view.status,'waiting');assert.equal(view.error,null);assert.ok(view.actions.some(a=>a.command.endsWith(' mega')));assert.ok(view.actions.some(a=>a.command.endsWith(' dynamax')));}finally{await session.dispose();}
});


test('trainer equipment offers ordinary Dynamax and Tera with a Z crystal, and Mega/G-Max/Tera with Gengarite',async()=>{
 const sets=Showdown.Teams.unpack(packPlayerTeam(['Garchomp','Blastoise','Gengar'],{},{Garchomp:'Rockium Z',Gengar:'Gengarite'},true))!;
 sets.forEach(p=>p.moves=['Protect','Rest']);
 const enemy=Showdown.Teams.unpack(packTeam(['Snorlax','Shuckle','Blissey']))!;enemy.forEach(p=>p.moves=['Rest']);
 const options={teams:{p1:Showdown.Teams.pack(sets),p2:Showdown.Teams.pack(enemy)},rule:'chaos' as const,trainerEquipment:['Dynamax Band','Tera Orb'] as const};
 for(const history of [[],['switch 3']]){
  const session=new BattleSession(async()=>{},[1,2,3,4],{...options,history});
  try{const view=await session.ready();assert.equal(view.error,null);assert.ok(view.actions.some(a=>a.command.endsWith(' dynamax')));assert.ok(view.actions.some(a=>a.command.endsWith(' terastallize')));if(history.length)assert.ok(view.actions.some(a=>a.command.endsWith(' mega')));}
  finally{await session.dispose();}
 }
 const ordinary=new BattleSession(async()=>{},[1,2,3,4],{...options,history:['move 1 dynamax']});
 try{const view=await ordinary.ready();assert.equal(view.error,null);assert.ok(view.team.find(p=>p.active)?.dynamax);assert.equal(view.team.find(p=>p.active)?.displaySpecies,'Garchomp');}finally{await ordinary.dispose();}
 for(const gimmick of ['mega','dynamax','terastallize']){
  const session=new BattleSession(async()=>{},[1,2,3,4],{...options,history:['switch 3',`move 1 ${gimmick}`]});
  try{const view=await session.ready();assert.equal(view.error,null);if(gimmick==='dynamax')assert.equal(view.team.find(p=>p.active)?.displaySpecies,'Gengar-Gmax');if(gimmick==='mega')assert.ok(view.messages.some(line=>line.includes('Gengar-Mega')));assert.ok(!view.actions.some(a=>/ (mega|dynamax|terastallize)$/.test(a.command)));}finally{await session.dispose();}
 }
});


test('Garchomp Tera and Blaziken Mega leave Gengar G-Max available and its spent Mega button visible',async()=>{
 const own=Showdown.Teams.unpack(packPlayerTeam(['Garchomp','Gengar','Blaziken'],{},{Garchomp:'Rockium Z',Gengar:'Gengarite',Blaziken:'Blazikenite'},true))!;own.forEach(p=>p.moves=['Protect','Rest']);
 const enemy=Showdown.Teams.unpack(packTeam(['Snorlax','Shuckle','Blissey']))!;enemy.forEach(p=>p.moves=['Rest']);
 const options={teams:{p1:Showdown.Teams.pack(own),p2:Showdown.Teams.pack(enemy)},rule:'chaos' as const,trainerEquipment:['Dynamax Band','Tera Orb'] as const};
 const session=new BattleSession(async()=>{},[1,2,3,4],{...options,history:['move 1 terastallize','switch 3','move 1 mega','switch 2']});
 try{
  let view=await session.ready();assert.equal(view.error,null);assert.equal(view.team.find(p=>p.active)?.species,'Gengar');
  assert.ok(view.actions.some(a=>a.command.endsWith(' dynamax')));assert.ok(!view.actions.some(a=>/ (mega|terastallize)$/.test(a.command)));
  const hooks=registerHooks({load(url,context,next){return url.endsWith('.css')?{format:'module',source:'export default {}',shortCircuit:true}:next(url,context);}});
  let html:string;
  try{
   const {BattleCommands}=await import('../src/web/battle-commands');
   html=renderToStaticMarkup(createElement(BattleCommands,{battle:view,equipment:options.trainerEquipment,rule:'chaos',mode:'moves',busy:false,forceSwitch:false,focused:'move 1',gimmick:null,onGimmick:()=>{},onMode:()=>{},onFocus:()=>{},onSend:()=>{}}));
  }finally{hooks.deregister();}
  const buttons=html.match(/<button[^>]*>/g)!;assert.match(buttons.find(b=>b.includes('data-gimmick="mega"'))!,/disabled/);assert.doesNotMatch(buttons.find(b=>b.includes('data-gimmick="dynamax"'))!,/disabled/);
  view=await session.submit(view.id,view.requestId,'move 1 dynamax');assert.equal(view.error,null);assert.equal(view.team.find(p=>p.active)?.displaySpecies,'Gengar-Gmax');
 }finally{await session.dispose();}
 const reverse=new BattleSession(async()=>{},[1,2,3,4],{...options,history:['move 1 dynamax','switch 3']});
 try{const view=await reverse.ready();assert.equal(view.error,null);assert.ok(view.actions.some(a=>a.command.endsWith(' mega')));assert.ok(!view.actions.some(a=>a.command.endsWith(' dynamax')));}finally{await reverse.dispose();}
});


test('Z commits only its user for the whole battle; switching and D-Max expiry cannot unlock another gimmick',async()=>{
 const own=Showdown.Teams.unpack(packPlayerTeam(['Garchomp','Gengar','Blastoise'],{},{Garchomp:'Rockium Z',Gengar:'Gengarite'},true))!;
 own.forEach(p=>p.moves=['Protect','Rest']);own[0].moves=['Protect','Stone Edge','Rest','Tackle'];
 const enemy=Showdown.Teams.unpack(packTeam(['Snorlax','Shuckle','Blissey']))!;enemy.forEach(p=>p.moves=['Rest']);
 const options={teams:{p1:Showdown.Teams.pack(own),p2:Showdown.Teams.pack(enemy)},rule:'chaos' as const,trainerEquipment:['Dynamax Band','Tera Orb'] as const};
 for(const history of [['move 2 zmove'],['move 2 zmove','switch 2','switch 2'],['move 1 dynamax','move 1','move 1']]){
  const session=new BattleSession(async()=>{},[1,2,3,4],{...options,history});
  try{
   let view=await session.ready();assert.equal(view.error,null);assert.equal(view.team.find(p=>p.active)?.species,'Garchomp');
   if(history[0].endsWith('zmove'))assert.ok(view.messages.some(line=>line.startsWith('|-zpower|p1a:')));
   else assert.ok(!view.team.find(p=>p.active)?.dynamax);
   assert.ok(!view.actions.some(a=>/ (zmove|mega|dynamax|terastallize)$/.test(a.command)));
   assert.throws(()=>session.submit(view.id,view.requestId,'move 1 terastallize'),/선택할 수 없는/);
   view=await session.submit(view.id,view.requestId,'switch 2');assert.equal(view.error,null);
   assert.ok(view.actions.some(a=>a.command.endsWith(' mega')));assert.ok(view.actions.some(a=>a.command.endsWith(' terastallize')));
   assert.equal(view.actions.some(a=>a.command.endsWith(' dynamax')),history[0].endsWith('zmove'));
  }finally{await session.dispose();}
 }
 const fresh=new BattleSession(async()=>{},[1,2,3,4],options);
 try{const view=await fresh.ready();for(const kind of ['zmove','dynamax','terastallize'])assert.ok(view.actions.some(a=>a.command.endsWith(' '+kind)));}finally{await fresh.dispose();}
});
