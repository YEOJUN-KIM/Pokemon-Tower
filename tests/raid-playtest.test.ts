import test from 'node:test';
import assert from 'node:assert/strict';
import {raidFixture} from './raid-fixture';
import {RunEvents} from '../src/server/run-events';
import {raidEventTestSettings} from '../src/data/raids';

test('manual raid playtest forces every destination floor from 3, ignoring chance, cooldown and checkpoints',()=>{
 const {store,owner,run,event}=raidFixture();
 try{
  assert.deepEqual(raidEventTestSettings,{enabled:true,startFloor:3});
  store.chooseEvent(owner,run,event.id,'skip');
  const events=new RunEvents(store.db,()=>{throw Error('Forced raids must not roll the normal event table');});
  for(const floor of [3,4,5,6,7]){
   store.db.prepare("UPDATE runs SET floor=?,state='select' WHERE id=?").run(floor,run);
   events.encounter(run,floor-1);
   const pending=store.view(owner).run!.event!;
   assert.equal(pending.kind,'raid-encounter');assert.equal(pending.afterFloor,floor-1);assert.ok(pending.raid);
   store.chooseEvent(owner,run,pending.id,'skip');
  }
 }finally{store.close();}
});
