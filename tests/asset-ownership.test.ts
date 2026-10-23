import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

test('current ownership audit preserves authored assets and distinguishes CC0 recordings and aliases',async()=>{
 const audit=JSON.parse(await readFile('docs/assets/manifests/runtime-ownership.json','utf8'));
 const paths=new Set<string>();
 for(const f of audit.files){
  assert.ok(!paths.has(f.path));paths.add(f.path);assert.equal(f.git,'kept');assert.equal(f.restore,false);assert.equal(f.tracked,true);
  let bytes=await readFile(f.path);if(f.text)bytes=Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n'));
  assert.equal(bytes.length,f.bytes,f.path);assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256,f.path);
 }
 const originals=(category:string)=>audit.files.filter((f:any)=>f.category===category&&f.ownership==='project-original');
 for(const [category,count] of [['eggs',5],['tm',18],['portal-event',2],['bgm',5]])assert.equal(originals(category as string).length,count);
 const music=audit.files.filter((f:any)=>f.category==='bgm'&&f.ownership==='external');assert.equal(music.length,8);assert.equal(music.filter((f:any)=>f.aliasOf).length,2);
 for(const file of music){assert.equal(file.license,'CC0-1.0');if(file.aliasOf)assert.equal(audit.files.find((f:any)=>f.path===file.aliasOf).sha256,file.sha256);}
 assert.equal(audit.files.filter((f:any)=>f.category==='showdown-vfx'&&f.license==='CC0-1.0').length,22);
 const mixed=JSON.parse(await readFile(audit.references[0].manifest,'utf8'));
 const beam=mixed.retained.find((f:any)=>f.path==='effects/flamethrower-beam.png');assert.equal(beam.ownership,'project-original');assert.equal(beam.owner,'project');
 assert.equal(mixed.retained.filter((f:any)=>f.ownership==='project-original').length,20);
});
