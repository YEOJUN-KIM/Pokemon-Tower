import {inspectPublicAsset} from './helpers/runtime-assets';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pokemonImageSources} from '../src/web/pokemon-image';
import additional from '../src/data/additional-animations.json' with {type:'json'};

function gifFrames(bytes:Buffer){
 assert.match(bytes.subarray(0,6).toString(),/^GIF8[79]a$/);
 let offset=13,count=0;if(bytes[10]&128)offset+=3*(1<<((bytes[10]&7)+1));
 const blocks=()=>{while(offset<bytes.length){const size=bytes[offset++];if(!size)return;offset+=size;}};
 while(offset<bytes.length){const kind=bytes[offset++];if(kind===59)break;if(kind===33){offset++;blocks();}else if(kind===44){const packed=bytes[offset+8];offset+=9;if(packed&128)offset+=3*(1<<((packed&7)+1));offset++;blocks();count++;}else assert.fail(`Invalid GIF block at ${offset-1}`);}
 return count;
}

test('every newly connected view contains real local animation and a PNG fallback',()=>{
 const views=additional as Record<string,Record<string,{gif:string;png:string}>>;
 assert.ok(Object.keys(views).length>0);
 for(const [key,images]of Object.entries(views))for(const [view,paths]of Object.entries(images)){
  const back=view==='back'||view==='shinyBack',shiny=view.startsWith('shiny');
  assert.deepEqual(pokemonImageSources(Number(key),back,true,key,shiny),[paths.gif,paths.png]);
  if(inspectPublicAsset(paths.gif))assert.ok(gifFrames(readFileSync('public'+paths.gif))>1,paths.gif);
  if(inspectPublicAsset(paths.png))assert.equal(readFileSync('public'+paths.png).subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.ok(!pokemonImageSources(Number(key),back,false,key,shiny).some(path=>path.endsWith('.gif')),key);
 }
});

test('Urshifu Rapid Strike keeps its own animated form in both orientations',()=>{
 for(const back of [false,true]){
  const rapid=pokemonImageSources(892,back,true,'10191')[0];
  const single=pokemonImageSources(892,back,true)[0];
  assert.match(rapid,/10191\.gif$/);
  assert.notEqual(rapid,single);
  if(inspectPublicAsset(rapid)&&inspectPublicAsset(single))assert.notDeepEqual(readFileSync('public'+rapid),readFileSync('public'+single));
 }
});
