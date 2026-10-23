import {publicAssetExists} from './helpers/runtime-assets';
import test from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {npcTrainingProfiles,npcTrainingTargets,type NpcTrainingTier} from '../src/data/npc-training';
import {npcTrainingProfile,trainNpcTeam} from '../src/server/npc-training';
import {encounterRandom,generateOpponentTeam,normalOpponentSpecies} from '../src/server/opponent-team';
import {challengers,drawChallengers} from '../src/data/legacy-challengers';
import {ChallengerEvents} from '../src/server/challenger-events';
import {challengerFixture,finishChallengerBattle} from './challenger-fixture';
import {starters} from '../src/data/teams';
import {TowerStore} from '../src/server/tower-store';
import {statKeys} from '../src/data/training';
import {isHeldItem} from '../src/data/held-items';
import {FORMAT} from '../src/data/battle-rules';
import {randomUUID} from 'node:crypto';
import {existsSync} from 'node:fs';
const seed:[number,number,number,number]=[17,29,43,71];

test('absolute IV ranges, monotonic floors, deterministic rolls and legal EV budgets across every tier/floor',()=>{
 for(const tier of Object.keys(npcTrainingProfiles) as NpcTrainingTier[]){
  let priorMin=0,priorMax=0;
  for(let floor=1;floor<=100;floor++){
   const target=npcTrainingTargets(floor,tier),profile=npcTrainingProfile('Pikachu',['Thunderbolt'],floor,tier,'speed',encounterRandom(seed));
   assert.deepEqual(profile,npcTrainingProfile('Pikachu',['Thunderbolt'],floor,tier,'speed',encounterRandom(seed)));
   assert.ok(target.ivRange[0]>=priorMin&&target.ivRange[1]>=priorMax);
   [priorMin,priorMax]=target.ivRange;
   assert.ok(Object.values(profile.ivs).every(v=>v>=target.ivRange[0]&&v<=target.ivRange[1]&&v<=31));
   assert.ok(Object.values(profile.evs).every(v=>v<=32&&v>=0));
   assert.equal(Object.values(profile.evs).reduce((a,b)=>a+b,0),target.evBudget);
   assert.ok(target.evBudget<=66);
  }
 }
 const averages=['casual','advanced','elite'].map(tier=>Object.values(npcTrainingProfile('Pikachu',['Thunderbolt'],5,tier as NpcTrainingTier,'speed',encounterRandom(seed)).ivs).reduce((a,b)=>a+b,0)/6);
 assert.ok(averages[0]<averages[1]&&averages[1]<averages[2]);assert.ok(averages[2]>=16);
});

test('EV roles invest in attacks, speed and separate defenses instead of a shared HP bonus',()=>{
 const profile=(tactic:Parameters<typeof npcTrainingProfile>[4])=>npcTrainingProfile('Pikachu',['Thunderbolt'],40,'elite',tactic,encounterRandom(seed)).evs;
 assert.ok(profile('physical').atk>profile('physical').spa);
 assert.ok(profile('special').spa>profile('special').atk);
 assert.ok(profile('speed').spe>profile('speed').hp);
 assert.ok(profile('bulk').def>profile('physical').def);
 assert.ok(profile('bulk').spd>0);assert.ok(profile('status').spd>0);
});

test('item/build quality, distinct supported items, same-floor ordinary membership and legal packed battles',()=>{
 const validator=new Showdown.TeamValidator(FORMAT);
 for(const sample of challengers)for(const floor of [5,20,40,99]){
  const trainer={id:sample.trainerId,name:sample.title,title:'도전자',kind:sample.kind,generation:null,specialty:null,tactic:sample.tactic,portrait:sample.portrait,minFloor:1,concept:''};
  const generated=generateOpponentTeam(floor,seed,[],null,trainer,'hundred-floor-v1');
  const team=trainNpcTeam(generated,floor,sample.trainingTier,sample.tactic,seed,'basic');
  assert.deepEqual(team,trainNpcTeam(generated,floor,sample.trainingTier,sample.tactic,seed,'basic'));
  assert.deepEqual(team.map(p=>p.name),generated.map(p=>p.name));assert.ok(team.every(p=>normalOpponentSpecies(p.name)));
  const items=team.flatMap(p=>p.item?[p.item]:[]);assert.equal(items.length,new Set(items).size);assert.ok(items.every(isHeldItem));
  assert.equal(items.length,sample.trainingTier==='casual'?0:3);
  // Use the actual game packing conversion from point stats to battle stats.
  const {store,owner,run,event}=challengerFixture(':memory:','owner',floor,sample.id);
  try{
   store.chooseEvent(owner,run,event.id,sample.id);
   const battle=store.currentBattle(owner)!;
   const packed=Showdown.Teams.unpack(battle.opponent_team)!;
   const expectedTeam=trainNpcTeam(packed.map(set=>({name:set.species,moves:[]})),floor,sample.trainingTier,sample.tactic,JSON.parse(battle.seed),'basic');
   for(const set of packed){
    const expected=expectedTeam.find(entry=>entry.name===set.species)!;
    assert.deepEqual(set.ivs,expected.profile!.ivs);assert.deepEqual(set.evs,expected.profile!.evs);
    assert.equal(set.item,expected.item??'');
    assert.deepEqual(set.moves.map(m=>Showdown.Dex.moves.get(m).id),expected.moves.map(m=>Showdown.Dex.moves.get(m).id));
   }
   // Like validateProfile: transfer IV provenance is not part of tower point training.
   const legality=structuredClone(packed);
   for(const set of legality){set.ivs={hp:31,atk:31,def:31,spa:31,spd:31,spe:31};set.gender='';set.pokeball='';set.shiny=false;}
   assert.equal(validator.validateTeam(legality),null);
   for(const set of packed){const expected=npcTrainingTargets(floor,sample.trainingTier);assert.ok((Object.values(set.ivs!) as number[]).every(v=>v>=expected.ivRange[0]&&v<=expected.ivRange[1]));}
  }finally{store.close();}
 }
 const base=[{name:'Gyarados',moves:['Waterfall']}];
 assert.ok(trainNpcTeam(base,5,'elite','setup',seed,'basic')[0].moves.includes('Dragon Dance'));
 assert.ok(trainNpcTeam(base,5,'casual','setup',seed,'basic')[0].moves.every(m=>Showdown.Dex.moves.get(m).category!=='Status'));
 assert.notDeepEqual(trainNpcTeam(base,5,'standard','bulk',seed,'basic')[0].item,trainNpcTeam(base,5,'elite','bulk',seed,'basic')[0].item);
});

