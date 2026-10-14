import {spawn} from 'node:child_process';
import {existsSync,openSync,closeSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const seed=process.argv[2]??'20261010';if(!/^\d{1,12}$/.test(seed))throw Error('Numeric seed required');
const prefix=`artifacts/experiments/samples/composition-diagnostics-${seed}`,source=JSON.parse(readFileSync(`artifacts/experiments/ai/coverage-factors-${seed}-manifest.json`,'utf8'));
for(const f of source.files)if(createHash('sha256').update(readFileSync(f.path)).digest('hex')!==f.sha256)throw Error('Frozen experiment changed: '+f.path);
if(existsSync(prefix+'-manifest.json'))throw Error('Preserve existing diagnostics');
const files=[...source.files.map(f=>f.path),'scripts/run-composition-diagnostics-v2.mjs','scripts/simulate-composition-diagnostics.ts','scripts/lib/composition-diagnostics.ts','scripts/audit-composition-diagnostics-v2.ts'];
writeFileSync(prefix+'-manifest.json',JSON.stringify({seed,rules:source.rules,cases:source.cases,courses:source.courses,player:'immunity',files:files.map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')})),notes:'Own collection snapshots only; identical immunity-only experiment with observational instrumentation, no decisions changed.'},null,2));
function run(args,env,log){return new Promise((resolve,reject)=>{const fd=log?openSync(log,'wx'):null;const child=spawn(process.execPath,args,{env,stdio:fd===null?'inherit':['ignore',fd,fd],windowsHide:true});if(fd!==null)closeSync(fd);child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error('Exit '+code+' see '+log)));});}
const results=await Promise.allSettled(source.rules.map(rule=>{
 const env={...process.env,BALANCE_PLAYER:'immunity',BALANCE_RULE:rule,BALANCE_FLOORS:'100',BALANCE_PER_THEME:'1',BALANCE_COMPOSITION:'synergy',BALANCE_OPPONENT:'v7',BALANCE_BEHAVIOR:'balanced',BALANCE_CASES:`artifacts/experiments/samples/auto-suite-${seed}-cases.json`,BALANCE_COURSES:'artifacts/experiments/ai/observed-damage-validation-courses.json',BALANCE_DATASET:prefix+`-${rule}-battles.jsonl`,COMPOSITION_TRACE:prefix+`-${rule}-trace.jsonl`};delete env.BALANCE_STAGES;delete env.BALANCE_PRICE_FILE;
 return run(['node_modules/tsx/dist/cli.mjs','scripts/simulate-composition-diagnostics.ts',`composition-diagnostics-${seed}-${rule}`],env,prefix+`-${rule}.log`);
}));
for(let i=0;i<results.length;i++){if(results[i].status==='rejected')throw results[i].reason;console.log('Completed '+source.rules[i]);}
await run(['node_modules/tsx/dist/cli.mjs','scripts/audit-composition-diagnostics-v2.ts',seed],process.env);
