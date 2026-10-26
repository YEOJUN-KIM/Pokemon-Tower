import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {copyCompactStandalone} from '../scripts/compact-standalone.mjs';

test('compaction preserves exact versioned dependency resolution and omits dev metadata',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'tower-compact-')),standalone=path.join(root,'standalone'),target=path.join(root,'out');
 const write=async(file:string,data:string)=>{await mkdir(path.dirname(file),{recursive:true});await writeFile(file,data);};
 const link=async(from:string,to:string)=>{await mkdir(path.dirname(from),{recursive:true});await symlink(to,from,process.platform==='win32'?'junction':'dir');};
 try{
  for(const [store,value]of [['a-with-long-peer-hash','a'],['dep@1','one'],['dep@2','two']]){
   const name=store.startsWith('a-')?'a':'dep',dir=path.join(standalone,'node_modules/.pnpm',store,'node_modules',name);
   await write(path.join(dir,'package.json'),JSON.stringify({name,main:'index.cjs'}));await write(path.join(dir,'index.cjs'),name==='a'?'module.exports=require("dep")':`module.exports=${JSON.stringify(value)}`);
   await write(path.join(dir,'index.cjs.map'),'dev');
  }
  await link(path.join(standalone,'node_modules/a'),path.join(standalone,'node_modules/.pnpm/a-with-long-peer-hash/node_modules/a'));
  await link(path.join(standalone,'node_modules/.pnpm/a-with-long-peer-hash/node_modules/dep'),path.join(standalone,'node_modules/.pnpm/dep@2/node_modules/dep'));
  const result=await copyCompactStandalone(standalone,target,root);
  for(const entry of result.links)await link(path.join(target,entry.path),path.join(target,entry.target));
  assert.equal(createRequire(path.join(target,'server.cjs'))('a'),'two');
  assert.equal(result.copied,6);assert.equal(result.omitted,3);
  assert.ok(result.links.every(l=>!l.path.includes('.pnpm')&&!l.target.includes('long-peer')));
  assert.equal(await readFile(path.join(target,'node_modules/.p/0/node_modules/a/index.cjs'),'utf8'),'module.exports=require("dep")');
 }finally{
  // Unlink only task-created junctions before recursive cleanup on Windows.
  const {lstat,readdir,unlink}=await import('node:fs/promises');
  async function unlinkTree(dir:string){for(const item of await readdir(dir)){const full=path.join(dir,item),stat=await lstat(full);if(stat.isSymbolicLink())await unlink(full);else if(stat.isDirectory())await unlinkTree(full);}}
  await unlinkTree(root);await rm(root,{recursive:true,force:true});
 }
});
