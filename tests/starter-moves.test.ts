import test from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {initialPartners,starters,pokemonSets} from '../src/data/teams';
import {starterBonusMoves} from '../src/data/starter-moves';
import {moveInfo} from '../src/data/move-info';
import {moveLearnsets} from '../src/server/move-learnsets';
import {defaultProfile} from '../src/server/training';
import {TowerStore} from '../src/server/tower-store';
import {TowerService} from '../src/server/tower-service';

test('all initial partners retain self moves and can equip registered, beginner-friendly bonus moves for free',()=>{
  assert.deepEqual(Object.keys(starterBonusMoves).sort(),[...initialPartners].sort());
  const store=new TowerStore(':memory:');
  try {
    store.ensurePlayer('new');
    for(const entry of store.trainingCollection('new')) {
      const bonus=starterBonusMoves[entry.species];
      assert.ok(bonus.length>0 && bonus.length<=4);
      assert.deepEqual(entry.profile.moves,bonus);
      assert.equal(new Set(entry.unlockedMoves).size,entry.unlockedMoves.length);
      for(const move of [...moveLearnsets[entry.species].selfMoves,...bonus])assert.ok(entry.unlockedMoves.includes(move),`${entry.species}: ${move}`);
      for(const move of bonus) {
        assert.ok(moveInfo[move],move);
        assert.ok(entry.learnableMoves.includes(move),`${entry.species}: ${move}`);
        const info=Showdown.Dex.moves.get(move);
        assert.ok(info.accuracy===true || info.accuracy>=90);
        assert.ok(!info.recoil && !info.flags.recharge);
      }
      store.train('new',entry.species,entry.revision,{...entry.profile,moves:[...bonus]});
    }
    assert.equal(store.view('new').growthPoints,0);
    const before=store.trainingCollection('new');
    store.ensurePlayer('new');
    assert.deepEqual(store.trainingCollection('new'),before);
  } finally {store.close();}
});

test('existing saves and non-starter collection moves are unchanged',()=>{
  const store=new TowerStore(':memory:');
  try {
    store.db.prepare('INSERT INTO players(id) VALUES (?)').run('old');
    for(const species of initialPartners)store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run('old',species);
    const before=store.trainingCollection('old');
    store.ensurePlayer('old');
    assert.deepEqual(store.trainingCollection('old'),before);
    store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run('old','Pikachu');
    const entry=store.trainingCollection('old').find(p=>p.species==='Pikachu')!;
    assert.deepEqual(new Set(entry.unlockedMoves),new Set([...moveLearnsets.Pikachu.selfMoves,...defaultProfile('Pikachu').moves]));
    assert.deepEqual(defaultProfile('Charizard').moves,before.find(p=>p.species==='Charizard')!.profile.moves);
    assert.ok(pokemonSets.Charizard.moves.includes('Slash'));
  } finally {store.close();}
});

test('manual starter loadouts and acquired profiles are never replaced by recommended defaults',()=>{
  const store=new TowerStore(':memory:');
  try {
    store.ensurePlayer('custom');
    const entry=store.trainingCollection('custom').find(p=>p.species==='Charizard')!;
    store.train('custom','Charizard',entry.revision,{...entry.profile,moves:['Slash']});
    store.ensurePlayer('custom');
    assert.deepEqual(store.trainingCollection('custom').find(p=>p.species==='Charizard')!.profile.moves,['Slash']);
    // Existing recruitment/egg records take precedence even for an initial-partner species.
    const acquired={...defaultProfile('Blastoise'),moves:['Water Gun']};
    store.db.prepare('INSERT INTO pokemon_training VALUES (?,?,?,?)').run('custom','Blastoise',JSON.stringify(acquired),1);
    assert.deepEqual(store.trainingCollection('custom').find(p=>p.species==='Blastoise')!.profile.moves,['Water Gun']);
  }finally{store.close();}
});

test('equipped starter bonuses reach actual battle actions with four move slots',async()=>{
  const store=new TowerStore(':memory:');
  const service=new TowerService(store);
  try {
    store.ensurePlayer('battle');
    // No training or manual move editing: the initial loadout itself must be beginner-friendly.
    const id=store.start('battle',starters);
    const packed=Showdown.Teams.unpack(store.battle(id).player_team)!;
    assert.equal(packed.length,3);
    for(const set of packed)assert.deepEqual(set.moves.map(m=>Showdown.Dex.moves.get(m).name),starterBonusMoves[set.species]);
    const {battle}=await service.state('battle');
    assert.ok(battle);
    for(let i=1;i<=4;i++)assert.ok(battle.actions.some(a=>a.command===`move ${i}`));
  } finally {await service.dispose();store.close();}
});
