import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {pokemonImageSources} from '../src/web/pokemon-image';
import inventory from '../src/data/pixel-sprites.json' with {type:'json'};
import frontOnlyBacks from '../src/data/front-only-back-sprites.json' with {type:'json'};
import {trainerLabel} from '../src/web/trainer-samples';
import type {BossView} from '../src/web/contracts';
import {playbackDuration} from '../src/web/playback-settings';
const boss=(data:Partial<BossView>):BossView=>({id:'normal',name:'등산가',title:'',introduction:'',victory:'',defeat:'',...data});
test('ordinary trainers show only their class; named gym leaders show specialty and name',()=>{
  assert.equal(trainerLabel(boss({id:'elite-rush',kind:'elite',title:'엘리트 트레이너',name:'속공 전문가'})),'엘리트 트레이너');
  assert.equal(trainerLabel(boss({kind:'normal'})),'등산가');
  assert.equal(trainerLabel(boss({id:'named-falkner',kind:'named',role:'gym',specialty:'Flying',title:'체육관 관장',name:'비상'})),'비행타입 관장 비상');
});
test('2x and 4x retain 1.2 seconds for notices while normal frames remain accelerated',()=>{
  assert.equal(playbackDuration(1000,2),500);assert.equal(playbackDuration(1000,4),250);
  assert.equal(playbackDuration(1000,2,true),1200);assert.equal(playbackDuration(1000,4,true),1200);
  assert.equal(playbackDuration(1600,1,true),1600);
});
test('every species/form has local normal and shiny backs, and copied fronts are excluded',()=>{
  for(const key of Object.keys(inventory))for(const shiny of [false,true]){
    const sources=pokemonImageSources(Number.parseInt(key,10),true,true,key,shiny);
    assert.ok(sources.some(path=>existsSync('public'+path)),`${key} shiny=${shiny} missing back`);
    if(frontOnlyBacks.includes(key))assert.ok(sources.every(path=>!path.includes('/showdown/pokemon/gen5-back/')),`${key} copied front`);
  }
  assert.ok(!pokemonImageSources(925,true,true)[0].includes('/showdown/pokemon/gen5-back/'));
});

test('fast playback preserves readable new dialogue without slowing hidden damage frames or 1x',()=>{
 for(const speed of [2,4] as const){
  assert.equal(playbackDuration(750,speed,false,'급소에 맞았다!'),750);
  assert.ok(playbackDuration(1600,speed,false,'상대 잠만보의 몸에 맹독이 퍼지기 시작했다!')>=1000);
  assert.equal(playbackDuration(750,speed),750/speed);
 }
 assert.equal(playbackDuration(750,1,false,'긴 문장'.repeat(30)),750);
 assert.equal(playbackDuration(0,4),0);
});
