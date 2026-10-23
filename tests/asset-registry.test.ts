import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {assetRegistry} from '../src/assets/registry';
import {loadAssetImage} from '../src/assets/load-image';
import {TrainerPortrait} from '../src/web/trainer-portrait';

test('registry keeps existing runtime paths and independent project fallbacks',()=>{
  for(const species of [6,908,1008])for(const back of [false,true]){
    const urls=assetRegistry.pokemon(species,back,true);
    assert.ok(urls.length);for(const url of urls)assert.ok(existsSync('public'+url),url);
  }
  for(const file of Object.values(assetRegistry.placeholders)){
    assert.ok(!/vendor|sprites/.test(file));assert.match(readFileSync('public'+file,'utf8'),/<svg/);
  }
  assert.equal(assetRegistry.cry(6),null);assert.equal(assetRegistry.cry(-1),null);
  assert.ok(existsSync('public'+assetRegistry.item('leftovers')));
  assert.ok(existsSync('public'+assetRegistry.tera('Fire')));
  assert.ok(existsSync('public'+assetRegistry.moveEffect('impact')));
  const html=renderToStaticMarkup(createElement(TrainerPortrait,{sprite:'unknown-asset',alt:'Generic trainer'}));
  assert.ok(html.includes(assetRegistry.placeholders.trainer));assert.ok(!html.includes('/sprites/trainers/'));
});

test('missing, broken and stalled VFX settle without rejecting the renderer',async()=>{
  for(const mode of ['loaded','error','stalled','constructor-error']){
    const image={naturalWidth:32,onload:null as null|(()=>void),onerror:null as null|(()=>void),set src(_url:string){if(mode==='stalled')return;queueMicrotask(()=>mode==='loaded'?this.onload?.():this.onerror?.());}};
    const result=await loadAssetImage('/not-installed.png',{timeoutMs:10,imageFactory:()=>{if(mode==='constructor-error')throw Error('Unavailable');return image as unknown as HTMLImageElement;}});
    assert.equal(result,mode==='loaded'?image:null);assert.equal(image.onload,null);assert.equal(image.onerror,null);
  }
});
