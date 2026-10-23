import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadDefinition,restoreGroup,verifyGroup} from '../scripts/assets/mixed/runtime.mjs';
import {sha256} from '../scripts/assets/pokerogue/common.mjs';
import {inspectPublicAsset} from './helpers/runtime-assets';

const fixture=()=>{
 const bytes=Buffer.from('external sprite'),retained={path:'items/original.svg'};
 const group={id:'fixture',repository:'PokeAPI/sprites',revision:'a3a1432e688ea028f12c51371d5253037cb9f17b',files:['a.png','b.png'].map(name=>({path:'items/'+name,bytes:bytes.length,sha256:sha256(bytes),url:'https://raw.githubusercontent.com/PokeAPI/sprites/a3a1432e688ea028f12c51371d5253037cb9f17b/sprites/items/'+name}))};
 return {bytes,group,definition:{groups:[group],folders:['items'],retained:[retained]}};
};

test('mixed ownership inventory covers 561 files with originals, authored beam and historical records retained',async()=>{
 const d=await loadDefinition();assert.equal(d.groups.length,7);
 assert.equal(d.groups.reduce((n:any,g:any)=>n+g.fileCount,0),535);assert.equal(d.retained.length,26);
 assert.equal(d.retained.filter((f:any)=>f.ownership==='project-original').length,20);
 assert.equal(d.retained.filter((f:any)=>f.ownership==='metadata').length,6);
 assert.deepEqual(d.retained.filter((f:any)=>f.ownership==='user-provided/unverified').map((f:any)=>f.path),[]);
 const ignore=(await readFile('.gitignore','utf8')).replace(/\r\n/g,'\n'),block=ignore.split('# BEGIN mixed external runtime: exact audited paths; retain originals and records\n')[1].split('# END mixed external runtime')[0];
 assert.deepEqual(block.trim().split(/\r?\n/).sort(),d.groups.flatMap((g:any)=>g.files.map((f:any)=>'/public/sprites/'+f.path)).sort());
 for(const f of d.retained){let b=await readFile('public/sprites/'+f.path);if(f.text)b=Buffer.from(b.toString('utf8').replace(/\r\n/g,'\n'));assert.equal(sha256(b),f.sha256,f.path);}
});

test('mixed restore preserves original files and restores only its provider online and offline',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'tower-mixed-')),f=fixture();
 try{
  const output=path.join(dir,'output'),cache=path.join(dir,'source');await mkdir(path.join(output,'items'),{recursive:true});await writeFile(path.join(output,'items/original.svg'),'original');let requests=0;
  const online=await restoreGroup({output,cache},f.group,f.definition,{fetcher:async()=>{requests++;return new Response(f.bytes);}});assert.equal(online.matching,2);
  assert.equal(await readFile(path.join(output,'items/original.svg'),'utf8'),'original');
  await rm(path.join(output,'items/a.png'));await rm(path.join(output,'items/b.png'));
  assert.equal((await restoreGroup({output,cache,offline:true},f.group,f.definition,{fetcher:async()=>{throw Error('Network forbidden');}})).matching,2);assert.equal(requests,2);
  await writeFile(path.join(output,'items/a.png'),'user edit');await assert.rejects(restoreGroup({output,cache,offline:true},f.group,f.definition),/Existing output differs/);
  assert.equal(await readFile(path.join(output,'items/a.png'),'utf8'),'user edit');
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('mixed verifier rejects partial, damaged and unknown assets while accepting retained originals',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'tower-mixed-')),f=fixture();
 try{
  await mkdir(path.join(dir,'items'));await writeFile(path.join(dir,'items/original.svg'),'original');
  assert.equal((await verifyGroup(dir,f.group,f.definition)).missing.length,2);
  await writeFile(path.join(dir,'items/a.png'),f.bytes);assert.equal((await verifyGroup(dir,f.group,f.definition)).missing.length,1);
  await writeFile(path.join(dir,'items/b.png'),'wrong');await writeFile(path.join(dir,'items/unknown.png'),'unknown');
  const result=await verifyGroup(dir,f.group,f.definition);assert.deepEqual(result.mismatched,['items/b.png']);assert.deepEqual(result.extra,['items/unknown.png']);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('mixed disk assertions skip only an entirely absent provider, even when source metadata remains',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'tower-mixed-')),d=await loadDefinition(),g=d.groups.find((g:any)=>g.id==='showdown-trainers');
 try{
  await mkdir(path.join(dir,'sprites/trainers'),{recursive:true});await writeFile(path.join(dir,'sprites/trainers/sources.json'),'{}');
  const url='/sprites/'+g.files[1].path;assert.equal(inspectPublicAsset(url,dir),false);
  assert.equal(inspectPublicAsset('/sprites/trainers/player-front.png',dir),true);
  await writeFile(path.join(dir,'sprites',g.files[0].path),'partial');assert.equal(inspectPublicAsset(url,dir),true);
  assert.equal((await verifyGroup(path.join(dir,'sprites'),g,d)).ok,false);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('mixed restore refuses missing offline inputs and symlinked output trees',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'tower-mixed-')),f=fixture();
 try{
  const output=path.join(dir,'output'),cache=path.join(dir,'source');
  await assert.rejects(restoreGroup({output,cache,offline:true},f.group,f.definition),/Offline source missing/);
  await mkdir(output);await mkdir(path.join(dir,'outside'));await symlink(path.join(dir,'outside'),path.join(output,'items'),'junction');
  await assert.rejects(restoreGroup({output,cache,offline:true},f.group,f.definition),/Symlink/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
