import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {assertPlayerPath,assertPublicText,inventory,preparePublicFiles,hash,assertExplorerPaths,explorerPolicy,stampPlayerBuild} from '../scripts/windows-player-package.mjs';

test('same-version player rebuilds have distinct stable installation identities',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'tower-build-'));
 try{
  await mkdir(path.join(directory,'scripts/player'),{recursive:true});
  await mkdir(path.join(directory,'.next'));
  const config={appVersion:'1.0.0-beta.5',buildVersion:'old',launcherVersion:'1',assetVersion:'1',schemaVersion:1};
  await writeFile(path.join(directory,'scripts/player/config.json'),JSON.stringify(config));
  await writeFile(path.join(directory,'.next/BUILD_ID'),'first\n');
  const first=await stampPlayerBuild(directory);
  assert.deepEqual(first,{...config,buildVersion:'1.0.0-beta.5-player.first'});
  assert.deepEqual(await stampPlayerBuild(directory),first);
  await writeFile(path.join(directory,'.next/BUILD_ID'),'second');
  const second=await stampPlayerBuild(directory);
  assert.equal(second.appVersion,first.appVersion);
  assert.notEqual(second.buildVersion,first.buildVersion);
  assert.deepEqual(JSON.parse(await readFile(path.join(directory,'scripts/player/config.json'),'utf8')),second);
 }finally{await rm(directory,{recursive:true,force:true});}
});

test('Explorer extraction budget includes the ZIP root, UTF-16 names and download directory',()=>{
 const limit=explorerPolicy.maxFullPath-explorerPolicy.extractionRootBudget-1-explorerPolicy.archiveRoot.length-1;
 assert.equal(assertExplorerPaths(['a'.repeat(limit)]).maxModeledPath,240);
 assert.throws(()=>assertExplorerPaths(['a'.repeat(limit+1)]),/Explorer path budget/);
 assert.throws(()=>assertExplorerPaths(['한'.repeat(limit+1)]),/Explorer path budget/);
 assert.throws(()=>assertExplorerPaths(['node_modules/.pnpm/next@16.3.8_@playwright+tes_b856825c6311cf24e2a7ae2d5c69fa1f/node_modules/next/dist/build/static-paths/app/extract-pathname-route-param-segments-from-loader-tree.js']),/Explorer path budget/);
});

test('player package rejects user state, development config, links and credentials',async()=>{
 for(const file of ['.env','.env.local','.git/config','saves/tower.sqlite','public/test.db','logs/server.log','.install-complete.json','.launcher.lock','test-results/screen.png','src/private.ts','../secret','public/a.map'])assert.throws(()=>assertPlayerPath(file),file);
 for(const file of ['PokemonTower.exe','.next/BUILD_ID','node_modules/.pnpm/next/node_modules/next/package.json','docs/assets/manifests/mixed-runtime-assets.json','scripts/player/managed-start.mjs'])assert.doesNotThrow(()=>assertPlayerPath(file));
 assert.throws(()=>assertPublicText('C:\\Users\\private\\project','server.js'));
 assert.throws(()=>assertPublicText('-----BEGIN PRIVATE KEY-----','server.js'));
 assert.throws(()=>assertPublicText('token-value-123456','server.js',['token-value-123456']));
 const directory=await mkdtemp(path.join(tmpdir(),'tower-release-'));
 try{
  const root='C:\\Users\\private\\Pokemon-Tower';
  await writeFile(path.join(directory,'server.js'),'const config='+JSON.stringify({root})+';\n');
  await preparePublicFiles(directory,root);
  assert.ok(!(await readFile(path.join(directory,'server.js'),'utf8')).includes('private'));
  const first=await inventory(directory);assert.equal(first.length,1);
  await writeFile(path.join(directory,'server.js'),'changed');
  assert.notEqual((await inventory(directory))[0].sha256,first[0].sha256);
  await mkdir(path.join(directory,'saves'));await writeFile(path.join(directory,'saves/tower.sqlite'),'private');
  await assert.rejects(inventory(directory),/Forbidden/);
 }finally{await rm(directory,{recursive:true,force:true});}
});

test('Windows ZIP includes hidden runtime files and rejects changed archive bytes',{skip:process.platform!=='win32'},async()=>{
 const temporary=await mkdtemp(path.join(tmpdir(),'tower-zip-'));
 const directory=path.join(temporary,'게임 배포'),zip=path.join(temporary,'release.zip');
 try{
  await mkdir(path.join(directory,'.next'),{recursive:true});
  await writeFile(path.join(directory,'.next/BUILD_ID'),'build-id');
  await writeFile(path.join(directory,'README.txt'),'release');
  const entries=await Promise.all(['.next/BUILD_ID','README.txt'].map(async name=>{const bytes=await readFile(path.join(directory,name));return {path:name,bytes:bytes.length,sha256:hash(bytes)};}));
  await writeFile(path.join(directory,'release-manifest.json'),JSON.stringify({files:entries}));
  const command=(mode:string)=>spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File','scripts/windows-player-zip.ps1','-Mode',mode,'-Directory',directory,'-ZipPath',zip],{encoding:'utf8',windowsHide:true});
  let result=command('create');assert.equal(result.status,0,result.stderr);
  result=command('verify');assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/3 exact files/);
  const extracted=path.join(temporary,'extracted');
  result=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File','scripts/windows-player-zip.ps1','-Mode','extract','-Directory',extracted,'-ZipPath',zip],{encoding:'utf8',windowsHide:true});
  assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/Classic Win32 extracted 3 files/);
  assert.equal(await readFile(path.join(extracted,'PokemonTower/.next/BUILD_ID'),'utf8'),'build-id');
  await rm(zip);await writeFile(path.join(directory,'README.txt'),'tampered');
  result=command('create');assert.equal(result.status,0,result.stderr);
  result=command('verify');assert.notEqual(result.status,0);assert.match(result.stderr,/ZIP content mismatch/);
  await rm(zip);const deep='node_modules/'+('x'.repeat(60))+'/'+('y'.repeat(70))+'.js';
  await mkdir(path.dirname(path.join(directory,deep)),{recursive:true});await writeFile(path.join(directory,deep),'too long');
  result=command('create');assert.notEqual(result.status,0);assert.match(result.stderr,/Explorer path budget/);
 }finally{await rm(temporary,{recursive:true,force:true});}
});
