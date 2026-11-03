import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {starters} from '../src/data/teams';
import {shinyCharm} from '../src/data/permanent-upgrades';
import {machineShiny,MACHINE_SHINY_WEIGHT} from '../src/data/egg-kinds';
import {hiddenShopProducts,snapshotHiddenShop} from '../src/server/hidden-shop';
import {hiddenShopProductPool} from '../src/data/hidden-shop';
import {floorCoinReward} from '../src/data/floors';
import {trainingCost} from '../src/data/training';
import {defaultProfile} from '../src/server/training';

test('research migrates additively, survives restart, charges once, and caps atomically',()=>{
 const path=`.data/tests/research-${randomUUID()}.sqlite`;let s=new TowerStore(path);
 try{
  s.ensurePlayer('p');s.db.prepare('UPDATE players SET growth_points=40000 WHERE id=?').run('p');
  // Simulate opening a pre-research database with its wallet and profile intact.
  s.db.exec('DROP TABLE permanent_research');s.close();s=new TowerStore(path);
  assert.equal(s.permanentView('p').allowanceLevel,0);assert.equal(s.view('p').growthPoints,40000);
  const id=randomUUID(),first=s.permanentAction('p',id,'buy','allowance',1,null);
  assert.deepEqual(s.permanentAction('p',id,'buy','allowance',1,null),first);assert.equal(s.view('p').growthPoints,39200);
  assert.throws(()=>s.permanentAction('p',id,'buy','shinyCharm',1,null),/같은 요청/);
  for(let n=1;n<3;n++)s.permanentAction('p',randomUUID(),'buy','allowance',1,null);
  for(let n=0;n<5;n++)s.permanentAction('p',randomUUID(),'buy','shinyCharm',1,null);
  assert.equal(s.view('p').growthPoints,5300);assert.equal(s.permanentView('p').startingCoins,450);assert.equal(s.permanentView('p').shinyWeight,54);
  for(const product of ['allowance','shinyCharm'])assert.throws(()=>s.permanentAction('p',randomUUID(),'buy',product,1,null),/최대/);
  s.close();s=new TowerStore(path);assert.equal(s.view('p').growthPoints,5300);assert.equal(s.permanentView('p').shinyCharmLevel,5);
  s.ensurePlayer('poor');assert.throws(()=>s.permanentAction('poor',randomUUID(),'buy','shinyCharm',1,null),/부족/);assert.equal(s.permanentView('poor').shinyCharmLevel,0);
  assert.throws(()=>s.permanentAction('p',randomUUID(),'hatch','shinyCharm',1,null),/연구/);
 }finally{s.close();}
});

test('allowance applies only once at a new start; active runs and abandon grant no extra GP',()=>{
 const s=new TowerStore(':memory:');try{
  s.ensurePlayer('p');s.db.prepare('UPDATE players SET growth_points=6000 WHERE id=?').run('p');
  const run=s.battle(s.start('p',starters)).run_id;
  s.permanentAction('p',randomUUID(),'buy','allowance',1,null);assert.equal(s.view('p').coins,0);
  s.abandon('p',run);const next=s.battle(s.start('p',starters)).run_id;assert.equal(s.view('p').coins,150);
  assert.throws(()=>s.start('p',starters),/진행 중/);assert.equal(s.view('p').coins,150);
  s.abandon('p',next);assert.equal(s.view('p').growthPoints,5200);
  s.start('p',starters);assert.equal(s.view('p').coins,150);assert.equal(s.view('p').growthPoints,5200);
 }finally{s.close();}
});

test('research receipt failure rolls back both the upgrade and its payment',()=>{
 const s=new TowerStore(':memory:');try{
  s.ensurePlayer('p');s.db.prepare('UPDATE players SET growth_points=2000 WHERE id=?').run('p');
  s.db.exec("CREATE TRIGGER fail_research BEFORE INSERT ON permanent_receipts BEGIN SELECT RAISE(ABORT,'receipt failed'); END");
  const id=randomUUID();assert.throws(()=>s.permanentAction('p',id,'buy','shinyCharm',1,null),/receipt failed/);
  assert.equal(s.view('p').growthPoints,2000);assert.equal(s.permanentView('p').shinyCharmLevel,0);
  s.db.exec('DROP TRIGGER fail_research');s.permanentAction('p',id,'buy','shinyCharm',1,null);assert.equal(s.view('p').growthPoints,500);assert.equal(s.permanentView('p').shinyCharmLevel,1);
 }finally{s.close();}
});

