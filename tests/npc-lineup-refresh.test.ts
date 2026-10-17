import {test} from 'node:test';
import assert from 'node:assert/strict';
import {npcReviewPresets,npcEarlyReplacements,canonicalNpcId} from '../src/data/npc-review-presets';
import {normalNpcTemplate} from '../src/server/npc-templates';
import {equipNpcGimmick} from '../src/data/npc-gimmicks';
import {primalOrbs} from '../src/data/primal-forms';
import {megaStones,DYNAMAX_ITEM} from '../src/data/gimmicks';
import {zCrystals} from '../src/data/z-crystals';
import templates from '../src/data/normal-npc-templates.json' with {type:'json'};
import {BattleSession} from '../src/server/battle-session';
import {packTeam} from '../src/data/teams';
import {defaultProfile} from '../src/server/training';
import {battleEvents} from '../src/battle/run';

test('every themed legendary boss and organization alias switches at 75 with one gimmick',()=>{
 for(const [id,early] of Object.entries(npcEarlyReplacements)){
  if(normalNpcTemplate(id,75,'villain')?.allFloors){assert.deepEqual(normalNpcTemplate(id,74,'villain'),normalNpcTemplate(id,75,'villain'));continue;}
  const aliases=[...new Set(templates.filter(t=>canonicalNpcId(t.id)===id).map(t=>t.id))];
  assert.equal(aliases.length,2,id);
  for(const alias of aliases){
   const before=normalNpcTemplate(alias,74,'villain')!,after=normalNpcTemplate(alias,75,'villain')!;
   assert.ok(before.team.some(p=>p.species===early.replacement),alias);
   assert.ok(before.team.every(p=>p.species!==early.species),alias);
   assert.deepEqual(after.team.map(p=>p.species).sort(),[...npcReviewPresets[id].entries].sort(),alias);
   assert.equal(after.legendaryMinFloor,75);
   assert.equal(after.ace,npcReviewPresets[id].ace);
   assert.equal(after.team.filter(p=>megaStones[p.item]||primalOrbs[p.item]||zCrystals[p.item]||p.item===DYNAMAX_ITEM).length,1,alias);
  }
 }
});

test('regional NPC partners and Iris retain their intended species in both stages',()=>{
 for(const [id,partner] of [['kiawe','Marowak-Alola'],['kukui','Ninetales-Alola'],['hau','Raichu-Alola'],['opal','Weezing-Galar'],['melony','Darmanitan-Galar'],['bede','Rapidash-Galar']]){
  const rows=templates.filter(t=>t.id==='named-'+id);assert.equal(rows.length,2);
  assert.ok(rows.every(t=>t.team.some(p=>p.species===partner)),id);
 }
 for(const row of templates.filter(t=>t.id==='named-iris')){
  assert.equal(row.ace,'Haxorus');assert.equal(row.signature?.species,'Haxorus');
  assert.ok(row.team.every(p=>p.species!=='Kommo-o'));
 }
});

test('Kyogre uses its matching orb, transforms in basic mode and restores the same battle history',async()=>{
 const equipped=equipNpcGimmick([{name:'Kyogre',moves:['Origin Pulse']},{name:'Sharpedo',moves:['Crunch'],item:'Sharpedonite'}],{rule:'primal',species:'Kyogre',item:'Blue Orb'});
 assert.equal(equipped[0].item,'Blue Orb');assert.equal(equipped[1].item,undefined);
 assert.throws(()=>equipNpcGimmick([{name:'Kyogre',moves:['Origin Pulse']}],{rule:'primal',species:'Kyogre',item:'Red Orb'}));
 const options={rule:'basic' as const,aiVersion:'tower-policy-v10',teams:{p1:packTeam(['Snorlax','Blastoise','Venusaur'],{Snorlax:{...defaultProfile('Snorlax'),moves:['Protect']}}),p2:packTeam(['Kyogre','Sharpedo','Crobat'],{Kyogre:{...defaultProfile('Kyogre'),moves:['Origin Pulse']}},{Kyogre:'Blue Orb'})}};
 const session=new BattleSession(async()=>{},[1,2,3,4],options);
 try{
  const before=await session.ready();assert.equal(before.opponentPrimal,true);assert.equal(before.opponent!.displaySpecies,'Kyogre-Primal');
  assert.ok(before.messages.some(l=>l.startsWith('|-weather|PrimordialSea')));
  const after=await session.submit(before.id,before.requestId,'move 1');
  const restored=new BattleSession(async()=>{},[1,2,3,4],{...options,history:['move 1']});
  try{assert.deepEqual(battleEvents((await restored.ready()).messages),battleEvents(after.messages));}finally{await restored.dispose();}
 }finally{await session.dispose();}
});
