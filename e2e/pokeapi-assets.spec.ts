import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

test('production serves official pinned PokeAPI PNG, GIF, back, shiny and form artwork bytes',async({request})=>{
  const manifest=JSON.parse(readFileSync('docs/assets/manifests/pokeapi-runtime-assets.json','utf8'));
  for(const file of ['pokemon/6.png','pokemon/back/6.png','pokemon/shiny/6.png','pokemon/versions/generation-v/black-white/animated/6.gif','pokemon/versions/generation-v/black-white/animated/back/shiny/6.gif','pokemon/other/official-artwork/10301.png','pokemon/other/official-artwork/shiny/10301.png']){
    const entry=manifest.files.find((f:{path:string})=>f.path===file);expect(entry).toBeTruthy();
    const response=await request.get('/vendor/pokeapi/'+file);expect(response.ok()).toBe(true);
    const bytes=await response.body();expect(bytes.length).toBe(entry.bytes);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(entry.sha256);
  }
});
