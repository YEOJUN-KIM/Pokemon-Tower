import {spawn} from 'node:child_process';
import {existsSync,openSync,closeSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const seed=process.argv[2]??'20261010';if(!/^\d{1,12}$/.test(seed))throw Error('Use a numeric seed');
const prefix=`artifacts/auto-suite-${seed}`;
function run(args,env,log){return new Promise((resolve,reject)=>{
 const fd=log?openSync(log,'wx'):null;
 const child=spawn(process.execPath,args,{env,stdio:fd===null?'inherit':['ignore',fd,fd],windowsHide:true});if(fd!==null)closeSync(fd);
 child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error(`Exit ${code}; see ${log}`)));
});}
if(!existsSync(prefix+'-cases.json'))await run(['node_modules/tsx/dist/cli.mjs','scripts/prepare-auto-suite-v2.ts',seed],process.env);
const manifest=JSON.parse(readFileSync(prefix+'-manifest.json','utf8'));
for(const f of manifest.files)if(createHash('sha256').update(readFileSync(f.path)).digest('hex')!==f.sha256)throw Error('Frozen input changed: '+f.path+'; use a new seed.');
for(const rule of manifest.rules)if(existsSync(`artifacts/simulation-auto-suite-${seed}-${rule}-balanced.json`)||existsSync(prefix+`-${rule}-battles.jsonl`)||existsSync(prefix+`-${rule}.log`))throw Error('Existing results preserved. Choose a new seed; audit completed runs separately.');
console.log(`Running ${manifest.caseCount*manifest.courses*manifest.rules.length} climbs; logs ${prefix}-RULE.log`);
const results=await Promise.allSettled(manifest.rules.map(rule=>{
 const env={...process.env,BALANCE_PLAYER:'matchup',BALANCE_RULE:rule,BALANCE_FLOORS:'100',BALANCE_PER_THEME:'1',BALANCE_COMPOSITION:'synergy',BALANCE_OPPONENT:'v7',BALANCE_BEHAVIOR:'balanced',BALANCE_CASES:prefix+'-cases.json',BALANCE_COURSES:'artifacts/observed-damage-validation-courses.json',BALANCE_DATASET:prefix+`-${rule}-battles.jsonl`};
 delete env.BALANCE_STAGES;delete env.BALANCE_PRICE_FILE;
 return run(['node_modules/tsx/dist/cli.mjs','scripts/simulate-immunity-climb.ts',`auto-suite-${seed}-${rule}`],env,prefix+`-${rule}.log`);
}));
for(let i=0;i<results.length;i++){if(results[i].status==='rejected')throw results[i].reason;console.log('Completed '+manifest.rules[i]);}
await run(['node_modules/tsx/dist/cli.mjs','scripts/summarize-auto-suite.ts',seed],process.env);
