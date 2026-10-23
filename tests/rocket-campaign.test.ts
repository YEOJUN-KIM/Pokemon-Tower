import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {RunEvents} from '../src/server/run-events';
import {VillainCampaigns} from '../src/server/villain-campaigns';
import {campaignEligible,emptyCampaign,rocketCampaignSettings} from '../src/data/villain-campaigns';
import {organizationGrunt,villainLeaders} from '../src/data/villain-organizations';
import {selectTrainerSample} from '../src/server/opponent-team';
import {starters} from '../src/data/teams';
import {eventDefinitions,eventEncounterSettings} from '../src/data/run-events';
import {selectRunEvent} from '../src/game/run-events';
import {rocketFixture,nextRocketEvent,rocketRegistry} from './rocket-fixture';
import {finishChallengerBattle} from './challenger-fixture';
import {transaction} from '../src/server/storage/transaction';
import Showdown from 'pokemon-showdown';
import {FORMAT,runBattle} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
import {TowerService} from '../src/server/tower-service';
import {presentationFrames} from '../src/web/battle-presentation';

test('pre-tier pending Rocket snapshots retain v10 and their original frozen team',()=>{
 const f=rocketFixture(),s=f.store;try{
  const campaigns=new VillainCampaigns(s.db),snapshot=campaigns.snapshot(campaigns.row(f.event.id)!);
  delete snapshot.aiVersion;delete snapshot.trainer.npcAi;
  const json=JSON.stringify(snapshot);
  s.db.prepare('UPDATE villain_event_encounters SET snapshot_json=? WHERE event_id=?').run(json,f.event.id);
  s.chooseEvent(f.owner,f.run,f.event.id,'challenge');const b=s.currentBattle(f.owner)!;
  assert.equal(b.ai_version,'tower-policy-v10');assert.equal(b.opponent_team,snapshot.opponentTeam);
  assert.equal(JSON.parse(b.trainer!).npcAi,undefined);assert.equal(campaigns.row(f.event.id)!.snapshot_json,json);
 }finally{s.close();}
});

test('normal random draws exclude villains in legacy and common pools; ordinary floor creation never rolls villains',()=>{
 for(const progression of ['legacy','hundred-floor-v1'] as const)for(const common of [false,true])for(let floor=1;floor<=100;floor++)for(let n=0;n<8;n++)assert.notEqual(selectTrainerSample(floor,[n,2,3,4],[],progression,{common}).role,'villain');
 const s=new TowerStore(':memory:');try{
  s.ensurePlayer('p');const first=s.battle(s.start('p',starters));
  for(let floor=1;floor<=100;floor++)if(floor%5){s.db.prepare("UPDATE runs SET floor=?,state='select' WHERE id=?").run(floor,first.run_id);const b=s.battle(s.enter('p',first.run_id,floor,starters));assert.equal(b.villain_event,null);assert.notEqual(JSON.parse(b.trainer!).role,'villain');}
 }finally{s.close();}
});

test('intro decline preserves eligibility, cooldown, global chance and single weighted selection',()=>{
 const f=rocketFixture();try{
  assert.equal(f.event.kind,'rocket-intro');assert.equal(campaignEligible('rocket-intro',emptyCampaign,31),false);
  f.store.chooseEvent(f.owner,f.run,f.event.id,'skip');assert.deepEqual(new VillainCampaigns(f.store.db).state(f.run),emptyCampaign);
  const events=new RunEvents(f.store.db,()=>0,rocketRegistry);events.encounter(f.run,2);assert.equal(events.view(f.run),null);
  assert.equal(nextRocketEvent(f.store,f.run).kind,'rocket-intro');
  assert.equal(f.store.db.prepare("SELECT COUNT(*) AS n FROM run_events WHERE run_id=? AND status!='complete'").get(f.run)!.n,1);
  assert.equal(selectRunEvent(1,null,()=>eventEncounterSettings.encounterPercent,rocketRegistry,2),null);
  assert.equal(selectRunEvent(4,3,()=>0,rocketRegistry,2,4),null);
 }finally{f.store.close();}
});

