import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const parts=['fresh','trained','mixed'];
const reports=parts.map(p=>JSON.parse(readFileSync(`artifacts/experiments/balance/simulation-diverse-${p}-balanced.json`,'utf8')));
const definitions=JSON.parse(readFileSync('artifacts/experiments/samples/diverse-team-cases.json','utf8'));
const cases=reports.flatMap(r=>r.stages);
assert.equal(cases.length,25,'Wait for all 25 cases to finish');
assert.equal(new Set(cases.map(c=>c.stage)).size,25);
const courseIds=cases[0].climbs.map(c=>c.id).sort();
assert.equal(courseIds.length,36);
const files=[];
let battleCount=0,decisionCount=0;
for(const [i,report] of reports.entries()){
 assert.equal(report.rule,'basic');
 assert.equal(report.sourceCourseHash,reports[0].sourceCourseHash);
 for(const c of report.stages){
  assert.deepEqual(c.climbs.map(r=>r.id).sort(),courseIds);
  if(c.recruitment==='fixed')for(const r of c.climbs)assert.deepEqual([...r.finalParty].sort(),[...c.initialTeam].sort());
 }
 const path=`artifacts/experiments/samples/diverse-${parts[i]}-battles.jsonl`;
 const bytes=readFileSync(path);
 const rows=bytes.toString('utf8').trim().split('\n').map(line=>JSON.parse(line));
 assert.equal(rows.length,report.stages.reduce((n,c)=>n+c.battles,0));
 assert.equal(new Set(rows.map(r=>`${r.caseId}/${r.courseId}/${r.floor}`)).size,rows.length);
 for(const c of report.stages)for(const climb of c.climbs){
  const battles=rows.filter(r=>r.caseId===c.stage&&r.courseId===climb.id);
  assert.equal(battles.length,climb.battles);
  assert.equal(battles.filter(r=>r.winner==='Player').length,climb.cleared);
  battles.forEach((r,n)=>assert.equal(r.floor,n+1));
 }
 for(const r of rows){
  assert.equal(r.rule,'basic');assert.equal(r.playerTeam.length,3);assert.equal(r.opponentTeam.length,3);
  assert(r.coinsBefore>=0);assert.equal(r.teraTicketsBefore,0);assert.equal(r.playerTera+r.enemyTera,0);
  decisionCount+=r.decisions.length;
 }
 battleCount+=rows.length;
 files.push({path,battles:rows.length,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
// Confirm the new logger and custom case option preserve the old recruitment baseline.
const old=JSON.parse(readFileSync('artifacts/experiments/balance/simulation-rule-basic-balanced.json','utf8')).stages.find(c=>c.stage==='trained');
const control=cases.find(c=>c.stage==='gen1-trained-adaptive');
for(const climb of control.climbs)assert.deepEqual(climb,old.climbs.find(c=>c.id===climb.id));
const summary={schemaVersion:1,rule:'basic',courses:36,climbs:900,battles:battleCount,decisions:decisionCount,
 engineVersion:reports[0].engineVersion,format:reports[0].format,sourceCourseFile:reports[0].sourceCourseFile,
 sourceCourseHash:reports[0].sourceCourseHash,definitions,files,courseIds,
 cases:cases.map(c=>({id:c.stage,label:c.label,category:c.category,team:c.initialTeam,recruitment:c.recruitment,
  samples:c.climbs.length,averageCleared:c.averageCleared,passed10:c.passed10,passed50:c.passed50,
  passed100:c.finished,battles:c.battles,battleWinRate:c.battleWinRate,byTheme:c.byTheme})),
 limitations:['These are AI strategies, not human win rates.','Only basic rule, 36 reused matched frozen courses; other rules and new random courses remain unmeasured.',
  'Fixed recruitment preserves the roster but still improves owned species through captures and shops.',
  'Each JSONL row is a played battle; later floors after defeat are missing, not losses.',
  'Decision traces lack per-turn observations and counterfactual action values; this is not an optimal-action training set.',
  'Opponent teams contain hidden simulator information: exclude unavailable fields from any deployed decision model.',
  'Split evaluation by courseId; generate new reserved courses for final testing. No model has been trained.']};
writeFileSync('artifacts/experiments/samples/diverse-simulation-summary.json',JSON.stringify(summary,null,2));
console.log(JSON.stringify({climbs:summary.climbs,battles:battleCount,decisions:decisionCount,baselineMatches:true,cases:summary.cases.map(({id,averageCleared,passed50,passed100})=>({id,averageCleared,passed50,passed100}))},null,2));
