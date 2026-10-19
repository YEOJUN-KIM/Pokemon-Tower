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

export function parseSimulationArgs(args:string[]){
 const options={runs:1000,seedBase:'raid-winrate-v1',workers:Math.min(4,availableParallelism()),out:'artifacts/reports/raid-winrate-simulation',boss:undefined as string|undefined,worker:false};
 for(let i=0;i<args.length;i++){
  const flag=args[i];if(flag==='--worker'){options.worker=true;continue;}
  if(!['--runs','--seed','--workers','--out','--boss'].includes(flag)||!args[i+1]||args[i+1].startsWith('--'))throw Error(`Invalid option ${flag}`);
  const value=args[++i];
  if(flag==='--runs')options.runs=Number(value);if(flag==='--workers')options.workers=Number(value);
  if(flag==='--seed')options.seedBase=value;if(flag==='--out')options.out=value;if(flag==='--boss')options.boss=value;
 }
 if(!Number.isSafeInteger(options.runs)||options.runs<1||!Number.isSafeInteger(options.workers)||options.workers<1||options.workers>32)throw Error('Positive integer runs/workers required (workers <=32)');
 if(options.boss&&!raidBossDefinitions.some(b=>b.id===options.boss))throw Error('Unknown boss');
 return options;
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
  const rows=await simulateRaid({bossId:options.boss,runs:options.runs,seedBase:options.seedBase});
  await new Promise<void>((accept,reject)=>process.send!({rows},error=>error?reject(error):accept()));process.disconnect!();return;
 }
 const sourceFiles=sourceManifest(),sourceHash=hash(JSON.stringify(sourceFiles));
 const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const bosses=raidBossDefinitions.filter(b=>!options.boss||b.id===options.boss),all=new Map<string,SimulationRow[]>();let cursor=0;
 const started=Date.now();
 async function work(){while(cursor<bosses.length){const boss=bosses[cursor++];
  const rows=options.workers===1?await simulateRaid({bossId:boss.id,runs:options.runs,seedBase:options.seedBase}):await new Promise<SimulationRow[]>((accept,reject)=>{
   const child=fork(fileURLToPath(import.meta.url),['--worker','--boss',boss.id,'--runs',String(options.runs),'--seed',options.seedBase],{execArgv:['--import','tsx'],stdio:['ignore','ignore','inherit','ipc'],windowsHide:true});
   let result:SimulationRow[]|undefined;child.on('message',(message:{rows:SimulationRow[]})=>{result=message.rows;});child.on('error',reject);child.on('exit',code=>code===0&&result?accept(result):reject(Error(`Worker ${boss.id} exited ${code}`)));
  });
  if(rows.length!==options.runs)throw Error('Incomplete simulation');all.set(boss.id,rows);
  console.log(`${all.size}/${bosses.length} ${boss.species}: ${rows.filter(r=>r.won).length}/${rows.length} player wins; elapsed ${((Date.now()-started)/1000).toFixed(1)}s`);
 }}
 await Promise.all(Array.from({length:Math.min(options.workers,bosses.length)},work));
 if(hash(JSON.stringify(sourceManifest()))!==sourceHash)throw Error('Source changed during simulation; no report written');
 const rows=bosses.flatMap(b=>all.get(b.id)!);
 const simulationFiles=['scripts/simulate-raids.ts','scripts/lib/raid-simulation.ts','scripts/lib/raid-simulation-pool.ts','scripts/lib/raid-simulation-player.ts','scripts/lib/raid-simulation-report.ts'];
 simulationReport(rows,{commit,engineVersion,format:FORMAT,seedBase:options.seedBase,runsPerBoss:options.runs,totalBattles:rows.length,sourceHash,sourceFiles,raidDefinitionsHash:hash(JSON.stringify(raidBossDefinitions)),poolHash:hash(JSON.stringify(simulationTeams)),simulationFiles:Object.fromEntries(simulationFiles.map(path=>[path,hash(readFileSync(path))])),workers:options.workers,elapsedSeconds:(Date.now()-started)/1000},options.out);
 console.log(`Wrote ${options.out}.{md,csv,json} and battle/branch/phase/team CSVs`);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error);process.exitCode=1;});
