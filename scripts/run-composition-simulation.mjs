import {spawn} from 'node:child_process';
import {openSync,closeSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';

const cases=JSON.parse(readFileSync('artifacts/experiments/samples/composition-team-cases.json','utf8'));
const sources={matched:'artifacts/experiments/balance/hundred-floor-six-z-courses.json',new:'artifacts/experiments/samples/composition-new-courses.json'};
const strategies=['legacy','synergy'],rules=['basic','mega','dynamax','tera','chaos'];
const jobs=Object.entries(sources).flatMap(([cohort,source])=>rules.flatMap(rule=>strategies.map(composition=>({cohort,source,rule,composition,player:'v8',phase:`composition-${cohort}-${rule}-${composition}`}))));
// An unchanged v7 legacy control checks that the new instrumentation keeps old results.
jobs.push({cohort:'control',source:sources.matched,rule:'basic',composition:'legacy',player:'v7',stages:'gen1-trained',phase:'composition-legacy-v7-check'});
// Separate support-action effects from composition effects, on identical rosters/courses.
for(const player of ['v7','v8'])jobs.push({cohort:'support',source:sources.matched,rule:'basic',composition:'synergy',player,stages:'screen-setup,trick-room',phase:`composition-support-${player}`});
const implementationFiles=['scripts/simulate-regional-balance.ts','src/battle/team-composition.ts','src/battle/composition-policy.ts'];
const implementationHash=createHash('sha256').update(implementationFiles.map(path=>readFileSync(path,'utf8')).join('\n')).digest('hex');
const previousManifest=existsSync('artifacts/experiments/samples/composition-experiment-manifest.json')?JSON.parse(readFileSync('artifacts/experiments/samples/composition-experiment-manifest.json','utf8')):null;
const manifest={schemaVersion:1,createdAt:new Date().toISOString(),implementationFiles,implementationHash,sourceHashes:Object.fromEntries(Object.entries(sources).map(([cohort,path])=>[cohort,createHash('sha256').update(readFileSync(path)).digest('hex')])),caseFile:'artifacts/experiments/samples/composition-team-cases.json',caseHash:createHash('sha256').update(readFileSync('artifacts/experiments/samples/composition-team-cases.json')).digest('hex'),cases:cases.length,perTheme:1,playerAI:'v8-experimental',opponentAI:'v7',sources,jobs};
writeFileSync('artifacts/experiments/samples/composition-experiment-manifest.json',JSON.stringify(manifest,null,2));
let cursor=0;
async function worker(){
 while(cursor<jobs.length){
  const job=jobs[cursor++],report=`artifacts/experiments/balance/simulation-${job.phase}-balanced.json`;
  if(process.argv.includes('--resume')&&previousManifest?.implementationHash===manifest.implementationHash&&previousManifest.caseHash===manifest.caseHash&&existsSync(report)){
   const r=JSON.parse(readFileSync(report,'utf8')),expected=job.stages?job.stages.split(',').length:cases.length;
   if(r.stages.length===expected&&r.rule===job.rule&&r.sourceCourseHash===createHash('sha256').update(readFileSync(job.source)).digest('hex')&&r.composition===job.composition&&r.playerAI===(job.player==='v8'?'v8-experimental':'v7')){console.log('Already complete '+job.phase);continue;}
  }
  const env={...process.env,BALANCE_FLOORS:'100',BALANCE_PER_THEME:'1',BALANCE_RULE:job.rule,BALANCE_COMPOSITION:job.composition,
   BALANCE_PLAYER:job.player,BALANCE_OPPONENT:'v7',BALANCE_BEHAVIOR:'balanced',BALANCE_COURSES:job.source,
   BALANCE_CASES:'artifacts/experiments/samples/composition-team-cases.json',BALANCE_DATASET:`artifacts/experiments/samples/${job.phase}-battles.jsonl`};
  delete env.BALANCE_PRICE_FILE;delete env.BALANCE_STAGES;if(job.stages)env.BALANCE_STAGES=job.stages;
  const log=`artifacts/experiments/samples/${job.phase}.log`,fd=openSync(log,'w');
  console.log('Starting '+job.phase);
  await new Promise((resolve,reject)=>{
   const child=spawn(process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/simulate-regional-balance.ts',job.phase],{env,stdio:['ignore',fd,fd]});
   closeSync(fd);child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error(`${job.phase} exited ${code}: ${log}`)));
  });
  console.log('Completed '+job.phase);
 }
}
await Promise.all([worker(),worker(),worker()]);
console.log('All composition comparisons finished');
