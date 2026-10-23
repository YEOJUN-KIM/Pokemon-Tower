import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {VillainCampaigns} from '../src/server/villain-campaigns';
import {RunEvents} from '../src/server/run-events';
import {villainCampaignTracks,campaignStage,villainChance,villainTrackEligible,villainStageMinFloor,type VillainOrganization} from '../src/data/villain-tracks';
import {villainTrackSample} from '../src/server/villain-track-samples';
import {snapshotVillainReward} from '../src/server/villain-track-rewards';
import {snapshotTrainerEventBattle} from '../src/server/trainer-event-battle';
import {normalNpcTemplate} from '../src/server/npc-templates';
import {CURRENT_PROGRESSION} from '../src/data/tower-progression';
import {trackFixture,trackEncounter,trackRegistry} from './villain-track-fixture';
import {finishChallengerBattle} from './challenger-fixture';
import {transaction} from '../src/server/storage/transaction';
import {eventDefinitions,eventEncounterSettings} from '../src/data/run-events';
import {canEquipGimmick} from '../src/data/gimmicks';
import {starters} from '../src/data/teams';

test('fixed organization order references complete reviewed samples/templates',()=>{
 assert.equal(eventEncounterSettings.encounterPercent,20);
 assert.deepEqual(Object.keys(villainCampaignTracks),['rocket','magma','aqua','galactic','plasma','flare','skull','macrocosmos']);
 for(const [org,track] of Object.entries(villainCampaignTracks)){
  assert.deepEqual(track.stages.slice(0,2).map(s=>s.key),['grunt-1','grunt-2']);
  for(const stage of track.stages){
   assert.ok(stage.sampleId,`${org}/${stage.key} must have a reviewed sample`);
   const sample=villainTrackSample(stage.sampleId);assert.equal(sample.role,'villain');
   assert.ok(normalNpcTemplate(sample.id,villainStageMinFloor[stage.rank],sample.role),sample.id);
   const snapshot=snapshotTrainerEventBattle(`validation-${org}-${stage.key}`,sample,villainStageMinFloor[stage.rank],'basic',CURRENT_PROGRESSION);
   assert.equal(snapshot.team.length,3);assert.ok(snapshot.opponentTeam);assert.equal(snapshot.aiVersion,'tower-policy-v13');
  }
 }
 assert.deepEqual(villainCampaignTracks.rocket.stages.map(s=>s.sampleId),['rocket-grunt','rocket-grunt','named-ariana','named-archer','named-giovanni']);
 assert.deepEqual(villainCampaignTracks.skull.stages.map(s=>s.sampleId),['skull-grunt','skull-grunt','named-guzma','named-faba','named-lusamine']);
 assert.equal(JSON.stringify(villainCampaignTracks.skull).includes('plumeria'),false);
 assert.equal(JSON.stringify(villainCampaignTracks).includes('named-n"'),false);
});

test('minimum floor, chronology gap, bounded pity and boss unlock gap',()=>{
 assert.deepEqual(Array.from({length:12},(_,i)=>villainChance(i)),[5,8,11,14,17,20,23,26,29,32,35,35]);
 for(const stage of Object.values(villainCampaignTracks).flatMap(t=>t.stages)){
  const min=villainStageMinFloor[stage.rank],gap=stage.rank==='boss'?5:3;
  assert.equal(villainTrackEligible(stage,min-1,100,null),false);
  assert.equal(villainTrackEligible(stage,min,12,10),false);
  assert.equal(villainTrackEligible(stage,min,10+gap,10),true);
 }
 assert.equal(villainTrackEligible(campaignStage('rocket',2),24,100,null),false);
 assert.equal(villainTrackEligible(campaignStage('rocket',2),25,100,null),true);
 assert.equal(villainTrackEligible(undefined,100,100,null),false);
});

