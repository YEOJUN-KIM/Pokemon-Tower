import {spawn} from 'node:child_process';
import {existsSync,openSync,closeSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const seed=process.argv[2]??'20261010';if(!/^\d{1,12}$/.test(seed))throw Error('Numeric seed');
const prefix=`artifacts/sample-wall-factors-${seed}`;if(existsSync(prefix+'-manifest.json'))throw Error('Preserve existing experiment');
for(const p of [`artifacts/coverage-factors-${seed}-manifest.json`,`artifacts/reliable-samples-${seed}-manifest.json`]){
 const m=JSON.parse(readFileSync(p,'utf8'));for(const f of m.files)if(createHash('sha256').update(readFileSync(f.path)).digest('hex')!==f.sha256)throw Error('Frozen input changed: '+f.path);
}
const files=['scripts/run-sample-wall-factors.mjs','scripts/simulate-sample-wall-factors.ts','scripts/audit-sample-wall-factors.ts','scripts/lib/paired-screen-composition.ts','scripts/lib/reliable-samples.ts','scripts/lib/composition-diagnostics.ts','src/battle/team-composition.ts','src/battle/coverage-factor-policy.ts',`artifacts/auto-suite-${seed}-cases.json`,`artifacts/reliable-samples-${seed}-cases.json`,'artifacts/observed-damage-validation-courses.json'];
const modes=['baseline','samples','walls','both'],rules=['basic','tera','chaos'];
writeFileSync(prefix+'-manifest.json',JSON.stringify({seed,modes,rules,cases:18,courses:9,player:'immunity',files:files.map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')})),notes:'2x2 initial attack sample preparation vs paired-wall composition; same species/IV/points/nature/ability/support moves and frozen nine courses. Initial samples only; original attack valuation during recruitment/TM remains. Original policy/NPC/economy fixed. Walls includes paired role utility + retaining complementary moves.'},null,2));
function run(args,env,log){return new Promise((resolve,reject)=>{const fd=log?openSync(log,'wx'):null;const child=spawn(process.execPath,args,{env,stdio:fd===null?'inherit':['ignore',fd,fd],windowsHide:true});if(fd!==null)closeSync(fd);child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error('Exit '+code+' see '+log)));});}
for(const mode of modes){
 const results=await Promise.allSettled(rules.map(rule=>{
  const sample=['samples','both'].includes(mode),wall=['walls','both'].includes(mode);
  const env={...process.env,BALANCE_PLAYER:'immunity',BALANCE_RULE:rule,BALANCE_FLOORS:'100',BALANCE_PER_THEME:'1',BALANCE_COMPOSITION:'synergy',BALANCE_OPPONENT:'v7',BALANCE_BEHAVIOR:'balanced',BALANCE_CASES:`artifacts/${sample?'reliable-samples':'auto-suite'}-${seed}-cases.json`,BALANCE_COURSES:'artifacts/observed-damage-validation-courses.json',BALANCE_DATASET:prefix+`-${rule}-${mode}-battles.jsonl`,COMPOSITION_TRACE:prefix+`-${rule}-${mode}-trace.jsonl`,COMPOSITION_WALLS:wall?'paired':'original'};delete env.BALANCE_STAGES;delete env.BALANCE_PRICE_FILE;
  return run(['node_modules/tsx/dist/cli.mjs','scripts/simulate-sample-wall-factors.ts',`sample-wall-factors-${seed}-${rule}-${mode}`],env,prefix+`-${rule}-${mode}.log`);
 }));for(let i=0;i<results.length;i++){if(results[i].status==='rejected')throw results[i].reason;console.log('Completed '+mode+' '+rules[i]);}
}
await run(['node_modules/tsx/dist/cli.mjs','scripts/audit-sample-wall-factors.ts',seed],process.env);
