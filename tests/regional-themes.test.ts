import {normalNpcTemplate} from '../src/server/npc-templates';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {towerThemes,randomTowerTheme,type TowerTheme} from '../src/data/tower-themes';
import {towerTrainerEncounter} from '../src/data/tower-trainers';
import {trainerCatalog} from '../src/data/trainer-catalog';
import {runOrganization,villainEncounter} from '../src/data/villain-organizations';
import {generateOpponentTeam} from '../src/server/opponent-team';
import {TowerStore} from '../src/server/tower-store';
import {pokemonSets,packTeam,starters} from '../src/data/teams';
import {defaultProfile} from '../src/server/training';
import {SwitchingPolicy} from '../src/battle/switch-policy';
import {DamagePolicy} from '../src/battle/policy';
import {runBattle} from '../src/battle/run';

const themes=Object.keys(towerThemes) as TowerTheme[];
test('all nine themes use regional signatures, distinct milestones and valid organization pools',()=>{
 assert.equal(themes.length,9);
 for(const theme of themes){const config=towerThemes[theme],gyms=new Set<string>(),elites=new Set<string>();
  for(let i=0;i<64;i++){
   const run=`theme-audit-${i}`,gym=[5,15,25,35,45].map(f=>towerTrainerEncounter(f,run,theme)!);
   assert.equal(new Set(gym.map(t=>t.boss.id)).size,5);
   const elite=[10,20,30].map(f=>towerTrainerEncounter(f,run,theme)!);assert.equal(new Set(elite.map(t=>t.boss.id)).size,3);
   for(const t of [...gym,...elite]){assert.equal(t.boss.generation,config.generation);assert.ok(t.entries.includes(t.ace!));}
   gym.forEach(t=>gyms.add(t.boss.id));elite.forEach(t=>elites.add(t.boss.id));
   assert.equal(towerTrainerEncounter(40,run,theme)!.boss.id,config.champion);assert.equal(towerTrainerEncounter(50,run,theme)!.boss.id,config.final);
   assert.ok((config.organizations as readonly string[]).includes(runOrganization(run,theme)));
  }
  assert.equal(gyms.size,config.gyms.length);assert.equal(elites.size,config.elites.length);
  for(const id of [...config.gyms,...config.elites,config.champion,config.final])assert.ok(trainerCatalog.some(s=>s.id===id));
  for(const f of [0,1,51,101,105])assert.equal(towerTrainerEncounter(f,'run',theme),null);
 }
 const counts=new Map(themes.map(t=>[t,0]));for(let i=0;i<9000;i++){const id=`draw-${i}`,theme=randomTowerTheme(id);assert.equal(randomTowerTheme(id),theme);counts.set(theme,counts.get(theme)!+1);}
 for(const count of counts.values())assert.ok(count>850 && count<1150,`unexpected theme distribution ${count}`);
});

test('new runs save a random theme and independent organization while existing Johto saves stay unchanged',()=>{
 const path=`.data/tests/${randomUUID()}.sqlite`;let store=new TowerStore(path);
 try{
  store.ensurePlayer('regions');let first='';
  for(let i=0;i<24;i++){const id=store.start('regions',starters),run=store.battle(id).run_id,theme=store.view('regions').run!.theme!;
   assert.equal(theme,randomTowerTheme(run));assert.equal(store.view('regions').run!.trainer!.generation,towerThemes[theme].generation);
   assert.equal(store.db.prepare('SELECT organization FROM run_villains WHERE run_id=?').get(run)!.organization,runOrganization(run));
   if(i===23){first=id;break;}store.abandon('regions',run);
  }
  const before=store.view('regions');store.close();store=new TowerStore(path);assert.deepEqual(store.view('regions'),before);
  const run=store.battle(first).run_id;store.db.prepare('DELETE FROM run_routes WHERE run_id=?').run(run);store.db.prepare('UPDATE run_themes SET theme=? WHERE run_id=?').run('johto',run);
  store.db.prepare("UPDATE runs SET state='select',floor=40 WHERE id=?").run(run);const preview=store.view('regions');assert.equal(preview.run!.boss!.name,'목호');
  store.close();store=new TowerStore(path);assert.deepEqual(store.view('regions'),preview);
 }finally{store.close();}
});

test('each theme persists its real preview and legal champion/final team without rerolling',()=>{
 const path=`.data/tests/${randomUUID()}.sqlite`;let store=new TowerStore(path);
 try{store.ensurePlayer('preview');
  for(const theme of themes){const run=store.battle(store.start('preview',starters)).run_id;store.db.prepare('UPDATE run_themes SET theme=? WHERE run_id=?').run(theme,run);
   for(const floor of [5,10,40,50]){
    store.db.prepare("UPDATE runs SET floor=?,state='select' WHERE id=?").run(floor,run);
    const expected=towerTrainerEncounter(floor,run,theme,true)!,preview=store.view('preview').run!.boss;assert.deepEqual(preview,expected.boss);
    const row=store.battle(store.enter('preview',run,floor,starters)),team=Showdown.Teams.unpack(row.opponent_team)!;
    assert.equal(team.length,3);const template=normalNpcTemplate(expected.boss.id,floor,expected.boss.role)!;
    assert.ok(team.some(p=>p.species===template.ace));assert.deepEqual(team.map(p=>p.species).sort(),template.team.map(p=>p.species).sort());
    assert.equal(new Set(team.map(p=>p.species)).size,3);
    const saved=store.view('preview');store.close();store=new TowerStore(path);assert.deepEqual(store.view('preview'),saved);assert.deepEqual(store.battle(row.id),row);
   }
   store.abandon('preview',run);
  }
 }finally{store.close();}
});

test('every theme finishes real v6 battles with its milestone teams',async()=>{
 for(const theme of themes)for(const floor of [10,40,50]){
  const trainer=towerTrainerEncounter(floor,'regional-engine',theme)!,team=generateOpponentTeam(floor,[1,2,3,4],[],trainer);
  const profiles=Object.fromEntries(team.map(p=>[p.name,{...defaultProfile(p.name),moves:p.moves,...(p.ability?{ability:p.ability}:{})}]));
  const enemy=packTeam(team.map(p=>p.name),profiles,Object.fromEntries(team.map(p=>[p.name,p.item??''])));
  const log=await runBattle({teams:{p1:packTeam(starters),p2:enemy},seed:[1,2,3,4],player:new DamagePolicy(),opponent:new SwitchingPolicy(),teraTickets:{p1:0,p2:1}});
  assert.ok(log.winner,`${theme} ${floor}`);
 }
});

test('regional organizations draw all three ranks with supported teams',()=>{
 const seen=new Set<string>();
 for(const theme of themes)for(const organization of towerThemes[theme].organizations){const ranks=new Set<string>();
  for(let i=0;i<300 && ranks.size<3;i++)for(const floor of [9,19,79]){
   const event=villainEncounter(`rank-${i}`,floor,organization);if(!event)continue;ranks.add(event.event.rank);seen.add(organization);
   for(const name of event.sample.entries!)assert.ok(pokemonSets[name]);
   assert.equal(generateOpponentTeam(floor,[i+1,2,3,4],[],null,event.sample).length,3);
  }
  assert.equal(ranks.size,3,organization);
 }
 assert.equal(seen.size,10);
});
