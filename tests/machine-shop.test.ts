import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {starters} from '../src/data/teams';
import {ownsMachine} from '../src/server/run-ownership';
function checkpoint(store:TowerStore,owner='machines'){store.ensurePlayer(owner);const run=store.battle(store.start(owner,starters)).run_id;store.db.prepare("UPDATE runs SET total_floors=50,floor=6,state='select' WHERE id=?").run(run);store.db.prepare('UPDATE players SET coins=10000 WHERE id=?').run(owner);return run;}

import {grantStoredReward} from '../src/server/inventory-grants';
test('TM used from Bag affects next battle, survives restart and never changes new-run or permanent defaults',()=>{
 const path=`.data/tests/${randomUUID()}.sqlite`;let store=new TowerStore(path);try{
  const run=checkpoint(store),before=store.trainingCollection('machines');grantStoredReward(store.db,run,{kind:'machine',move:'Earthquake',amount:1});
  const entry=store.view('machines').run!.bag!.entries.find(e=>e.move==='Earthquake')!,target=entry.targets[0];store.useBag('machines',run,randomUUID(),entry.id,target,0);
  store.close();store=new TowerStore(path);assert.equal(store.view('machines').run!.bag!.currentMoves[target][0],'Earthquake');assert.deepEqual(store.trainingCollection('machines'),before);
  const battle=store.enter('machines',run,6,starters);assert.equal(Showdown.Teams.unpack(store.battle(battle).player_team)!.find(s=>s.species===target)!.moves[0],'Earthquake');assert.throws(()=>store.useBag('machines',run,randomUUID(),entry.id,target,1),/비전투/);
  store.abandon('machines',run);const fresh=store.start('machines',starters);assert.deepEqual(Showdown.Teams.unpack(store.battle(fresh).player_team)!.find(s=>s.species===target)!.moves,before.find(e=>e.species===target)!.profile.moves);assert.equal(ownsMachine(store.db,store.battle(fresh).run_id,'Earthquake'),false);
 }finally{store.close();}
});

test('the TM shop is gone: no machine offers, purchases and rerolls are rejected, no coins move',()=>{
 const store=new TowerStore(':memory:');try{const run=checkpoint(store),before=store.view('machines').coins;
  assert.equal(store.view('machines').run!.machineShop,null);
  assert.throws(()=>store.purchaseMachine('machines',run,6,'Earthquake'),/종료/);assert.throws(()=>store.rerollShop('machines',run,6,'machines',0),/지닌 도구/);
  assert.equal(store.view('machines').coins,before);assert.equal(ownsMachine(store.db,run,'Earthquake'),false);
 }finally{store.close();}
});
