import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {existsSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {villainOrganizations,villainEncounter,villainRankWeights} from '../src/data/villain-organizations';
import {generateOpponentTeam,encounterPool} from '../src/server/opponent-team';
import {packTeam,starters} from '../src/data/teams';
import {FORMAT} from '../src/battle/run';
import {floors} from '../src/data/floors';
import {findVillainBattle,villainResult} from './helpers/villain';

test('rank draws respect floor gates, organization, milestones, consecutive exclusion and ended state',()=>{
 const seen=new Set<string>();
 for(const group of villainOrganizations)for(let run=0;run<400;run++)for(let floor=1;floor<=100;floor++){
  const id=`campaign-${run}`,event=villainEncounter(id,floor,group.id);
  assert.equal(villainEncounter(id,floor,group.id,true),null);assert.equal(villainEncounter(id,floor,group.id,false,true),null);
  if(floor%5===0)assert.equal(event,null);
  if(!event)continue;
  assert.deepEqual(event,villainEncounter(id,floor,group.id));assert.equal(event.event.organization,group.id);
  assert.equal(event.sample.role,'villain');assert.ok(event.sample.title.startsWith(group.name));
  assert.ok(event.event.rank!=='executive' || floor>=16);assert.ok(event.event.rank!=='boss' || floor>=75);
  seen.add(`${group.id}:${event.event.rank}`);
 }
 assert.equal(seen.size,30);
 for(const floor of [1,15,16,30,31,50,74,75,100])assert.equal(Object.values(villainRankWeights(floor)).reduce((a,b)=>a+b,0),1);
});

test('all ten executive and boss teams retain their ace, distinct tools, legal moves and available portraits',()=>{
 const validator=new Showdown.TeamValidator(FORMAT);
 for(const group of villainOrganizations)for(const rank of ['executive','boss'] as const){
  let sample;
  for(let i=0;i<2000&&!sample;i++)for(let floor=rank==='boss'?75:16;floor<100;floor++){
   const event=villainEncounter(`roster-${i}`,floor,group.id);if(event?.event.rank===rank){sample=event.sample;break;}
  }
  assert.ok(sample);assert.ok(existsSync(`public/sprites/trainers/${sample.portrait}.png`));
  const floor=rank==='boss'?75:16;assert.ok(sample.entries!.every(name=>encounterPool(floor).includes(name)));
  for(let seed=1;seed<=3;seed++){
   const team=generateOpponentTeam(floor,[seed,2,3,4],[],null,sample),sets=Showdown.Teams.unpack(packTeam(team.map(p=>p.name)))!;
   assert.ok(team.some(p=>p.name===sample.ace));assert.equal(new Set(team.map(p=>p.item)).size,3);
   sets.forEach((set,i)=>{set.moves=team[i].moves;set.item=team[i].item!;if(team[i].ability)set.ability=team[i].ability!;});
   assert.equal(validator.validateTeam(sets),null,`${group.id}:${rank}`);
  }
 }
});

test('boss victory pays the frozen bonus once, ends only that run and survives reopening',async()=>{
 const path=`.data/tests/${randomUUID()}.sqlite`;let store=new TowerStore(path);
 try{
  const row=findVillainBattle(store,'boss','boss'),event=JSON.parse(row.villain_event!);
  assert.equal(row.reward,floors[row.floor-1].reward+1000);assert.equal(store.view('boss').run!.villainEvent!.ended,false);
  const {log,view}=await villainResult(store,row.id);assert.equal(log.winner,'Player');
  const before=store.view('boss').coins;store.complete(row.id,log,view);store.complete(row.id,log,view);
  assert.equal(store.view('boss').coins,before+row.reward);assert.equal(store.view('boss').run!.villainEvent!.ended,true);
  store.close();store=new TowerStore(path);assert.equal(store.view('boss').run!.villainEvent!.ended,true);
  store.recruit('boss',row.run_id,row.id,null,null);
  for(let floor=row.floor+1;floor<=100;floor++){
   store.db.prepare("UPDATE runs SET state='select',floor=? WHERE id=?").run(floor,row.run_id);
   const next=store.battle(store.enter('boss',row.run_id,floor,starters));assert.equal(next.villain_event,null);
   assert.notEqual(next.trainer && JSON.parse(next.trainer).role,'villain');
  }
  store.abandon('boss',row.run_id);const next=store.battle(store.start('boss',starters));
  assert.equal(store.db.prepare('SELECT defeated_battle_id FROM run_villain_campaigns WHERE run_id=?').get(next.run_id)!.defeated_battle_id,null);
  assert.equal(event.bonus,1000);assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{store.close();}
});

test('executive victory pays 250 extra without ending the campaign; boss loss pays nothing',async()=>{
 const store=new TowerStore(':memory:');try{
  const executive=findVillainBattle(store,'exec','executive');assert.equal(executive.reward,floors[executive.floor-1].reward+250);
  const won=await villainResult(store,executive.id);assert.equal(won.log.winner,'Player');store.complete(executive.id,won.log,won.view);
  assert.equal(store.view('exec').coins,executive.reward);assert.equal(store.view('exec').run!.villainEvent!.ended,false);
  const boss=findVillainBattle(store,'loss','boss'),lost=await villainResult(store,boss.id,false);assert.equal(lost.log.winner,'Tower AI');
  store.complete(boss.id,lost.log,lost.view);assert.equal(store.view('loss').coins,0);
  assert.equal(store.db.prepare('SELECT defeated_battle_id FROM run_villain_campaigns WHERE run_id=?').get(boss.run_id)!.defeated_battle_id,null);
 }finally{store.close();}
});

test('reward failure rolls back boss defeat and completion atomically',async()=>{
 const store=new TowerStore(':memory:');try{
  const boss=findVillainBattle(store,'rollback','boss'),result=await villainResult(store,boss.id);
  store.db.exec("CREATE TRIGGER fail_reward BEFORE INSERT ON rewards BEGIN SELECT RAISE(ABORT,'fixture reward failure'); END;");
  assert.throws(()=>store.complete(boss.id,result.log,result.view),/fixture reward failure/);
  assert.equal(store.battle(boss.id).status,'active');assert.equal(store.view('rollback').run!.villainEvent!.ended,false);assert.equal(store.view('rollback').coins,0);
  store.db.exec('DROP TRIGGER fail_reward');store.complete(boss.id,result.log,result.view);assert.equal(store.view('rollback').run!.villainEvent!.ended,true);
 }finally{store.close();}
});

test('v19 upgrade preserves old battles, inventory and grunt-only runs without assigning a new campaign',()=>{
 const path=`.data/tests/${randomUUID()}.sqlite`;let store=new TowerStore(path);try{
  store.ensurePlayer('old');const id=store.start('old',starters);
  // v19 did not have this field; a random modern grunt must not enter its baseline snapshot.
  store.db.prepare('UPDATE battles SET villain_event=NULL WHERE id=?').run(id);
  const row=store.battle(id),before=store.view('old');
  store.db.exec('DROP TABLE run_villain_campaigns; ALTER TABLE battles DROP COLUMN villain_event; PRAGMA user_version=19;');store.close();store=new TowerStore(path);
  assert.equal(store.db.prepare('PRAGMA user_version').get()!.user_version,43);assert.deepEqual(store.view('old'),before);
  assert.deepEqual(store.battle(row.id),row);assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM run_villain_campaigns').get()!.n,0);
  store.db.prepare("UPDATE runs SET floor=31,state='select' WHERE id=?").run(row.run_id);
  const next=store.battle(store.enter('old',row.run_id,31,starters));assert.equal(next.villain_event,null);assert.equal(next.reward,floors[30].reward);
  assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{store.close();}
});
