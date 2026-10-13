import {evolvedOpponentSpecies} from '../src/data/opponent-species';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {trainerCatalog,normalTrainerSamples,eliteTrainerSamples,namedTrainerSamples,trainerView} from '../src/data/trainer-catalog';
import {selectTrainerSample,generateOpponentTeam,encounterPool} from '../src/server/opponent-team';
import {packTeam,pokemonSets,starters} from '../src/data/teams';
import {FORMAT,runBattle} from '../src/battle/run';
import {defaultProfile} from '../src/server/training';
import {TowerStore} from '../src/server/tower-store';
import {DamagePolicy} from '../src/battle/policy';
import {TowerPolicy} from '../src/battle/tower-policy';
import {randomUUID} from 'node:crypto';
import {existsSync} from 'node:fs';
import {towerTrainerEncounter} from '../src/data/tower-trainers';
import {towerThemes} from '../src/data/tower-themes';

const seed:[number,number,number,number]=[1,2,3,4];
function teamFor(sample:typeof trainerCatalog[number]){
  const encounter=generateOpponentTeam(Math.max(10,sample.minFloor),seed,[],null,sample);
  const profiles=Object.fromEntries(encounter.map(({name,moves})=>[name,{...defaultProfile(name),moves,...(encounter.find(p=>p.name===name)?.ability?{ability:encounter.find(p=>p.name===name)!.ability!}:{})}]));
  return {encounter,packed:packTeam(encounter.map(p=>p.name),profiles,Object.fromEntries(encounter.map(p=>[p.name,p.item ?? ''])))};
}
test('catalog covers all types and generations with supported, legal distinct parties',()=>{
  assert.equal(trainerCatalog.length,183);assert.equal(new Set(trainerCatalog.map(s=>s.id)).size,183);
  assert.equal(new Set(normalTrainerSamples.map(s=>s.specialty)).size,18);assert.equal(new Set(eliteTrainerSamples.map(s=>s.specialty)).size,18);
  for(let gen=1;gen<=9;gen++){const group=namedTrainerSamples.filter(s=>s.generation===gen);assert.ok(group.length>=13);assert.deepEqual(new Set(group.map(s=>s.role)),new Set(['gym','villain','champion','elite']));}
  const validator=new Showdown.TeamValidator(FORMAT);
  for(const sample of trainerCatalog){
    for(const name of sample.entries ?? [])assert.ok(pokemonSets[name],`${sample.id}: unsupported ${name}`);
    assert.ok(existsSync(`public/sprites/trainers/${sample.portrait}.png`),sample.portrait);
    const {encounter,packed}=teamFor(sample);assert.equal(new Set(encounter.map(p=>p.name)).size,3);const legal=Showdown.Teams.unpack(packed)!;for(const set of legal){set.pokeball='';set.evs={hp:1,atk:0,def:0,spa:0,spd:0,spe:0};set.ivs={hp:31,atk:31,def:31,spa:31,spd:31,spe:31};}assert.equal(validator.validateTeam(legal),null,sample.id);
    if(sample.specialty && sample.kind!=='named')for(const p of encounter)assert.ok(Showdown.Dex.species.get(p.name).types.includes(sample.specialty),`${sample.id}: ${p.name}`);
    assert.deepEqual(teamFor(sample),teamFor(sample));
  }
});
test('selection respects floors and recent identities/types without restricting Pokémon generation',()=>{
  for(let floor=1;floor<=10;floor++)for(let i=0;i<30;i++){
    const sample=selectTrainerSample(floor,[1,2,3,i]);assert.ok(sample.minFloor<=floor);if(floor<4)assert.equal(sample.kind,'normal');
    const encounter=generateOpponentTeam(floor,[1,2,3,i],[],null,sample);assert.equal(encounter.length,3);for(const p of encounter)assert.ok(encounterPool(floor).includes(p.name));
    const next=selectTrainerSample(floor,[1,2,3,i],[{id:sample.id,specialty:sample.specialty}]);assert.notEqual(next.id,sample.id);if(sample.specialty)assert.notEqual(next.specialty,sample.specialty);
  }
});
test('named trainers draw varied legal triples from original candidate entries, with a mandatory ace and varied partners',()=>{
  const validator=new Showdown.TeamValidator(FORMAT);
  for(const sample of namedTrainerSamples){
    assert.ok(sample.entries!.length>=5);assert.equal(new Set(sample.entries).size,sample.entries!.length);
    const combinations=new Set<string>(),seen=new Set<string>();
    for(let i=0;i<300;i++){
      const seed:[number,number,number,number]=[i,2,3,4],team=generateOpponentTeam(10,seed,[],null,sample);
      assert.equal(team.length,3);assert.equal(new Set(team.map(p=>p.name)).size,3);
      assert.deepEqual(generateOpponentTeam(10,seed,[],null,sample),team);
      for(const p of team){assert.ok(sample.entries!.includes(p.name));seen.add(p.name);
        assert.equal(validator.validateSet({...structuredClone(pokemonSets[p.name]),moves:p.moves,ability:p.ability ?? pokemonSets[p.name].ability,item:p.item ?? ''},{}),null,`${sample.id}: ${p.name}`);}
      combinations.add(team.map(p=>p.name).sort().join(','));assert.ok(team.some(p=>p.name===sample.ace),sample.id);const equipped=team.map(p=>p.item).filter(Boolean);assert.equal(new Set(equipped).size,equipped.length);
    }
    assert.equal(seen.size,sample.entries!.length,sample.id);assert.ok(combinations.size>=(sample.entries!.length===5 ? 6 : 8),sample.id);
  }
});
test('boss identities vary by run, preview agrees with battle, and saved identity and party survive reload',()=>{
  for(const floor of [5,10]){
    const seen=new Set<string>();
    for(let i=0;i<200;i++){const boss=towerTrainerEncounter(floor,`run-${i}`)!;seen.add(boss.boss.id);assert.equal(boss.boss.role,floor===5 ? 'gym' : 'champion');assert.deepEqual(towerTrainerEncounter(floor,`run-${i}`),boss);}
    assert.equal(seen.size,9);
    const path=`.data/tests/${randomUUID()}.sqlite`;let store=new TowerStore(path);
    try{store.ensurePlayer('boss');const first=store.start('boss',starters),runId=store.battle(first).run_id;
      store.db.prepare("UPDATE runs SET floor=?,state='select' WHERE id=?").run(floor,runId);
      const preview=store.view('boss').run!.boss!;store.close();store=new TowerStore(path);
      assert.deepEqual(store.view('boss').run!.boss,preview);
      const id=store.enter('boss',runId,floor,starters),row=store.battle(id);assert.deepEqual(JSON.parse(row.boss!),preview);
      const sample=namedTrainerSamples.find(s=>s.id===preview.id)!;for(const p of Showdown.Teams.unpack(row.opponent_team)!)assert.ok(sample.entries!.map(name=>evolvedOpponentSpecies(name,sample.id==='named-red')).includes(p.species));
      store.close();store=new TowerStore(path);assert.equal(store.battle(id).opponent_team,row.opponent_team);assert.deepEqual(store.view('boss').run!.boss,preview);
    }finally{store.close();}
  }
});
test('saved normal trainer survives reload and never grants a boss reward',()=>{
  const path=`.data/tests/${randomUUID()}.sqlite`;let store=new TowerStore(path);try{store.ensurePlayer('trainer');let id='',row;do{id=store.start('trainer',starters);row=store.battle(id);if(JSON.parse(row.trainer!).role==='villain')store.abandon('trainer',row.run_id);}while(JSON.parse(row.trainer!).role==='villain');assert.equal(row.boss,null);assert.ok(row.trainer);const sample=trainerCatalog.find(s=>s.id===JSON.parse(row.trainer!).id)!;assert.deepEqual(store.view('trainer').run!.trainer,{...trainerView(sample),generation:towerThemes[store.view('trainer').run!.theme!].generation});assert.equal(store.view('trainer').run!.boss,null);
    store.db.prepare('INSERT INTO rewards VALUES (?,?,?)').run(id,'trainer',100);assert.equal(store.view('trainer').run!.restartReward,20);
    const before=store.view('trainer');store.close();store=new TowerStore(path);assert.deepEqual(store.view('trainer'),before);assert.equal(store.battle(id).opponent_team,row.opponent_team);
  }finally{store.close();}
});
test('version ten migration preserves existing parties and creates nullable trainer metadata',()=>{
  const path=`.data/tests/${randomUUID()}.sqlite`;let store=new TowerStore(path);try{store.ensurePlayer('legacy');const id=store.start('legacy',starters),before=store.battle(id).opponent_team;store.db.exec('ALTER TABLE battles DROP COLUMN trainer; PRAGMA user_version=10;');store.close();store=new TowerStore(path);assert.equal(store.battle(id).opponent_team,before);assert.equal(store.view('legacy').run!.trainer,null);assert.equal((store.db.prepare('PRAGMA user_version').get() as {user_version:number}).user_version,28);}finally{store.close();}
});
test('every sample completes a battle using the existing public-information AI',async()=>{
  for(const sample of trainerCatalog){const {packed}=teamFor(sample);const log=await runBattle({teams:{p1:packTeam(starters),p2:packed},seed,player:new DamagePolicy(),opponent:new TowerPolicy()});assert.ok(log.winner,`${sample.id}: unfinished battle`);}
});
