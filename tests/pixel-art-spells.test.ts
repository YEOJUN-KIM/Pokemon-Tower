import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {assetRegistry} from '../src/assets/registry';
import {projectileVfxCatalog} from '../src/assets/projectile-vfx';
import {inspectSources,loadDefinition,prepare,verify} from '../scripts/assets/pixel-art-spells/runtime.mjs';

test('eight selected original projectiles match reviewed hashes, frame evidence and typed role registry',async()=>{
 const assets=await inspectSources(),definition=await loadDefinition();
 assert.equal(assets.length,8);assert.equal(definition.archiveInventory.length,22);
 assert.equal(definition.archiveInventory.filter((a:any)=>a.aseFile).length,21);
 assert.equal(definition.selected.filter((a:any)=>a.sourceAse).length,7);
 assert.equal(definition.license.spdx,'CC0-1.0');assert.equal(definition.license.attributionRequired,false);
 assert.equal(definition.review.status,'Reviewed / Rejected for primary battle VFX');
 assert.equal(definition.review.primaryBattleAdopted,false);assert.equal(definition.review.battleIntegrationRemoved,true);
 assert.deepEqual(Object.keys(projectileVfxCatalog).sort(),definition.selected.map((a:any)=>a.role).sort());
 for(const {asset,filename} of assets){
  const runtime=assetRegistry.projectileVfx(asset.role)!;
  assert.ok(runtime,asset.role);assert.equal(runtime.file,filename);
  assert.equal(runtime.frames,asset.sheet.frameCount);assert.equal(runtime.frameWidth,asset.sheet.frameWidth);assert.equal(runtime.frameHeight,asset.sheet.frameHeight);
  assert.equal(runtime.category,asset.category);assert.equal(runtime.small,asset.smallProjectile);assert.equal(runtime.direction,asset.direction);
  assert.equal(runtime.sourceFrameDurationMs,asset.sourceFrameDurationsMs?.[0]??null);
  assert.equal(runtime.sourceLoop,asset.sourceLoop);assert.equal(runtime.suggestedPlayback,asset.suggestedPlayback);
  assert.equal(decodeURIComponent(runtime.url.split('/').at(-1)!),filename);
 }
 assert.equal(assetRegistry.projectileVfx('Projectile_Energy_Small')!.sourceFrameDurationMs,null);
 assert.equal(assetRegistry.projectileVfx('Projectile_Solid_Rock')!.frames,1);
 assert.equal(assetRegistry.projectileVfx('Projectile_Solid_Ice')!.frames,4);
 for(const unknown of ['__proto__','../Fireball.png','Flamethrower','Splash'])assert.equal(assetRegistry.projectileVfx(unknown),null);
 assert.equal(assetRegistry.moveEffect('impact'),'/vendor/showdown/fx/impact.png');
});

test('offline preparation copies only eight selected PNG, is repeatable, and refuses modified/extra outputs',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'tower-pixel-spells-'));
 try{
  const output=path.join(dir,'generated');
  assert.equal((await verify({output})).missing.length,8);
  assert.equal((await prepare({output})).matching,8);
  assert.equal((await prepare({output})).ok,true);
  assert.equal((await readdir(output)).length,8);
  const original=await readFile(path.join(output,'Fireball.png'));
  await writeFile(path.join(output,'Fireball.png'),'user edit');
  assert.deepEqual((await verify({output})).mismatched,['Fireball.png']);
  await assert.rejects(prepare({output}),/refusing overwrite/);
  assert.equal(await readFile(path.join(output,'Fireball.png'),'utf8'),'user edit');
  await writeFile(path.join(output,'Fireball.png'),original);
  await writeFile(path.join(output,'Splash.png'),'not selected');
  assert.deepEqual((await verify({output})).extra,['Splash.png']);
  await assert.rejects(prepare({output}),/Unexpected generated assets/);
 }finally{
  const resolved=path.resolve(dir),parent=path.resolve(tmpdir());
  assert.ok(resolved.startsWith(parent+path.sep)&&path.basename(resolved).startsWith('tower-pixel-spells-'));
  await rm(resolved,{recursive:true,force:true});
 }
});
