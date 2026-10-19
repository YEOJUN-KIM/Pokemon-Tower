import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {existsSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import templates from '../src/data/normal-npc-templates.json' with {type:'json'};
import reviewed from '../scripts/data/npc/normal-npc-samples.json' with {type:'json'};
import {namedTrainerSamples} from '../src/data/trainer-catalog';
import {pokemonSets} from '../src/data/teams';
import {FORMAT} from '../src/battle/run';
import {CURRENT_PROGRESSION} from '../src/data/tower-progression';
import {isHeldItem} from '../src/data/held-items';
import {normalNpcTemplate} from '../src/server/npc-templates';
import {snapshotTrainerEventBattle} from '../src/server/trainer-event-battle';
import {villainCampaignTracks} from '../src/data/villain-tracks';
import {snapshotVillainReward} from '../src/server/villain-track-rewards';
import {VillainCampaigns} from '../src/server/villain-campaigns';
import {TowerStore} from '../src/server/tower-store';
import {trackFixture,trackRegistry,trackEncounter} from './villain-track-fixture';

test('Ariana is a fixed legal three-member tactical officer with Arbok lead and no gimmick at any floor',()=>{
 const sample=namedTrainerSamples.find(s=>s.id==='named-ariana')!;
 assert.equal(sample.name,'아테나');assert.equal(sample.role,'villain');assert.equal(sample.minFloor,25);assert.equal(sample.aiCeiling,'tactical');assert.equal(sample.ace,'Arbok');assert.equal(sample.generation,2);
 assert.deepEqual(sample.entries,['Arbok','Vileplume','Honchkrow']);assert.ok(existsSync(`public/sprites/trainers/${sample.portrait}.png`));
 const template=normalNpcTemplate(sample.id,25,sample.role)!;
 assert.equal(template.team.length,3);assert.equal(template.signature,null);assert.equal(template.gimmickEnabled,false);assert.deepEqual(template.selectionRules,{preferredLead:['Arbok']});assert.deepEqual(template.required,[]);
 const builds=[['Intimidate','Black Sludge',['Gunk Shot','Crunch','Glare','Earthquake']],['Effect Spore','Leftovers',['Giga Drain','Sludge Bomb','Sleep Powder','Moonblast']],['Moxie','Life Orb',['Brave Bird','Sucker Punch','Night Slash','Roost']]];
 const validator=new Showdown.TeamValidator(FORMAT);
 for(const [i,member] of template.team.entries()){
  assert.deepEqual([member.profile.ability,member.item,member.profile.moves],builds[i]);assert.ok(isHeldItem(member.item));
  assert.equal(validator.validateSet({...structuredClone(pokemonSets[member.species]),species:member.species,ability:member.profile.ability,item:member.item,moves:member.profile.moves},{}),null,member.species);
 }
 for(const floor of [25,45,55,75,100])for(let seed=0;seed<20;seed++){
  const snapshot=snapshotTrainerEventBattle(`ariana:${floor}:${seed}`,sample,floor,'chaos',CURRENT_PROGRESSION);
  assert.equal(snapshot.team[0].name,'Arbok');assert.deepEqual(new Set(snapshot.team.map(p=>p.name)),new Set(sample.entries));assert.equal(snapshot.trainer.gimmick,undefined);assert.equal(snapshot.trainer.npcAi!.tier,'tactical');assert.equal(snapshot.opponentTeraTickets,0);
 }
});

test('Archer, Giovanni, Guzma, Faba and Lusamine reviewed teams are identical to implementation commit 13e78cdd',()=>{
 const hashes={'named-archer':'8284d996b2f1164cf7001a0bfadc7d09db8b88843cb39df31c8c220b27540c84','named-giovanni':'4c48bda126bd24bef3d700fa95f93f7007fffe0c471ee177f1e9c64b90374dd6','named-guzma':'41cd4a7eb6c21e46b6b7361c00f7341ff0cf952b1b02e6e38d093bb87f486057','named-faba':'34aa4f56a87d329543397a595236c528143126912203ff47fac9acc0db8a3d04','named-lusamine':'02c1e8ccda7444bf489a2952af88c4594cc18e58f500b2d569adfa4c18a37232'};
 for(const [id,hash] of Object.entries(hashes))assert.equal(createHash('sha256').update(JSON.stringify(templates.filter(r=>r.id===id))).digest('hex'),hash,id);
});

test('Ariana is the only source/runtime NPC addition; all 179 existing templates match 13e78cdd exactly',()=>{
 const digest=(rows:{id:string}[])=>createHash('sha256').update(JSON.stringify(rows.filter(r=>r.id!=='named-ariana'))).digest('hex');
 assert.equal(templates.filter(r=>r.id==='named-ariana').length,1);assert.equal(reviewed.samples.filter(r=>r.id==='named-ariana').length,1);
 assert.equal(digest(templates),'549c80debb4230f3c2dcba7d9b1b32c9bf1aeca192e07e371443df480b33bbfa');
 assert.equal(digest(reviewed.samples),'2a8defe93360ccbcc92da2974a56129573367bcdf54b701bdb247bf36ea03596');
});

for(const [organization,index,sampleId,minFloor] of [['rocket',2,'named-ariana',25],['skull',3,'named-faba',45]] as const)test(`${organization}: previously blocked persisted stage resumes at ${sampleId} without migration or resetting progress`,()=>{
 const path=`.data/tests/completion-${randomUUID()}.sqlite`,f=trackFixture(path,organization);let s=f.store;
 try{
  s.db.prepare("UPDATE run_events SET status='complete' WHERE run_id=?").run(f.run);
  s.db.prepare('UPDATE run_villain_tracks SET stage_index=?,grunt_wins=2,pity=4,last_event_order=10,last_checked_order=10 WHERE run_id=?').run(index,f.run);
  const before=new VillainCampaigns(s.db).track(f.run);s.close();s=new TowerStore(path,()=>0,trackRegistry);assert.deepEqual(new VillainCampaigns(s.db).track(f.run),before);
  trackEncounter(s,f.run,minFloor-1,20);assert.equal(s.view(f.owner).run!.event,null);assert.equal(new VillainCampaigns(s.db).track(f.run)!.pity,4);
  trackEncounter(s,f.run,minFloor,21);const event=s.view(f.owner).run!.event!,snapshot=new VillainCampaigns(s.db).snapshot(new VillainCampaigns(s.db).row(event.id)!);
  assert.equal(snapshot.sample.id,sampleId);assert.equal(snapshot.trackIndex,index);assert.equal(new VillainCampaigns(s.db).track(f.run)!.grunt_wins,2);
  const saved=JSON.stringify(snapshot);s.close();s=new TowerStore(path,()=>99,trackRegistry);assert.equal(new VillainCampaigns(s.db).row(event.id)!.snapshot_json,saved);
 }finally{s.close();}
});

test('Ariana/Guzma keep officer rewards, Archer/Faba keep executive catch-up/fallback and bosses keep permanent tickets',()=>{
 const f=trackFixture(),s=f.store;try{
  for(const organization of ['rocket','skull'] as const)for(const stage of villainCampaignTracks[organization].stages.slice(2)){
   const reward=(roll:()=>number)=>snapshotVillainReward(s.db,f.run,organization,stage.key,stage.rank,roll).entries;
   assert.equal(reward(()=>0)[0].kind,'coins');
   if(stage.rank==='officer'){assert.deepEqual(reward(()=>0).slice(1).map(e=>e.kind),['vitamin','vitamin']);assert.equal(reward(()=>99)[1].kind,'tool-voucher');}
   else if(stage.rank==='executive'){
    s.db.prepare("UPDATE run_rules SET rule='basic' WHERE run_id=?").run(f.run);assert.equal(reward(()=>0)[1].kind,'tool-voucher');
    s.db.prepare("UPDATE run_rules SET rule='tera' WHERE run_id=?").run(f.run);assert.equal(reward(()=>0)[1].kind,'trainer-equipment');
   }else if(stage.rank==='boss')assert.deepEqual(reward(()=>0)[1],{kind:'typed-egg-ticket',eggKind:'superRare',amount:1});
  }
 }finally{s.close();}
});
