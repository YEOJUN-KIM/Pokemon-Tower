import {assertSpriteFiles} from './helpers/runtime-assets';
import test from 'node:test';
import assert from 'node:assert/strict';
import {pokemonImageSources} from '../src/web/pokemon-image';
import {pixelSpriteSources} from '../src/data/pixel-sprites';
import nonPixelFronts from '../src/data/non-pixel-front-sprites.json' with {type:'json'};
import additional from '../src/data/additional-animations.json' with {type:'json'};

test('illustration placeholders use real local pixel PNGs for animated and static front views',()=>{
 for(const key of nonPixelFronts){
  assert.deepEqual(pixelSpriteSources(key,false,true),[]);
  for(const animated of [false,true]){
   const sources=pokemonImageSources(Number(key),false,animated,key);
   const added=(additional as Record<string,{front?:{gif:string;png:string}}>)[key]?.front;
   assert.deepEqual(sources,animated&&added?[added.gif,added.png]:[`/vendor/pokeapi/pokemon/${key}.png`]);
   assertSpriteFiles([sources[0]]);
  }
  for(const back of [false,true])for(const shiny of [false,true]){
   const sources=pokemonImageSources(Number(key),back,true,key,shiny);
   assertSpriteFiles(sources);
  }
 }
 assert.match(pokemonImageSources(6,false,true)[0],/animated\/6\.gif$/);
 assert.match(pokemonImageSources(1008,false,true)[0],/gen5ani\/miraidon\.gif$/);
});
