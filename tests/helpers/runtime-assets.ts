import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';

// A fresh clone may omit the entire PokéRogue pack. Partial installs and all
// other tracked packs still receive the existing disk integrity assertions.
export function inspectPublicAsset(url:string) {
  return !url.startsWith('/vendor/pokerogue/')||existsSync('public/vendor/pokerogue');
}

export function assertSpriteFiles(sources:string[],message?:string) {
  assert.ok(sources.length,message??'Sprite resolver must provide candidates');
  const installed=sources.filter(inspectPublicAsset);
  if(installed.length)assert.ok(installed.some(url=>existsSync('public'+url)),message??sources.join(', '));
}
