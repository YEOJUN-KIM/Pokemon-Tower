import test from 'node:test';
import assert from 'node:assert/strict';
import {raidFixture} from './raid-fixture';
import {RunEvents} from '../src/server/run-events';
import {raidEventTestSettings} from '../src/data/raids';
import {villainEventTestSettings} from '../src/data/villain-campaigns';

test('manual Raid settings remain preserved while the temporary villain-only override takes priority',()=>{
 const {store,owner,run,event}=raidFixture();try{
  assert.deepEqual(raidEventTestSettings,{enabled:true,startFloor:3});assert.equal(villainEventTestSettings.onlyVillainEvents,true);
  store.chooseEvent(owner,run,event.id,'skip');
  const events=new RunEvents(store.db,()=>0);
  store.db.prepare('UPDATE run_encounter_progress SET cleared_count=2 WHERE run_id=?').run(run);
  events.encounter(run,2);assert.equal(events.view(run),null);
  store.db.prepare('UPDATE run_encounter_progress SET cleared_count=4 WHERE run_id=?').run(run);
  store.db.prepare("UPDATE runs SET floor=5,state='select' WHERE id=?").run(run);
  events.encounter(run,4);assert.equal(events.view(run)!.kind,'rocket-intro');
 }finally{store.close();}
});
