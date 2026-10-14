import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,openSync,closeSync} from 'node:fs';
import {createHash} from 'node:crypto';
const source='artifacts/experiments/ai/support-recheck-fresh-courses.json';
const cases=JSON.parse(readFileSync('artifacts/experiments/ai/support-player-cases.json','utf8')).map(c=>({...c,iv:31,points:66,recruitment:'adaptive'}));
writeFileSync('artifacts/experiments/ai/support-recheck-climb-cases.json',JSON.stringify(cases,null,2));
const jobs=['basic','mega','dynamax','tera','chaos'].flatMap(rule=>['v8','v9','v10'].map(mode=>({kind:'battle',rule,mode,phase:`support-recheck-new-${rule}-${mode}`})));
jobs.push(...['basic','tera','chaos'].flatMap(rule=>['v8','v9','v10'].map(mode=>({kind:'climb',rule,mode,phase:`support-climb-${rule}-${mode}`}))));
const files=['src/battle/measured-support-player-policy.ts','src/battle/support-player-policy.ts','src/battle/composition-policy.ts','scripts/simulate-support-recheck.ts','scripts/simulate-support-climb.ts','artifacts/experiments/ai/support-player-cases.json','artifacts/experiments/ai/support-recheck-climb-cases.json',source];
writeFileSync('artifacts/experiments/ai/support-recheck-manifest.json',JSON.stringify({createdAt:new Date().toISOString(),source,files,hash:createHash('sha256').update(files.map(p=>readFileSync(p,'utf8')).join('\n')).digest('hex'),jobs},null,2));
let cursor=0;
async function worker(){while(cursor<jobs.length){
 const j=jobs[cursor++],fd=openSync(`artifacts/experiments/ai/${j.phase}.log`,'w');console.log('Starting '+j.phase);
 const env=j.kind==='battle'?{SUPPORT_PLAYER:j.mode,SUPPORT_RULE:j.rule,SUPPORT_COHORT:'new',SUPPORT_COURSES:source}:{BALANCE_PLAYER:j.mode,BALANCE_RULE:j.rule,BALANCE_FLOORS:'100',BALANCE_PER_THEME:'1',BALANCE_COURSES:source,BALANCE_CASES:'artifacts/experiments/ai/support-recheck-climb-cases.json',BALANCE_COMPOSITION:'synergy',BALANCE_DATASET:`artifacts/experiments/ai/${j.phase}-battles.jsonl`};
 await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['node_modules/tsx/dist/cli.mjs',j.kind==='battle'?'scripts/simulate-support-recheck.ts':'scripts/simulate-support-climb.ts',...(j.kind==='climb'?[j.phase]:[])],{env:{...process.env,...env},stdio:['ignore',fd,fd]});closeSync(fd);child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error('Failed '+j.phase)));});
 console.log('Completed '+j.phase);
}}
await Promise.all([worker(),worker(),worker()]);
