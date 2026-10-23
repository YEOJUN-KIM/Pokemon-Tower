import type {TrainingProfile} from '../src/data/training';
import test from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {pokemonSets, packTeam, starters, opponentTeam} from '../src/data/teams';
import {floors} from '../src/data/floors';
import {species, moves, spriteUrl} from '../src/web/catalog';
import {abilityNames} from '../src/web/pokedex-data';
import {FORMAT, runBattle} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
import {randomUUID} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {TowerService} from '../src/server/tower-service';
import type {BattleLog} from '../src/battle/run';
import {pokemonImageSources} from '../src/web/pokemon-image';
import {isCollectibleSpecies,namedReferenceSpecies} from '../src/data/pokedex-roster';
import {classicCollection} from './classic-team-fixture';

function orders(roster: string[]) {
  return roster.flatMap(a => roster.filter(b => b !== a).flatMap(b => roster.filter(c => c !== a && c !== b).map(c => [a,b,c])));
}

test('648 species and one hundred consecutive floors have legal sets and complete display data', () => {
  assert.equal(Object.keys(pokemonSets).length,648);
  assert.equal(floors.length,100);
  const encountered = new Set<string>(starters);
  for (const [name,set] of Object.entries(pokemonSets)) {
    const partners = starters.filter(p => p !== name).slice(0,2);
    const errors = new Showdown.TeamValidator(FORMAT).validateTeam(Showdown.Teams.unpack(packTeam([name,...partners]))!);
    assert.equal(errors,null,`${name}: ${errors?.join(', ')}`);
    assert.ok(species[name]?.name);
    if(!Showdown.Dex.species.get(name).forme)assert.equal(species[name].id,Showdown.Dex.species.get(name).num);
    else assert.ok(Number.isSafeInteger(species[name].id)&&species[name].id>0);
    if(isCollectibleSpecies(name)||namedReferenceSpecies.has(name)){
      assert.ok(pokemonImageSources(species[name].id,false,true,species[name].spriteKey).length,`${name}: front battle image`);
      assert.ok(pokemonImageSources(species[name].id,true,true,species[name].spriteKey).length,`${name}: back battle image`);
      assert.ok(spriteUrl(name),name);assert.ok(spriteUrl(name,true),name);
    }
    assert.ok(abilityNames[set.ability],`${name}: missing ability translation`);
    for (const move of set.moves) assert.ok(moves[move],`${name}: missing translation for ${move}`);
  }
  for (const [index,floor] of floors.entries()) {
    assert.equal(floor.number,index + 1);
    assert.equal(new Set(floor.opponents).size,3);
    floor.opponents.forEach(name => encountered.add(name));
    assert.ok(floor.reward > 0);
  }
  assert.equal(encountered.size,20);
});

test('every floor finishes a real seeded battle', async () => {
  for (const floor of floors) {
    const log = await runBattle({teams:{p1:packTeam(starters),p2:packTeam([...floor.opponents])},seed:[1,2,3,4],player:new DamagePolicy(),opponent:new DamagePolicy()});
    assert.ok(['Player','Tower AI','tie'].includes(log.winner!));
    assert.ok(log.turns > 0 && log.turns < 200);
  }
});

