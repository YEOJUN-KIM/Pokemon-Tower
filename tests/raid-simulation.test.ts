import test from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {simulateRaid,summarize,simulationSeed,SimulationHealth,mean,median} from '../scripts/lib/raid-simulation';
import {simulationTeams,simulationPlayerTeam} from '../scripts/lib/raid-simulation-pool';
import {simulationReport,csv} from '../scripts/lib/raid-simulation-report';
import {parseSimulationArgs} from '../scripts/simulate-raids';
import {replayBattle,type BattleLog} from '../src/battle/run';
import {validateProfile} from '../src/server/training';
import {mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

test('real engine smoke and determinism: one random-route boss × six runs twice, replay, aggregates and reports',async()=>{
 const options={bossId:'volcarona',runs:6,seedBase:'raid-test-v1'},logs:BattleLog[]=[];
 const first=await simulateRaid({...options,onLog:log=>logs.push(log)}),second=await simulateRaid(options);
 assert.deepEqual(second,first);assert.equal(first.length,6);
 const summary=summarize(first);assert.equal(summary.playerWins+summary.bossWins,6);
 assert.equal(first.filter(r=>r.lossPhase!==null).length,summary.bossWins);
 assert.equal(first.reduce((n,r)=>n+Number(['slither-wing','iron-moth'].includes(r.route)),0),6);
 for(const row of first){
  assert.ok(row.survivors>=0&&row.survivors<=3);assert.ok(row.teamHP>=0&&row.teamHP<=100);
  if(row.lossPhase!==null){assert.ok(row.lossPhase>=1&&row.lossPhase<=2);assert.ok(row.bossPhaseHP!>=0&&row.bossPhaseHP!<=100);}
  assert.equal(row.effectiveHP,row.phaseHP.reduce((a,b)=>a+b,0));
  row.observedPhases.forEach((hp,i)=>assert.equal(hp,row.phaseHP[i]));
 }
 assert.ok(logs.every(log=>log.raid?.transformationAdapter===1&&log.decisions.length>0&&log.publicProtocol.some(l=>l.startsWith('|raid|'))));
 await replayBattle(logs[0]);
 const dir=mkdtempSync(join(tmpdir(),'raid-sim-')),out=join(dir,'smoke');
 const report=simulationReport(first,{seedBase:options.seedBase,sourceHash:'test',commit:'test'},out);
 assert.equal(report.groups[0].summary.battles,6);assert.equal(report.branches.reduce((n,b)=>n+b.summary.battles,0),6);
 assert.equal(report.phases.reduce((n,p)=>n+p.losses,0),summary.bossWins);
 assert.equal(readFileSync(out+'.battles.csv','utf8').trim().split('\n').length,7);
 assert.match(readFileSync(out+'.md','utf8'),/20개 일반 팀/);
 assert.equal(JSON.parse(readFileSync(out+'.json','utf8')).groups[0].summary.playerWins,summary.playerWins);
});

test('twenty independent three-member pools use real normal player sets and legal growth',()=>{
 assert.equal(simulationTeams.length,20);assert.equal(new Set(simulationTeams.map(t=>t.species.join('/'))).size,20);
 for(const team of simulationTeams){
  assert.equal(team.species.length,3);assert.equal(new Set(team.species).size,3);
  const player=simulationPlayerTeam(team,95),sets=Showdown.Teams.unpack(player.packed)!;
  assert.equal(sets.length,3);
  for(const name of team.species){validateProfile(name,player.profiles[name]);assert.equal(player.profiles[name].runBonuses,undefined);assert.equal(sets.find(s=>s.species===name)!.level,50);}
 }
});

test('terminal health events retain fainted maxima, bench state and exact Phase health',()=>{
 const state=new SimulationHealth();
 state.consume('|request|'+JSON.stringify({side:{pokemon:[{ident:'p1: A',condition:'100/100'},{ident:'p1: B',condition:'200/200'},{ident:'p1: C',condition:'150/150'}]}}),'p1');
 state.consume('|switch|p1a: A|A, L50|100/100','p1');state.consume('|-damage|p1a: A|0 fnt','p1');state.consume('|faint|p1a: A','p1');
 state.consume('|switch|p1a: B|B, L50|200/200','p1');state.consume('|-sethp|p1a: B|25/200','p1');
 assert.deepEqual([...state.own.values()],[{hp:0,max:100},{hp:25,max:200},{hp:150,max:150}]);
 const boss=new SimulationHealth();boss.consume('|switch|p2a: Boss|Source, L50|180/180','p2');boss.consume('|-heal|p2a: Boss|360/360|[silent]','p2');boss.consume('|-damage|p2a: Boss|90/360','p2');
 assert.equal(boss.phase,1);assert.deepEqual([...boss.own.values()],[{hp:90,max:360}]);
 boss.consume('|switch|p2a: Boss|Final, L50|240/240|[raid]','p2');assert.equal(boss.phase,2);
});

test('CLI defaults, invalid arguments, seeds, empty-win metrics and CSV escaping',()=>{
 assert.equal(parseSimulationArgs([]).runs,1000);
 for(const args of [['--runs','0'],['--runs','1.5'],['--workers','33'],['--boss','missing'],['--bogus'],['--runs']])assert.throws(()=>parseSimulationArgs(args));
 assert.deepEqual(simulationSeed('same'),simulationSeed('same'));assert.notDeepEqual(simulationSeed('same'),simulationSeed('other'));
 assert.equal(mean([]),null);assert.equal(median([]),null);assert.equal(median([4,2,1,3]),2.5);
 assert.equal(csv([['a,b','"quoted"',null]]),'"a,b","""quoted""",\n');
});