test('live registry keeps ordinary candidates before and after a campaign, with cooldown and injected registries',()=>{
 const f=rocketFixture(),s=f.store;try{
  s.chooseEvent(f.owner,f.run,f.event.id,'skip');
  const live=new RunEvents(s.db,()=>0);
  s.db.prepare('UPDATE run_encounter_progress SET cleared_count=2 WHERE run_id=?').run(f.run);
  live.encounter(f.run,2);assert.equal(live.view(f.run),null);
  s.db.prepare('UPDATE run_encounter_progress SET cleared_count=4 WHERE run_id=?').run(f.run);
  live.encounter(f.run,4);const intro=live.view(f.run)!;assert.equal(intro.kind,'mystery-chest');
  s.db.prepare("UPDATE runs SET floor=5 WHERE id=?").run(f.run);live.choose(f.owner,f.run,intro.id,'skip');
  s.db.prepare('INSERT INTO run_organization_campaigns VALUES (?,?,?,?,?,?,?,?)').run(f.run,'rocket',1,2,1,1,1,1);
  s.db.prepare('UPDATE run_encounter_progress SET cleared_count=7 WHERE run_id=?').run(f.run);
  live.encounter(f.run,7);assert.equal(live.view(f.run)!.kind,'mystery-chest');
  s.db.prepare("UPDATE runs SET floor=8 WHERE id=?").run(f.run);live.choose(f.owner,f.run,live.view(f.run)!.id,'skip');
  s.db.prepare('UPDATE run_encounter_progress SET cleared_count=10 WHERE run_id=?').run(f.run);
  const chest=new RunEvents(s.db,()=>0,{'mystery-chest':eventDefinitions['mystery-chest']});
  chest.encounter(f.run,8);assert.equal(chest.view(f.run)!.kind,'mystery-chest');
 }finally{s.close();}
});

