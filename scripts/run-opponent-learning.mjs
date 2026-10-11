import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,readdirSync,existsSync,openSync,closeSync} from 'node:fs';
import {createHash} from 'node:crypto';

const id=process.argv[2]??'20261011',prefix=`artifacts/opponent-learning-${id}`;
if(!/^\d{1,12}$/.test(id)||existsSync(prefix+'-manifest.json'))throw Error('Use a new numeric experiment ID');
const digest=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const old=JSON.parse(readFileSync('artifacts/sample-holdout-20261011-manifest.json','utf8'));
const courseFile='artifacts/sample-holdout-20261011-courses.json',caseFile='artifacts/reliable-samples-20261010-cases.json';
for(const path of [courseFile,caseFile]){const frozen=old.files.find(f=>f.path===path);if(!frozen||digest(path)!==frozen.sha256)throw Error('Changed fixture '+path);}
const sources=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?sources(dir+'/'+e.name):/\.(ts|tsx|json)$/.test(e.name)?[dir+'/'+e.name]:[]);
const files=[...sources('src'),...sources('scripts/lib'),courseFile,caseFile,'pnpm-lock.yaml','scripts/simulate-opponent-learning.ts','scripts/run-opponent-learning.mjs','scripts/audit-opponent-learning.ts'];
const manifest={id,modes:['v7','v8'],rules:['basic','mega','dynamax','tera','chaos'],caseFile,courseFile,cases:18,courses:18,totalFloors:100,files:files.map(path=>({path,sha256:digest(path)})),notes:'Paired 18 reliable sample teams x 18 identical frozen courses x 5 rules x 2 NPC policies. Existing immunity-only player, composition and shop decisions unchanged. Only NPC policy changes; no tuning during experiment. Reuses held-out courses, not a new holdout. Correlated simulated climbs, not human win rates.'};
writeFileSync(prefix+'-manifest.json',JSON.stringify(manifest,null,2),{flag:'wx'});
function run(args,env,log){return new Promise((resolve,reject)=>{const fd=openSync(log,'wx'),child=spawn(process.execPath,args,{env,stdio:['ignore',fd,fd],windowsHide:true});closeSync(fd);child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error('Exit '+code+'; see '+log)));});}
const env={...process.env,BALANCE_PLAYER:'immunity',BALANCE_FLOORS:'100',BALANCE_PER_THEME:'2',BALANCE_COMPOSITION:'synergy',BALANCE_BEHAVIOR:'balanced',BALANCE_COURSES:courseFile,BALANCE_CASES:caseFile,COMPOSITION_WALLS:'original'};
delete env.BALANCE_STAGES;delete env.BALANCE_PRICE_FILE;
const jobs=manifest.modes.flatMap(mode=>manifest.rules.map(rule=>({mode,rule})));
let cursor=0;
async function worker(){while(cursor<jobs.length){const {mode,rule}=jobs[cursor++],name=`opponent-learning-${id}-${rule}-${mode}`;
 await run(['node_modules/tsx/dist/cli.mjs','scripts/simulate-opponent-learning.ts',name],{...env,BALANCE_OPPONENT:mode,BALANCE_RULE:rule,BALANCE_DATASET:prefix+`-${rule}-${mode}-battles.jsonl`,COMPOSITION_TRACE:prefix+`-${rule}-${mode}-trace.jsonl`},prefix+`-${rule}-${mode}.log`);
 console.log('Completed '+mode+' '+rule);
}}
const result=await Promise.allSettled([worker(),worker(),worker()]);for(const r of result)if(r.status==='rejected')throw r.reason;
await run(['node_modules/tsx/dist/cli.mjs','scripts/audit-opponent-learning.ts',id],env,prefix+'-audit.log');
console.log('Audit complete: '+prefix+'-report.md');
