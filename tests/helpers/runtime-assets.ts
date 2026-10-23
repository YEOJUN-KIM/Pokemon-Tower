import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
const mixed=JSON.parse(readFileSync(new URL('../../docs/assets/manifests/mixed-runtime-assets.json',import.meta.url),'utf8')) as {groups:{files:{path:string}[]}[]};

// A fresh clone may omit an entire generated sprite pack. Partial installs and all
// other tracked packs still receive the existing disk integrity assertions.
export function inspectPublicAsset(url:string,publicRoot='public') {
  const group=mixed.groups.find(group=>group.files.some(file=>url==='/sprites/'+file.path));
  if(group&&!group.files.some(file=>existsSync(`${publicRoot}/sprites/${file.path}`)))return false;
  for(const pack of ['pokerogue','showdown/pokemon','pokeapi']){
    if(url.startsWith(`/vendor/${pack}/`)&&!existsSync(`${publicRoot}/vendor/${pack}`))return false;
  }
  return true;
}

export function publicAssetExists(file:string){
  return !inspectPublicAsset(file.replace(/^public/,''))||existsSync(file);
}

export function assertSpriteFiles(sources:string[],message?:string,publicRoot='public') {
  assert.ok(sources.length,message??'Sprite resolver must provide candidates');
  const installed=sources.filter(url=>inspectPublicAsset(url,publicRoot));
  if(installed.length)assert.ok(installed.some(url=>existsSync(publicRoot+url)),message??sources.join(', '));
}
