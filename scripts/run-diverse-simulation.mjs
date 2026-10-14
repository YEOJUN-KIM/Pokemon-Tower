import {spawn} from 'node:child_process';
import {openSync,closeSync,readFileSync} from 'node:fs';

function run(args,env=process.env,log){
 return new Promise((resolve,reject)=>{
  const fd=log?openSync(log,'w'):null;
  const child=spawn(process.execPath,args,{env,stdio:fd===null?'inherit':['ignore',fd,fd]});
  if(fd!==null)closeSync(fd);
  child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error(`${args.join(' ')} exited ${code}; see ${log??'console'}`)));
 });
}
await run(['node_modules/tsx/dist/cli.mjs','scripts/prepare-diverse-cases.ts']);
const definitions=JSON.parse(readFileSync('artifacts/experiments/samples/diverse-team-cases.json','utf8'));
for(const part of ['fresh','trained','mixed']){
 const ids=definitions.filter(c=>part==='mixed'?c.category!=='starter':c.category==='starter'&&c.id.endsWith('-'+part)).map(c=>c.id);
 const env={...process.env,BALANCE_FLOORS:'100',BALANCE_PER_THEME:'4',BALANCE_RULE:'basic',BALANCE_OPPONENT:'v7',
  BALANCE_BEHAVIOR:'balanced',BALANCE_COURSES:'artifacts/experiments/balance/hundred-floor-six-z-courses.json',
  BALANCE_CASES:'artifacts/experiments/samples/diverse-team-cases.json',BALANCE_STAGES:ids.join(','),BALANCE_DATASET:`artifacts/experiments/samples/diverse-${part}-battles.jsonl`};
 delete env.BALANCE_PRICE_FILE;
 console.log(`Running ${part}: ${ids.length} cases, 36 courses each`);
 await run(['node_modules/tsx/dist/cli.mjs','scripts/simulate-regional-balance.ts','diverse-'+part],env,`artifacts/experiments/samples/diverse-${part}.log`);
}
await run(['scripts/summarize-diverse-simulation.mjs']);