test('full Rocket chain reuses source samples, freezes snapshots, pays/progresses once and bypasses normal floor/recruitment',()=>{
 const path=`.data/tests/rocket-${randomUUID()}.sqlite`,f=rocketFixture(path);let s=f.store;
 try{
  for(const [index,stage] of ['rocket-intro','rocket-ambush','rocket-ambush','rocket-officer','rocket-boss'].entries()){
   const event=index?nextRocketEvent(s,f.run):f.event;assert.equal(event.kind,stage);
   const saved=new VillainCampaigns(s.db).row(event.id)!,snapshot=new VillainCampaigns(s.db).snapshot(saved);
   const source=stage==='rocket-officer'?villainLeaders.rocket.executive:stage==='rocket-boss'?villainLeaders.rocket.boss:organizationGrunt('rocket');assert.deepEqual(snapshot.sample,source);
   const before=s.view(f.owner),order=s.db.prepare('SELECT cleared_count FROM run_encounter_progress WHERE run_id=?').get(f.run)!.cleared_count;
   s.close();s=new TowerStore(path,()=>0,rocketRegistry);
   assert.equal(new VillainCampaigns(s.db).row(event.id)!.snapshot_json,saved.snapshot_json);
   s.chooseEvent(f.owner,f.run,event.id,'challenge');const b=s.currentBattle(f.owner)!;
   assert.equal(b.ai_version,snapshot.aiVersion);assert.deepEqual(JSON.parse(b.trainer!).npcAi,snapshot.trainer.npcAi);assert.equal(b.opponent_team,snapshot.opponentTeam);assert.equal(JSON.parse(b.trainer!).id,source.id);
   s.chooseEvent(f.owner,f.run,event.id,'challenge');assert.equal(s.currentBattle(f.owner)!.id,b.id);
   s.close();s=new TowerStore(path,()=>0,rocketRegistry);assert.equal(s.currentBattle(f.owner)!.opponent_team,b.opponent_team);
   const receipt=finishChallengerBattle(s,b.id);s.complete(b.id,receipt.log,receipt.view);
   const after=s.view(f.owner),state=new VillainCampaigns(s.db).state(f.run);
   assert.equal(after.coins-before.coins,snapshot.reward.entries[0].kind==='coins'?snapshot.reward.entries[0].amount:0);
   assert.equal(after.run!.floor,before.run!.floor);assert.equal(after.run!.state,'select');assert.equal(after.run!.victories,before.run!.victories);assert.deepEqual(after.run!.candidates,[]);
   assert.equal(s.db.prepare('SELECT cleared_count FROM run_encounter_progress WHERE run_id=?').get(f.run)!.cleared_count,order);
   assert.throws(()=>s.recruit(f.owner,f.run,b.id,null,null));assert.equal(s.db.prepare('SELECT COUNT(*) AS n FROM run_events WHERE run_id=?').get(f.run)!.n,index+1);
   assert.equal(state.started,1);assert.equal(state.clues,Math.min(index,2));
   if(index===2){assert.equal(campaignEligible('rocket-ambush',state,1),false);assert.equal(campaignEligible('rocket-officer',state,1),true);}
   if(index===3){assert.equal(state.boss_location_known,1);assert.equal(campaignEligible('rocket-officer',state,1),false);assert.equal(campaignEligible('rocket-boss',state,1),true);}
   if(index===4){assert.equal(state.completed,1);assert.equal(state.boss_defeated,1);for(const kind of Object.keys(rocketCampaignSettings.stages))assert.equal(new VillainCampaigns(s.db).eligible(f.run,kind as keyof typeof rocketCampaignSettings.stages,1),false);}
  }
  assert.deepEqual(s.db.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{s.close();}
});

for(const ambush of [false,true])test(`${ambush?'ambush':'intro'} loss and duplicate retry preserve opponent/reward and never advance early`,()=>{
 const f=rocketFixture(),s=f.store;try{
  let event=f.event;if(ambush){s.chooseEvent(f.owner,f.run,event.id,'challenge');finishChallengerBattle(s,s.currentBattle(f.owner)!.id);event=nextRocketEvent(s,f.run);}
  const campaigns=new VillainCampaigns(s.db),before=campaigns.state(f.run),coins=s.view(f.owner).coins,snapshot=campaigns.row(event.id)!.snapshot_json;
  s.chooseEvent(f.owner,f.run,event.id,'challenge');const lost=s.currentBattle(f.owner)!;finishChallengerBattle(s,lost.id,'Tower AI');
  assert.deepEqual(campaigns.state(f.run),before);assert.equal(s.db.prepare('SELECT coins FROM players WHERE id=?').get(f.owner)!.coins,coins);
  s.retry(f.owner,f.run,lost.id);s.retry(f.owner,f.run,lost.id);const id=s.enter(f.owner,f.run,lost.floor,starters),retry=s.battle(id);
  assert.equal(retry.ai_version,lost.ai_version);assert.equal(retry.trainer,lost.trainer);assert.equal(retry.opponent_team,lost.opponent_team);assert.equal(retry.seed,lost.seed);assert.equal(retry.tera_tickets,lost.tera_tickets);assert.equal(campaigns.row(event.id)!.snapshot_json,snapshot);
  const receipt=finishChallengerBattle(s,id);s.complete(id,receipt.log,receipt.view);assert.equal(campaigns.state(f.run).clues,ambush?1:0);assert.equal(campaigns.state(f.run).started,1);
  assert.equal(s.db.prepare('SELECT used FROM run_retries WHERE run_id=?').get(f.run)!.used,1);
 }finally{s.close();}
});

test('failed victory receipt rolls back campaign, wallet and battle together',()=>{
 const f=rocketFixture(),s=f.store;try{
  s.chooseEvent(f.owner,f.run,f.event.id,'challenge');const b=s.currentBattle(f.owner)!;
  s.db.exec("CREATE TRIGGER fail_rocket BEFORE UPDATE OF claimed ON villain_event_encounters BEGIN SELECT RAISE(ABORT,'receipt failure'); END");
  assert.throws(()=>finishChallengerBattle(s,b.id),/receipt failure/);assert.equal(s.battle(b.id).status,'active');assert.equal(s.view(f.owner).coins,180);assert.deepEqual(new VillainCampaigns(s.db).state(f.run),emptyCampaign);
  s.db.exec('DROP TRIGGER fail_rocket');finishChallengerBattle(s,b.id);assert.equal(new VillainCampaigns(s.db).state(f.run).started,1);
 }finally{s.close();}
});

test('backward Teleport preserves persisted clues and organization stage across restart; v43 upgrade is additive and idempotent',()=>{
 const path=`.data/tests/rocket-migration-${randomUUID()}.sqlite`,f=rocketFixture(path);let s=f.store;try{
  s.chooseEvent(f.owner,f.run,f.event.id,'challenge');finishChallengerBattle(s,s.currentBattle(f.owner)!.id);const ambush=nextRocketEvent(s,f.run);s.chooseEvent(f.owner,f.run,ambush.id,'challenge');finishChallengerBattle(s,s.currentBattle(f.owner)!.id);s.continueEvent(f.owner,f.run,ambush.id);
  const before=new VillainCampaigns(s.db).state(f.run);
  s.db.prepare("UPDATE runs SET floor=41,state='select' WHERE id=?").run(f.run);s.db.prepare('UPDATE run_encounter_progress SET cleared_count=cleared_count+3 WHERE run_id=?').run(f.run);
  const events=new RunEvents(s.db,()=>0,{'random-teleport':eventDefinitions['random-teleport']});transaction(s.db,()=>events.encounter(f.run,39));
  // Event location is the next normal floor; relocate the fixture to its actual door.
  s.db.prepare('UPDATE runs SET floor=40 WHERE id=?').run(f.run);const teleport=events.view(f.run)!;events.choose(f.owner,f.run,teleport.id,'teleport');events.continue(f.owner,f.run,teleport.id);
  assert.equal(s.view(f.owner).run!.floor,1);assert.deepEqual(new VillainCampaigns(s.db).state(f.run),before);
  s.close();s=new TowerStore(path,()=>0,rocketRegistry);assert.deepEqual(new VillainCampaigns(s.db).state(f.run),before);
  const snapshot=s.db.prepare('SELECT * FROM villain_event_encounters').all();s.db.exec('PRAGMA user_version=43');s.close();s=new TowerStore(path);
  assert.equal(s.db.prepare('PRAGMA user_version').get()!.user_version,47);assert.deepEqual(new VillainCampaigns(s.db).state(f.run),before);assert.deepEqual(s.db.prepare('SELECT * FROM villain_event_encounters').all(),snapshot);assert.deepEqual(s.db.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{s.close();}
});

test('actual v43 database without either new table upgrades while preserving an active battle and legacy receipt',()=>{
 const path=`.data/tests/rocket-v43-${randomUUID()}.sqlite`;let s=new TowerStore(path);try{
  s.ensurePlayer('old');const id=s.start('old',starters),before=s.battle(id),view=s.view('old');
  s.db.exec('DROP TABLE villain_event_encounters; DROP TABLE run_organization_campaigns; PRAGMA user_version=43');s.close();s=new TowerStore(path);
  assert.equal(s.db.prepare('PRAGMA user_version').get()!.user_version,47);assert.deepEqual(s.battle(id),before);assert.deepEqual(s.view('old'),view);
  assert.equal(s.db.prepare('SELECT COUNT(*) AS n FROM run_organization_campaigns').get()!.n,0);assert.deepEqual(s.db.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{s.close();}
});

test('grunt, officer and Giovanni snapshots are legal and run through the existing battle engine',async()=>{
 const f=rocketFixture(),s=f.store;try{
  for(let index=0;index<5;index++){
   const event=index?nextRocketEvent(s,f.run):f.event;s.chooseEvent(f.owner,f.run,event.id,'challenge');const b=s.currentBattle(f.owner)!;
   if(index!==1&&index!==2){
    const legality=Showdown.Teams.unpack(b.opponent_team)!;for(const set of legality){set.ivs={hp:31,atk:31,def:31,spa:31,spd:31,spe:31};set.gender='';set.pokeball='';set.evs={hp:1,atk:0,def:0,spa:0,spd:0,spe:0};}
    assert.equal(new Showdown.TeamValidator(FORMAT).validateTeam(legality),null);
    const log=await runBattle({rule:b.rule,teams:{p1:b.player_team,p2:b.opponent_team},seed:JSON.parse(b.seed),player:new DamagePolicy(),opponent:new DamagePolicy(),teraTickets:JSON.parse(b.tera_tickets),trainerEquipment:JSON.parse(b.trainer_equipment!)});
    assert.ok(log.winner);assert.ok(log.turns>0);
   }
   finishChallengerBattle(s,b.id);
  }
 }finally{s.close();}
});

test('special final action returns the last hit/faint/win for playback before showing the event reward',async()=>{
 const f=rocketFixture(),s=f.store,service=new TowerService(s);try{
  for(let index=0;index<5;index++){
   const event=index?nextRocketEvent(s,f.run):f.event;s.chooseEvent(f.owner,f.run,event.id,'challenge');const b=s.currentBattle(f.owner)!;
   if(index<3){finishChallengerBattle(s,b.id);continue;}
   const player=Showdown.Teams.pack(Showdown.Teams.import('Charizard\nAbility: Blaze\nLevel: 50\nEVs: 1 HP\n- Flamethrower\n\nBlastoise\nAbility: Torrent\nLevel: 50\nEVs: 1 HP\n- Surf\n\nVenusaur\nAbility: Overgrow\nLevel: 50\nEVs: 1 HP\n- Vine Whip')!);
   const opponent=Showdown.Teams.pack(Showdown.Teams.import('Magikarp\nAbility: Swift Swim\nLevel: 1\nEVs: 1 HP\n- Splash\n\nCaterpie\nAbility: Shield Dust\nLevel: 1\nEVs: 1 HP\n- Tackle\n\nWeedle\nAbility: Shield Dust\nLevel: 1\nEVs: 1 HP\n- Poison Sting')!);
   s.db.prepare('UPDATE battles SET player_team=?,opponent_team=? WHERE id=?').run(player,opponent,b.id);
   let before=await service.state(f.owner);assert.equal(before.battle!.status,'waiting',before.battle!.error??'');
   for(let turn=0;turn<2;turn++)before=await service.action(f.owner,b.id,before.battle!.requestId,'move 1');
   const result=await service.action(f.owner,b.id,before.battle!.requestId,'move 1');
   assert.equal(result.tower.run!.state,'select');assert.equal(result.tower.run!.event!.phase,'reward');
   assert.equal(result.battle!.status,'complete');assert.equal(result.battle!.winner,'Player');
   const frames=presentationFrames(before.battle!,result.battle!);
   assert.ok(frames.some(frame=>frame.motion?.kind==='hit'));
   assert.ok(frames.some(frame=>frame.motion?.kind==='faint'));
   assert.ok(result.battle!.messages.includes('|win|Player'));
   assert.ok(frames.every(frame=>frame.view.status==='waiting'&&frame.view.winner===null));
   assert.equal((await service.state(f.owner)).battle,null);
  }
 }finally{await service.dispose();s.close();}
});
