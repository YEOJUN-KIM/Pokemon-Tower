import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import baseline from './fixtures/galar-tuning-baseline.json' with {type:'json'};
import {galarTuningTelemetry} from '../scripts/lib/galar-tuning-telemetry';
import type {BattleLog} from '../src/battle/run';
import {packedNpcRule} from '../src/data/npc-gimmicks';

test('Galar tuning changes exactly four fields; every other NPC, profile, order and AI is preserved',()=>{
 for(const [path,reference]of Object.entries(baseline.paths)){
  const d=JSON.parse(readFileSync(path,'utf8')),rows=Array.isArray(d)?d:d.trainers??d.samples;
  assert.equal(createHash('sha256').update(JSON.stringify(rows.filter((r:{id:string})=>!baseline.changed.includes(r.id)))).digest('hex'),reference.otherHash,path);
  const expected=structuredClone(reference.rows);
  for(const row of expected)for(const p of row.team){
   if(row.id==='named-allister'&&p.species==='Cursola')p.item='';
   if(row.id==='named-raihan'&&p.species==='Duraludon'){
    const build='profile'in p?p.profile:p;build.moves=build.moves.map(m=>m==='Body Press'?'Dark Pulse':m);
   }
   if(row.id==='named-leon'&&p.species==='Dragapult')p.item='Focus Sash';
   if(row.id==='named-leon'&&p.species==='Charizard')p.item='Life Orb';
  }
  assert.deepEqual(rows.filter((r:{id:string})=>baseline.changed.includes(r.id)),expected,path);
 }
 assert.equal(createHash('sha256').update(readFileSync('src/battle/galar-policy.ts','utf8').replaceAll('\r\n','\n')).digest('hex'),baseline.ai);
 assert.equal(packedNpcRule([{item:'Life Orb'}],0),'basic');
 assert.equal(packedNpcRule([{item:'Life Orb',gigantamax:true}],0),'dynamax');
});
const log=(lines:string[]):BattleLog=>({schemaVersion:1,engineVersion:'fixture',format:'fixture',seed:[1,2,3,4],teams:{p1:'',p2:''},decisions:[],publicProtocol:lines,winner:'Player',turns:2});
test('telemetry distinguishes a Sash saving an action from activation followed by a faint',()=>{
 const saved=galarTuningTelemetry(log(['|switch|p2a: Dragapult|Dragapult|100/100','|turn|1','|-enditem|p2a: Dragapult|Focus Sash','|-damage|p2a: Dragapult|1/100','|move|p2a: Dragapult|Dragon Darts|p1a: Lapras']), 'Charizard');
 assert.equal(saved.sashExtraActions,1);assert.equal(saved.sashSavedEntries,1);
 const failed=galarTuningTelemetry(log(['|switch|p2a: Dragapult|Dragapult|100/100','|-enditem|p2a: Dragapult|Focus Sash','|faint|p2a: Dragapult']), 'Charizard');assert.equal(failed.sashExtraActions,0);
});
test('telemetry separates Max direct damage, Life Orb recoil and Wildfire damage/KOs',()=>{
 const r=galarTuningTelemetry(log(['|switch|p1a: Lapras|Lapras|100/100','|switch|p2a: Charizard|Charizard|100/100','|turn|1','|-start|p2a: Charizard|Dynamax|Gmax','|move|p2a: Charizard|G-Max Wildfire|p1a: Lapras','|-damage|p1a: Lapras|10/100','|-damage|p2a: Charizard|95/100|[from] item: Life Orb','|-damage|p1a: Lapras|0 fnt|[from] G-Max Wildfire','|faint|p1a: Lapras']), 'Charizard');
 assert.equal(r.damage.Charizard,90);assert.ok(Math.abs(r.damage['Charizard recoil']-5)<1e-8);assert.equal(r.damage['Charizard residual'],10);assert.equal(r.maxDamage.Charizard,90);assert.equal(r.directKOs['Charizard residual'],1);assert.deepEqual(r.maxTurns,[1]);
});
test('telemetry detects duplicate hazards and does not count weather upkeep as a new activation',()=>{
 const r=galarTuningTelemetry(log(['|-weather|Sandstorm|[from] ability: Sand Stream|[of] p2a: Gigalith','|-weather|Sandstorm|[upkeep]','|-sidestart|p1: Player|move: Stealth Rock','|move|p2a: Gigalith|Stealth Rock|p1a: Lapras']), 'Duraludon');assert.equal(r.weather.Sandstorm,1);assert.equal(r.issues.length,1);
});