test('weighted sampling without ID/title replacement respects minFloor and is not one-per-difficulty',()=>{
 const random=encounterRandom(seed),counts=new Map<string,number>();let repeatedDifficulty=false;
 for(let i=0;i<4000;i++){
  const floor=i%2?2:20,candidates=drawChallengers(floor,random);
  assert.equal(candidates.length,3);assert.equal(new Set(candidates.map(c=>c.id)).size,3);assert.equal(new Set(candidates.map(c=>c.title)).size,3);
  assert.ok(candidates.every(c=>c.minFloor<=floor));
  if(new Set(candidates.map(c=>c.difficulty)).size<3)repeatedDifficulty=true;
  for(const c of candidates)counts.set(c.id,(counts.get(c.id)??0)+1);
 }
 assert.ok(repeatedDifficulty);assert.ok(counts.get('easy')!>counts.get('hard')!*2);
 const pool=challengers.filter(c=>['easy','medium','hard','traveler-special'].includes(c.id));
 assert.equal(drawChallengers(2,()=>0,pool)[0].id,'easy');
 assert.equal(drawChallengers(2,()=>.99,pool)[0].id,'traveler-special');
 for(const c of challengers)assert.ok(publicAssetExists(`public/sprites/trainers/${c.portrait}.png`));
});

test('production draw persists exactly three full snapshots and restores them after DB reopen',()=>{
 const path=`.data/tests/challenger-draw-${randomUUID()}.sqlite`;
 const {store,owner,event}=challengerFixture(path);
 store.db.prepare('DELETE FROM challenger_encounters WHERE event_id=?').run(event.id);
 new ChallengerEvents(store.db).create(event.id,2);
 const snapshot=store.view(owner).run!.event!.challengers!;
 const saved=JSON.parse((store.db.prepare('SELECT candidates_json FROM challenger_encounters WHERE event_id=?').get(event.id) as {candidates_json:string}).candidates_json);
 assert.equal(saved.length,3);assert.ok(saved.every((c:{rank:string;encounter:unknown;rewardDefinition:unknown})=>c.rank&&c.encounter&&c.rewardDefinition));
 assert.equal(JSON.stringify(snapshot).includes('trainingTier'),false);
 store.close();const reopened=new TowerStore(path);try{assert.deepEqual(reopened.view(owner).run!.event!.challengers,snapshot);}finally{reopened.close();}
});

test('saved legacy candidates retain presentation, original training/rewards and can start and retry',()=>{
 const {store,owner,run,event}=challengerFixture();
 try{
  const modern=challengers.find(c=>c.id==='hard')!;
  const {trainingTier,rewardProfile,weight,minFloor,...display}=modern;
  const legacy={...display,title:'숙련 전술가',kind:'elite',floorOffset:8,trainingScale:1.4,hpPoints:7,fallbackItem:'Leftovers'};
  store.db.prepare('UPDATE challenger_encounters SET candidates_json=? WHERE event_id=?').run(JSON.stringify([legacy]),event.id);
  assert.equal(store.view(owner).run!.event!.challengers![0].title,'숙련 전술가');
  store.db.prepare('UPDATE run_retries SET retry_limit=1 WHERE run_id=?').run(run);
  store.chooseEvent(owner,run,event.id,'hard');const original=store.currentBattle(owner)!;
  finishChallengerBattle(store,original.id,'Tower AI');store.retry(owner,run,original.id);
  const retried=store.enter(owner,run,2,starters);
  assert.equal(store.battle(retried).opponent_team,original.opponent_team);
  finishChallengerBattle(store,retried);
  assert.deepEqual(store.view(owner).run!.event!.result!.entries,legacy.rewardDefinition.entries);
  store.selectEventReward(owner,run,event.id,'bonus','tickets');
  assert.equal(store.permanentView(owner).eggTickets,3);
 }finally{store.close();}
});
