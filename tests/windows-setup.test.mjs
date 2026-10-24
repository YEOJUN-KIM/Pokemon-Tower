import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';

// Test the retained CLI contract, rather than requiring retired CMD files.
// Full installation/server/process behavior is covered by player and EXE tests.
for(const [file,repair]of [['launch-local.mjs',false],['setup-windows.mjs',true]])test(file+' forwards diagnostic arguments and engine exit status',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'tower-cli-'));
 try{
  await writeFile(path.join(directory,file),await readFile(new URL('../scripts/'+file,import.meta.url)));
  await writeFile(path.join(directory,'player-launcher.mjs'),`export async function main(args=process.argv.slice(2)){process.stdout.write(JSON.stringify(args));return 17;}`);
  const args=['--home',path.join(directory,'한글 & (QA)'),'--check','--no-browser'];
  const result=spawnSync(process.execPath,[path.join(directory,file),...args],{cwd:directory,encoding:'utf8',windowsHide:true});
  assert.ifError(result.error);assert.equal(result.status,17,result.stderr);
  assert.deepEqual(JSON.parse(result.stdout),repair?['--repair',...args]:args);
 }finally{await rm(directory,{recursive:true,force:true});}
});
