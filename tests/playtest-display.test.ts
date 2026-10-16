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
test('1x/2x retain existing popup pacing; 4x uses a readable shorter popup hold',()=>{
  assert.equal(playbackDuration(1000,2),500);assert.equal(playbackDuration(1000,4),250);
  assert.equal(playbackDuration(1000,2,true),1200);assert.equal(playbackDuration(1000,4,true),700);
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


test('4x removes idle overhead but leaves important results readable and 1x/2x timing unchanged',()=>{
 const legacy=(duration:number,speed:number,notice:boolean,text:string)=>Math.max(duration/speed,notice?1200:0,speed>1&&text?Math.min(duration,Math.max(800,Math.min(1600,Array.from(text).length*28+450))):0);
 for(const speed of [1,2] as const)for(const duration of [0,220,360,750,1200,1600])for(const notice of [false,true])for(const text of ['', '효과가 굉장했다!', '긴 일반 메시지입니다.']){
  assert.equal(playbackDuration(duration,speed,notice,text,{important:false,idle:true}),legacy(duration,speed,notice,text));
 }
 assert.equal(playbackDuration(750,4,false,'',{idle:true}),60);
 assert.equal(playbackDuration(750,4,false,'피카츄 등장!',{important:false}),450);
 for(const text of ['효과가 굉장했다!','효과가 별로인 듯하다…','급소에 맞았다!','공격이 빗나갔다.','기술은 실패했다.','효과가 없다.','마비되었다!'])assert.equal(playbackDuration(750,4,false,text,{important:true}),750);
 assert.equal(playbackDuration(1000,4,false,'',{idle:false}),250);
});
