import {test} from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {normalNpcStage,normalNpcGimmicksEnabled} from '../src/data/normal-mode-stages';
import {namedTrainerSamples} from '../src/data/trainer-catalog';
import {generateOpponentTeam} from '../src/server/opponent-team';
import {megaStones,DYNAMAX_ITEM} from '../src/data/gimmicks';
import {primalOrbs} from '../src/data/primal-forms';
import {zCrystals} from '../src/data/z-crystals';
import {npcGimmick,npcExtraCandidates} from '../src/data/npc-gimmicks';
import {TowerStore} from '../src/server/tower-store';
import {starters} from '../src/data/teams';
import normalSamples from '../scripts/data/npc/normal-npc-samples.json' with {type:'json'};

const special=(item:string)=>!!megaStones[item] || !!zCrystals[item] || !!primalOrbs[item] || item===DYNAMAX_ITEM;
test('normal mode has two leader and two boss samples and exact 50/55/100 boundaries',()=>{
 for(const floor of [1,10,40,45,49])assert.equal(normalNpcGimmicksEnabled(floor,'boss'),false);
 assert.equal(normalNpcGimmicksEnabled(50,'boss'),true);assert.equal(normalNpcStage(99,'boss'),'first-gate');assert.equal(normalNpcStage(100,'boss'),'final-gate');
 for(const floor of [49,50,51,54])for(const kind of ['leader','executive','elite'] as const)assert.equal(normalNpcGimmicksEnabled(floor,kind),false);
 assert.equal(normalNpcGimmicksEnabled(55,'leader'),true);assert.equal(normalNpcStage(54,'leader'),'leaders-early');assert.equal(normalNpcStage(55,'leader'),'leaders-late');
 assert.equal(normalNpcGimmicksEnabled(100,'normal'),false);assert.throws(()=>normalNpcStage(101,'boss'));
});
test('new encounters suppress every early gimmick and retain late signatures',()=>{
 for(const sample of namedTrainerSamples){
  const isBoss=sample.role==='champion'||sample.role==='villain',start=isBoss?50:55;
  for(const floor of [start-1,start]){
   const team=generateOpponentTeam(floor,[1,2,3,4],[],null,sample,'hundred-floor-v1');
   if(floor<start){assert.ok(team.every(p=>!special(p.item ?? '')),sample.id);assert.ok(team.every(p=>!p.gigantamax));}
   else {const plan=npcGimmick(sample.id,sample.generation,[...sample.entries!,...(npcExtraCandidates[sample.id] ?? [])],sample.ace);if(plan&&plan.rule!=='tera')assert.ok(team.some(p=>special(p.item ?? '')),sample.id);}
  }
 }
});
test('saved early Paldea fights have no NPC Tera ticket, while the first champion gate does',()=>{
 const store=new TowerStore(':memory:');try{
  store.ensurePlayer('stage');const first=store.battle(store.start('stage',starters,'basic'));
  store.db.prepare("UPDATE run_themes SET theme='paldea' WHERE run_id=?").run(first.run_id);
  for(const floor of [45,50]){store.db.prepare("UPDATE runs SET floor=?,state='select' WHERE id=?").run(floor,first.run_id);
   const row=store.battle(store.enter('stage',first.run_id,floor,starters));assert.equal(JSON.parse(row.tera_tickets).p2,floor===50?1:0);
   if(floor===45){assert.ok(Showdown.Teams.unpack(row.opponent_team)!.every(p=>!special(p.item)));assert.equal(JSON.parse(row.boss!).gimmick,undefined);}
  }
 }finally{store.close();}
});
test('general-mode review keeps fifty candidate pools and paired stages for other NPCs',()=>{
 const counts=new Map<string,number>();
 for(const row of normalSamples.samples){
  counts.set(row.id,(counts.get(row.id) ?? 0)+1);
  if('select' in row&&row.select){
   assert.ok(row.team.length>=3&&row.team.length<=6);for(const p of row.team){assert.equal(p.profile.moves.length,4);assert.equal(Object.values(p.profile.evs).reduce((a,b)=>a+b,0),66);assert.ok(Object.values(p.profile.ivs).every(v=>v===31));}continue;
  }
  assert.equal(row.team.length,3);
  for(const p of row.team){assert.equal(Object.values(p.profile.evs).reduce((a,b)=>a+b,0),row.statPoints);assert.ok(Object.values(p.profile.evs).every(v=>v<=32));assert.ok(Object.values(p.profile.ivs).every(v=>v===row.iv));}
  if(!row.gimmickEnabled)assert.ok(row.team.every(p=>!special(p.item)&&!p.gigantamax&&(!('battleForm' in p)||!p.battleForm)));
 }
 assert.equal(counts.size,173);assert.equal([...counts.values()].filter(n=>n===1).length,91);assert.ok([...counts.values()].every(n=>n===1||n===2));
 for(const id of ['named-maxie','magma-boss-maxie']){const rows=normalSamples.samples.filter(s=>s.id===id);assert.ok(rows.find(s=>s.stage==='first-gate')!.team.every(p=>p.species!=='Groudon'));const final=rows.find(s=>s.stage==='final-gate')!;assert.ok(final.team.some(p=>p.species==='Groudon'));assert.ok(final.team.some(p=>p.species==='Camerupt' && p.item==='Cameruptite'));}
});
