import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {machineMoves} from '../src/data/shop';
import {machineRarity,machineRarities,machineRarityWeights,rollMachineOffers} from '../src/data/machine-rarities';
import {moveInfo} from '../src/data/move-info';
import {TowerStore} from '../src/server/tower-store';
import {starters} from '../src/data/teams';

test('all machine grades have translated details; first shop can draw every grade and later shops favor stronger grades',()=>{
  const candidates=machineMoves.map(move=>({move}));
  assert.equal(Object.keys(machineRarities).length,machineMoves.length);
  for(const move of machineMoves)assert.ok(moveInfo[move]?.name,move);
  let cumulative=0;
  for(const [grade,weight] of Object.entries(machineRarityWeights(5))){let call=0;const offers=rollMachineOffers(candidates,5,()=>call++===0 ? (cumulative+weight/2)/100 : 0);assert.equal(machineRarity(offers[0].move),grade);cumulative+=weight;}
  let seed=12345;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
  const high:number[]=[];
  for(const floor of [5,45]){let count=0;for(let i=0;i<3000;i++){const offers=rollMachineOffers(candidates,floor,random);assert.equal(offers.length,4);assert.equal(new Set(offers.map(o=>o.move)).size,4);count+=offers.filter(o=>['epic','legendary'].includes(machineRarity(o.move))).length;}high.push(count);}
  assert.ok(high[1]>high[0]*10);
  assert.deepEqual(rollMachineOffers([{move:'Protect'}],45,()=>0),[{move:'Protect'}]);
  assert.deepEqual(rollMachineOffers([],45,()=>0),[]);
});

test('v14 migration preserves thirty-floor run, packed battle and saved offers while new runs finish at fifty',()=>{
  const path=`.data/tests/${randomUUID()}.sqlite`;let store=new TowerStore(path);
  try{
    store.ensurePlayer('legacy');const battle=store.battle(store.start('legacy',starters)),run=battle.run_id;
    store.db.prepare("UPDATE runs SET total_floors=30,floor=6,state='select' WHERE id=?").run(run);
    const stock=store.view('legacy').run!.machineShop!.offers.map(({rarity,...offer})=>({...offer,price:200}));
    store.db.prepare('UPDATE machine_shops SET offers=? WHERE run_id=?').run(JSON.stringify(stock),run);
    store.view('legacy');const itemStock=store.db.prepare('SELECT offers FROM item_shops WHERE run_id=?').get(run);store.close();
    const legacy=new DatabaseSync(path);legacy.exec('PRAGMA foreign_keys=OFF; BEGIN;');
    const sql=(legacy.prepare("SELECT sql FROM sqlite_master WHERE name='runs'").get() as {sql:string}).sql;
    legacy.exec(sql.replace('CREATE TABLE "runs"','CREATE TABLE legacy_runs').replace('CREATE TABLE runs','CREATE TABLE legacy_runs').replace('DEFAULT 100','DEFAULT 30').replace('BETWEEN 1 AND 100','BETWEEN 1 AND 30'));
    legacy.exec("INSERT INTO legacy_runs SELECT * FROM runs; DROP TABLE runs; ALTER TABLE legacy_runs RENAME TO runs; CREATE UNIQUE INDEX one_active_run ON runs(player_id) WHERE state IN ('select','battle','recruit'); PRAGMA user_version=14; COMMIT;");legacy.close();
    store=new TowerStore(path);
    assert.equal(store.view('legacy').run!.totalFloors,30);assert.deepEqual(store.battle(battle.id),battle);
    assert.deepEqual(store.view('legacy').run!.machineShop!.offers,stock);
    store.db.prepare('UPDATE players SET coins=1000 WHERE id=?').run('legacy');
    store.purchaseMachine('legacy',run,6,stock[0].move,stock[0].targets[0]);
    assert.equal(store.view('legacy').coins,800);
    assert.equal(store.db.prepare('SELECT price FROM machine_purchases WHERE run_id=?').get(run)!.price,200);
    assert.deepEqual(store.db.prepare('SELECT offers FROM item_shops WHERE run_id=?').get(run),itemStock);
    assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(),[]);
    store.ensurePlayer('fresh');store.start('fresh',starters);assert.equal(store.view('fresh').run!.totalFloors,100);
  }finally{store.close();}
});
