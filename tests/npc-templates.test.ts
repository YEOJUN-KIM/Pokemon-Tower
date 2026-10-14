import {test} from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import templates from '../src/data/normal-npc-templates.json' with {type:'json'};
import {normalNpcTemplate,templateProfile} from '../src/server/npc-templates';
import {generateOpponentTeam} from '../src/server/opponent-team';
import {namedTrainerSamples} from '../src/data/trainer-catalog';
import {towerDifficulty,CURRENT_PROGRESSION} from '../src/data/tower-progression';
import {TowerStore} from '../src/server/tower-store';
import {villainEncounter,villainRankWeights} from '../src/data/villain-organizations';
import {packTeam,starters} from '../src/data/teams';
import {runBattle} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
import {randomUUID} from 'node:crypto';
import type {TrainingProfile} from '../src/data/training';
import {namedOpponentIVs} from '../src/server/named-opponent-ivs';

test('live named teams use the reviewed three members and profiles, scaled to actual floors',()=>{
 for(const sample of namedTrainerSamples)for(const floor of [5,45,50,55,75,95,100]){
  const source=normalNpcTemplate(sample.id,floor,sample.role);assert.ok(source,sample.id);
  const team=generateOpponentTeam(floor,[1,2,3,4],[],null,sample,CURRENT_PROGRESSION);
  assert.deepEqual(team.map(p=>p.name).sort(),source.team.map(p=>p.species).sort());
  for(const entry of team){const original:{species:string;profile:TrainingProfile}=source.team.find(p=>p.species===entry.name)!;
   const expected=templateProfile(original.profile,floor);
   expected.ivs=namedOpponentIVs(entry.name,entry.moves,floor,[1,2,3,4],expected);
   assert.deepEqual(entry.profile,expected);
   assert.deepEqual(entry.moves,original.profile.moves);
   assert.equal(entry.ability,original.profile.ability);
   assert.ok(Object.values(entry.profile!.ivs).every(v=>v>=0&&v<=31));
   assert.equal(Object.values(entry.profile!.evs).reduce((a,b)=>a+b,0),Math.min(Object.values(original.profile.evs).reduce((a,b)=>a+b,0),towerDifficulty(floor).points));
  }
 }
 const iris=normalNpcTemplate('named-iris',50,'champion')!;
 assert.equal(iris.ace,'Haxorus');assert.equal(iris.signature.species,'Haxorus');
 assert.equal(iris.team.find(p=>p.species==='Haxorus')!.item,'Dragonium Z');
 assert.equal(templates.length,328);
});

test('stored champion teams retain template nature, ability, tools and stats across reopening',()=>{
 const path=`.data/tests/${randomUUID()}.sqlite`;let store=new TowerStore(path);try{
  store.ensurePlayer('templates');const first=store.battle(store.start('templates',starters,'basic'));
  store.db.prepare("UPDATE run_themes SET theme='sinnoh' WHERE run_id=?").run(first.run_id);
  store.db.prepare("UPDATE run_routes SET second_theme='sinnoh' WHERE run_id=?").run(first.run_id);
  for(const floor of [50,100]){
   store.db.prepare("UPDATE runs SET floor=?,state='select' WHERE id=?").run(floor,first.run_id);
   const row=store.battle(store.enter('templates',first.run_id,floor,starters));
   const template=normalNpcTemplate('named-cynthia',floor,'champion')!,sets=Showdown.Teams.unpack(row.opponent_team)!;
   assert.deepEqual(sets.map(s=>s.species).sort(),['Garchomp','Spiritomb','Lucario'].sort());
   for(const set of sets){const source=template.team.find(p=>p.species===set.species)!,profile=templateProfile(source.profile,floor);
    profile.ivs=namedOpponentIVs(set.species,source.profile.moves,floor,JSON.parse(row.seed),profile);
    assert.equal(set.item,source.item);assert.equal(set.nature,profile.nature);assert.equal(set.ability,profile.ability);
    assert.deepEqual(set.ivs ?? {hp:31,atk:31,def:31,spa:31,spd:31,spe:31},profile.ivs);assert.deepEqual(set.evs,profile.evs);assert.deepEqual(set.moves,profile.moves);
   }
   store.close();store=new TowerStore(path);assert.equal(store.battle(row.id).opponent_team,row.opponent_team);
  }
 }finally{store.close();}
});

test('boss rank is impossible before 75 even after many wins; late Maxie stores and uses Primal Groudon',async()=>{
 for(let floor=1;floor<75;floor++)assert.equal(villainRankWeights(floor,{gruntWins:100,executiveWins:100}).boss,0);
 const store=new TowerStore(':memory:');try{
  store.ensurePlayer('maxie');let row:ReturnType<TowerStore['battle']>|undefined;
  for(let attempt=0;attempt<50&&!row;attempt++){
   const first=store.battle(store.start('maxie',starters,'basic'));
   store.db.prepare("UPDATE run_villains SET organization='magma' WHERE run_id=?").run(first.run_id);
   for(let floor=76;floor<100;floor++){
    const event=villainEncounter(first.run_id,floor,'magma');if(event?.event.rank!=='boss')continue;
    store.db.prepare("UPDATE runs SET floor=?,state='select' WHERE id=?").run(floor,first.run_id);
    const next=store.battle(store.enter('maxie',first.run_id,floor,starters));
    if(next.villain_event&&JSON.parse(next.villain_event).rank==='boss'){row=next;break;}
   }
   if(!row)store.abandon('maxie',first.run_id);
  }
  assert.ok(row);assert.ok(row.floor>=75);
  const sets=Showdown.Teams.unpack(row.opponent_team)!;
  assert.deepEqual(sets.map(p=>p.species).sort(),['Groudon','Camerupt','Crobat'].sort());
  assert.equal(sets.find(p=>p.species==='Groudon')!.item,'Red Orb');
  assert.equal(JSON.parse(row.trainer!).gimmick.rule,'primal');
  assert.equal(JSON.parse(row.tera_tickets).p2,0);
  const log=await runBattle({rule:'basic',teams:{p1:packTeam(starters),p2:row.opponent_team},seed:[1,2,3,4],player:new DamagePolicy(),opponent:new DamagePolicy(),teraTickets:{p1:0,p2:0}});
  assert.ok(log.publicProtocol.some(line=>line.includes('Groudon-Primal')));assert.ok(log.winner);
 }finally{store.close();}
});
