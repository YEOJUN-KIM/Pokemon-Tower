import {test, expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

test('production public routes serve regenerated PokéRogue GIF and PNG bytes', async ({request}) => {
  const manifest=JSON.parse(readFileSync('docs/assets/manifests/pokerogue-runtime-assets.json','utf8'));
  for(const file of ['pokemon/front/908.gif','pokemon/back/908.gif','pokemon/shinyBack/70.png']) {
    const entry=manifest.files.find((item:{path:string})=>item.path===file);
    expect(entry).toBeTruthy();
    const response=await request.get('/vendor/pokerogue/'+file);
    expect(response.ok()).toBe(true);
    const bytes=await response.body();
    expect(bytes.length).toBe(entry.bytes);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(entry.sha256);
  }
});
