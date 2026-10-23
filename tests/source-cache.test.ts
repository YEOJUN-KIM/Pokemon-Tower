import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {cachedSourceText,pokeapiCsv,trainerSpriteIndex} from '../scripts/lib/source-cache.mjs';

test('cache miss downloads to nested parents; cache hit works offline; failed response is not cached',async()=>{
  const root=mkdtempSync(join(tmpdir(),'tower-source-cache-'));
  const descriptor={...pokeapiCsv('pokemon'),cachePath:join(root,'absent','nested','pokemon.csv')};let requests=0;
  const online=(async()=>{requests++;return new Response('id,identifier\n6,charizard\n');}) as typeof fetch;
  assert.match(await cachedSourceText(descriptor,online),/charizard/);assert.equal(requests,1);
  assert.match(await cachedSourceText(descriptor,(async()=>{throw Error('Offline');}) as typeof fetch),/charizard/);
  const failed={...descriptor,cachePath:join(root,'missing.csv')};
  await assert.rejects(cachedSourceText(failed,(async()=>new Response('',{status:404})) as typeof fetch),/PokeAPI: HTTP 404/);
  assert.equal(existsSync(failed.cachePath),false);
  await assert.rejects(cachedSourceText(failed,(async()=>new Response('')) as typeof fetch),/empty response/);
  assert.equal(existsSync(failed.cachePath),false);
  assert.throws(()=>pokeapiCsv('../private'),/Invalid/);assert.match(trainerSpriteIndex.url,/pokemonshowdown\.com/);
});

for(const script of ['import-mega-assets.mjs','import-paldea-trainer-sprites.mjs','prune-unevolved-sprites.ts','import-selectable-forms.ts','import-ability-descriptions.mjs'])test(`${script}: actual source check recovers empty cache and then runs offline`,()=>{
  const root=mkdtempSync(join(tmpdir(),'tower-import-check-')),preload=join(root,'fetch-fixture.mjs');
  writeFileSync(preload,String.raw`globalThis.fetch=async url=>{if(process.env.CACHE_OFFLINE==='1')throw Error('Network forbidden on cache hit');if(!['https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/','https://play.pokemonshowdown.com/sprites/trainers/'].some(prefix=>String(url).startsWith(prefix)))throw Error('Unexpected source '+url);return new Response(String(url).endsWith('.csv')?'id,identifier\n6,charizard\n':'<html>official directory fixture</html>');};`);
  const importer=resolve('scripts',script),tsx=import.meta.resolve('tsx');
  const args=['--import',tsx,'--import',pathToFileURL(preload).href,importer,'--check-sources'];
  for(const offline of ['0','1']){
    const result=spawnSync(process.execPath,args,{cwd:root,env:{...process.env,CACHE_OFFLINE:offline},encoding:'utf8',timeout:30_000,windowsHide:true});
    assert.equal(result.status,0,result.stderr||result.stdout);assert.match(result.stdout,/sources ready/i);
  }
  // Only the fetch harness and requested cache files may be created; no runtime assets/data writes.
  assert.deepEqual(readdirSync(root).sort(),['.data','fetch-fixture.mjs']);
  const cache=script.includes('paldea')?'.data/cache/import/trainer-sprite-index.html':`.data/cache/${script.includes('forms')||script.includes('prune')?'forms':'import'}/${script.includes('ability')?'abilities':'pokemon'}.csv`;
  assert.ok(readFileSync(join(root,cache),'utf8').length>0);
});