test('shiny charm raises the egg-machine shiny weight without changing any other draw',()=>{
 assert.equal(machineShiny(23),true);assert.equal(machineShiny(24),false);assert.equal(machineShiny(24,6),true);assert.equal(machineShiny(30,6),false);
 assert.deepEqual(shinyCharm.extraWeights.map(extra=>MACHINE_SHINY_WEIGHT+extra),[24,30,36,42,48,54]);
 // Every 10000-wide roll is 40: not shiny at level 0, shiny once the weight exceeds 40 (level 3+).
 const calls:number[]=[],s=new TowerStore(':memory:',max=>{calls.push(max);return max===10000?40:0;});
 try{
  s.ensurePlayer('p');s.db.prepare('UPDATE players SET growth_points=30000 WHERE id=?').run('p');
  const hatch=()=>{calls.length=0;return s.permanentAction('p',randomUUID(),'hatch','egg',1,null,'machine');};
  const plain=hatch(),draws=[...calls];assert.equal(plain.eggs![0].shiny,false);
  for(let n=0;n<2;n++)s.permanentAction('p',randomUUID(),'buy','shinyCharm',1,null);
  assert.equal(hatch().eggs![0].shiny,false);
  s.permanentAction('p',randomUUID(),'buy','shinyCharm',1,null);
  const boosted=hatch();assert.equal(boosted.eggs![0].shiny,true);assert.deepEqual(calls,draws);
  assert.equal(boosted.eggs![0].species,plain.eggs![0].species);assert.equal(boosted.eggs![0].eggKind,'shiny');assert.deepEqual(boosted.eggs![0].ivs,plain.eggs![0].ivs);
 }finally{s.close();}
});

test('legacy eggFocus research migrates to shiny charm with the same level and cannot be bought again',()=>{
 const path=`.data/tests/charm-${randomUUID()}.sqlite`;let s=new TowerStore(path);
 try{
  s.ensurePlayer('p');s.ensurePlayer('q');s.db.prepare('UPDATE players SET growth_points=9000 WHERE id=?').run('p');
  s.db.exec("DROP TABLE permanent_research; CREATE TABLE permanent_research(player_id TEXT NOT NULL REFERENCES players(id),product TEXT NOT NULL CHECK(product IN ('allowance','eggFocus')),level INTEGER NOT NULL CHECK(level BETWEEN 1 AND 3),PRIMARY KEY(player_id,product)) STRICT; INSERT INTO permanent_research VALUES ('p','eggFocus',2),('p','allowance',1),('q','eggFocus',3); PRAGMA user_version=48;");
  s.close();s=new TowerStore(path);
  assert.equal(s.permanentView('p').shinyCharmLevel,2);assert.equal(s.permanentView('p').allowanceLevel,1);assert.equal(s.permanentView('q').shinyCharmLevel,3);
  assert.equal(s.permanentView('p').shinyWeight,24+12);assert.equal(s.view('p').growthPoints,9000);
  assert.throws(()=>s.permanentAction('p',randomUUID(),'buy','eggFocus',1,null),/빛나는 부적/);
 }finally{s.close();}
});

test('economy uses capped floor growth, meaningful training costs, and per-ticket hidden prices',()=>{
 assert.equal(floorCoinReward(1),180);assert.equal(floorCoinReward(100),615);
 const before=defaultProfile('Charizard'),after=structuredClone(before);after.evs.spa=32;after.evs.spe=32;after.evs.hp=2;after.nature='Modest';after.ability='Solar Power';assert.equal(trainingCost(after,0),528);assert.equal(trainingCost(after,66),0);assert.equal(trainingCost(before,0),0);
 const s=new TowerStore(':memory:');try{s.ensurePlayer('p');const run=s.battle(s.start('p',starters)).run_id;
  const products=hiddenShopProducts(s.db,run).filter(p=>p.category==='egg-tickets');assert.deepEqual(products.map(p=>p.quantity),[1,2]);
  for(const p of products)for(const random of [()=>0,()=>.999999]){const offer=snapshotHiddenShop([p],random).offers[0];const [min,max]=hiddenShopProductPool['egg-tickets'].prices[offer.currency];assert.ok(offer.price>=min*p.quantity&&offer.price<=max*p.quantity);}
 }finally{s.close();}
});
