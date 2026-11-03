import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {starters} from '../src/data/teams';
import {selectTrainerSample,generateOpponentTeam} from '../src/server/opponent-team';
import {generateNpcEncounter} from '../src/server/npc-encounters';
import {npcSamples} from '../src/data/npc-samples';
import {towerTrainerEncounter} from '../src/data/tower-trainers';
import {CURRENT_PROGRESSION} from '../src/data/tower-progression';
import {recentEncounters} from '../src/server/encounter-history';
const store=new TowerStore(':memory:');let checked=0;
try{
 for(const rule of ['basic','chaos'] as const){
  store.ensurePlayer(rule);const first=store.battle(store.start(rule,starters,rule)),id=first.run_id;
  for(let floor=1;floor<=100;floor++){
   const history=floor===1?[]:recentEncounters(store.db,id);
   let row=first;if(floor>1){store.db.prepare("UPDATE runs SET floor=?,state='select' WHERE id=?").run(floor,id);row=store.battle(store.enter(rule,id,floor,starters));}
   const seed=JSON.parse(row.seed),theme=(store.view(rule).run!).theme;
   const trainer=towerTrainerEncounter(floor,id,theme,true);
   const sample=trainer?undefined:selectTrainerSample(floor,seed,history.flatMap(h=>{const t=JSON.parse(h.trainer??'null'),s=npcSamples.find(s=>s.id===t?.id);return s?[{id:s.id,specialty:s.specialty}]:[];}),CURRENT_PROGRESSION,{common:true});
   const concept=sample?.npcRank?npcSamples.find(s=>s.id===sample.id):undefined;
   const team=concept?generateNpcEncounter(floor,seed,concept,sample!.npcRank,rule,CURRENT_PROGRESSION).team:generateOpponentTeam(floor,seed,history.flatMap(h=>(Showdown.Teams.unpack(h.opponent_team)??[]).map(p=>p.species)),trainer,sample,CURRENT_PROGRESSION);
   const actual=Showdown.Teams.unpack(row.opponent_team)!;
   assert.deepEqual(actual.map(p=>p.species),team.map(p=>p.profile?.forme??p.name));
   for(let i=0;i<team.length;i++){
    assert.deepEqual(actual[i].moves.map(m=>Showdown.Dex.moves.get(m).id),team[i].moves.map(m=>Showdown.Dex.moves.get(m).id));
    assert.equal(Showdown.toID(actual[i].item),Showdown.toID(team[i].item??''));
    if(team[i].profile){assert.deepEqual(actual[i].ivs,team[i].profile!.ivs);assert.deepEqual(actual[i].evs??{hp:0,atk:0,def:0,spa:0,spd:0,spe:0},team[i].profile!.evs);}
   }
   checked++;
  }
 }
 writeFileSync('artifacts/build-progression-audit/live-verification.json',JSON.stringify({checked,rules:['basic','chaos'],floors:'1..100',result:'exact production species/moves/items/profile IVs/EVs match; in-memory database only'},null,2));
 console.log('Verified',checked,'live TowerStore encounters');
}finally{store.close();}
