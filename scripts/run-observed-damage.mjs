import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,openSync,closeSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const stage=process.argv[2]??'dev';if(!['dev','validate'].includes(stage))throw Error('Unknown stage');
const source=stage==='dev'?'artifacts/support-ablation-validation-courses.json':'artifacts/observed-damage-validation-courses.json';
const selection=stage==='validate'?JSON.parse(readFileSync('artifacts/observed-damage-selection.json','utf8')):null;
const modes=stage==='dev'?['v9','observed']:['v9',selection.candidate];
if(new Set(modes).size!==modes.length)throw Error('Candidate must differ from baseline');
const jobs=(stage==='dev'?['basic','tera','chaos']:['basic','mega','dynamax','tera','chaos']).flatMap(rule=>modes.map(mode=>({kind:'battle',rule,mode,phase:`observed-damage-${stage}-${rule}-${mode}`})));
if(stage==='validate')jobs.push(...['basic','tera','chaos'].flatMap(rule=>modes.map(mode=>({kind:'climb',rule,mode,phase:`observed-climb-${rule}-${mode}`}))));
const files=['src/battle/observed-damage.ts','src/battle/damage-aware-support-player-policy.ts','src/battle/support-player-policy.ts','src/battle/switch-policy.ts','scripts/simulate-observed-damage.ts','scripts/simulate-observed-damage-climb.ts','artifacts/support-player-cases.json','artifacts/support-recheck-climb-cases.json',source];
const hash=createHash('sha256').update(files.map(p=>readFileSync(p,'utf8')).join('\n')).digest('hex');
const manifestPath=`artifacts/observed-damage-${stage}-manifest.json`,old=existsSync(manifestPath)?JSON.parse(readFileSync(manifestPath,'utf8')):null;
writeFileSync(manifestPath,JSON.stringify({createdAt:new Date().toISOString(),stage,source,files,hash,selection,jobs,selectionRule:'Development total wins over basic/tera/chaos; only one fixed observed-damage candidate. Validation proceeds regardless of development gain; no tuning after validation.'},null,2));
let cursor=0;
async function worker(){while(cursor<jobs.length){
 const j=jobs[cursor++];if(process.argv.includes('--resume')&&old?.hash===hash){const report=j.kind==='battle'?`artifacts/${j.phase}-summary.json`:`artifacts/simulation-${j.phase}-balanced.json`;if(existsSync(report)){const r=JSON.parse(readFileSync(report,'utf8'));if((r.cases??r.stages)?.length===6){console.log('Reused '+j.phase);continue;}}}
 const fd=openSync(`artifacts/${j.phase}.log`,'w');console.log('Starting '+j.phase);
 const env=j.kind==='battle'?{SUPPORT_PLAYER:j.mode,SUPPORT_RULE:j.rule,SUPPORT_COHORT:'new',SUPPORT_PHASE:j.phase,SUPPORT_COURSES:source}:{BALANCE_PLAYER:j.mode,BALANCE_RULE:j.rule,BALANCE_FLOORS:'100',BALANCE_PER_THEME:'1',BALANCE_COURSES:source,BALANCE_CASES:'artifacts/support-recheck-climb-cases.json',BALANCE_COMPOSITION:'synergy',BALANCE_DATASET:`artifacts/${j.phase}-battles.jsonl`};
 await new Promise((resolve,reject)=>{const c=spawn(process.execPath,['node_modules/tsx/dist/cli.mjs',j.kind==='battle'?'scripts/simulate-observed-damage.ts':'scripts/simulate-observed-damage-climb.ts',...(j.kind==='climb'?[j.phase]:[])],{env:{...process.env,...env},stdio:['ignore',fd,fd]});closeSync(fd);c.once('error',reject);c.once('exit',code=>code===0?resolve():reject(Error('Failed '+j.phase)));});console.log('Completed '+j.phase);
}}
await Promise.all([worker(),worker(),worker()]);
if(stage==='dev'){
 const scores=modes.map(mode=>({mode,wins:['basic','tera','chaos'].reduce((sum,rule)=>sum+JSON.parse(readFileSync(`artifacts/observed-damage-dev-${rule}-${mode}-summary.json`,'utf8')).cases.reduce((s,c)=>s+c.wins,0),0)}));
 const ranked=scores.slice(1).sort((a,b)=>b.wins-a.wins);const winner=ranked[0];
 writeFileSync('artifacts/observed-damage-selection.json',JSON.stringify({candidate:winner.mode,scores,developmentGain:winner.wins-scores[0].wins,developmentHash:hash,rule:'Single candidate; development pooled wins, stable tie order. Not proof of superiority.'},null,2));console.log(JSON.stringify({scores,candidate:winner.mode}));
}
