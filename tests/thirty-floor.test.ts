import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {towerDifficulty} from '../src/data/tower-progression';
import {npcRankTraining} from '../src/data/npc-ranks';
import {floors} from '../src/data/floors';
import {starters,packTeam,pokemonSets} from '../src/data/teams';
import {isShopFloor} from '../src/data/shop';
import {towerTrainerEncounter} from '../src/data/tower-trainers';
import {villainOrganizations,runOrganization,villainGrunt} from '../src/data/villain-organizations';
import {encounterPool,generateOpponentTeam} from '../src/server/opponent-team';
import {runBattle,FORMAT} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';

test('one hundred real battle results progress through every checkpoint and only clear after floor one hundred',async()=>{
  const store=new TowerStore(':memory:');
  try{
    store.ensurePlayer('climb');let id=store.start('climb',starters);const run=store.battle(id).run_id;
    // Hidden Kanto/Johto rematches have separate route tests; this fixture counts 100 battles.
    store.db.prepare("UPDATE run_themes SET theme='hoenn' WHERE run_id=?").run(run);
    store.db.prepare("UPDATE run_routes SET second_theme='sinnoh' WHERE run_id=?").run(run);
    assert.equal(store.view('climb').run!.totalFloors,100);
    for(let floor=1;floor<=100;floor++){
      if(floor>1){
        assert.equal(store.view('climb').run!.state,'select');
        assert.equal(!!store.view('climb').run!.machineShop,isShopFloor(floor,100));
        if(isShopFloor(floor,100)){
          store.db.prepare('INSERT OR REPLACE INTO consumable_shops VALUES (?,?,?)').run(run,floor,JSON.stringify(['attack','speed','guard']));
          store.purchase('climb',run,floor,'attack');
          assert.ok(store.view('climb').run!.battleItems!.attack!>0);
          const offer=store.view('climb').run!.machineShop!.offers[0];
          if(offer)store.purchaseMachine('climb',run,floor,offer.move,offer.targets[0],null);
        }
        id=store.enter('climb',run,floor,starters);
      }
      const row=store.battle(id),original=Showdown.Teams.unpack(row.opponent_team)!;
      assert.equal(original.length,3);assert.equal(new Set(original.map(set=>set.species)).size,3);
      const boss=floor%5===0 ? towerTrainerEncounter(floor,run,store.view('climb').run!.theme!,true)!.boss : null;
      const savedBoss=row.boss?JSON.parse(row.boss):null;
      if(savedBoss?.gimmick){
        assert.ok(original.some(set=>set.species===savedBoss.gimmick.species));
        if(savedBoss.gimmick.item)assert.ok(original.some(set=>set.species===savedBoss.gimmick.species && set.item===savedBoss.gimmick.item));
        const {gimmick,npcAi,...identity}=savedBoss;assert.deepEqual(identity,boss);assert.ok(npcAi);
      }else if(savedBoss){const {npcAi,...identity}=savedBoss;assert.deepEqual(identity,boss);assert.ok(npcAi);}
      else assert.equal(savedBoss,boss);
      const rank=row.trainer?JSON.parse(row.trainer).npcRank:undefined;
      const points=rank?npcRankTraining(floor,rank).evBudget:floor===50?46:towerDifficulty(floor).points;
      assert.equal(original.reduce((sum,set)=>sum+Object.values((set.evs ?? {}) as Record<string,number>).reduce((s,n)=>s+n,0),0),3*points);
      // Weak deterministic opponents isolate progression from win-rate tuning. No winner is injected.
      const enemy=packTeam(['Unown','Luvdisc','Delibird']);
      store.db.prepare('UPDATE battles SET opponent_team=?,seed=? WHERE id=?').run(enemy,'[1,2,3,4]',id);
      const log=await runBattle({trainerEquipment:row.trainer_equipment==null?undefined:JSON.parse(row.trainer_equipment),teams:{p1:row.player_team,p2:enemy},seed:[1,2,3,4],player:new DamagePolicy(),opponent:new DamagePolicy(),upgrades:JSON.parse(row.upgrades)});
      assert.equal(log.winner,'Player');
      store.complete(id,log,{id,status:'complete',requestId:1,turn:log.turns,team:[],opponent:null,actions:[],messages:log.publicProtocol,winner:log.winner,error:null});
      store.recruit('climb',run,id,null,null);
      assert.equal(store.view('climb').run!.state,floor===100 ? 'cleared' : 'select');
    }
    assert.equal(store.view('climb').run!.victories,100);assert.equal(store.view('climb').coins,0);
    assert.throws(()=>store.enter('climb',run,101,starters),/잘못된 층/);
  }finally{store.close();}
});

