import {test} from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {effectNotice} from '../src/web/battle-effects';
import {describeLine} from '../src/web/catalog';
import {presentationFrames} from '../src/web/battle-presentation';
import type {BattleView} from '../src/web/contracts';
import {pokemonSets,packTeam} from '../src/data/teams';
import {runBattle} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';

test('public effect sources identify the owner, including damage to the other side',()=>{
  const rough='|-damage|p1a: Charizard|87/100|[from] ability: Rough Skin|[of] p2a: Garchomp';
  assert.equal(effectNotice(rough)?.actor,'p2a: Garchomp');
  assert.equal(effectNotice(rough)?.label,'까칠한피부');
  assert.match(describeLine(rough)!,/상대 한카리아스의 까칠한피부/);
  assert.equal(effectNotice('|-immune|p2a: Lapras|[from] ability: Water Absorb')?.label,'저수');
  assert.equal(effectNotice('|-weather|Sandstorm|[from] ability: Sand Stream|[of] p2a: Tyranitar')?.label,'모래날림');
  assert.equal(effectNotice('|-enditem|p2a: Golem|Focus Sash')?.label,'기합의띠');
  assert.equal(effectNotice('|-heal|p1a: Blastoise|70/100|[from] item: Leftovers')?.side,'player');
  const absorption='|-heal|p2a: Lapras|75/100|[from] ability: Water Absorb|[of] p1a: Blastoise';
  assert.equal(effectNotice(absorption)?.actor,'p2a: Lapras');
  assert.match(describeLine(absorption)!,/상대 라프라스의 저수/);
  assert.equal(effectNotice('|-enditem|p1a: Blastoise|Leftovers|[from] move: Knock Off'),null);
  assert.equal(effectNotice('|-ability|p2a: Golem|Sturdy|[silent]'),null);
  assert.equal(effectNotice('|-damage|p2a: Golem|1/100'),null);
});

test('activation popup is timed before HP change and is not repeated for one effect',()=>{
  const before:BattleView={id:'effects',requestId:1,status:'waiting',turn:1,team:[{species:'Blastoise',condition:'100/100',active:true}],opponent:{species:'Golem',condition:'100/100'},actions:[],messages:['|turn|1'],winner:null,error:null};
  const messages=['|move|p1a: Blastoise|Surf|p2a: Golem','|-ability|p2a: Golem|Sturdy','|-damage|p2a: Golem|1/100'];
  const frames=presentationFrames(before,{...before,messages:[...before.messages,...messages]});
  assert.equal(frames[1].notice?.label,'옹골참');
  assert.equal(frames[1].duration,1200);
  assert.equal(frames[1].view.opponent?.condition,'100/100');
  assert.equal(frames[2].view.opponent?.condition,'1/100');
  assert.equal(frames[2].notice,undefined);
  assert.equal(describeLine(messages[1]),'상대 딱구리는 옹골참으로 버텼다!');
  const absorb=['|-ability|p2a: Lapras|Water Absorb','|-heal|p2a: Lapras|80/100|[from] ability: Water Absorb'];
  const healing=presentationFrames(before,{...before,messages:[...before.messages,...absorb]});
  assert.equal(healing.filter(frame=>frame.notice).length,1);
});

test('real engine Sturdy and Focus Sash events produce survival notices',async()=>{
  for(const sash of [false,true]) {
    const team=['Golem','Pikachu','Cloyster'].map(name=>structuredClone(pokemonSets[name as keyof typeof pokemonSets]));
    if(sash){team[0].ability='Rock Head';team[0].item='Focus Sash';}
    const log=await runBattle({teams:{p1:packTeam(['Blastoise','Charizard','Venusaur']),p2:Showdown.Teams.pack(team)},seed:[1,2,3,4],player:new DamagePolicy(),opponent:new DamagePolicy()});
    const event=log.publicProtocol.find(line=>effectNotice(line)?.name === (sash ? 'Focus Sash' : 'Sturdy'));
    assert.ok(event,`Missing ${sash ? 'Focus Sash' : 'Sturdy'} event`);
    assert.match(describeLine(event)!,/버텼다!/);
  }
});

test('Intimidate animates its target and absorption blocks damage before healing',()=>{
  const before:BattleView={id:'effects',requestId:1,status:'waiting',turn:1,team:[{species:'Charizard',condition:'100/100',active:true}],opponent:{species:'Lapras',condition:'50/100'},actions:[],messages:['|turn|1'],winner:null,error:null};
  const intimidated=presentationFrames(before,{...before,messages:[...before.messages,'|-ability|p2a: Lapras|Intimidate','|-unboost|p1a: Charizard|atk|1']});
  assert.equal(intimidated[0].notice?.side,'enemy');
  assert.equal(intimidated[1].motion?.side,'player');
  assert.equal(intimidated[1].motion?.kind,'stat-down');
  assert.equal(intimidated[1].motion?.label,'공격 하락');
  const absorbed=presentationFrames(before,{...before,messages:[...before.messages,'|-heal|p2a: Lapras|75/100|[from] ability: Water Absorb|[of] p1a: Charizard']});
  assert.equal(absorbed[0].notice?.label,'저수');
  assert.equal(absorbed[0].announcement,'상대 라프라스의 저수!');
  assert.equal(absorbed[0].view.opponent?.condition,'50/100');
  assert.equal(absorbed[1].motion?.kind,'heal');
  assert.equal(absorbed[1].view.opponent?.condition,'75/100');
  const immune=presentationFrames(before,{...before,messages:[...before.messages,'|-immune|p2a: Lapras|[from] ability: Water Absorb']});
  assert.equal(immune[0].motion,null);
  assert.equal(immune[0].notice?.label,'저수');
});
