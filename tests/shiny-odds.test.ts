import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {starters} from '../src/data/teams';
import {shinyOdds,shinyChance,eggShinyChance,towerShinyChance,scoutShinyChance,rollShiny,shinyPercent,SHINY_CHARM_MAX} from '../src/data/shiny-odds';
import {machineShiny,MACHINE_SHINY_WEIGHT} from '../src/data/egg-kinds';
import {rollTowerShiny,rollEncounterShiny} from '../src/server/shiny';
import {lose} from './battle-retry.test';

test('odds tables: level 0 is the base rate, every kind is monotonic and sized for its exposure',()=>{
 assert.equal(SHINY_CHARM_MAX,5);
 assert.equal(eggShinyChance(0),24/10000);assert.equal(MACHINE_SHINY_WEIGHT,24);assert.equal(towerShinyChance(0),1/8192);
 for(const kind of ['egg','tower','scout'] as const){
  const {chances}=shinyOdds[kind];assert.equal(chances.length,SHINY_CHARM_MAX+1);
  for(let level=1;level<=SHINY_CHARM_MAX;level++)assert.ok(chances[level]>chances[level-1],`${kind} ${level}`);
 }
 // Tower is far below egg per roll; out-of-range levels clamp.
 for(let level=0;level<=SHINY_CHARM_MAX;level++)assert.ok(towerShinyChance(level)<eggShinyChance(level)/5);
 assert.equal(shinyChance('egg',99),eggShinyChance(SHINY_CHARM_MAX));assert.equal(shinyChance('egg',-3),eggShinyChance(0));
 assert.equal(scoutShinyChance(3),shinyOdds.scout.chances[3]/shinyOdds.scout.scale);
 assert.equal(shinyPercent(eggShinyChance(0)),'0.24%');assert.equal(shinyPercent(towerShinyChance(0)),'0.012%');
});

test('rolls use the same table as the displayed chance at every boundary',()=>{
 for(const kind of ['egg','tower','scout'] as const)for(let level=0;level<=SHINY_CHARM_MAX;level++){
  const {scale,chances}=shinyOdds[kind],n=chances[level];
  assert.equal(rollShiny(kind,level,max=>{assert.equal(max,scale);return n-1;}),true);
  assert.equal(rollShiny(kind,level,()=>n),false);
 }
 for(let level=0;level<=SHINY_CHARM_MAX;level++){
  const weight=shinyOdds.egg.chances[level];assert.equal(machineShiny(weight-1,level),true);assert.equal(machineShiny(weight,level),false);
 }
 // Level 0 towers keep the legacy 1/8192 draw exactly.
 assert.equal(rollTowerShiny(max=>{assert.equal(max,8192);return 0;},0),true);assert.equal(rollTowerShiny(()=>1,0),false);
 assert.equal(rollEncounterShiny(()=>0),true);
});

const withCharm=(s:TowerStore,level:number)=>{if(level)s.db.prepare("INSERT INTO permanent_research VALUES ('p','shinyCharm',?)").run(level);};
const roller=(state:{tower:number})=>(max:number)=>max===65536?state.tower:max===8192?1:0;

test('tower opponents use the charm level, are fixed at creation and survive reload and retry',()=>{
 const path=`.data/tests/tower-shiny-${randomUUID()}.sqlite`,state={tower:20};let s=new TowerStore(path,roller(state));
 try{
  s.ensurePlayer('p');s.db.prepare('UPDATE players SET growth_points=20000 WHERE id=?').run('p');
  for(let n=0;n<3;n++)s.permanentAction('p',randomUUID(),'buy','retry',1,null);
  // Level 2: 17/65536 -> a roll of 20 is not shiny; level 3 (25) is.
  withCharm(s,2);let id=s.start('p',starters,'basic');
  assert.ok(Showdown.Teams.unpack(s.battle(id).opponent_team)!.every(p=>!p.shiny));
  s.db.prepare("UPDATE permanent_research SET level=3 WHERE product='shinyCharm'").run();s.abandon('p',s.battle(id).run_id);
  id=s.start('p',starters,'basic');const team=s.battle(id).opponent_team;
  assert.ok(Showdown.Teams.unpack(team)!.length>0&&Showdown.Teams.unpack(team)!.every(p=>p.shiny));
  // Reload keeps the same snapshot even if the roller would now say otherwise.
  s.close();state.tower=60000;s=new TowerStore(path,roller(state));
  assert.equal(s.battle(id).opponent_team,team);
  // Retry reuses the stored opponent team.
  const run=s.battle(id).run_id;lose(s,id);s.retry('p',run,id);
  const next=s.enter('p',run,1,starters);assert.equal(s.battle(next).opponent_team,team);
  assert.ok(Showdown.Teams.unpack(s.battle(next).opponent_team)!.every(p=>p.shiny));
 }finally{s.close();}
});

test('a shiny opponent stays shiny as a recruit candidate and is saved permanently',()=>{
 const state={tower:0},s=new TowerStore(':memory:',roller(state));
 try{
  s.ensurePlayer('p');withCharm(s,1);
  const battle=s.start('p',starters,'chaos'),run=s.battle(battle).run_id;
  const opponents=Showdown.Teams.unpack(s.battle(battle).opponent_team)!;assert.ok(opponents.every(p=>p.shiny));
  s.db.prepare("UPDATE battles SET status='complete' WHERE id=?").run(battle);s.db.prepare("UPDATE runs SET state='recruit' WHERE id=?").run(run);
  const incoming=opponents.find(p=>!s.roster(run).includes(p.species))!.species;
  assert.equal(s.view('p').run!.candidateDetails![incoming].shiny,true);
  s.recruit('p',run,battle,incoming,null,undefined,true);
  assert.equal(s.trainingCollection('p').find(e=>e.species===incoming)!.profile.shiny,true);
 }finally{s.close();}
});

test('without a charm the tower keeps the legacy draw and eggs use the shared table',()=>{
 const state={tower:0},s=new TowerStore(':memory:',(max)=>max===8192?0:max===10000?29:0);
 try{
  s.ensurePlayer('p');s.db.prepare('UPDATE players SET growth_points=20000 WHERE id=?').run('p');
  const id=s.start('p',starters,'basic');assert.ok(Showdown.Teams.unpack(s.battle(id).opponent_team)!.every(p=>p.shiny));
  assert.equal(s.permanentView('p').shinyChance!.egg,eggShinyChance(0));assert.equal(s.permanentView('p').shinyChance!.tower,towerShinyChance(0));
  assert.equal(s.permanentAction('p',randomUUID(),'hatch','egg',1,null,'machine').eggs![0].shiny,false);
  s.permanentAction('p',randomUUID(),'buy','shinyCharm',1,null);
  assert.equal(s.permanentView('p').shinyChance!.egg,eggShinyChance(1));assert.equal(s.permanentView('p').shinyChance!.scout,scoutShinyChance(1));
  assert.equal(s.permanentAction('p',randomUUID(),'hatch','egg',1,null,'machine').eggs![0].shiny,true);
  void state;
 }finally{s.close();}
});
