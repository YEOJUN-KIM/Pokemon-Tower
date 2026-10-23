import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, writeFile, readFile, readdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {sha256, safeRelative, cliOptions, loadDefinition} from '../scripts/assets/pokerogue/common.mjs';
import {sourceBytes} from '../scripts/assets/pokerogue/download.mjs';
import {verifyOutput, requireVerified} from '../scripts/assets/pokerogue/verify.mjs';
import {restore, convert} from '../scripts/assets/pokerogue/restore.mjs';

const temporary = () => mkdtemp(path.join(tmpdir(), 'tower-pokerogue-test-'));
const entry = (file:string, value:Buffer, text=false) => ({path:file,bytes:value.length,sha256:sha256(value),...(text?{text:true}:{})});

test('deployment check and packaging fail before copying when the runtime pack is absent',async()=>{
  const dir=await temporary();
  try{
    for(const args of [[],['--check']]){
      const result=spawnSync(process.execPath,[path.resolve('scripts/package-deploy.mjs'),...args],{cwd:dir,encoding:'utf8'});
      assert.equal(result.status,1,result.stderr);
      assert.match(result.stderr,/2002 missing/);
      assert.match(result.stderr,/pnpm assets:pokerogue/);
      assert.match(result.stderr,/1393 missing/);
      assert.match(result.stderr,/pnpm assets:showdown-pokemon/);
      assert.match(result.stderr,/4648 missing/);
      for(const [group,count] of [['showdown-trainers',194],['showdown-gimmicks',146],['pokeapi-gimmick-items',82],['pokeapi-items',109],['pokeapi-legacy-items',2],['pokesprite-items',1],['pokerogue-items',1]]){
        assert.ok(result.stderr.includes(`${group} runtime is not ready: ${count} missing`));
        assert.ok(result.stderr.includes(`pnpm assets:${group}`));
      }
      assert.match(result.stderr,/pnpm assets:pokeapi/);
      assert.deepEqual(await readdir(dir),[]);
    }
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('verifier reports missing, extra and damaged files; only text permits CRLF normalization',async()=>{
  const dir=await temporary();
  try{
    const image=Buffer.from([0,10,255]),text=Buffer.from('notice\n');
    const manifest={files:[entry('sprite.gif',image),entry('notice.md',text,true)]};
    await writeFile(path.join(dir,'sprite.gif'),image);await writeFile(path.join(dir,'notice.md'),'notice\r\n');
    assert.equal(requireVerified(await verifyOutput(dir,manifest)).matching,2);
    await writeFile(path.join(dir,'sprite.gif'),'damaged');await writeFile(path.join(dir,'extra.png'),'extra');await rm(path.join(dir,'notice.md'));
    const result=await verifyOutput(dir,manifest);
    assert.deepEqual(result.missing,['notice.md']);assert.deepEqual(result.extra,['extra.png']);assert.deepEqual(result.mismatched,['sprite.gif']);
    assert.throws(()=>requireVerified(result),/verification failed/);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('downloads are pinned, hash checked and reusable without network; corrupt cache fails',async()=>{
  const dir=await temporary(),data=Buffer.from('upstream');let requests=0;
  const descriptor={...entry('assets/test.json',data),url:'https://raw.githubusercontent.com/pagefaultgames/pokerogue-assets/'+'a'.repeat(40)+'/test.json'};
  try{
    const fetcher=(async()=>{requests++;return new Response(data);}) as typeof fetch;
    await sourceBytes(descriptor,dir,{fetcher});
    assert.deepEqual(await sourceBytes(descriptor,dir,{offline:true,fetcher:(async()=>{throw Error('network forbidden');}) as typeof fetch}),data);
    assert.equal(requests,1);
    await writeFile(path.join(dir,descriptor.path),'bad');await assert.rejects(sourceBytes(descriptor,dir,{offline:true}),/Cache hash mismatch/);
    await assert.rejects(sourceBytes({...descriptor,path:'absent.json'},dir,{offline:true}),/Offline source missing/);
    await assert.rejects(sourceBytes({...descriptor,path:'mutable.json',url:descriptor.url.replace('a'.repeat(40),'beta')},dir),/pinned URL/);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('HTTP errors and wrong upstream hashes never become accepted cache files',async()=>{
  const dir=await temporary(),descriptor={...entry('input.json',Buffer.from('good')),url:'https://raw.githubusercontent.com/pagefaultgames/pokerogue-assets/'+'b'.repeat(40)+'/input.json'};
  try{
    await assert.rejects(sourceBytes(descriptor,dir,{fetcher:(async()=>new Response('missing',{status:404})) as typeof fetch}),/HTTP 404/);
    await assert.rejects(sourceBytes(descriptor,dir,{fetcher:(async()=>new Response('wrong')) as typeof fetch}),/hash\/size mismatch/);
    assert.deepEqual(await readdir(dir),[]);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('restore verifies staging before publishing and refuses damaged existing files',async()=>{
  const dir=await temporary(),cache=path.join(dir,'cache'),output=path.join(dir,'out'),image=Buffer.from('generated image');
  const definition={pack:{recipes:[{atlas:'assets/a.json',gif:'a.gif',png:'a.png'}],metadata:[]},lock:{files:[]},manifest:{files:[entry('a.gif',image),entry('a.png',image)]}};
  let calls=0;
  const generator=async(jobsFile:string)=>{calls++;const [job]=JSON.parse(await readFile(jobsFile,'utf8'));await writeFile(job.gif,image);await writeFile(job.png,image);};
  try{
    assert.equal((await restore({cache,output,offline:true},definition,{convert:generator})).matching,2);
    await rm(output,{recursive:true});
    assert.equal((await restore({cache,output,offline:true},definition,{convert:generator})).matching,2);
    assert.equal(calls,2);
    await writeFile(path.join(output,'a.gif'),'local change');
    await assert.rejects(restore({cache,output,offline:true},definition,{convert:generator}),/Existing output differs/);
    assert.equal(await readFile(path.join(output,'a.gif'),'utf8'),'local change');
    await rm(output,{recursive:true});
    await assert.rejects(restore({cache,output,offline:true},definition,{convert:async(jobsFile:string)=>{const [job]=JSON.parse(await readFile(jobsFile,'utf8'));await writeFile(job.gif,'bad');}}),/verification failed/);
    await assert.rejects(readFile(path.join(output,'a.gif')),/ENOENT/);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('pack definitions cover every golden output and every recipe input',async()=>{
  const {pack,lock,manifest}=await loadDefinition();
  const outputs=pack.recipes.flatMap((r:any)=>[r.gif,r.png]).concat(pack.metadata.map((r:any)=>r.path));
  assert.equal(new Set(outputs).size,outputs.length);
  assert.deepEqual([...outputs].sort(),manifest.files.map((f:any)=>f.path).sort());
  const inputs=new Set(lock.files.map((f:any)=>f.path));
  for(const recipe of pack.recipes)assert.ok(inputs.has(recipe.atlas),recipe.atlas);
  assert.equal(manifest.fileCount,manifest.files.length);
  assert.equal(manifest.totalBytes,manifest.files.reduce((n:number,f:any)=>n+f.bytes,0));
});

test('unsafe paths, unknown CLI flags and absent Python fail clearly',()=>{
  for(const file of ['../escape','/absolute','C:/file','a\\b','a/../b'])assert.throws(()=>safeRelative(file),/Unsafe/);
  assert.throws(()=>cliOptions(['--unknown'],['--offline']),/Unknown option/);
  assert.throws(()=>convert('unused.json','tower-python-does-not-exist',{pillow:'12.3.0'}),/Python 3 required/);
});
