import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import {villainOrganizations,villainEncounter,villainRankWeights} from '../src/data/villain-organizations';
import {generateOpponentTeam,encounterPool} from '../src/server/opponent-team';
import {packTeam} from '../src/data/teams';
import {FORMAT} from '../src/battle/run';

test('rank draws respect floor gates, organization, milestones, consecutive exclusion and ended state',()=>{
 const seen=new Set<string>();
 for(const group of villainOrganizations)for(let run=0;run<400;run++)for(let floor=1;floor<=100;floor++){
  const id=`campaign-${run}`,event=villainEncounter(id,floor,group.id);
  assert.equal(villainEncounter(id,floor,group.id,true),null);assert.equal(villainEncounter(id,floor,group.id,false,true),null);
  if(floor%5===0)assert.equal(event,null);
  if(!event)continue;
  assert.deepEqual(event,villainEncounter(id,floor,group.id));assert.equal(event.event.organization,group.id);
  assert.equal(event.sample.role,'villain');assert.ok(event.sample.title.startsWith(group.name));
  assert.ok(event.event.rank!=='executive' || floor>=16);assert.ok(event.event.rank!=='boss' || floor>=75);
  seen.add(`${group.id}:${event.event.rank}`);
 }
 assert.equal(seen.size,30);
 for(const floor of [1,15,16,30,31,50,74,75,100])assert.equal(Object.values(villainRankWeights(floor)).reduce((a,b)=>a+b,0),1);
});

test('all ten executive and boss teams retain their ace, distinct tools, legal moves and available portraits',()=>{
 const validator=new Showdown.TeamValidator(FORMAT);
 for(const group of villainOrganizations)for(const rank of ['executive','boss'] as const){
  let sample;
  for(let i=0;i<2000&&!sample;i++)for(let floor=rank==='boss'?75:16;floor<100;floor++){
   const event=villainEncounter(`roster-${i}`,floor,group.id);if(event?.event.rank===rank){sample=event.sample;break;}
  }
  assert.ok(sample);assert.ok(existsSync(`public/sprites/trainers/${sample.portrait}.png`));
  const floor=rank==='boss'?75:16;assert.ok(sample.entries!.every(name=>encounterPool(floor).includes(name)));
  for(let seed=1;seed<=3;seed++){
   const team=generateOpponentTeam(floor,[seed,2,3,4],[],null,sample),sets=Showdown.Teams.unpack(packTeam(team.map(p=>p.name)))!;
   assert.ok(team.some(p=>p.name===sample.ace));assert.equal(new Set(team.map(p=>p.item)).size,3);
   sets.forEach((set,i)=>{set.moves=team[i].moves;set.item=team[i].item!;if(team[i].ability)set.ability=team[i].ability!;});
   assert.equal(validator.validateTeam(sets),null,`${group.id}:${rank}`);
  }
 }
});
