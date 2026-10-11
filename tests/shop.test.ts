import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {TowerService} from '../src/server/tower-service';
import {packTeam,starters} from '../src/data/teams';
import {runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';

test('legacy five-floor upgrades retain snapshots and restore a healthy team',async()=>{
  const path=`.data/tests/${randomUUID()}.sqlite`;let store=new TowerStore(path);let service:TowerService|undefined;
  try {
    store.ensurePlayer('shop');const first=store.start('shop',starters),run=store.battle(first).run_id;
    store.db.prepare('UPDATE players SET coins=600 WHERE id=?').run('shop');
    assert.throws(()=>store.purchase('shop',run,1,'attack'),/상점/);
    store.db.prepare("UPDATE runs SET total_floors=50,floor=6,state='select' WHERE id=?").run(run);
    store.db.prepare('INSERT INTO consumable_shops VALUES (?,?,?)').run(run,6,JSON.stringify(['attack','speed','guard']));
    assert.throws(()=>store.purchase('other',run,6,'attack'),/찾을/);
    assert.throws(()=>store.purchase('shop',run,6,'unknown'),/강화/);
    // Previously purchased five-floor upgrades remain compatible after migration.
    store.db.prepare('INSERT INTO run_upgrades VALUES (?,?,?,?)').run(run,'attack',6,10);
    store.db.prepare('INSERT INTO run_upgrades VALUES (?,?,?,?)').run(run,'speed',6,10);
    store.close();store=new TowerStore(path);
    assert.deepEqual(store.view('shop').run!.upgrades,[{kind:'attack',remainingFloors:5},{kind:'speed',remainingFloors:5}]);
    for(let floor=6;floor<=10;floor++) {
      store.db.prepare("UPDATE runs SET floor=?,state='select' WHERE id=?").run(floor,run);
      assert.equal(store.view('shop').run!.upgrades[0].remainingFloors,11-floor);
    }
    const id=store.enter('shop',run,10,starters);
    assert.deepEqual(JSON.parse(store.battle(id).upgrades),['attack','speed']);
    service=new TowerService(store);const before=await service.state('shop');
    assert.ok(before.battle!.team.every(p=>{const [hp,max]=p.condition.split('/');return hp===max;}));
    const after=await service.action('shop',id,before.battle!.requestId,'move 1');
    await service.dispose();store.close();store=new TowerStore(path);service=new TowerService(store);
    const restored=(await service.state('shop')).battle!;assert.deepEqual({...restored,messages:battleEvents(restored.messages)},{...after.battle,messages:battleEvents(after.battle!.messages)});
    await service.abandon('shop',run);
    const fresh=store.start('shop',starters);
    assert.deepEqual(store.view('shop').run!.upgrades,[]);
    assert.equal(store.battle(fresh).upgrades,'[]');
  } finally {await service?.dispose();store.close();}
});

test('insufficient funds cannot create an upgrade or change the wallet',()=>{
  const store=new TowerStore(':memory:');try {
    store.ensurePlayer('poor');const run=store.battle(store.start('poor',starters)).run_id;
    store.db.prepare("UPDATE runs SET total_floors=50,floor=6,state='select' WHERE id=?").run(run);
    store.db.prepare('INSERT INTO consumable_shops VALUES (?,?,?)').run(run,6,JSON.stringify(['attack','speed','guard']));
    assert.throws(()=>store.purchase('poor',run,6,'speed'),/부족/);
    assert.equal(store.view('poor').coins,0);assert.deepEqual(store.view('poor').run!.upgrades,[]);
  } finally {store.close();}
});

test('upgrades actually increase damage and speed, replay identically and do not leak into other battles',async()=>{
  const team=packTeam(['Blastoise','Charizard','Venusaur']);
  const play=(upgrades?:('attack'|'speed')[])=>runBattle({teams:{p1:team,p2:team},seed:[1,2,3,4],player:new DamagePolicy(),opponent:new DamagePolicy(),upgrades});
  const plain=await play(),attack=await play(['attack']),speed=await play(['speed']);
  const firstHP=(log:typeof plain)=>Number(log.publicProtocol.find(line=>line.startsWith('|-damage|p2a:'))!.split('|')[3].split('/')[0]);
  assert.ok(firstHP(attack)<firstHP(plain),'attack boost deals more damage');
  assert.ok(speed.publicProtocol.find(line=>line.startsWith('|move|'))!.includes('|p1a:'),'speed upgrade acts first in a mirror matchup');
  assert.deepEqual(battleEvents((await replayBattle(attack)).publicProtocol),battleEvents(attack.publicProtocol));
  assert.deepEqual(battleEvents((await play()).publicProtocol),battleEvents(plain.publicProtocol));
});
