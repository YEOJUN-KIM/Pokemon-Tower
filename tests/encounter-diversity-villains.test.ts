import {test} from 'node:test';
import assert from 'node:assert/strict';
import roster from '../src/data/battle-roster.json' with {type:'json'};
import {encounterPool} from '../src/server/opponent-team';
import {CURRENT_PROGRESSION,towerDifficulty} from '../src/data/tower-progression';
import {villainEncounter,villainRankWeights,VILLAIN_CHANCE} from '../src/data/villain-organizations';

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
 for(let n=0;n<4000;n++){
  if(villainEncounter(`rate-${n}`,41,'rocket'))events++;
  const event=villainEncounter(`boss-${n}`,75+n%25,'rocket',false,false,{gruntWins:10,executiveWins:10});
  if(event?.event.rank==='boss'){bosses++;bossFloors.add(75+n%25);}
 }
 assert.equal(VILLAIN_CHANCE,.08);assert.ok(events>240 && events<400);
 assert.ok(bosses>120 && bosses<340);assert.equal(bossFloors.size,20);
});

test('unavailable leaders redistribute the event draw to eligible ranks',()=>{
 let events=0;
 for(let n=0;n<600;n++){
  const id=`eligible-${n}`,base=villainEncounter(id,41,'rocket');
  const event=villainEncounter(id,41,'rocket',false,false,{gruntWins:0,executiveWins:0},sample=>sample.kind==='normal');
  assert.equal(!!event,!!base);
  if(event){events++;assert.equal(event.event.rank,'grunt');}
  assert.equal(villainEncounter(id,41,'rocket',false,false,undefined,()=>false),null);
 }
 assert.ok(events>30);
});
