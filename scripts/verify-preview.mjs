import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {isQuickTunnelOrigin} from './lib/preview-origin.mjs';

const env=await readFile('.data/preview.env','utf8');
const origin=env.match(/^TOWER_ORIGIN=(.*)$/m)?.[1].trim();
assert.ok(isQuickTunnelOrigin(origin),'Expected a game tunnel address, not a Cloudflare service endpoint');
const request=(path,options={})=>fetch(`${origin}${path}`,{...options,signal:AbortSignal.timeout(20000)});
async function json(response) {
  assert.equal(response.status,200,await response.clone().text());
  return response.json();
}
assert.equal((await request('/')).status,200);
assert.equal((await request('/api/health')).status,200);
assert.equal((await request('/fonts/neodgm.woff2')).status,200);
const first=await request('/api/battle');
await json(first.clone());
const setCookie=first.headers.get('set-cookie');
assert.match(setCookie,/; Secure/i);
const headers={Cookie:setCookie.split(';')[0],Origin:origin,'Content-Type':'application/json'};
const post=body=>request('/api/battle',{method:'POST',headers,body:JSON.stringify(body)}).then(json);
const start=await post({type:'start',selected:['Charizard','Blastoise','Venusaur']});
const turn=await post({type:'action',battleId:start.battle.id,requestId:start.battle.requestId,action:'move 1'});
assert.ok(turn.battle.requestId>start.battle.requestId);
const restored=await json(await request('/api/battle',{headers}));
assert.equal(restored.battle.id,turn.battle.id);
assert.equal(restored.battle.requestId,turn.battle.requestId);
assert.deepEqual(restored.battle.team,turn.battle.team);
console.log(`PASS: external HTTPS page, health, font, secure guest cookie, battle turn and reload.\n${origin}`);
