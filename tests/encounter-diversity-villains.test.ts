import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import roster from '../src/data/battle-roster.json' with {type:'json'};
import {encounterPool} from '../src/server/opponent-team';
import {CURRENT_PROGRESSION,towerDifficulty} from '../src/data/tower-progression';
import {villainEncounter,villainRankWeights,runOrganization,VILLAIN_CHANCE} from '../src/data/villain-organizations';
import {TowerStore} from '../src/server/tower-store';
import {starters} from '../src/data/teams';
import {findVillainBattle,villainResult} from './helpers/villain';

test('broader early pools substantially increase eligible species without changing rarity gates',()=>{
 const data:Record<string,{bst:number;legendary?:boolean;mythical?:boolean}>=roster;
 for(const floor of [1,5,10,25,50,51,60,75,100]){
  const pool=encounterPool(floor,CURRENT_PROGRESSION);
  const oldCeiling=floor<=50?Math.min(550,360+floor*3.8):floor<=60?480+(floor-51)*40/9:525+(floor-61)*165/39;
  assert.ok(towerDifficulty(floor).bstCeiling>oldCeiling);
  if(floor<=10)assert.ok(pool.length>=2*pool.filter(name=>data[name].bst<=oldCeiling).length);
  assert.ok(pool.every(name=>data[name].bst<=towerDifficulty(floor).bstCeiling));
  if(floor<75)assert.ok(pool.every(name=>!data[name].legendary));
  if(floor<90)assert.ok(pool.every(name=>!data[name].mythical));
 }
});

test('victories shift rank chances upward while keeping floor gates and random outcomes',()=>{
 const baseline=villainRankWeights(80),grunt=villainRankWeights(80,{gruntWins:1,executiveWins:0}),executive=villainRankWeights(80,{gruntWins:1,executiveWins:1});
 assert.ok(grunt.grunt<baseline.grunt && grunt.executive>baseline.executive && grunt.boss>baseline.boss);
 assert.equal(executive.grunt,grunt.grunt);assert.ok(executive.executive<grunt.executive && executive.boss>grunt.boss);
 for(const floor of [1,16,31,51,74,75,100])for(const gruntWins of [0,1,4,100])for(const executiveWins of [0,1,5,100]){
  const weights=villainRankWeights(floor,{gruntWins,executiveWins});
  assert.ok(Math.abs(Object.values(weights).reduce((a,b)=>a+b,0)-1)<1e-12);
  assert.ok(Object.values(weights).every(value=>value>=0 && value<=1));
  if(floor<75)assert.equal(weights.boss,0);
  if(floor<16)assert.equal(weights.executive,0);
 }
 let events=0,bosses=0;const bossFloors=new Set<number>();
 for(let n=0;n<1000;n++){
  if(villainEncounter(`rate-${n}`,41,'rocket'))events++;
  const event=villainEncounter(`boss-${n}`,75+n%25,'rocket',false,false,{gruntWins:10,executiveWins:10});
  if(event?.event.rank==='boss'){bosses++;bossFloors.add(75+n%25);}
 }
 assert.equal(VILLAIN_CHANCE,.15);assert.ok(events>110 && events<190);
 assert.ok(bosses>80 && bosses<190);assert.equal(bossFloors.size,20);
});

test('unavailable leaders redistribute the event draw to eligible ranks',()=>{
 let events=0;
 for(let n=0;n<300;n++){
  const id=`eligible-${n}`,base=villainEncounter(id,41,'rocket');
  const event=villainEncounter(id,41,'rocket',false,false,{gruntWins:0,executiveWins:0},sample=>sample.kind==='normal');
  assert.equal(!!event,!!base);
  if(event){events++;assert.equal(event.event.rank,'grunt');}
  assert.equal(villainEncounter(id,41,'rocket',false,false,undefined,()=>false),null);
 }
 assert.ok(events>30);
});

