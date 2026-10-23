import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';

// A fresh clone may omit an entire generated sprite pack. Partial installs and all
// other tracked packs still receive the existing disk integrity assertions.
export function inspectPublicAsset(url:string) {
  for(const pack of ['pokerogue','showdown/pokemon']){
    if(url.startsWith(`/vendor/${pack}/`)&&!existsSync(`public/vendor/${pack}`))return false;
  }
  return true;
}

export function assertSpriteFiles(sources:string[],message?:string) {
  assert.ok(sources.length,message??'Sprite resolver must provide candidates');
  const installed=sources.filter(inspectPublicAsset);
  if(installed.length)assert.ok(installed.some(url=>existsSync('public'+url)),message??sources.join(', '));
}