for(const general of [false,true])for(const villain of [false,true])test(`independent results: general ${general}, villain ${villain}; sequential modals and one saved judgement`,()=>{
 const draws=[general?0:99,...(general?[0]:[]),villain?0:99],f=trackFixture(':memory:','galactic','track',()=>draws.shift()??99),s=f.store;
 try{
  if(general){const event=s.view(f.owner).run!.event!;assert.equal(event.kind,'mystery-chest');assert.equal(s.db.prepare('SELECT COUNT(*) AS n FROM villain_event_encounters').get()!.n,0);s.chooseEvent(f.owner,f.run,event.id,'skip');s.chooseEvent(f.owner,f.run,event.id,'skip');}
  assert.equal(s.view(f.owner).run!.event?.kind??null,villain?'villain-campaign':null);
  assert.equal(new VillainCampaigns(s.db).track(f.run)!.pity,villain?0:1);
  assert.equal(draws.length,0);const state=new VillainCampaigns(s.db).track(f.run);
  new RunEvents(s.db,()=>{throw Error('must not reroll');},trackRegistry).followup(f.run);
  assert.deepEqual(new VillainCampaigns(s.db).track(f.run),state);
  assert.ok(Number(s.db.prepare("SELECT COUNT(*) AS n FROM run_events WHERE status!='complete'").get()!.n)<=1);
 }finally{s.close();}
});

for(const organization of Object.keys(villainCampaignTracks) as VillainOrganization[])test(`${organization}: sequential wins, no replay, exact reward and completed end`,()=>{
 const f=trackFixture(':memory:',organization),s=f.store;
 try{
  s.chooseEvent(f.owner,f.run,s.view(f.owner).run!.event!.id,'skip');
  const campaigns=new VillainCampaigns(s.db);
  for(const [index,stage] of villainCampaignTracks[organization].stages.entries()){
   if(index)trackEncounter(s,f.run,Math.max(2,villainStageMinFloor[stage.rank]),index*20+1);
   const e=s.view(f.owner).run!.event;
   assert.equal(e!.villain!.stage,stage.key);assert.equal(e!.kind,'villain-campaign');
   assert.throws(()=>s.chooseEvent(f.owner,f.run,e!.id,'skip'));
   const saved=campaigns.row(e!.id)!,snap=campaigns.snapshot(saved),before=s.view(f.owner),floor=before.run!.floor;
   s.chooseEvent(f.owner,f.run,e!.id,'challenge');const b=s.currentBattle(f.owner)!;s.chooseEvent(f.owner,f.run,e!.id,'challenge');
   assert.equal(b.opponent_team,snap.opponentTeam);assert.equal(campaigns.row(e!.id)!.snapshot_json,saved.snapshot_json);
   const receipt=finishChallengerBattle(s,b.id);s.complete(b.id,receipt.log,receipt.view);
   assert.equal(campaigns.track(f.run)!.stage_index,index+1);assert.equal(campaigns.track(f.run)!.grunt_wins,Math.min(index+1,2));
   assert.equal(s.view(f.owner).run!.floor,floor);assert.equal(s.view(f.owner).run!.state,'select');assert.deepEqual(s.view(f.owner).run!.candidates,[]);
   assert.equal(s.view(f.owner).coins-before.coins,Number(snap.reward.entries[0].kind==='coins'&&snap.reward.entries[0].amount));
   if(stage.rank==='boss')assert.equal(s.db.prepare("SELECT quantity FROM reward_egg_tickets WHERE player_id=? AND kind='superRare'").get(f.owner)!.quantity,1);
   s.continueEvent(f.owner,f.run,e!.id);assert.equal(s.view(f.owner).run!.event,null);
  }
  assert.equal(campaigns.track(f.run)!.completed,1);trackEncounter(s,f.run,100,150);assert.equal(s.view(f.owner).run!.event,null);
 }finally{s.close();}
});

