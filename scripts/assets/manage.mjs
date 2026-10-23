import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {verifyOutput} from './pokerogue/verify.mjs';
import {loadDefinition as pokerogue} from './pokerogue/common.mjs';
import {loadDefinition as showdown} from './showdown-pokemon/common.mjs';
import {loadDefinition as pokeapi} from './pokeapi/common.mjs';
import {loadDefinition as mixed,verifyGroup} from './mixed/runtime.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const tasks=[['PokéRogue','pokerogue'],['Showdown Pokémon','showdown-pokemon'],['PokeAPI','pokeapi'],['Trainers','trainers'],['Gimmicks','gimmicks'],['Items','items']];
export async function inspectAssets(){
 const definitions=await Promise.all([pokerogue(),showdown(),pokeapi(),mixed()]);
 const results=[];
 for(const [index,directory] of ['pokerogue','showdown/pokemon','pokeapi'].entries())results.push(await verifyOutput(path.join(root,'public/vendor',directory),definitions[index].manifest));
 for(const folder of ['trainers','gimmicks','items']){
  const groups=definitions[3].groups.filter(g=>g.folder===folder),checks=await Promise.all(groups.map(g=>verifyGroup(path.join(root,'public/sprites'),g,definitions[3])));
  results.push({ok:checks.every(r=>r.ok),matching:checks.reduce((n,r)=>n+r.matching,0),missing:checks.flatMap(r=>r.missing),extra:[...new Set(checks.flatMap(r=>r.extra))],mismatched:checks.flatMap(r=>r.mismatched)});
 }
 return results;
}
/** @param {string} mode @param {{offline?: boolean, python?: string}} options */
export async function runTasks(mode,{offline=false,python}={},dependencies={}){
 const inspect=dependencies.inspect??inspectAssets,log=dependencies.log??console.log;
 const run=dependencies.run??(async args=>new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{cwd:root,stdio:'inherit',windowsHide:true});child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error(`Asset restore exited ${code}`)));}));
 const checks=await inspect();
 if(mode==='setup')for(let i=0;i<tasks.length;i++){
  const [name,key]=tasks[i];if(checks[i].ok){log(`${name.padEnd(18)} OK (already installed)`);continue;}
  log(`${name}: restoring`);
  const args=i<3?[`scripts/assets/${key}/restore.mjs`]:['scripts/assets/mixed/runtime.mjs','restore',key];
  if(offline)args.push('--offline');if(python&&i===0)args.push('--python',python);
  await run(args);
 }
 const final=mode==='setup'?await inspect():checks;
 for(let i=0;i<tasks.length;i++){const r=final[i];log(`${tasks[i][0].padEnd(18)} ${r.ok?'OK':`FAILED (${r.missing.length} missing, ${r.extra.length} extra, ${r.mismatched.length} mismatched)`}`);}
 if(final.some(r=>!r.ok))throw Error('External assets are incomplete. Run pnpm assets:setup; inspect damaged files before retrying.');
 log('External assets ready.');return final;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try{const mode=process.argv[2];if(!['setup','verify'].includes(mode))throw Error('Expected setup or verify');let offline=false,python;for(let i=3;i<process.argv.length;i++){if(process.argv[i]==='--offline'&&mode==='setup')offline=true;else if(process.argv[i]==='--python'&&mode==='setup'&&process.argv[i+1])python=process.argv[++i];else throw Error('Unknown asset option: '+process.argv[i]);}await runTasks(mode,{offline,python});}catch(error){console.error(error.message);process.exitCode=1;}
}
