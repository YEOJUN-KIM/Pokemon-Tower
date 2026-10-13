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
  const offers=store.view('feedback').run!.vitaminShop!.offers;
  for(const offer of offers.slice(0,3))store.purchaseVitamin('feedback',run,11,offer.stat,'Charizard');
  assert.equal(store.view('feedback').run!.vitaminShop!.counts!.Charizard,3);
  const before=store.view('feedback');assert.throws(()=>store.purchaseVitamin('feedback',run,11,offers[3].stat,'Charizard'),/총 3개/);assert.deepEqual(store.view('feedback'),before);
  store.close();store=new TowerStore(path);store.db.prepare("UPDATE runs SET floor=21,state='select' WHERE id=?").run(run);
  const stat=store.view('feedback').run!.vitaminShop!.offers[0].stat;
  assert.throws(()=>store.purchaseVitamin('feedback',run,21,stat,'Charizard'),/총 3개/);
  store.purchaseVitamin('feedback',run,21,stat,'Blastoise');assert.equal(store.view('feedback').run!.vitaminShop!.counts!.Blastoise,1);
 }finally{store.close();}
});

test('confirmed item transfers and swaps conserve inventory and reject stale or incompatible exchanges atomically',()=>{
 const {store,run}=setup();try{
  store.db.prepare('INSERT INTO run_held_items VALUES (?,?,?)').run(run,'Charizard','Leftovers');
  store.db.prepare('INSERT INTO run_held_items VALUES (?,?,?)').run(run,'Blastoise','Sitrus Berry');
  assert.throws(()=>store.equipItem('feedback',run,11,'Blastoise','Leftovers'),/승인/);
  store.equipItem('feedback',run,11,'Blastoise','Leftovers','Charizard');
  assert.deepEqual(store.view('feedback').run!.heldItems,{Charizard:'Sitrus Berry',Blastoise:'Leftovers'});assert.deepEqual(store.view('feedback').run!.itemBag,{});
  store.equipItem('feedback',run,11,'Venusaur','Leftovers','Blastoise');
  assert.deepEqual(store.view('feedback').run!.heldItems,{Charizard:'Sitrus Berry',Venusaur:'Leftovers'});
  const before=store.view('feedback');assert.throws(()=>store.equipItem('feedback',run,11,'Blastoise','Leftovers','Charizard'),/확인/);assert.deepEqual(store.view('feedback'),before);
  store.db.prepare("UPDATE run_held_items SET item='Charizardite X' WHERE run_id=? AND species='Charizard'").run(run);
  const incompatible=store.view('feedback');assert.throws(()=>store.equipItem('feedback',run,11,'Charizard','Leftovers','Venusaur'),/맞는 도구/);assert.deepEqual(store.view('feedback'),incompatible);
 }finally{store.close();}
});

test('Focus Sash activates once in a real battle, replays identically and remains equipped next floor',async()=>{
 const {store,run}=setup();try{
  store.db.prepare('INSERT INTO run_held_items VALUES (?,?,?)').run(run,'Charizard','Focus Sash');
  const id=store.enter('feedback',run,11,starters),enemy=Showdown.Teams.unpack(packTeam(['Golem','Snorlax','Blastoise']))!;enemy[0].moves=['Rock Slide'];
  store.db.prepare('UPDATE battles SET opponent_team=?,seed=?,tera_tickets=? WHERE id=?').run(Showdown.Teams.pack(enemy),'[1,2,3,4]','{"p1":0,"p2":0}',id);
  const row=store.battle(id),log=await runBattle({teams:{p1:row.player_team,p2:row.opponent_team},seed:[1,2,3,4],player:new DamagePolicy(),opponent:new DamagePolicy(),rule:row.rule,teraTickets:{p1:0,p2:0}});
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
  const row=store.battle(id),log=await runBattle({teams:{p1:row.player_team,p2:row.opponent_team},seed:[1,2,3,4],player:new DamagePolicy(),opponent:new DamagePolicy(),rule:row.rule,teraTickets:{p1:0,p2:0}});
  assert.ok(log.publicProtocol.some(line=>line.startsWith('|-enditem|p1a: Charizard|Focus Sash|[from] move: Knock Off')));
  store.complete(id,log,{id,status:'complete',requestId:1,turn:log.turns,team:[],opponent:null,actions:[],messages:log.publicProtocol,winner:log.winner,error:null});
  assert.equal(store.view('feedback').run!.heldItems!.Charizard,undefined);
 }finally{store.close();}
});

test('candidate details only appear after victory and match the saved opponent ability, moves and base stats',async()=>{
 const {store,run}=setup();try{
  const id=store.enter('feedback',run,11,starters);assert.deepEqual(store.view('feedback').run!.candidateDetails,{});
  store.db.prepare('UPDATE battles SET opponent_team=?,seed=?,tera_tickets=? WHERE id=?').run(packTeam(['Unown','Luvdisc','Delibird']),'[1,2,3,4]','{"p1":0,"p2":0}',id);
  const row=store.battle(id),log=await runBattle({teams:{p1:row.player_team,p2:row.opponent_team},seed:[1,2,3,4],player:new DamagePolicy(),opponent:new DamagePolicy(),rule:row.rule,teraTickets:{p1:0,p2:0}});
  assert.equal(log.winner,'Player');store.complete(id,log,{id,status:'complete',requestId:1,turn:log.turns,team:[],opponent:null,actions:[],messages:log.publicProtocol,winner:log.winner,error:null});
  const saved=Showdown.Teams.unpack(row.opponent_team)![0],details=store.view('feedback').run!.candidateDetails![saved.species];
  assert.equal(details.ability,saved.ability);assert.deepEqual(details.moves,saved.moves.map(m=>Showdown.Dex.moves.get(m).name));assert.deepEqual(details.baseStats,Showdown.Dex.species.get(saved.species).baseStats);
 }finally{store.close();}
});