test('pity only grows on eligible new judgements, survives backward teleport/reopen and resets on appearance',()=>{
 const path=`.data/tests/track-${randomUUID()}.sqlite`,f=trackFixture(path);let s=f.store;
 try{
  s.chooseEvent(f.owner,f.run,s.view(f.owner).run!.event!.id,'skip');const e=s.view(f.owner).run!.event!;s.chooseEvent(f.owner,f.run,e.id,'challenge');finishChallengerBattle(s,s.currentBattle(f.owner)!.id);s.continueEvent(f.owner,f.run,e.id);
  trackEncounter(s,f.run,41,2,()=>99);assert.equal(new VillainCampaigns(s.db).track(f.run)!.pity,0);
  trackEncounter(s,f.run,12,4,()=>99);assert.equal(new VillainCampaigns(s.db).track(f.run)!.pity,1);
  const before=new VillainCampaigns(s.db).track(f.run);s.close();s=new TowerStore(path,()=>0,trackRegistry);assert.deepEqual(new VillainCampaigns(s.db).track(f.run),before);
  trackEncounter(s,f.run,12,5,()=>0);assert.equal(new VillainCampaigns(s.db).track(f.run)!.pity,0);const snap=new VillainCampaigns(s.db).row(s.view(f.owner).run!.event!.id)!.snapshot_json;
  s.close();s=new TowerStore(path,()=>99,trackRegistry);assert.equal(new VillainCampaigns(s.db).row(s.view(f.owner).run!.event!.id)!.snapshot_json,snap);
 }finally{s.close();}
});

test('new track loss/retry uses existing snapshot and shared retry receipt; win rollback is atomic',()=>{
 const f=trackFixture(),s=f.store;try{
  s.chooseEvent(f.owner,f.run,s.view(f.owner).run!.event!.id,'skip');const event=s.view(f.owner).run!.event!,campaigns=new VillainCampaigns(s.db),json=campaigns.row(event.id)!.snapshot_json;
  s.chooseEvent(f.owner,f.run,event.id,'challenge');const b=s.currentBattle(f.owner)!,state=campaigns.track(f.run),coins=s.view(f.owner).coins;
  finishChallengerBattle(s,b.id,'Tower AI');assert.deepEqual(campaigns.track(f.run),state);assert.ok(s.view(f.owner).coins<=coins);const lossCoins=s.view(f.owner).coins;
  s.retry(f.owner,f.run,b.id);s.retry(f.owner,f.run,b.id);const next=s.enter(f.owner,f.run,b.floor,[...s.view(f.owner).run!.roster]);
  assert.equal(s.battle(next).opponent_team,b.opponent_team);assert.equal(s.battle(next).seed,b.seed);assert.equal(campaigns.row(event.id)!.snapshot_json,json);const retryCoins=s.view(f.owner).coins;
  s.db.exec("CREATE TRIGGER fail_track_receipt BEFORE UPDATE OF claimed ON villain_event_encounters BEGIN SELECT RAISE(ABORT,'fixture receipt failure'); END;");
  assert.throws(()=>finishChallengerBattle(s,next),/fixture receipt/);assert.deepEqual(campaigns.track(f.run),state);assert.equal(s.view(f.owner).coins,retryCoins);
  s.db.exec('DROP TRIGGER fail_track_receipt');finishChallengerBattle(s,next);assert.equal(campaigns.track(f.run)!.stage_index,1);
 }finally{s.close();}
});