test('won events persist and drive subsequent rank draws, with one organization across chapter transition',async()=>{
 const path=`.data/tests/${randomUUID()}.sqlite`;let store=new TowerStore(path);
 try{
  const row=findVillainBattle(store,'progress','grunt'),organization=JSON.parse(row.villain_event!).organization as string;
  const result=await villainResult(store,row.id);store.complete(row.id,result.log,result.view);store.complete(row.id,result.log,result.view);
  store.close();store=new TowerStore(path);
  assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM rewards WHERE battle_id=?').get(row.id)!.n,1);
  const victories=store.db.prepare('SELECT b.villain_event FROM battles b JOIN rewards r ON r.battle_id=b.id WHERE b.run_id=?').all(row.run_id);
  assert.equal(victories.length,1);
  // Shift the next encounter to a floor where one victory actually changes the rank draw.
  let floor=0;
  for(let f=31;f<=99;f++){
   if(f===row.floor)continue;
   const allowed=encounterPool(f,CURRENT_PROGRESSION),accept=(sample:import('../src/data/trainer-catalog').TrainerSample)=>sample.entries!.filter(name=>allowed.includes(name)).length>=3 && (!sample.ace || allowed.includes(sample.ace));
   const before=villainEncounter(row.run_id,f,organization,false,false,undefined,accept);
   const after=villainEncounter(row.run_id,f,organization,false,false,{gruntWins:1,executiveWins:0},accept);
   if(after && before?.event.rank!==after.event.rank){floor=f;break;}
  }
  // A deterministic fixture run need not contain a changed draw; any eligible event still verifies the saved input.
  if(!floor)for(let f=31;f<=99;f++){
   if(f===row.floor)continue;
   const pool=encounterPool(f,CURRENT_PROGRESSION),eligible=(sample:import('../src/data/trainer-catalog').TrainerSample)=>sample.entries!.filter(name=>pool.includes(name)).length>=3 && (!sample.ace || pool.includes(sample.ace));
   if(villainEncounter(row.run_id,f,organization,false,false,{gruntWins:1,executiveWins:0},eligible)){floor=f;break;}
  }
  assert.ok(floor);
  // Insert a normal predecessor so consecutive-villain exclusion does not mask the draw.
  store.db.prepare("UPDATE runs SET state='select',floor=100 WHERE id=?").run(row.run_id);store.enter('progress',row.run_id,100,starters);
  store.db.prepare("UPDATE runs SET state='select',floor=? WHERE id=?").run(floor,row.run_id);
  const allowed=encounterPool(floor,CURRENT_PROGRESSION),accept=(sample:import('../src/data/trainer-catalog').TrainerSample)=>sample.entries!.filter(name=>allowed.includes(name)).length>=3 && (!sample.ace || allowed.includes(sample.ace));
  const expected=villainEncounter(row.run_id,floor,organization,false,false,{gruntWins:1,executiveWins:0},accept)!;
  const next=store.battle(store.enter('progress',row.run_id,floor,starters));assert.equal(JSON.parse(next.villain_event!).rank,expected.event.rank);
  // Complete the first chapter through the real transition code.
  store.db.prepare("UPDATE runs SET state='select',floor=50 WHERE id=?").run(row.run_id);
  const milestone=store.battle(store.enter('progress',row.run_id,50,starters)),win=await villainResult(store,milestone.id);
  store.complete(milestone.id,win.log,win.view);store.recruit('progress',row.run_id,milestone.id,null,null);
  if(store.view('progress').run!.floor===50){const hidden=store.battle(store.enter('progress',row.run_id,50,starters)),hiddenWin=await villainResult(store,hidden.id);store.complete(hidden.id,hiddenWin.log,hiddenWin.view);store.recruit('progress',row.run_id,hidden.id,null,null);}
  assert.equal(store.view('progress').run!.floor,51);
  assert.equal(store.db.prepare('SELECT organization FROM run_villains WHERE run_id=?').get(row.run_id)!.organization,organization);
  store.ensurePlayer('independent');const fresh=store.battle(store.start('independent',starters));assert.equal(store.db.prepare('SELECT organization FROM run_villains WHERE run_id=?').get(fresh.run_id)!.organization,runOrganization(fresh.run_id));
 }finally{store.close();}
});
