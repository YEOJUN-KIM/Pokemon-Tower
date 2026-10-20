import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {starters,packTeam} from '../src/data/teams';
import type {BattleLog} from '../src/battle/run';
import type {BattleView} from '../src/web/contracts';
import Showdown from 'pokemon-showdown';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {schema} from '../src/server/schema';

export function lose(store:TowerStore,id:string){
 const b=store.battle(id);
 const log:BattleLog={schemaVersion:1,engineVersion:b.engine_version,format:b.format,teams:{p1:b.player_team,p2:b.opponent_team},seed:JSON.parse(b.seed),rule:b.rule,upgrades:JSON.parse(b.upgrades),trainerEquipment:b.trainer_equipment==null?undefined:JSON.parse(b.trainer_equipment),teraTickets:JSON.parse(b.tera_tickets),decisions:[],publicProtocol:[],winner:'Tower AI',turns:5};
 const view:BattleView={id,status:'complete',requestId:1,turn:5,team:[],opponent:null,actions:[],messages:[],winner:'Tower AI',error:null};
 store.complete(id,log,view);return b;
}
function setup(){const s=new TowerStore(':memory:');s.ensurePlayer('p');s.ensurePlayer('other');s.db.prepare('UPDATE players SET growth_points=10000 WHERE id=?').run('p');return s;}
test('retry starts at zero; permanent purchase is idempotent, capped and applies next run',()=>{
 const s=setup();try{
  assert.equal(s.permanentView('p').retryLimit,0);
  const first=s.start('p',starters),run=s.battle(first).run_id;
  const receipt=randomUUID();s.permanentAction('p',receipt,'buy','retry',1,null);s.permanentAction('p',receipt,'buy','retry',1,null);
  assert.equal(s.permanentView('p').retryLimit,1);assert.equal(s.view('p').growthPoints,9500);assert.equal(s.view('p').run!.retries!.limit,0);
  lose(s,first);assert.throws(()=>s.retry('p',run,first),/횟수/);
  for(let n=0;n<2;n++)s.permanentAction('p',randomUUID(),'buy','retry',1,null);
  assert.equal(s.permanentView('p').retryLimit,3);assert.throws(()=>s.permanentAction('p',randomUUID(),'buy','retry',1,null),/최대/);
  s.start('p',starters);assert.equal(s.view('p').run!.retries!.remaining,3);
 }finally{s.close();}
});
test('three retries preserve opponent, seed and floor, allow reconfiguration and settle growth only once',()=>{
 const s=setup();try{
  for(let n=0;n<3;n++)s.permanentAction('p',randomUUID(),'buy','retry',1,null);
  let id=s.start('p',starters,'basic');const run=s.battle(id).run_id;
  const opponent=s.battle(id).opponent_team,seed=s.battle(id).seed,points=s.view('p').growthPoints;
  s.db.prepare('UPDATE players SET coins=321 WHERE id=?').run('p');
  for(let n=1;n<=3;n++){
   lose(s,id);assert.equal(s.view('p').run!.retries!.canRetry,true);assert.equal(s.view('p').growthPoints,points);
   assert.throws(()=>s.retry('other',run,id),/찾을 수/);
   s.retry('p',run,id);s.retry('p',run,id);
   let v=s.view('p');assert.equal(v.run!.state,'select');assert.equal(v.run!.retries!.used,n);assert.equal(v.coins,321);assert.ok(v.run!.adjustment);
   assert.equal(s.currentBattle('p'),null);assert.equal(v.run!.retries!.opponents.length,3);
   const entry=v.run!.adjustment!.entries.find(e=>e.species===starters[0])!;
   s.train('p',entry.species,entry.revision,entry.profile,{id:run,floor:1,snapshot:v.run!.adjustment!.snapshot});
   const next=s.enter('p',run,1,[...starters].reverse());assert.notEqual(next,id);
   assert.equal(s.battle(id).status,'complete');assert.equal(s.battle(next).opponent_team,opponent);assert.equal(s.battle(next).seed,seed);
   assert.equal(Showdown.Teams.unpack(s.battle(next).player_team)![0].species,starters[2]);
   assert.equal(s.currentBattle('p')!.id,next);id=next;
  }
  lose(s,id);assert.equal(s.view('p').run!.retries!.canRetry,false);assert.equal(s.view('p').growthPoints,points+10);
  assert.throws(()=>s.retry('p',run,id),/횟수/);s.finishLoss('p',run);s.finishLoss('p',run);assert.equal(s.view('p').growthPoints,points+10);
  assert.equal(s.db.prepare('SELECT COUNT(*) AS n FROM battles WHERE run_id=?').get(run)!.n,4);
  assert.deepEqual(s.db.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{s.close();}
});
test('stale retry delivery cannot reopen a new battle, and giving up prevents later retries',()=>{
 const s=setup();try{
  s.permanentAction('p',randomUUID(),'buy','retry',1,null);
  const id=s.start('p',starters),run=lose(s,id).run_id;s.retry('p',run,id);const next=s.enter('p',run,1,starters);
  assert.throws(()=>s.retry('p',run,id),/패배/);lose(s,next);s.finishLoss('p',run);assert.throws(()=>s.retry('p',run,next),/횟수/);
  assert.equal(s.view('p').run!.growthReward,10);
 }finally{s.close();}
});
test('v27 migration retains original teams, actions and foreign keys; retry preparation survives reopening',()=>{
 mkdirSync('.data/tests',{recursive:true});const path=`.data/tests/retry-${randomUUID()}.sqlite`;
 const old=new DatabaseSync(path);
 old.exec(schema.replace('  encounter_order INTEGER NOT NULL DEFAULT 0 CHECK(encounter_order>=0),\n','').replace('UNIQUE(run_id, encounter_order, stage, attempt)','UNIQUE(run_id, floor, stage, attempt)').replace('  attempt INTEGER NOT NULL DEFAULT 0 CHECK(attempt>=0),\n','').replace('UNIQUE(run_id, floor, stage, attempt)','UNIQUE(run_id, floor, stage)').replace(/PRAGMA user_version = \d+/, 'PRAGMA user_version = 27'));
 old.prepare('INSERT INTO players(id) VALUES (?)').run('legacy');old.prepare("INSERT INTO runs(id,player_id,floor,state,created_at) VALUES (?,?,1,'battle',1)").run('old-run','legacy');
 const packed=packTeam(starters);
 old.prepare("INSERT INTO battles(id,run_id,floor,player_team,opponent_team,seed,engine_version,format,ai_version,status,reward,candidates) VALUES ('old-battle','old-run',1,?,?, '[1,2,3,4]','old-engine','gen9nationaldexag','tower-policy-v9','active',100,'[]')").run(packed,packed);
 old.prepare("INSERT INTO actions VALUES ('old-battle',1,'move 1')").run();old.close();
 let s=new TowerStore(path);try{
  assert.equal(s.db.prepare('PRAGMA user_version').get()!.user_version,46);assert.equal(s.battle('old-battle').player_team,packed);assert.deepEqual(s.history('old-battle'),['move 1']);assert.deepEqual(s.db.prepare('PRAGMA foreign_key_check').all(),[]);
  s.ensurePlayer('p');s.db.prepare('UPDATE players SET growth_points=500 WHERE id=?').run('p');s.permanentAction('p',randomUUID(),'buy','retry',1,null);
  const id=s.start('p',starters),run=lose(s,id).run_id;s.retry('p',run,id);s.close();s=new TowerStore(path);
  assert.equal(s.view('p').run!.retries!.preparing,true);assert.equal(s.view('p').run!.retries!.used,1);assert.ok(s.enter('p',run,1,starters));
 }finally{s.close();}
});

test('retry retains unused purchases, held tools, TMs and remaining consumables through disk reload and the new snapshot',()=>{
 mkdirSync('.data/tests',{recursive:true});const path=`.data/tests/retry-bag-${randomUUID()}.sqlite`;
 let s=new TowerStore(path);try{
  s.ensurePlayer('p');s.db.prepare('UPDATE players SET growth_points=1000 WHERE id=?').run('p');s.permanentAction('p',randomUUID(),'buy','retry',1,null);
  const first=s.start('p',starters),run=s.battle(first).run_id;
  s.db.prepare("UPDATE runs SET state='select',floor=11 WHERE id=?").run(run);
  s.db.prepare("INSERT INTO run_item_bag VALUES (?,'Leftovers',1)").run(run);
  s.db.prepare("INSERT INTO run_held_items VALUES (?,'Charizard','Focus Sash')").run(run);
  s.db.prepare('INSERT INTO run_reward_inventory VALUES (?,?,?,?)').run(randomUUID(),run,JSON.stringify({kind:'machine',move:'Earthquake',amount:1}),1);
  s.db.prepare('INSERT INTO run_reward_inventory VALUES (?,?,?,?)').run(randomUUID(),run,JSON.stringify({kind:'vitamin',stat:'atk',amount:2}),2);
  s.db.prepare("INSERT INTO run_battle_items VALUES (?,'attack',2)").run(run);
  s.db.prepare("INSERT INTO run_battle_items VALUES (?,'guard',1)").run(run);
  const id=s.enter('p',run,11,starters);s.input('p',id,1,'item attack');lose(s,id);
  s.retry('p',run,id);
  const before=s.view('p').run!;assert.equal(before.heldItems!.Charizard,'Focus Sash');assert.equal(before.itemBag!.Leftovers,1);assert.equal(before.battleItems!.attack,1);
  assert.ok(before.bag!.entries.some(e=>e.pocket==='machines'&&e.name));assert.equal(before.bag!.entries.find(e=>e.action==='vitamin')!.quantity,2);
  s.close();s=new TowerStore(path);assert.deepEqual(s.view('p').run!.bag,before.bag);
  const next=s.enter('p',run,11,starters),snapshot=s.battle(next);
  assert.deepEqual(JSON.parse(snapshot.battle_items),{attack:1,guard:1});assert.equal(Showdown.Teams.unpack(snapshot.player_team)![0].item,'Focus Sash');
  assert.equal(s.view('p').run!.itemBag!.Leftovers,1);assert.equal(s.db.prepare("SELECT quantity FROM run_reward_inventory WHERE run_id=? AND json_extract(effect_json,'$.kind')='machine'").get(run)!.quantity,1);
 }finally{s.close();}
});