test('v11 migration preserves ten-floor battles, profiles, purchases and foreign keys while new runs use one hundred',()=>{
  const path=`.data/tests/${randomUUID()}.sqlite`;let store=new TowerStore(path);
  try{
    store.ensurePlayer('old');const id=store.start('old',starters),run=store.battle(id).run_id;
    store.db.prepare("UPDATE runs SET total_floors=10,floor=6,state='select' WHERE id=?").run(run);
    store.db.prepare('UPDATE players SET coins=1000 WHERE id=?').run('old');store.db.prepare('INSERT OR REPLACE INTO consumable_shops VALUES (?,?,?)').run(run,6,JSON.stringify(['attack','speed','guard']));store.purchase('old',run,6,'attack');
    const before=store.view('old'),battle=store.battle(id);store.close();
    const legacy=new DatabaseSync(path);legacy.exec('PRAGMA foreign_keys=OFF; BEGIN;');
    const sql=(legacy.prepare("SELECT sql FROM sqlite_master WHERE name='runs'").get() as {sql:string}).sql;
    legacy.exec(sql.replace('CREATE TABLE "runs"','CREATE TABLE legacy_runs').replace('CREATE TABLE runs','CREATE TABLE legacy_runs').replace('DEFAULT 100','DEFAULT 10').replace('BETWEEN 1 AND 100','BETWEEN 1 AND 10'));
    legacy.exec("INSERT INTO legacy_runs SELECT * FROM runs; DROP TABLE runs; ALTER TABLE legacy_runs RENAME TO runs; CREATE UNIQUE INDEX one_active_run ON runs(player_id) WHERE state IN ('select','battle','recruit'); PRAGMA user_version=11; COMMIT;");legacy.close();
    store=new TowerStore(path);
    assert.deepEqual(store.battle(id),battle);assert.deepEqual(store.view('old').run,before.run);assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(),[]);
    assert.equal((store.db.prepare('PRAGMA foreign_keys').get() as {foreign_keys:number}).foreign_keys,1);
    store.ensurePlayer('new');store.start('new',starters);assert.equal(store.view('new').run!.totalFloors,100);
    store.db.prepare("UPDATE runs SET floor=10,state='select' WHERE id=?").run(run);assert.equal(store.view('old').run!.floorName,'타워의 정상');
  }finally{store.close();}
});

test('villain grunts belong to one saved organization, avoid milestones and consecutive appearances, and have legal teams',()=>{
  const validator=new Showdown.TeamValidator(FORMAT),seen=new Set<string>();
  for(let i=0;i<300;i++){
    const run=`villain-fixture-${i}`,organization=runOrganization(run);seen.add(organization);
    for(let floor=1;floor<=30;floor++){
      const sample=villainGrunt(run,floor,organization);
      assert.equal(villainGrunt(run,floor,organization,true),null);
      if(floor%5===0)assert.equal(sample,null);
      if(sample){assert.equal(sample.title,villainOrganizations.find(g=>g.id===organization)!.name);assert.equal(sample.role,'villain');}
    }
  }
  assert.equal(seen.size,10);
  for(const group of villainOrganizations){
    for(const name of group.entries)assert.ok(pokemonSets[name],`${group.id}: ${name}`);
    const sample={id:'fixture',name:'조직원',title:group.name,kind:'normal' as const,role:'villain' as const,generation:null,specialty:null,tactic:'status' as const,portrait:group.portrait,minFloor:1,concept:'fixture',entries:group.entries.filter(name=>encounterPool(9).includes(name))};
    assert.ok(sample.entries.length>=3);
    const team=generateOpponentTeam(9,[1,2,3,4],[],null,sample);assert.equal(team.length,3);
    const unpacked=Showdown.Teams.unpack(packTeam(team.map(p=>p.name)))!;unpacked.forEach((set,i)=>{set.moves=team[i].moves;});assert.equal(validator.validateTeam(unpacked),null);
  }
  const store=new TowerStore(':memory:');try{store.ensurePlayer('saved');const run=store.battle(store.start('saved',starters)).run_id;assert.equal((store.db.prepare('SELECT organization FROM run_villains WHERE run_id=?').get(run) as {organization:string}).organization,runOrganization(run));}finally{store.close();}
});
