import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {speciesGender,genderOptions,collectionGender} from '../src/server/pokemon-gender';
import {TowerStore} from '../src/server/tower-store';
import {packTeam,starters,trainedSet} from '../src/data/teams';
import {defaultProfile,validateProfile} from '../src/server/training';
import {runBattle,replayBattle} from '../src/battle/run';
import {genderFromDetails} from '../src/data/gender';

test('species ratios, fixed sexes and genderless species are respected',()=>{
  assert.deepEqual(genderOptions('Charizard'),['M','F']);assert.deepEqual(genderOptions('Chansey'),['F']);assert.deepEqual(genderOptions('Tauros'),['M']);assert.deepEqual(genderOptions('Metagross'),['N']);
  assert.equal(speciesGender('Charizard',.12),'F');assert.equal(speciesGender('Charizard',.13),'M');
  assert.equal(speciesGender('Chansey',.999),'F');assert.equal(speciesGender('Metagross',0),'N');
  assert.equal(collectionGender('Charizard','owner'),collectionGender('Charizard','owner'));
  assert.throws(()=>validateProfile('Chansey',{...defaultProfile('Chansey'),gender:'M'}),/성별/);
  assert.throws(()=>validateProfile('Metagross',{...defaultProfile('Metagross'),gender:'F'}),/성별/);
  assert.equal(genderFromDetails('Charizard, L50, F, shiny'),'F');assert.equal(genderFromDetails('Metagross, L50'),'N');
});
test('free gender setting survives restart and packs into new battles',()=>{
  const path=`.data/tests/${randomUUID()}.sqlite`;let store=new TowerStore(path);
  try{
    store.ensurePlayer('gender');const entry=store.trainingCollection('gender').find(e=>e.species==='Charizard')!;
    store.train('gender','Charizard',entry.revision,{...entry.profile,gender:'F'});assert.equal(store.view('gender').growthPoints,0);
    store.close();store=new TowerStore(path);assert.equal(store.trainingCollection('gender').find(e=>e.species==='Charizard')!.profile.gender,'F');
    const id=store.start('gender',starters);assert.equal(Showdown.Teams.unpack(store.battle(id).player_team)![0].gender,'F');
    const packed=store.battle(id).player_team;const entry2=store.trainingCollection('gender').find(e=>e.species==='Charizard')!;
    store.train('gender','Charizard',entry2.revision,{...entry2.profile,gender:'M'});assert.equal(store.battle(id).player_team,packed);
  }finally{store.close();}
});
for(const gender of ['F','M','N'] as const)test(`Attract uses the packed sex (${gender}) and replay remains identical`,async()=>{
  const own={...trainedSet('Pikachu'),gender:'M' as const,moves:['Attract','Thunderbolt']};
  const target={...trainedSet(gender==='N'?'Metagross':'Gyarados'),gender,moves:['Tackle']};
  const teams={p1:Showdown.Teams.pack([own,trainedSet('Gengar'),trainedSet('Charizard')]),p2:Showdown.Teams.pack([target,trainedSet('Blastoise'),trainedSet('Venusaur')])};
  const log=await runBattle({teams,seed:[1,2,3,4],player:{choose:o=>o.legalActions.find(a=>a.command.startsWith('team '))?.command ?? (o.turn===1?'move 1':o.legalActions.find(a=>a.command==='move 2')?.command ?? o.legalActions[0].command)},opponent:{choose:o=>o.legalActions.find(a=>a.command.startsWith('team '))?.command ?? o.legalActions.find(a=>a.command==='move 1')?.command ?? o.legalActions[0].command}});
  assert.equal(log.publicProtocol.some(line=>line.startsWith('|-start|p2a:')&&line.includes('|Attract')),gender==='F');
  const replay=await replayBattle(log);assert.deepEqual(replay.publicProtocol.filter(line=>!line.startsWith('|t:|')),log.publicProtocol.filter(line=>!line.startsWith('|t:|')));
});
