import {fork,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {availableParallelism} from 'node:os';
import {raidBossDefinitions} from '../src/data/raids';
import {engineVersion,FORMAT} from '../src/battle/run';
import {simulateRaid,type SimulationRow} from './lib/raid-simulation';
import {simulationReport} from './lib/raid-simulation-report';
import {simulationTeams} from './lib/raid-simulation-pool';
import {raidFloorBrackets} from './lib/raid-floor-brackets';
import {floorSimulationReport,type OverallBaseline} from './lib/raid-floor-report';

export function parseSimulationArgs(args:string[]){
 const options={runs:1000,seedBase:'raid-winrate-v1',workers:Math.min(4,availableParallelism()),out:'artifacts/reports/raid-winrate-simulation',boss:undefined as string|undefined,worker:false,floorBrackets:false};
 for(let i=0;i<args.length;i++){
  const flag=args[i];if(flag==='--worker'){options.worker=true;continue;}
  if(flag==='--floor-brackets'){options.floorBrackets=true;continue;}
  if(!['--runs','--seed','--workers','--out','--boss'].includes(flag)||!args[i+1]||args[i+1].startsWith('--'))throw Error(`Invalid option ${flag}`);
  const value=args[++i];
  if(flag==='--runs')options.runs=Number(value);if(flag==='--workers')options.workers=Number(value);
  if(flag==='--seed')options.seedBase=value;if(flag==='--out')options.out=value;if(flag==='--boss')options.boss=value;
 }
 if(options.floorBrackets){
  if(!args.includes('--runs'))options.runs=500;
  if(!args.includes('--out'))options.out='artifacts/reports/raid-winrate-by-floor';
  if(resolve(options.out).toLowerCase()===resolve('artifacts/reports/raid-winrate-simulation').toLowerCase())throw Error('Floor report cannot overwrite original overall results');
 }
 if(!Number.isSafeInteger(options.runs)||options.runs<1||!Number.isSafeInteger(options.workers)||options.workers<1||options.workers>32)throw Error('Positive integer runs/workers required (workers <=32)');
 if(options.boss&&!raidBossDefinitions.some(b=>b.id===options.boss))throw Error('Unknown boss');
 return options;
}
type JobOptions={bossIds:string[];runs:number;seedBase:string;workers:number;floorBrackets:boolean;onProgress?:(bossId:string,rows:SimulationRow[])=>void};
async function simulateBoss(bossId:string,options:Pick<JobOptions,'runs'|'seedBase'|'floorBrackets'>){
 const rows:SimulationRow[]=[];
 for(const bracket of options.floorBrackets?raidFloorBrackets.map(b=>b.id):[undefined])rows.push(...await simulateRaid({bossId,runs:options.runs,seedBase:options.seedBase,bracket}));
 return rows;
}
export async function runRaidSimulationJobs(options:JobOptions){
 if(!Number.isSafeInteger(options.workers)||options.workers<1||options.workers>32)throw Error('Invalid worker count');
 if(!options.bossIds.length||new Set(options.bossIds).size!==options.bossIds.length||options.bossIds.some(id=>!raidBossDefinitions.some(b=>b.id===id)))throw Error('Invalid boss jobs');
 const all=new Map<string,SimulationRow[]>();let cursor=0;
 async function work(){while(cursor<options.bossIds.length){const id=options.bossIds[cursor++];
  const rows=options.workers===1?await simulateBoss(id,options):await new Promise<SimulationRow[]>((accept,reject)=>{
   const child=fork(fileURLToPath(import.meta.url),['--worker','--boss',id,'--runs',String(options.runs),'--seed',options.seedBase,...(options.floorBrackets?['--floor-brackets']:[])],{execArgv:['--import','tsx'],stdio:['ignore','ignore','inherit','ipc'],windowsHide:true});
   let result:SimulationRow[]|undefined;child.on('message',(message:{rows:SimulationRow[]})=>{result=message.rows;});child.on('error',reject);child.on('exit',code=>code===0&&result?accept(result):reject(Error(`Worker ${id} exited ${code}`)));
  });
  if(rows.length!==options.runs*(options.floorBrackets?raidFloorBrackets.length:1))throw Error('Incomplete simulation');
  all.set(id,rows);options.onProgress?.(id,rows);
 }}
 await Promise.all(Array.from({length:Math.min(options.workers,options.bossIds.length)},work));
 return options.bossIds.flatMap(id=>all.get(id)!);
}
const hash=(data:string|Buffer)=>createHash('sha256').update(data).digest('hex');
function sourceManifest(){
 const paths:string[]=[];
 function visit(dir:string){for(const entry of readdirSync(dir,{withFileTypes:true})){const path=resolve(dir,entry.name);if(entry.isDirectory())visit(path);else paths.push(path);}}
 visit('src');
 return Object.fromEntries(paths.sort().map(path=>[relative(process.cwd(),path).replaceAll('\\','/'),hash(readFileSync(path))]));
}
async function main(){
 const options=parseSimulationArgs(process.argv.slice(2));
 if(options.worker){
  if(!options.boss||!process.send)throw Error('Worker requires boss and IPC');
  const rows=await simulateBoss(options.boss,options);
  await new Promise<void>((accept,reject)=>process.send!({rows},error=>error?reject(error):accept()));process.disconnect!();return;
 }
 const sourceFiles=sourceManifest(),sourceHash=hash(JSON.stringify(sourceFiles));
 const baselineFiles=options.floorBrackets?Object.fromEntries(readdirSync('artifacts/reports').filter(name=>name.startsWith('raid-winrate-simulation.')).sort().map(name=>['artifacts/reports/'+name,hash(readFileSync('artifacts/reports/'+name))])):{};
 const baseline:OverallBaseline|undefined=options.floorBrackets?JSON.parse(readFileSync('artifacts/reports/raid-winrate-simulation.json','utf8')):undefined;
 if(baseline&&(baseline.metadata.raidDefinitionsHash!==hash(JSON.stringify(raidBossDefinitions))||baseline.metadata.poolHash!==hash(JSON.stringify(simulationTeams))||baseline.metadata.sourceHash!==sourceHash))throw Error('Overall baseline gameplay data/pool differs from current source');
 const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const bosses=raidBossDefinitions.filter(b=>!options.boss||b.id===options.boss);let completed=0;
 const started=Date.now();
 const rows=await runRaidSimulationJobs({...options,bossIds:bosses.map(b=>b.id),onProgress:(id,rows)=>{
  completed++;console.log(`${completed}/${bosses.length} ${id}: ${rows.filter(r=>r.won).length}/${rows.length} player wins; elapsed ${((Date.now()-started)/1000).toFixed(1)}s`);
 }});
 if(hash(JSON.stringify(sourceManifest()))!==sourceHash)throw Error('Source changed during simulation; no report written');
 for(const [path,expected]of Object.entries(baselineFiles))if(hash(readFileSync(path))!==expected)throw Error('Original overall result changed during simulation');
 const simulationFiles=['scripts/simulate-raids.ts','scripts/lib/raid-simulation.ts','scripts/lib/raid-simulation-pool.ts','scripts/lib/raid-simulation-player.ts','scripts/lib/raid-simulation-report.ts'];
 if(options.floorBrackets)simulationFiles.push('scripts/lib/raid-floor-brackets.ts','scripts/lib/raid-floor-report.ts');
 const metadata={commit,engineVersion,format:FORMAT,seedBase:options.seedBase,runsPerBoss:options.runs,...(options.floorBrackets?{runsPerBossBracket:options.runs,floorBrackets:raidFloorBrackets,baselineFiles}:{}),totalBattles:rows.length,sourceHash,sourceFiles,raidDefinitionsHash:hash(JSON.stringify(raidBossDefinitions)),poolHash:hash(JSON.stringify(simulationTeams)),simulationFiles:Object.fromEntries(simulationFiles.map(path=>[path,hash(readFileSync(path))])),workers:options.workers,elapsedSeconds:(Date.now()-started)/1000};
 if(baseline)floorSimulationReport(rows,metadata,options.out,baseline);else simulationReport(rows,metadata,options.out);
 console.log(`Wrote ${options.out}.{md,csv,json} and battle/branch/phase/team CSVs`);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error);process.exitCode=1;});
