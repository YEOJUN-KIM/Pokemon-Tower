import {test} from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {namedTrainerSamples} from '../src/data/trainer-catalog';
import {johtoOriginalBuild} from '../src/data/johto-builds';
import {championMoves} from '../src/data/champion-builds';
import {packTeam,pokemonSets} from '../src/data/teams';
import {FORMAT,runBattle} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';

test('every champion candidate has a complete legal battle build',()=>{
  const validator=new Showdown.TeamValidator(FORMAT);
  const candidates=new Set(namedTrainerSamples.filter(s=>s.role==='champion').flatMap(s=>s.entries!));
  assert.ok(candidates.size>=50);
  for(const name of candidates){
    const sample=namedTrainerSamples.find(s=>s.role==='champion'&&s.entries!.includes(name))!;
    const original=johtoOriginalBuild(sample.id,name);
    const moves=original?.moves ?? championMoves[name];assert.equal(moves?.length,4,name);
    assert.equal(validator.validateSet({...structuredClone(pokemonSets[name]),moves:[...moves],...(original?{ability:original.ability}: {})},{}),null,name);
  }
});

test('Light Ball really boosts Pikachu damage in the battle engine',async()=>{
  const damages:number[]=[];
  for(const item of ['', 'Light Ball']){
    const own=Showdown.Teams.unpack(packTeam(['Pikachu','Blastoise','Venusaur'],{},{Pikachu:item}))!;
    own[0].moves=['Thunderbolt'];
    const enemy=Showdown.Teams.unpack(packTeam(['Snorlax','Blastoise','Venusaur']))!;
    enemy[0].moves=['Tackle'];
    const result=await runBattle({teams:{p1:Showdown.Teams.pack(own),p2:Showdown.Teams.pack(enemy)},seed:[1,2,3,4],player:new DamagePolicy(),opponent:new DamagePolicy()});
    const line=result.publicProtocol.find(line=>line.startsWith('|-damage|p2a: Snorlax|'))!;
    assert.ok(line);const [hp,max]=line.split('|')[3].split(' ')[0].split('/').map(Number);
    damages.push(1-hp/max);
  }
  assert.ok(damages[1]>damages[0]*1.8,`unboosted=${damages[0]}, boosted=${damages[1]}`);
});
