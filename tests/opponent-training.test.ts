import {test} from 'node:test';
import assert from 'node:assert/strict';
import {opponentIVCap,opponentProfile} from '../src/server/opponent-training';
import {statKeys,type StatBlock} from '../src/data/training';

test('opponent IVs ramp by floor while keeping a bounded, approximately uniform draw',()=>{
  assert.deepEqual([1,5,10,20,27,30].map(opponentIVCap),[5,9,14,24,31,31]);
  for(let floor=1;floor<=30;floor++){
    const draws=Array.from({length:32},(_,value)=>opponentProfile('Charizard',['Flamethrower'],floor,Object.fromEntries(statKeys.map(stat=>[stat,value])) as StatBlock).ivs.hp);
    assert.equal(Math.min(...draws),0);assert.equal(Math.max(...draws),opponentIVCap(floor));
    const counts=Array.from({length:opponentIVCap(floor)+1},(_,value)=>draws.filter(draw=>draw===value).length);
    assert.ok(Math.max(...counts)-Math.min(...counts)<=1);
  }
});
test('late stat points keep the same total, prefer the correct attacking stat and retain supplied moves',()=>{
  const raw=Object.fromEntries(statKeys.map(stat=>[stat,31])) as StatBlock;
  for(const name of ['Charizard','Garchomp'])for(const floor of [1,10,11,20,30]){
    const moves=name==='Charizard' ? ['Flamethrower'] : ['Dragon Claw'];
    const profile=opponentProfile(name,moves,floor,raw),total=Math.max(0,floor-10);
    assert.equal(Object.values(profile.evs).reduce((sum,n)=>sum+n,0),total);
    assert.equal(profile.evs[name==='Charizard' ? 'spa' : 'atk'],Math.ceil(total*.6));
    assert.deepEqual(profile.moves,moves);assert.equal(profile.statSystem,'points');
  }
});
