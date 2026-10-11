import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,openSync,closeSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const sources={matched:'artifacts/hundred-floor-six-z-courses.json',new:'artifacts/support-ai-new-courses.json'};
const files=['src/battle/support-player-policy.ts','src/battle/composition-policy.ts','src/battle/switch-policy.ts','scripts/simulate-support-player.ts','artifacts/support-player-cases.json'];
const hash=createHash('sha256').update(files.map(p=>readFileSync(p,'utf8')).join('\n')).digest('hex');
const old=existsSync('artifacts/support-player-manifest.json')?JSON.parse(readFileSync('artifacts/support-player-manifest.json','utf8')):null;
const jobs=Object.keys(sources).flatMap(cohort=>['basic','mega','dynamax','tera','chaos'].flatMap(rule=>['v7','v8','v9'].map(mode=>({cohort,rule,mode,phase:`support-player-${cohort}-${rule}-${mode}`}))));
const manifest={schemaVersion:1,createdAt:new Date().toISOString(),files,hash,sources,sourceHashes:Object.fromEntries(Object.entries(sources).map(([k,p])=>[k,createHash('sha256').update(readFileSync(p)).digest('hex')])),cases:6,floors:[1,5,10,20,30,40,50,60,75,90,100],perTheme:1,jobs};
writeFileSync('artifacts/support-player-manifest.json',JSON.stringify(manifest,null,2));
let cursor=0;
async function worker(){while(cursor<jobs.length){
 const job=jobs[cursor++],report=`artifacts/${job.phase}-summary.json`;
 if(process.argv.includes('--resume')&&old?.hash===hash&&existsSync(report)){const r=JSON.parse(readFileSync(report,'utf8'));if(r.cases.length===6&&r.sourceHash===manifest.sourceHashes[job.cohort]){console.log('Complete '+job.phase);continue;}}
 const fd=openSync(`artifacts/${job.phase}.log`,'w');console.log('Starting '+job.phase);
 await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/simulate-support-player.ts'],{env:{...process.env,SUPPORT_COHORT:job.cohort,SUPPORT_RULE:job.rule,SUPPORT_PLAYER:job.mode},stdio:['ignore',fd,fd]});closeSync(fd);child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error(`Failed ${job.phase}; see its log`)));});
 console.log('Completed '+job.phase);
}}
await Promise.all([worker(),worker(),worker()]);console.log('Support player experiment complete');
