import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {starters} from '../src/data/teams';
import {permanentResearch} from '../src/data/permanent-upgrades';
import {selectFocusedEggPool} from '../src/game/egg-machine-tuning';
import {eggSpeciesRegion} from '../src/server/egg-machine-tuning';
import {hiddenShopProducts,snapshotHiddenShop} from '../src/server/hidden-shop';
import {hiddenShopProductPool} from '../src/data/hidden-shop';
import {floorCoinReward} from '../src/data/floors';
import {trainingCost} from '../src/data/training';
import {defaultProfile} from '../src/server/training';

test('research migrates additively, survives restart, charges once, and caps atomically',()=>{
 const path=`.data/tests/research-${randomUUID()}.sqlite`;let s=new TowerStore(path);
 try{
  s.ensurePlayer('p');s.db.prepare('UPDATE players SET growth_points=20000 WHERE id=?').run('p');
  // Simulate opening a pre-research database with its wallet and profile intact.
  s.db.exec('DROP TABLE permanent_research');s.close();s=new TowerStore(path);
  assert.equal(s.permanentView('p').allowanceLevel,0);assert.equal(s.view('p').growthPoints,20000);
  const id=randomUUID(),first=s.permanentAction('p',id,'buy','allowance',1,null);
  assert.deepEqual(s.permanentAction('p',id,'buy','allowance',1,null),first);assert.equal(s.view('p').growthPoints,19200);
  assert.throws(()=>s.permanentAction('p',id,'buy','eggFocus',1,null),/같은 요청/);
  for(let n=1;n<3;n++)s.permanentAction('p',randomUUID(),'buy','allowance',1,null);
  for(let n=0;n<3;n++)s.permanentAction('p',randomUUID(),'buy','eggFocus',1,null);
  assert.equal(s.view('p').growthPoints,8300);assert.equal(s.permanentView('p').startingCoins,450);assert.equal(s.permanentView('p').eggFocusWeight,65);
  for(const product of ['allowance','eggFocus'])assert.throws(()=>s.permanentAction('p',randomUUID(),'buy',product,1,null),/최대/);
  s.close();s=new TowerStore(path);assert.equal(s.view('p').growthPoints,8300);assert.equal(s.permanentView('p').eggFocusLevel,3);
  s.ensurePlayer('poor');assert.throws(()=>s.permanentAction('poor',randomUUID(),'buy','eggFocus',1,null),/부족/);assert.equal(s.permanentView('poor').eggFocusLevel,0);
  assert.throws(()=>s.permanentAction('p',randomUUID(),'hatch','eggFocus',1,null),/연구/);
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
  const id=randomUUID();assert.throws(()=>s.permanentAction('p',id,'buy','eggFocus',1,null),/receipt failed/);
  assert.equal(s.view('p').growthPoints,2000);assert.equal(s.permanentView('p').eggFocusLevel,0);
  s.db.exec('DROP TRIGGER fail_research');s.permanentAction('p',id,'buy','eggFocus',1,null);assert.equal(s.view('p').growthPoints,1000);assert.equal(s.permanentView('p').eggFocusLevel,1);
 }finally{s.close();}
});

test('focus research has exact 50/55/60/65 boundaries and does not add rarity/shiny draws',()=>{
 for(const weight of permanentResearch.eggFocus.weights){let focused=0;for(let draw=0;draw<100;draw++)if(selectFocusedEggPool(['focus','other'],x=>x==='focus',()=>draw,weight)[0]==='focus')focused++;assert.equal(focused,weight);}
 assert.deepEqual(selectFocusedEggPool(['other'],()=>false,()=>{throw Error('No extra roll');},65),['other']);
 const calls:number[]=[],s=new TowerStore(':memory:',max=>{calls.push(max);return max===100?60:0;});
 try{
  s.ensurePlayer('p');s.db.prepare('UPDATE players SET growth_points=10000 WHERE id=?').run('p');
  const hatch=()=>{calls.length=0;return s.permanentAction('p',randomUUID(),'hatch','egg',1,null,'machine',{kind:'region',region:'hoenn'});};
  const normal=hatch(),draws=[...calls];assert.notEqual(eggSpeciesRegion(normal.eggs![0].species),'hoenn');
  for(let n=0;n<3;n++)s.permanentAction('p',randomUUID(),'buy','eggFocus',1,null);
  const boosted=hatch();assert.equal(eggSpeciesRegion(boosted.eggs![0].species),'hoenn');assert.equal(calls.length,draws.length);assert.deepEqual([calls[0],calls[1],...calls.slice(3,9),calls.at(-1)],[draws[0],draws[1],...draws.slice(3,9),draws.at(-1)]);assert.equal(boosted.eggs![0].eggKind,normal.eggs![0].eggKind);
 }finally{s.close();}
});

test('economy uses capped floor growth, meaningful training costs, and per-ticket hidden prices',()=>{
 assert.equal(floorCoinReward(1),180);assert.equal(floorCoinReward(100),615);
 const before=defaultProfile('Charizard'),after=structuredClone(before);after.evs.spa=32;after.evs.spe=32;after.evs.hp=2;after.nature='Modest';after.ability='Solar Power';assert.equal(trainingCost(before,after),628);
 const s=new TowerStore(':memory:');try{s.ensurePlayer('p');const run=s.battle(s.start('p',starters)).run_id;
  const products=hiddenShopProducts(s.db,run).filter(p=>p.category==='egg-tickets');assert.deepEqual(products.map(p=>p.quantity),[1,2]);
  for(const p of products)for(const random of [()=>0,()=>.999999]){const offer=snapshotHiddenShop([p],random).offers[0];const [min,max]=hiddenShopProductPool['egg-tickets'].prices[offer.currency];assert.ok(offer.price>=min*p.quantity&&offer.price<=max*p.quantity);}
 }finally{s.close();}
});
