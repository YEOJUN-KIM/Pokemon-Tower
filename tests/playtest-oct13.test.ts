import {useVitaminReward,vitaminCount} from './reward-inventory-fixture';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {starters,packTeam} from '../src/data/teams';
import {CURRENT_PROGRESSION} from '../src/data/tower-progression';
import {generateOpponentTeam,normalOpponentSpecies,selectTrainerSample} from '../src/server/opponent-team';
import {eliteTrainerSamples,normalTrainerSamples} from '../src/data/trainer-catalog';
import {runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';

function setup(path=':memory:'){
 const store=new TowerStore(path);store.ensurePlayer('feedback');
 const run=store.battle(store.start('feedback',starters)).run_id;
 store.db.prepare("UPDATE runs SET state='select',floor=11 WHERE id=?").run(run);
 store.db.prepare('UPDATE players SET coins=100000 WHERE id=?').run('feedback');
 return {store,run};
}

test('normal teams exclude rare species at all depths and elite specialists add complementary partners',()=>{
 for(const name of ['Iron Valiant','Buzzwole','Mewtwo'])assert.equal(normalOpponentSpecies(name),false,name);
 for(const floor of [11,40,75,90,100])for(let seed=1;seed<=15;seed++){
  const normal={...normalTrainerSamples[0],specialty:null};
  assert.ok(generateOpponentTeam(floor,[seed,2,3,4],[],null,normal,CURRENT_PROGRESSION).every(p=>normalOpponentSpecies(p.name)));
  const elite=eliteTrainerSamples.find(s=>s.specialty==='Dragon')!;
  const team=generateOpponentTeam(floor,[seed,2,3,4],[],null,elite,CURRENT_PROGRESSION);
  assert.equal(team.filter(p=>Showdown.Dex.species.get(p.name).types.includes('Dragon')).length,1);
  assert.equal(team.length,3);assert.equal(new Set(team.map(p=>p.name)).size,3);
  const sample=selectTrainerSample(floor,[seed,2,3,4],[],CURRENT_PROGRESSION);
  if(sample.kind==='normal')assert.ok(generateOpponentTeam(floor,[seed,2,3,4],[],null,sample,CURRENT_PROGRESSION).every(p=>normalOpponentSpecies(p.name)));
 }
});

test('three vitamins total across types and checkpoints persist after reopen and reject a fourth without spending',()=>{
 const path=`.data/tests/${randomUUID()}.sqlite`;let {store,run}=setup(path);
 try{
  const offers=([{stat:'atk'},{stat:'def'},{stat:'spa'},{stat:'spd'}] as const);
  for(const offer of offers.slice(0,3))useVitaminReward(store,'feedback',run,11,offer.stat,'Charizard');
  assert.equal(vitaminCount(store,run,'Charizard'),3);
  assert.throws(()=>useVitaminReward(store,'feedback',run,11,offers[3].stat,'Charizard'),/대상/);const before=store.view('feedback');assert.throws(()=>store.useReward('feedback',run,randomUUID(),before.run!.rewardInventory![0].id,'Charizard'),/대상/);assert.deepEqual(store.view('feedback'),before);
  store.close();store=new TowerStore(path);store.db.prepare("UPDATE runs SET floor=21,state='select' WHERE id=?").run(run);
  const stat='spd' as const;
  assert.throws(()=>store.useReward('feedback',run,randomUUID(),store.view('feedback').run!.rewardInventory![0].id,'Charizard'),/대상/);
  store.useReward('feedback',run,randomUUID(),store.view('feedback').run!.rewardInventory![0].id,'Blastoise');assert.equal(vitaminCount(store,run,'Blastoise'),1);
 }finally{store.close();}
});

test('automatic item transfers return the previous target tool and reject stale holders atomically',()=>{
 const {store,run}=setup();try{
  store.db.prepare('INSERT INTO run_held_items VALUES (?,?,?)').run(run,'Charizard','Leftovers');store.db.prepare('INSERT INTO run_held_items VALUES (?,?,?)').run(run,'Blastoise','Sitrus Berry');
  store.equipItem('feedback',run,11,'Blastoise','Leftovers');assert.deepEqual(store.view('feedback').run!.heldItems,{Blastoise:'Leftovers'});assert.equal(store.view('feedback').run!.itemBag!['Sitrus Berry'],1);
  store.equipItem('feedback',run,11,'Venusaur','Leftovers');assert.deepEqual(store.view('feedback').run!.heldItems,{Venusaur:'Leftovers'});const before=store.view('feedback');assert.throws(()=>store.equipItem('feedback',run,11,'Blastoise','Leftovers','Charizard'),/바뀌었/);assert.deepEqual(store.view('feedback'),before);
 }finally{store.close();}
});

test('Focus Sash activates once in a real battle, replays identically and remains equipped next floor',async()=>{
 const {store,run}=setup();try{
  store.db.prepare('INSERT INTO run_held_items VALUES (?,?,?)').run(run,'Charizard','Focus Sash');
  const id=store.enter('feedback',run,11,starters),enemy=Showdown.Teams.unpack(packTeam(['Golem','Snorlax','Blastoise']))!;enemy[0].moves=['Rock Slide'];
  store.db.prepare('UPDATE battles SET opponent_team=?,seed=?,tera_tickets=? WHERE id=?').run(Showdown.Teams.pack(enemy),'[1,2,3,4]','{"p1":0,"p2":0}',id);
  const row=store.battle(id),log=await runBattle({trainerEquipment:row.trainer_equipment==null?undefined:JSON.parse(row.trainer_equipment),teams:{p1:row.player_team,p2:row.opponent_team},seed:[1,2,3,4],player:new DamagePolicy(),opponent:new DamagePolicy(),rule:row.rule,teraTickets:{p1:0,p2:0}});
  assert.equal(log.publicProtocol.filter(line=>line.startsWith('|-enditem|p1a: Charizard|Focus Sash')).length,1);
  assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
  store.complete(id,log,{id,status:'complete',requestId:1,turn:log.turns,team:[],opponent:null,actions:[],messages:log.publicProtocol,winner:log.winner,error:null});
  assert.equal(store.view('feedback').run!.heldItems!.Charizard,'Focus Sash');
  store.db.prepare("UPDATE runs SET state='select',floor=12 WHERE id=?").run(run);
  assert.equal(Showdown.Teams.unpack(store.battle(store.enter('feedback',run,12,starters)).player_team)![0].item,'Focus Sash');
 }finally{store.close();}
});

test('Focus Sash removed by Knock Off is not mistaken for natural activation',async()=>{
 const {store,run}=setup();try{
  store.db.prepare('INSERT INTO run_held_items VALUES (?,?,?)').run(run,'Charizard','Focus Sash');
  const id=store.enter('feedback',run,11,starters),enemy=Showdown.Teams.unpack(packTeam(['Tyranitar','Snorlax','Blastoise']))!;enemy[0].moves=['Knock Off'];
  store.db.prepare('UPDATE battles SET opponent_team=?,seed=?,tera_tickets=? WHERE id=?').run(Showdown.Teams.pack(enemy),'[1,2,3,4]','{"p1":0,"p2":0}',id);
  const row=store.battle(id),log=await runBattle({trainerEquipment:row.trainer_equipment==null?undefined:JSON.parse(row.trainer_equipment),teams:{p1:row.player_team,p2:row.opponent_team},seed:[1,2,3,4],player:new DamagePolicy(),opponent:new DamagePolicy(),rule:row.rule,teraTickets:{p1:0,p2:0}});
  assert.ok(log.publicProtocol.some(line=>line.startsWith('|-enditem|p1a: Charizard|Focus Sash|[from] move: Knock Off')));
  store.complete(id,log,{id,status:'complete',requestId:1,turn:log.turns,team:[],opponent:null,actions:[],messages:log.publicProtocol,winner:log.winner,error:null});
  assert.equal(store.view('feedback').run!.heldItems!.Charizard,undefined);
 }finally{store.close();}
});

test('candidate details only appear after victory and match the saved opponent ability, moves and base stats',async()=>{
 const {store,run}=setup();try{
  const id=store.enter('feedback',run,11,starters);assert.deepEqual(store.view('feedback').run!.candidateDetails,{});
  store.db.prepare('UPDATE battles SET opponent_team=?,seed=?,tera_tickets=? WHERE id=?').run(packTeam(['Unown','Luvdisc','Delibird']),'[1,2,3,4]','{"p1":0,"p2":0}',id);
  const row=store.battle(id),log=await runBattle({trainerEquipment:row.trainer_equipment==null?undefined:JSON.parse(row.trainer_equipment),teams:{p1:row.player_team,p2:row.opponent_team},seed:[1,2,3,4],player:new DamagePolicy(),opponent:new DamagePolicy(),rule:row.rule,teraTickets:{p1:0,p2:0}});
  assert.equal(log.winner,'Player');store.complete(id,log,{id,status:'complete',requestId:1,turn:log.turns,team:[],opponent:null,actions:[],messages:log.publicProtocol,winner:log.winner,error:null});
  const saved=Showdown.Teams.unpack(row.opponent_team)![0],details=store.view('feedback').run!.candidateDetails![saved.species];
  assert.deepEqual(details.types,Showdown.Dex.species.get(saved.species).types);
  assert.equal(details.teraType,saved.teraType);assert.equal(details.shiny,!!saved.shiny);
  assert.equal(details.ability,saved.ability);assert.deepEqual(details.moves,saved.moves.map(m=>Showdown.Dex.moves.get(m).name));assert.deepEqual(details.baseStats,Showdown.Dex.species.get(saved.species).baseStats);
 }finally{store.close();}
});
