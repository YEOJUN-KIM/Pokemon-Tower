import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {moveInfo} from '../src/data/move-info';
import {effectAssets,moveAnimationPlan} from '../src/web/move-animation-plan';
import {presentationFrames} from '../src/web/battle-presentation';
import type {BattleView} from '../src/web/contracts';

test('every move has bounded choreography using only the 22 licensed local effects',()=>{
  const used=new Set<string>();
  for(const move of Object.keys(moveInfo)) {
    const plan=moveAnimationPlan(move);
    assert.ok((plan.particles.length>0||['clone','soundwave'].includes(plan.style))&&plan.particles.length<=12,move);
    assert.ok(plan.duration<=1100,move);
    for(const particle of plan.particles){
      assert.ok(effectAssets.includes(particle.asset),particle.asset);
      assert.ok(particle.start>=0&&particle.end<=plan.duration&&particle.end>particle.start,move);
      used.add(particle.asset);
    }
  }
  assert.deepEqual([...used].sort(),[...effectAssets].sort());
  for(const asset of effectAssets)assert.equal(readFileSync(`public/vendor/showdown/fx/${asset}.png`).subarray(0,8).toString('hex'),'89504e470d0a1a0a');
});

test('recognizable techniques have distinct composition and support moves avoid offensive contact',()=>{
  const expected={'Flamethrower':'flame','Surf':'wave','Thunderbolt':'electricburst','Thunder':'thunder','Ice Beam':'icebeam','Shadow Ball':'shadoworb','Leaf Storm':'leaves','Dragon Claw':'claw','Crunch':'bite','Close Combat':'punches','Earthquake':'quake'};
  for(const [move,style] of Object.entries(expected))assert.equal(moveAnimationPlan(move).style,style);
  assert.equal(moveAnimationPlan('Roost').contact,false);
  assert.equal(moveAnimationPlan('Swords Dance').style,'support');
  assert.equal(moveAnimationPlan('Will-O-Wisp').style,'blueflame');
  assert.equal(moveAnimationPlan('Will-O-Wisp').offensive,false);
  assert.equal(moveAnimationPlan('Tera Blast','water').style,'waterbeam');
});

test('playback retains real attack direction, self target, miss and effect duration before damage',()=>{
  const before:BattleView={id:'fx',requestId:1,status:'waiting',turn:1,team:[{species:'Charizard',condition:'100/100',active:true}],opponent:{species:'Blastoise',condition:'100/100'},actions:[],messages:['|turn|1'],winner:null,error:null};
  for(const [actor,target,expected] of [['p1a: Charizard','p2a: Blastoise','enemy'],['p2a: Blastoise','p1a: Charizard','player']]) {
    const frames=presentationFrames(before,{...before,messages:[...before.messages,`|move|${actor}|Flamethrower|${target}`,`|-miss|${actor}|${target}`]});
    assert.equal(frames[0].motion?.targetSide,expected);assert.equal(frames[0].motion?.missed,true);
    assert.equal(frames[0].duration,moveAnimationPlan('Flamethrower').duration);
    assert.equal(frames[0].view.opponent?.condition,'100/100');
  }
  const self=presentationFrames(before,{...before,messages:[...before.messages,'|move|p1a: Charizard|Roost|p1a: Charizard']});
  assert.equal(self[0].motion?.targetSide,'player');
  const absorbed=presentationFrames(before,{...before,messages:[...before.messages,'|move|p1a: Charizard|Surf|p2a: Blastoise','|-heal|p2a: Blastoise|100/100|[from] ability: Water Absorb']});
  assert.equal(absorbed[0].motion?.blocked,true);
  assert.equal(absorbed[0].motion?.missed,false);
});

test('Flamethrower uses the supplied beam without changing damage order or shared fire recipes',()=>{
  const plan=moveAnimationPlan('Flamethrower');
  assert.equal(plan.duration,950);
  assert.equal(plan.beam?.url,'/sprites/effects/flamethrower-beam.png');
  assert.equal(moveAnimationPlan('Heat Wave').beam,undefined);
  assert.equal(readFileSync('public/sprites/effects/flamethrower-beam.png').subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  const before:BattleView={id:'beam',requestId:1,status:'waiting',turn:1,team:[{species:'Charizard',condition:'100/100',active:true}],opponent:{species:'Blastoise',condition:'100/100'},actions:[],messages:['|turn|1'],winner:null,error:null};
  const frames=presentationFrames(before,{...before,messages:[...before.messages,'|move|p1a: Charizard|Flamethrower|p2a: Blastoise','|-damage|p2a: Blastoise|80/100']});
  assert.equal(frames[0].duration,950);
  assert.equal(frames[0].view.opponent?.condition,'100/100');
  assert.equal(frames[1].view.opponent?.condition,'80/100');
  for(const result of ['|-immune|p2a: Blastoise','|-fail|p1a: Charizard']) {
    const failed=presentationFrames(before,{...before,messages:[...before.messages,'|move|p1a: Charizard|Flamethrower|p2a: Blastoise',result]});
    assert.equal(failed[0].motion?.blocked,true);
    assert.equal(failed[0].duration,950);
    assert.equal(failed[0].view.opponent?.condition,'100/100');
  }
});
