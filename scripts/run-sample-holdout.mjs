import {spawn} from 'node:child_process';
import {existsSync,openSync,closeSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const id=process.argv[2]??'20261011';if(!/^\d{1,12}$/.test(id))throw Error('Numeric experiment id');
const prefix=`artifacts/experiments/samples/sample-holdout-${id}`,courseFile=prefix+'-courses.json';
if(existsSync(prefix+'-preregister.json')||existsSync(courseFile))throw Error('Preserve existing holdout; use a new id');
const development=JSON.parse(readFileSync('artifacts/experiments/samples/sample-wall-factors-20261010-manifest.json','utf8'));
const digest=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
for(const f of development.files)if(digest(f.path)!==f.sha256)throw Error('Frozen development changed: '+f.path);
const priorCourseFiles=readdirSync('artifacts/experiments',{recursive:true}).filter(n=>n.endsWith('courses.json')).sort().map(n=>({path:'artifacts/experiments/'+n,sha256:digest('artifacts/experiments/'+n)}));
const sources=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?sources(dir+'/'+e.name):/\.(ts|tsx|json)$/.test(e.name)?[dir+'/'+e.name]:[]);
const files=[...new Set([...development.files.map(f=>f.path),...sources('src'),'pnpm-lock.yaml','scripts/run-sample-holdout.mjs','scripts/audit-sample-holdout.ts','scripts/lib/course-freshness.ts',...priorCourseFiles.map(f=>f.path)])];
const prereg={id,sourceExperiment:'sample-wall-factors-20261010',modes:['baseline','samples'],rules:['basic','tera','chaos'],cases:18,courses:18,perTheme:2,totalFloors:100,courseFile,priorCourseFiles,files:files.map(path=>({path,sha256:digest(path)})),notes:'Frozen development candidate and same 18 starting teams; only fresh courses. Two per theme, no coefficient tuning, immunity-only player/v7 NPC/original wall composition/current frozen economy. Dataset collected before either condition, public player inputs only.'};
writeFileSync(prefix+'-preregister.json',JSON.stringify(prereg,null,2),{flag:'wx'});
function run(args,env,log){return new Promise((resolve,reject)=>{const fd=log?openSync(log,'wx'):null;const child=spawn(process.execPath,args,{env,stdio:fd===null?'inherit':['ignore',fd,fd],windowsHide:true});if(fd!==null)closeSync(fd);child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error('Exit '+code+' see '+log)));});}
const env={...process.env,BALANCE_PLAYER:'immunity',BALANCE_RULE:'basic',BALANCE_FLOORS:'100',BALANCE_PER_THEME:'2',BALANCE_COMPOSITION:'synergy',BALANCE_OPPONENT:'v7',BALANCE_BEHAVIOR:'balanced',BALANCE_COURSES:courseFile,COMPOSITION_WALLS:'original'};delete env.BALANCE_STAGES;delete env.BALANCE_PRICE_FILE;
await run(['node_modules/tsx/dist/cli.mjs','scripts/simulate-sample-wall-factors.ts','record'],env,prefix+'-record.log');
const fresh=JSON.parse(readFileSync(courseFile,'utf8'));
if(fresh.courses.length!==18)throw Error('Expected 18 fresh courses');
// Freshness assertion uses the same tested TypeScript helper before any simulation.
await run(['node_modules/tsx/dist/cli.mjs','-e',`import {readFileSync,writeFileSync} from 'node:fs';import {assertFreshCourses} from './scripts/lib/course-freshness';const p=JSON.parse(readFileSync('${prefix}-preregister.json','utf8'));const current=JSON.parse(readFileSync(p.courseFile,'utf8')).courses;const prior=p.priorCourseFiles.flatMap(f=>JSON.parse(readFileSync(f.path,'utf8')).courses);writeFileSync('${prefix}-freshness.json',JSON.stringify(assertFreshCourses(current,prior),null,2));`],env);
for(const f of prereg.files)if(digest(f.path)!==f.sha256)throw Error('Preregistered source changed: '+f.path);
writeFileSync(prefix+'-manifest.json',JSON.stringify({...prereg,files:[...prereg.files,{path:courseFile,sha256:digest(courseFile)}]},null,2),{flag:'wx'});
for(const mode of prereg.modes){
 const results=await Promise.allSettled(prereg.rules.map(rule=>run(['node_modules/tsx/dist/cli.mjs','scripts/simulate-sample-wall-factors.ts',`sample-holdout-${id}-${rule}-${mode}`],{...env,BALANCE_RULE:rule,BALANCE_CASES:`artifacts/experiments/samples/${mode==='samples'?'reliable-samples':'auto-suite'}-20261010-cases.json`,BALANCE_DATASET:prefix+`-${rule}-${mode}-battles.jsonl`,COMPOSITION_TRACE:prefix+`-${rule}-${mode}-trace.jsonl`},prefix+`-${rule}-${mode}.log`)));
 for(let i=0;i<results.length;i++){if(results[i].status==='rejected')throw results[i].reason;console.log('Completed '+mode+' '+prereg.rules[i]);}
}
await run(['node_modules/tsx/dist/cli.mjs','scripts/audit-sample-holdout.ts',id],env);
