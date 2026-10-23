import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadDefinition,sourceBase,sha256} from '../scripts/assets/pokeapi/common.mjs';
import {restore} from '../scripts/assets/pokeapi/restore.mjs';
import {sourceBytes} from '../scripts/assets/pokeapi/download.mjs';
import {verifyOutput} from '../scripts/assets/pokeapi/verify.mjs';
import {inspectPublicAsset,assertSpriteFiles} from './helpers/runtime-assets';

const temporary=()=>mkdtemp(path.join(tmpdir(),'tower-pokeapi-test-'));
const entry=(file:string,data:Buffer)=>({path:file,bytes:data.length,sha256:sha256(data),url:sourceBase+file});

test('PokeAPI lock covers all current images at one official immutable revision',async()=>{
  const {lock,manifest}=await loadDefinition();
  assert.equal(lock.strategy,'official-upstream');assert.equal(lock.repository,'PokeAPI/sprites');
  assert.equal(manifest.fileCount,4648);assert.equal(manifest.totalBytes,89453521);
  assert.equal(lock.files.filter((f:any)=>f.path.endsWith('.png')).length,3182);
  assert.equal(lock.files.filter((f:any)=>f.path.endsWith('.gif')).length,1466);
  assert.ok(lock.files.every((f:any)=>f.url===sourceBase+f.path));
});

test('PokeAPI restore uses verified source cache offline and preserves local edits',async()=>{
  const dir=await temporary(),data=Buffer.from('upstream sprite'),source=entry('pokemon/a.png',data);
  const definition={lock:{files:[source]},manifest:{files:[source]}};
  try{
    const cache=path.join(dir,'source'),output=path.join(dir,'output');let requests=0;
    assert.equal((await restore({cache,output},definition,{fetcher:async()=>{requests++;return new Response(data);}})).matching,1);
    await rm(output,{recursive:true});
    assert.equal((await restore({cache,output,offline:true},definition,{fetcher:async()=>{throw Error('Network forbidden');}})).matching,1);
    assert.equal(requests,1);assert.deepEqual(await readFile(path.join(output,source.path)),data);
    await writeFile(path.join(output,source.path),'user edit');
    await assert.rejects(restore({cache,output,offline:true},definition),/Existing output differs/);
    assert.equal(await readFile(path.join(output,source.path),'utf8'),'user edit');
    await writeFile(path.join(cache,source.path),'bad cache');
    await assert.rejects(restore({cache,output:path.join(dir,'empty'),offline:true},definition),/Cache hash mismatch/);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('PokeAPI rejects live branches, other repositories, missing offline inputs and invalid responses',async()=>{
  const dir=await temporary(),source=entry('pokemon/a.png',Buffer.from('good'));
  try{
    await assert.rejects(sourceBytes(source,dir,{offline:true}),/Offline source missing/);
    for(const url of [source.url.replace(/[a-f0-9]{40}/,'master'),source.url.replace('PokeAPI/sprites','other/repo')])await assert.rejects(sourceBytes({...source,url},dir),/approved pinned URL/);
    await assert.rejects(sourceBytes(source,dir,{fetcher:async()=>new Response('wrong')}),/hash\/size mismatch/);
    await assert.rejects(sourceBytes(source,dir,{fetcher:async()=>new Response('missing',{status:404})}),/HTTP 404/);
    assert.deepEqual(await readdir(dir),[]);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('a wholly absent pack permits development disk checks; a partial pack is inspected and fails verify',async()=>{
  const dir=await temporary(),publicRoot=path.join(dir,'public'),output=path.join(publicRoot,'vendor/pokeapi');
  const a=entry('pokemon/a.png',Buffer.from('a')),b=entry('pokemon/b.gif',Buffer.from('b'));
  const url='/vendor/pokeapi/pokemon/b.gif';
  try{
    assert.equal(inspectPublicAsset(url,publicRoot),false);
    assert.doesNotThrow(()=>assertSpriteFiles([url],undefined,publicRoot));
    assert.equal((await verifyOutput(output,{files:[a,b]})).missing.length,2);
    await mkdir(path.join(output,'pokemon'),{recursive:true});await writeFile(path.join(output,a.path),'a');
    assert.equal(inspectPublicAsset(url,publicRoot),true);
    assert.throws(()=>assertSpriteFiles([url],undefined,publicRoot));
    const result=await verifyOutput(output,{files:[a,b]});
    assert.equal(result.ok,false);assert.deepEqual(result.missing,[b.path]);
    await writeFile(path.join(output,a.path),'wrong');await writeFile(path.join(output,'extra.png'),'extra');
    const damaged=await verifyOutput(output,{files:[a,b]});
    assert.deepEqual(damaged.mismatched,[a.path]);assert.deepEqual(damaged.extra,['extra.png']);
  }finally{await rm(dir,{recursive:true,force:true});}
});