test('a saved ten-floor run completes real battles, replaces members, restores floor seven and awards once', async () => {
  const path = `.data/tests/${randomUUID()}.sqlite`;
  let store = new TowerStore(path);
  const owner = 'climber';
  const recruits = ['Cloyster','Arcanine','Gyarados','Golem','Lucario','Lapras','Dragonite','Tyranitar','Metagross','Garchomp'];
  const replacements: (string | null)[] = [null,null,null,'Charizard','Arcanine','Blastoise','Venusaur','Golem','Cloyster','Gyarados'];
  try {
    store.ensurePlayer(owner);
    classicCollection(store,owner);
    let id = store.start(owner,starters);
    const runId = store.battle(id).run_id;
    store.db.prepare('UPDATE runs SET total_floors=10 WHERE id=?').run(runId);
    let expectedCoins = 0;
    assert.equal(store.view(owner).run!.totalFloors,10);
    for (const [index,floor] of floors.slice(0,10).entries()) {
      const roster = store.roster(runId);
      const profiles=JSON.parse((store.db.prepare("SELECT profiles FROM runs WHERE id=?").get(runId) as {profiles:string}).profiles) as Record<string,TrainingProfile>;
      let winning: {team: string[]; log: BattleLog} | undefined;
      // Offline integration search, not the in-game AI or a claim about human win rates.
      for (const team of index === 0 ? [starters] : orders(roster)) {
        const log = await runBattle({trainerEquipment:store.trainerEquipment(runId),teams:{p1:packTeam(team,profiles),p2:packTeam([...floor.opponents])},seed:[1,2,3,4],player:new DamagePolicy(),opponent:new DamagePolicy()});
        if (log.winner === 'Player') {winning = {team,log}; break;}
      }
      assert.ok(winning,`No winning fixed-seed team on floor ${floor.number} with ${roster}`);
      if (index > 0) id = store.enter(owner,runId,floor.number,winning.team);
      store.db.prepare('UPDATE battles SET opponent_team=? WHERE id=?').run(packTeam([...floor.opponents]),id);
      store.db.prepare('UPDATE battles SET seed = ? WHERE id = ?').run('[1,2,3,4]',id);
      winning.log.decisions.filter(d => d.side === 'p1' && !d.action.startsWith('team')).forEach((d,i) => store.input(owner,id,i + 1,d.action));
      store.complete(id,winning.log,{id,status:'complete',requestId:1,turn:winning.log.turns,team:[],opponent:null,actions:[],messages:winning.log.publicProtocol,winner:winning.log.winner,error:null});
      store.complete(id,winning.log,{id,status:'complete',requestId:1,turn:winning.log.turns,team:[],opponent:null,actions:[],messages:[],winner:winning.log.winner,error:null});
      expectedCoins += store.battle(id).reward;
      assert.equal(store.view(owner).coins,expectedCoins);
      if (roster.length === 6) assert.throws(() => store.recruit(owner,runId,id,recruits[index],null),/보유 한도/);
      store.recruit(owner,runId,id,recruits[index],replacements[index]);
      if (floor.number < 10) assert.deepEqual(store.view(owner).run!.suggestedTeam,winning.team.map(name => name === replacements[index] ? recruits[index] : name));
      assert.ok(store.roster(runId).length <= 6);
      assert.ok(store.view(owner).unlocked.includes(recruits[index]));
      assert.throws(() => store.recruit(owner,runId,id,recruits[index],replacements[index]),/이미 처리/);
      if (floor.number === 6) {
        const snapshot = store.view(owner);
        store.close(); store = new TowerStore(path);
        assert.deepEqual(store.view(owner),snapshot);
        assert.equal(store.view(owner).run!.floor,7);
      }
    }
    assert.equal(store.view(owner).run!.state,'cleared');
    assert.equal(store.view(owner).run!.floor,10);
    assert.ok(expectedCoins>=2610);
    assert.equal(store.roster(runId).length,6);
    assert.throws(() => store.enter(owner,runId,11,starters),/잘못된 층/);
    assert.ok(store.start(owner,['Garchomp','Metagross','Dragonite']));
    assert.equal(store.view(owner).coins,0);
    assert.equal(store.view(owner).growthPoints,400);
  } finally {store.close();}
});

test('v1 migration preserves an active three-floor battle and new runs use one hundred floors', async () => {
  const path = `.data/tests/${randomUUID()}.sqlite`;
  let store = new TowerStore(path);
  store.ensurePlayer('legacy');
  const id = store.start('legacy',starters);
  const runId = store.battle(id).run_id;
  store.db.prepare('UPDATE battles SET seed = ? WHERE id = ?').run('[1,2,3,4]',id);
  store.db.prepare('UPDATE battles SET opponent_team = ? WHERE id = ?').run(opponentTeam,id);
  store.db.prepare('UPDATE players SET coins = 700 WHERE id = ?').run('legacy');
  let service = new TowerService(store);
  let response = await service.state('legacy');
  response = await service.action('legacy',id,response.battle!.requestId,'move 1');
  const before = response.battle;
  await service.dispose();
  // Recreate the previous schema shape while retaining the actual battle snapshot and input.
  store.db.exec('ALTER TABLE runs DROP COLUMN total_floors; PRAGMA user_version = 1;');
  store.close(); store = new TowerStore(path); service = new TowerService(store);
  try {
    const restored = await service.state('legacy');
    // Showdown timestamps are wall-clock metadata, not part of replayed battle state.
    const withoutClock=(battle:typeof before)=>battle && {...battle,messages:battle.messages.filter(line=>!line.startsWith('|t:|'))};
    assert.deepEqual(withoutClock(restored.battle),withoutClock(before));
    assert.equal(restored.tower.run!.totalFloors,3);
    assert.equal(restored.tower.coins,700);
    await service.abandon('legacy',runId);
    store.start('legacy',starters);
    assert.equal(store.view('legacy').run!.totalFloors,100);
    assert.equal(store.view('legacy').coins,0);
  } finally {await service.dispose(); store.close();}
});
