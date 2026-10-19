import test from 'node:test';
import assert from 'node:assert/strict';
import {raidFixture} from './raid-fixture';
import {RunEvents} from '../src/server/run-events';
import {eventEncounterSettings} from '../src/data/run-events';
import {VillainCampaigns} from '../src/server/villain-campaigns';

test('live registry uses the normal gate and cooldown, without forced Raid or villain-only candidates',()=>{
 const {store,owner,run,event}=raidFixture();try{
  store.chooseEvent(owner,run,event.id,'skip');
  // This regression isolates the general track; independent combinations have their own fixtures.
  new VillainCampaigns(store.db).enableTrack(run);
  store.db.prepare('UPDATE run_villain_tracks SET completed=1 WHERE run_id=?').run(run);
  let draw=0;const events=new RunEvents(store.db,()=>draw);
  store.db.prepare('UPDATE run_encounter_progress SET cleared_count=2 WHERE run_id=?').run(run);
  events.encounter(run,2);assert.equal(events.view(run),null);
  store.db.prepare('UPDATE run_encounter_progress SET cleared_count=4 WHERE run_id=?').run(run);
  store.db.prepare("UPDATE runs SET floor=5,state='select' WHERE id=?").run(run);
  draw=eventEncounterSettings.encounterPercent;
  events.encounter(run,4);assert.equal(events.view(run),null);
  draw=0;events.encounter(run,4);assert.equal(events.view(run)!.kind,'mystery-chest');
 }finally{store.close();}
});
