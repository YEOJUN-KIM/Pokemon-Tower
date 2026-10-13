import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {pokemonImageSources} from '../src/web/pokemon-image';
import {pixelSpriteSources} from '../src/data/pixel-sprites';
import nonPixelFronts from '../src/data/non-pixel-front-sprites.json' with {type:'json'};

test('illustration placeholders use real local pixel PNGs for animated and static front views',()=>{
 for(const key of nonPixelFronts){
  assert.deepEqual(pixelSpriteSources(key,false,true),[]);
  for(const animated of [false,true]){
   const sources=pokemonImageSources(Number(key),false,animated,key);
   assert.deepEqual(sources,[`/vendor/pokeapi/pokemon/${key}.png`]);
   assert.ok(existsSync('public'+sources[0]));
  }
  for(const back of [false,true])for(const shiny of [false,true]){
   const sources=pokemonImageSources(Number(key),back,true,key,shiny);
   assert.ok(sources.length && sources.some(source=>existsSync('public'+source)));
  }
 }
 assert.match(pokemonImageSources(6,false,true)[0],/animated\/6\.gif$/);
 assert.match(pokemonImageSources(1008,false,true)[0],/gen5ani\/miraidon\.gif$/);
});
