import {readFileSync,writeFileSync,createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const manifest=JSON.parse(readFileSync('artifacts/composition-experiment-manifest.json','utf8'));
const cases=JSON.parse(readFileSync(manifest.caseFile,'utf8'));
assert.equal(createHash('sha256').update(manifest.implementationFiles.map(path=>readFileSync(path,'utf8')).join('\n')).digest('hex'),manifest.implementationHash);
assert.equal(createHash('sha256').update(readFileSync(manifest.caseFile)).digest('hex'),manifest.caseHash);
const reports=manifest.jobs.map(job=>({job,report:JSON.parse(readFileSync(`artifacts/simulation-${job.phase}-balanced.json`,'utf8'))}));
const oldCourses=JSON.parse(readFileSync(manifest.sources.matched,'utf8')).courses;
const newCourses=JSON.parse(readFileSync(manifest.sources.new,'utf8')).courses;
assert(newCourses.every(c=>!oldCourses.some(o=>o.id===c.id)),'New cohort must have distinct courses');
const datasetFiles=[];let totalBattles=0,totalDecisions=0,totalClimbs=0;
for(const {job,report} of reports){
 const expected=job.stages?job.stages.split(','):cases.map(c=>c.id);
 assert.deepEqual(report.stages.map(s=>s.stage).sort(),expected.sort());
 assert.equal(report.composition,job.composition);assert.equal(report.rule,job.rule);assert.equal(report.courses,9);
 assert.equal(report.sourceCourseHash,createHash('sha256').update(readFileSync(job.source)).digest('hex'));
 const indexes=new Map();
 for(const stage of report.stages){
  assert.equal(stage.climbs.length,9);totalClimbs+=9;
  for(const climb of stage.climbs){
   indexes.set(`${stage.stage}/${climb.id}`,{climb,played:0,wins:0});
   if(job.composition==='synergy')for(const r of climb.recruitments){assert(r.afterScore>=r.beforeScore);assert.equal(r.afterTeam.length,3);assert.equal(new Set(r.afterTeam).size,3);}
  }
 }
 const path=`artifacts/${job.phase}-battles.jsonl`,hash=createHash('sha256');let battles=0,decisions=0;
 const stream=createReadStream(path);stream.on('data',chunk=>hash.update(chunk));
 for await(const line of createInterface({input:stream,crlfDelay:Infinity})){
  const row=JSON.parse(line),index=indexes.get(`${row.caseId}/${row.courseId}`);assert(index);
  assert.equal(row.floor,++index.played);if(row.winner==='Player')index.wins++;
  assert.equal(row.composition,job.composition);assert.equal(row.rule,job.rule);
  assert(row.coinsBefore>=0&&row.teraTicketsBefore>=0);assert.equal(row.playerTeam.length,3);assert.equal(row.opponentTeam.length,3);
  if(!['tera','chaos'].includes(job.rule))assert.equal(row.playerTera+row.enemyTera,0);
  battles++;decisions+=row.decisions.length;
 }
 for(const {climb,played,wins} of indexes.values()){assert.equal(played,climb.battles);assert.equal(wins,climb.cleared);}
 assert.equal(battles,report.stages.reduce((n,s)=>n+s.battles,0));
 totalBattles+=battles;totalDecisions+=decisions;
 datasetFiles.push({path,battles,decisions,sha256:hash.digest('hex')});
 console.log('Audited '+job.phase+': '+battles+' battles');
}
const control=reports.find(r=>r.job.cohort==='control').report.stages[0];
const previous=JSON.parse(readFileSync('artifacts/simulation-rule-basic-balanced.json','utf8')).stages.find(s=>s.stage==='trained');
for(const climb of control.climbs)assert.deepEqual(climb,previous.climbs.find(c=>c.id===climb.id));
const aggregate=stages=>{const climbs=stages.flatMap(s=>s.climbs);return {samples:climbs.length,averageCleared:climbs.reduce((n,c)=>n+c.cleared,0)/climbs.length,
 passed10:climbs.filter(c=>c.cleared>=10).length,passed50:climbs.filter(c=>c.cleared>=50).length,passed100:climbs.filter(c=>c.cleared===100).length};};
const comparisons=[];
for(const cohort of ['matched','new'])for(const rule of ['basic','mega','dynamax','tera','chaos']){
 const pair=reports.filter(r=>r.job.cohort===cohort&&r.job.rule===rule);
 const legacy=pair.find(r=>r.job.composition==='legacy').report,synergy=pair.find(r=>r.job.composition==='synergy').report;
 const rows=synergy.stages.flatMap(s=>s.climbs.map(c=>{const old=legacy.stages.find(o=>o.stage===s.stage).climbs.find(o=>o.id===c.id);assert(old);return {caseId:s.stage,courseId:c.id,delta:c.cleared-old.cleared};}));
 comparisons.push({cohort,rule,legacy:aggregate(legacy.stages),synergy:aggregate(synergy.stages),
 improved:rows.filter(r=>r.delta>0).length,worse:rows.filter(r=>r.delta<0).length,tied:rows.filter(r=>r.delta===0).length,
 cases:synergy.stages.map(s=>({id:s.stage,label:s.label,legacy:aggregate([legacy.stages.find(o=>o.stage===s.stage)]),synergy:aggregate([s])})),pairedDeltas:rows});
}
const supports=reports.filter(r=>r.job.cohort==='support').map(({job,report})=>({player:job.player,cases:report.stages.map(s=>({id:s.stage,...aggregate([s]),supportMoves:s.climbs.reduce((counts,c)=>{for(const [move,n] of Object.entries(c.supportMoves??{}))counts[move]=(counts[move]??0)+n;return counts;},{})}))}));
const summary={schemaVersion:1,climbs:totalClimbs,battles:totalBattles,decisions:totalDecisions,cases:cases.length,mainClimbs:4140,baselineMatches:true,
 comparisons,supports,datasetFiles,notes:'Experimental player AI only; live opponent v7 and game balance unchanged. Paired heuristic experiment, not trained ML or human win rates. Each case/cohort has one course per theme (9); frozen matched cohort differs from newly generated live cohort. No future enemy knowledge in composition selection. No new-cohort tuning after results.'};
assert.equal(totalClimbs,4185);
writeFileSync('artifacts/composition-simulation-summary.json',JSON.stringify(summary,null,2));
console.log(JSON.stringify({climbs:totalClimbs,battles:totalBattles,decisions:totalDecisions,comparisons:comparisons.map(({cases:_,pairedDeltas:__,...c})=>c),supports},null,2));
