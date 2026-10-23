import test from 'node:test';
import assert from 'node:assert/strict';
import {pokemonImageSources} from '../src/web/pokemon-image';
import {pokedexEntries} from '../src/server/pokedex-entries';
import {species,spriteUrl} from '../src/web/catalog';
import {pixelSprites,pixelSpriteSources} from '../src/data/pixel-sprites';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import additional from '../src/data/additional-animations.json' with {type:'json'};
const extra=additional as Record<string,Partial<Record<'front'|'back'|'shinyFront'|'shinyBack',{gif:string;png:string}>>>;

test('battle forms keep national IDs separate from sprite keys and use audited paired assets',()=>{
  assert.equal(species.Minior.id,774);
  assert.equal(species.Minior.spriteKey,'10136');
  assert.match(pokemonImageSources(774,false,true,species.Minior.spriteKey)[0],/gen5(?:ani)?\/minior\.(gif|png)$/);
  assert.match(pokemonImageSources(421,true,true,'421-sunshine')[0],/gen5ani-back\/cherrim-sunshine\.gif$/);
  assert.match(pokemonImageSources(10276,false,true)[0],/gen5ani\/terapagos-terastal\.gif$/);
  assert.equal(pixelSprites[1017].key,'ogerpon');
});

test('classic animation stays intact while modern species use paired pixel sprites',()=>{
  const front=pokemonImageSources(6,false,true),back=pokemonImageSources(6,true,true);
  assert.match(front[0],/black-white\/animated\/6\.gif$/);
  assert.match(back[0],/black-white\/animated\/back\/6\.gif$/);
  assert.match(front[1],/pokemon\/6\.png$/);assert.match(back.at(-1)!,/pokemon\/back\/6\.png$/);
  assert.match(pokemonImageSources(908,false,true)[0],/pokerogue\/pokemon\/front\/908\.gif$/);
  assert.match(pokemonImageSources(908,true,true)[0],/pokerogue\/pokemon\/back\/908\.gif$/);
  assert.equal(pokemonImageSources(6,false,false).length,1);
});

test('every modern archive species uses available pixel animation independently for each orientation',()=>{
  let animated=0,staticOnly=0;
  for(const entry of pokedexEntries()) {
    const front=pokemonImageSources(entry.id,false,true),back=pokemonImageSources(entry.id,true,true);
    if(entry.id>=650) {
      assert.equal(front[0].endsWith('.gif'),!!extra[entry.id]?.front||pixelSprites[entry.id].animatedFront);
      assert.equal(back[0].endsWith('.gif'),!!extra[entry.id]?.back||pixelSprites[entry.id].animatedBack);
    }
    if(front[0].endsWith('.gif'))animated++;else staticOnly++;
    assert.ok(front.at(-1)!.endsWith('.png'));assert.ok(back.at(-1)!.endsWith('.png'));
  }
  assert.equal(animated+staticOnly,pokedexEntries().length);
  assert.ok(animated>0 && staticOnly>0);
  for(const entry of pokedexEntries().filter(entry=>entry.id>=650)) {
    assert.ok(pixelSprites[entry.id]);
    for(const back of [false,true]){const added=extra[entry.id]?.[back?'back':'front'];const pixel=pixelSpriteSources(entry.id,back,true);if(added)assert.deepEqual(pokemonImageSources(entry.id,back,true),[added.gif,added.png]);else if(pixel.length)assert.deepEqual(pokemonImageSources(entry.id,back,true),pixel);else assert.ok(pokemonImageSources(entry.id,back,true).every(url=>url.startsWith('/vendor/pokeapi/pokemon/')));}
  }
  assert.deepEqual(pokemonImageSources(1008,false,true),['/vendor/showdown/pokemon/gen5ani/miraidon.gif','/vendor/showdown/pokemon/gen5/miraidon.png']);
  assert.ok(pokemonImageSources(1008,true,true).every(url=>url.startsWith('/vendor/')));
});

test('all modern dex orientations resolve to actual local PNG or GIF files',()=>{
  for(const entry of pokedexEntries().filter(entry=>entry.id>=650))for(const back of [false,true]) {
    for(const url of pokemonImageSources(entry.id,back,true)) {
      const bytes=readFileSync(resolve('public',url.slice(1)));
      if(url.endsWith('.gif'))assert.equal(bytes.subarray(0,4).toString(),'GIF8',url);
      else assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a',url);
    }
  }
});

test('all playable, shiny and preview images resolve locally without external fallback',()=>{
  for(const entry of pokedexEntries()) {
    const variants=[entry.id,species[entry.species]?.spriteKey ?? entry.id,...(entry.forms ?? []).map(form=>form.spriteKey)];
    for(const spriteKey of variants)for(const back of [false,true])for(const shiny of [false,true]) {
      const sources=pokemonImageSources(entry.id,back,true,spriteKey,shiny);
      assert.ok(sources.length,`${entry.species}/${spriteKey}/${back}/${shiny}`);
      for(const url of sources) {
        assert.ok(url.startsWith('/'),url);
        const bytes=readFileSync(resolve('public',url.slice(1)));
        if(url.endsWith('.gif'))assert.equal(bytes.subarray(0,4).toString(),'GIF8',url);
        else assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a',url);
      }
    }
    for(const back of [false,true]) {
      const url=spriteUrl(entry.species,back);
      assert.ok(url.startsWith('/'),url);
      assert.ok(readFileSync(resolve('public',url.slice(1))).length>0,url);
    }
  }
});

 test('all battle species and mega forms avoid model-rendered GIF fallbacks',()=>{
 const forms=JSON.parse(readFileSync('src/data/mega-forms.json','utf8'));
 for(const entry of pokedexEntries())for(const back of [false,true])for(const url of pokemonImageSources(entry.id,back,true,species[entry.species]?.spriteKey ?? entry.id))assert.ok(!url.includes('other/showdown/'),url);
 for(const form of Object.values(forms) as {id:number;spriteKey:string}[])for(const back of [false,true])for(const url of pokemonImageSources(form.id,back,true,form.spriteKey)){assert.ok(!url.includes('other/showdown/'),url);assert.ok(url.startsWith('/sprites/gimmicks/')||url.startsWith('/vendor/pokerogue/pokemon/')||url.startsWith('/vendor/showdown/pokemon/gen5')||url.startsWith('/vendor/pokeapi/pokemon/'),url);const data=readFileSync(resolve('public',url.slice(1)));assert.ok(data.length>100);}
 const sources=JSON.parse(readFileSync('docs/assets/manifests/mega-sprite-sources.json','utf8')).sources;for(const row of sources)if(row.path.endsWith('.gif'))assert.match(row.url,/\/gen5ani(?:-back)?\//);
 });