test('rank rewards: coins, automatic vitamins/voucher, usable missing gimmick/fallback, permanent boss ticket',()=>{
 const f=trackFixture(),s=f.store;try{
  const reward=(rank:'grunt'|'officer'|'executive'|'boss',roll=()=>0)=>snapshotVillainReward(s.db,f.run,'galactic',rank==='grunt'?'grunt-1':rank,rank,roll).entries;
  assert.equal(reward('grunt').length,1);assert.deepEqual(reward('officer').slice(1).map(e=>e.kind),['vitamin','vitamin']);assert.equal(reward('officer',()=>99)[1].kind,'tool-voucher');
  assert.equal(reward('executive')[1].kind,'tool-voucher');
  s.db.prepare("UPDATE run_rules SET rule='mega' WHERE run_id=?").run(f.run);const mega=reward('executive')[1];assert.equal(mega.kind,'item-exchange');
  if(mega.kind==='item-exchange'){assert.ok(starters.some(s=>canEquipGimmick(s,mega.items[0])));s.db.prepare('INSERT INTO run_item_bag VALUES (?,?,1)').run(f.run,mega.items[0]);}
  assert.equal(reward('executive')[1].kind,'tool-voucher');
  s.db.prepare("UPDATE run_rules SET rule='tera' WHERE run_id=?").run(f.run);assert.deepEqual(reward('executive')[1],{kind:'trainer-equipment',item:'Tera Orb',amount:1,fallbackPoints:100});
  assert.deepEqual(reward('boss')[1],{kind:'typed-egg-ticket',eggKind:'superRare',amount:1});
 }finally{s.close();}
});

test('v45 additive migration preserves active snapshot, receipts, pity and foreign keys on repeated reopen',()=>{
 const path=`.data/tests/migrate-track-${randomUUID()}.sqlite`,f=trackFixture(path);let s=f.store;try{
  const before=s.view(f.owner);s.db.exec('DROP TABLE tool_voucher_draws; DROP TABLE run_event_followups; DROP TABLE run_villain_tracks; PRAGMA user_version=45');
  s.close();s=new TowerStore(path,()=>0,trackRegistry);assert.equal(s.db.prepare('PRAGMA user_version').get()!.user_version,47);assert.deepEqual(s.view(f.owner),before);assert.deepEqual(s.db.prepare('PRAGMA foreign_key_check').all(),[]);
  const state=s.view(f.owner);s.close();s=new TowerStore(path,()=>0,trackRegistry);assert.deepEqual(s.view(f.owner),state);
 }finally{s.close();}
});

test('general Teleport finishes first; backward destination including floor 1 preserves chronology and permits the queued battle',()=>{
 const registry={...trackRegistry,'random-teleport':eventDefinitions['random-teleport']};
 const s=new TowerStore(':memory:',()=>0,registry);try{
  s.ensurePlayer('p');const first=s.start('p',starters,'basic',{events:true}),run=s.battle(first).run_id;
  finishChallengerBattle(s,first);
  s.db.prepare("UPDATE runs SET state='select',floor=40 WHERE id=?").run(run);
  s.db.prepare('INSERT INTO run_encounter_progress VALUES (?,39)').run(run);
  s.db.prepare("INSERT INTO run_villain_tracks(run_id,organization,stage_index,grunt_wins,last_event_order) VALUES (?,'galactic',1,1,30)").run(run);
  const events=new RunEvents(s.db,()=>0,{'random-teleport':eventDefinitions['random-teleport']});transaction(s.db,()=>events.encounter(run,39));const teleport=events.view(run)!;
  s.chooseEvent('p',run,teleport.id,'teleport');assert.equal(s.view('p').run!.floor,1);assert.equal(s.view('p').run!.event!.kind,'random-teleport');
  s.continueEvent('p',run,teleport.id);const event=s.view('p').run!.event!;assert.equal(event.kind,'villain-campaign');assert.equal(event.villain!.stage,'grunt-2');assert.equal(new VillainCampaigns(s.db).track(run)!.last_event_order,39);
  s.chooseEvent('p',run,event.id,'challenge');assert.equal(s.currentBattle('p')!.floor,1);finishChallengerBattle(s,s.currentBattle('p')!.id);assert.equal(new VillainCampaigns(s.db).track(run)!.grunt_wins,2);assert.equal(s.view('p').run!.floor,1);
 }finally{s.close();}
});
