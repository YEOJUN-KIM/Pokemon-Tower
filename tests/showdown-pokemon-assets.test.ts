import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile, rm, readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadDefinition, sourceBase, sha256} from '../scripts/assets/showdown-pokemon/common.mjs';
import {restore} from '../scripts/assets/showdown-pokemon/restore.mjs';
import {sourceBytes} from '../scripts/assets/showdown-pokemon/download.mjs';
import {verifyOutput} from '../scripts/assets/showdown-pokemon/verify.mjs';

const temporary=()=>mkdtemp(path.join(tmpdir(),'tower-showdown-test-'));
const entry=(name:string,data:Buffer)=>({path:name,bytes:data.length,sha256:sha256(data),url:sourceBase+name});

test('Showdown lock covers every golden file using a fixed deployed snapshot',async()=>{
  const {lock,manifest}=await loadDefinition();
  assert.equal(manifest.fileCount,1393);
  assert.equal(manifest.totalBytes,36480199);
  assert.equal(lock.strategy,'immutable-git-snapshot');
  assert.equal(lock.files.filter((f:any)=>f.path.endsWith('.gif')).length,440);
  assert.equal(lock.files.filter((f:any)=>f.path.endsWith('.png')).length,952);
});

test('Showdown online and forbidden-network offline restore produce identical bytes without overwriting existing files',async()=>{
  const dir=await temporary(),data=Buffer.from('sprite fixture'),source=entry('gen5/a.png',data);
  const definition={lock:{files:[source]},manifest:{files:[source]}};
  let calls=0;
  try{
    const cache=path.join(dir,'cache'),output=path.join(dir,'online'),offline=path.join(dir,'offline');
    const result=await restore({cache,output},definition,{fetcher:async()=>{calls++;return new Response(data);}});
    assert.equal(result.matching,1);assert.equal(calls,1);
    assert.equal((await restore({cache,output:offline,offline:true},definition,{fetcher:async()=>{throw Error('Network forbidden');}})).matching,1);
    assert.deepEqual(await readFile(path.join(output,source.path)),await readFile(path.join(offline,source.path)));
    await writeFile(path.join(output,source.path),'user edit');
    await assert.rejects(restore({cache,output,offline:true},definition),/Existing output differs/);
    assert.equal(await readFile(path.join(output,source.path),'utf8'),'user edit');
    await writeFile(path.join(cache,source.path),'corrupt cache');
    await assert.rejects(restore({cache,output:path.join(dir,'new'),offline:true},definition),/Cache hash mismatch/);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('Showdown missing offline inputs, mutable URLs and invalid upstream bytes fail without publishing',async()=>{
  const dir=await temporary(),source=entry('gen5/a.png',Buffer.from('good'));
  try{
    await assert.rejects(sourceBytes(source,dir,{offline:true}),/Offline source missing/);
    await assert.rejects(sourceBytes({...source,url:source.url.replace(/[a-f0-9]{40}/,'main')},dir),/approved pinned URL/);
    await assert.rejects(sourceBytes({...source,url:'https://play.pokemonshowdown.com/sprites/gen5/a.png'},dir),/approved pinned URL/);
    await assert.rejects(sourceBytes(source,dir,{fetcher:async()=>new Response('wrong')}),/hash\/size mismatch/);
    await assert.rejects(sourceBytes(source,dir,{fetcher:async()=>new Response('absent',{status:404})}),/HTTP 404/);
    assert.deepEqual(await readdir(dir),[]);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('Showdown verifier reports partial packs and unexpected files; unsafe output/cache paths are rejected',async()=>{
  const dir=await temporary(),a=entry('a.png',Buffer.from('a')),b=entry('b.gif',Buffer.from('b'));
  try{
    await writeFile(path.join(dir,'a.png'),'changed');await writeFile(path.join(dir,'extra.png'),'extra');
    const result=await verifyOutput(dir,{files:[a,b]});
    assert.deepEqual(result.missing,['b.gif']);assert.deepEqual(result.mismatched,['a.png']);assert.deepEqual(result.extra,['extra.png']);
    const definition={lock:{files:[]},manifest:{files:[]}};
    await assert.rejects(restore({cache:dir,output:path.join(dir,'nested')},definition),/separate directories/);
    await assert.rejects(restore({cache:path.resolve('.data'),output:dir},definition),/asset directories/);
  }finally{await rm(dir,{recursive:true,force:true});}
});
