import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {parseSimulationArgs,runRaidSimulationJobs} from '../scripts/simulate-raids';
import {raidFloorBrackets,endgameDifficulty} from '../scripts/lib/raid-floor-brackets';
import {floorSimulationReport,type OverallBaseline} from '../scripts/lib/raid-floor-report';
import {simulationTeams,simulationPlayerTeam} from '../scripts/lib/raid-simulation-pool';
import {simulateRaid} from '../scripts/lib/raid-simulation';

test('two bosses × four brackets × three real runs: eligibility, balanced floors, determinism across workers, complete statistics',async()=>{
 const options={bossIds:['volcarona','kyurem'],runs:3,seedBase:'raid-floor-test-v1',floorBrackets:true};
 const serial=await runRaidSimulationJobs({...options,workers:1}),parallel=await runRaidSimulationJobs({...options,workers:2});
 assert.equal(serial.length,24);assert.deepEqual(parallel,serial);
 for(const bossId of options.bossIds)for(const bracket of raidFloorBrackets){
  const selected=serial.filter(r=>r.bossId===bossId&&r.bracket===bracket.id);assert.equal(selected.length,3);
  assert.equal(selected.filter(r=>r.won).length+selected.filter(r=>!r.won).length,3);
  const counts=bracket.floors.map(f=>selected.filter(r=>r.floor===f).length);assert.ok(Math.max(...counts)-Math.min(...counts)<=1);
  for(const row of selected){assert.ok((bracket.floors as readonly number[]).includes(row.floor));assert.ok(row.floor>=bracket.min&&row.floor<=bracket.max);assert.ok(simulationTeams.find(t=>t.id===row.teamId)!.minFloor<=row.floor);}
 }
 const baseline=JSON.parse(readFileSync('tests/fixtures/raid/overall-comparison.json','utf8')) as OverallBaseline;
 const root=join(mkdtempSync(join(tmpdir(),'raid-floor-')),'smoke'),metadata={runsPerBossBracket:3,commit:'test',seedBase:options.seedBase};
 const result=floorSimulationReport(serial,metadata,root,baseline),other=root+'-parallel';floorSimulationReport(parallel,metadata,other,baseline);
 for(const suffix of ['csv','comparison.csv','branches.csv','phases.csv','teams.csv','strength.csv','floors.csv','battles.csv'])assert.equal(readFileSync(root+'.'+suffix,'utf8'),readFileSync(other+'.'+suffix,'utf8'));
 assert.equal(result.groups.length,8);assert.equal(result.groups.reduce((n,g)=>n+g.summary.battles,0),24);
 for(const group of result.groups){
  assert.equal(result.phases.filter(p=>p.bossId===group.bossId&&p.bracket===group.bracket).reduce((n,p)=>n+p.losses,0),group.summary.bossWins);
  assert.equal(result.branches.filter(b=>b.bossId===group.bossId&&b.bracket===group.bracket).reduce((n,b)=>n+b.summary.battles,0),3);
 }
 assert.equal(result.teams.reduce((n,t)=>n+t.uses,0),24);assert.equal(result.floors.reduce((n,f)=>n+f.battles,0),24);
 for(const bracket of ['late','endgame']){const s=result.strength.find(s=>s.bracket===bracket)!;assert.equal(s.avgIV,25);assert.equal(s.avgTrainingPoints,50);assert.equal(s.avgHeldItems,3);assert.ok(s.eligibleTeams.every(f=>f.count===20));}
 assert.throws(()=>floorSimulationReport([{...serial[0],floor:95},...serial.slice(1)],metadata,root,baseline),/eligibility/);
 assert.throws(()=>floorSimulationReport([...serial,serial[0]],metadata,root,baseline),/Duplicate/);
});

test('original overall mode keeps its seed domain despite the explicitly versioned HP change',async()=>{
 const rows=await simulateRaid({bossId:'garchomp',runs:2,seedBase:'raid-winrate-v1'});
 assert.deepEqual(rows.map(r=>r.floor),[5,15]);assert.ok(rows.every(r=>r.bracket===undefined));
 assert.deepEqual(rows.map(r=>r.seed),[[37910,31203,60545,31135],[50335,2703,7243,60384]]);
});

test('bracket CLI defaults, explicit runs, protected output and label boundaries',()=>{
 assert.equal(parseSimulationArgs([]).runs,1000);
 const bracket=parseSimulationArgs(['--floor-brackets']);assert.equal(bracket.runs,500);assert.equal(bracket.out,'artifacts/experiments/balance/raid-winrate-by-floor');
 assert.equal(parseSimulationArgs(['--runs','3','--floor-brackets']).runs,3);assert.equal(parseSimulationArgs(['--floor-brackets','--runs','4']).runs,4);
 assert.throws(()=>parseSimulationArgs(['--floor-brackets','--out','artifacts/experiments/balance/raid-winrate-simulation']),/overwrite/);
 assert.deepEqual([39.9,40,65,65.1,80,80.1].map(endgameDifficulty),['너무 강함','적당히 어려움','적당히 어려움','비교적 쉬움','비교적 쉬움','너무 쉬움']);
 const early=simulationPlayerTeam(simulationTeams[0],5),late=simulationPlayerTeam(simulationTeams[0],65),end=simulationPlayerTeam(simulationTeams[0],95);
 assert.equal(early.profiles.Charizard.ivs.hp,0);assert.deepEqual(late,end);
});
