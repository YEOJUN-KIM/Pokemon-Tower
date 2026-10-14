import {spawn} from 'node:child_process';
import {existsSync,openSync,closeSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const seed=process.argv[2]??'20261010';if(!/^\d{1,12}$/.test(seed))throw Error('Numeric suite seed required');
const prefix=`artifacts/experiments/ai/coverage-factors-${seed}`,source=JSON.parse(readFileSync(`artifacts/experiments/samples/auto-suite-${seed}-manifest.json`,'utf8'));
for(const f of source.files)if(createHash('sha256').update(readFileSync(f.path)).digest('hex')!==f.sha256)throw Error('Frozen suite changed: '+f.path);
if(existsSync(prefix+'-manifest.json'))throw Error('Preserve existing factor experiment');
const files=['scripts/run-coverage-factors.mjs','scripts/simulate-coverage-factors.ts','src/battle/coverage-factor-policy.ts','src/battle/public-immunity-v2.ts','src/battle/revealed-immunity.ts','src/battle/adaptive-coverage-player-policy.ts','src/battle/matchup-aware-support-player-policy.ts',`artifacts/experiments/samples/auto-suite-${seed}-cases.json`,'artifacts/experiments/ai/observed-damage-validation-courses.json'];
const modes=['baseline','immunity','switching','both'];
writeFileSync(prefix+'-manifest.json',JSON.stringify({seed,modes,rules:source.rules,cases:source.caseCount,courses:source.courses,files:files.map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')})),factors:{immunity:'Expanded public memory and blocked gimmick check',switching:'Forced replacement, emergency retreat, fallback voluntary/forced distinction'},notes:'Four-cell factorial, identical fixtures/NPC/economy; original endpoints must exactly reproduce prior comparison.'},null,2));
function run(args,env,log){return new Promise((resolve,reject)=>{const fd=log?openSync(log,'wx'):null;const child=spawn(process.execPath,args,{env,stdio:fd===null?'inherit':['ignore',fd,fd],windowsHide:true});if(fd!==null)closeSync(fd);child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error('Exit '+code+' see '+log)));});}
for(const mode of modes){
 const results=await Promise.allSettled(source.rules.map(rule=>{
  const env={...process.env,BALANCE_PLAYER:mode,BALANCE_RULE:rule,BALANCE_FLOORS:'100',BALANCE_PER_THEME:'1',BALANCE_COMPOSITION:'synergy',BALANCE_OPPONENT:'v7',BALANCE_BEHAVIOR:'balanced',BALANCE_CASES:`artifacts/experiments/samples/auto-suite-${seed}-cases.json`,BALANCE_COURSES:'artifacts/experiments/ai/observed-damage-validation-courses.json',BALANCE_DATASET:prefix+`-${rule}-${mode}-battles.jsonl`};delete env.BALANCE_STAGES;delete env.BALANCE_PRICE_FILE;
  return run(['node_modules/tsx/dist/cli.mjs','scripts/simulate-coverage-factors.ts',`coverage-factors-${seed}-${rule}-${mode}`],env,prefix+`-${rule}-${mode}.log`);
 }));
 for(let i=0;i<results.length;i++){if(results[i].status==='rejected')throw results[i].reason;console.log('Completed '+mode+' '+source.rules[i]);}
}
await run(['node_modules/tsx/dist/cli.mjs','scripts/audit-coverage-factors.ts',seed],process.env);
