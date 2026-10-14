import {test} from 'node:test';
import assert from 'node:assert/strict';
import drafts from '../scripts/data/npc/npc-team-samples.json' with {type:'json'};
import {BattleSession} from '../src/server/battle-session';
import {packTeam,starters} from '../src/data/teams';
import {defaultProfile} from '../src/server/training';
import {runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
import {canEquipGimmick} from '../src/data/gimmicks';
import {pokemonName,describeLine,species} from '../src/web/catalog';
import {existsSync} from 'node:fs';

test('reviewed replacements preserve the exact triples, including campaign boss aliases',()=>{
 const expected:Record<string,string[]>={
  'named-giovanni':['Mewtwo','Rhyperior','Kangaskhan'],
  'rocket-boss-giovanni':['Mewtwo','Rhyperior','Kangaskhan'],
  'named-lance':['Dragonite','Charizard','Gyarados'],
  'named-cynthia':['Garchomp','Spiritomb','Lucario'],
  'named-maxie':['Groudon','Camerupt','Crobat'],
  'magma-boss-maxie':['Groudon','Camerupt','Crobat'],
  'named-archie':['Kyogre','Sharpedo','Crobat'],
  'aqua-boss-archie':['Kyogre','Sharpedo','Crobat'],
 };
 for(const [id,names] of Object.entries(expected)){
  const s=drafts.samples.find(s=>s.id===id)!;assert.ok(s,id);
  assert.deepEqual(s.team.map(p=>p.species).sort(),[...names].sort(),id);
 }
 for(const id of ['named-maxie','magma-boss-maxie']){
  const s=drafts.samples.find(s=>s.id===id)!;assert.equal(s.ace,'Groudon');assert.equal(s.signature.rule,'primal');
  assert.equal(s.team.find(p=>p.species==='Groudon')!.item,'Red Orb');assert.equal('legendaryMinFloor' in s?s.legendaryMinFloor:null,75);
  assert.ok(s.team.every(p=>p.species==='Groudon' || !p.item.endsWith('ite')));
 }
});

test('Primal Groudon automatically reverts in basic mode, shows its form and restores; logged battles replay exactly',async()=>{
 const teams={p1:packTeam(starters,{Charizard:{...defaultProfile('Charizard'),moves:['Protect']}}),p2:packTeam(['Groudon','Camerupt','Crobat'],{Groudon:{...defaultProfile('Groudon'),moves:['Precipice Blades','Fire Punch']}},{Groudon:'Red Orb'})};
 assert.equal(canEquipGimmick('Groudon','Red Orb'),true);assert.equal(canEquipGimmick('Charizard','Red Orb'),false);
 const options={rule:'basic' as const,aiVersion:'tower-policy-v10',teams};
 const session=new BattleSession(async()=>{},[1,2,3,4],options);
 try{
  const before=await session.ready();assert.equal(before.opponentPrimal,true);assert.equal(before.opponent!.displaySpecies,'Groudon-Primal');
  assert.ok(before.messages.some(l=>l.startsWith('|-primal|p2')));assert.ok(before.messages.some(l=>l.startsWith('|-weather|DesolateLand')));
  assert.ok(before.actions.every(a=>!/(mega|dynamax|zmove|terastallize)$/.test(a.command)));
  const after=await session.submit(before.id,before.requestId,'move 1');
  const restored=new BattleSession(async()=>{},[1,2,3,4],{...options,history:['move 1']});
  try{const v=await restored.ready();assert.equal(v.opponentPrimal,true);assert.deepEqual(battleEvents(v.messages),battleEvents(after.messages));}finally{await restored.dispose();}
 }finally{await session.dispose();}
 assert.equal(pokemonName('Groudon-Primal'),'원시그란돈');assert.equal(describeLine('|-primal|p2a: Groudon'),'상대 그란돈 원시회귀!');
 assert.deepEqual(species['Groudon-Primal'].types,['땅','불꽃']);
 assert.ok(existsSync('public/vendor/pokeapi/pokemon/10078.png'));
 const log=await runBattle({rule:'basic',opponentRule:'basic',teams,seed:[1,2,3,4],player:new DamagePolicy(),opponent:new DamagePolicy()});
 assert.ok(log.publicProtocol.some(l=>l.startsWith('|-primal|p2')));
 assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
});
