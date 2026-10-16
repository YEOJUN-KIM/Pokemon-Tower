import {challengerFixture} from './challenger-fixture';
import {snapshotRankReward} from '../src/server/challenger-rewards';
import {challengerDefinition} from '../src/data/challengers';
import {npcSamples} from '../src/data/npc-samples';
import {generateNpcEncounter} from '../src/server/npc-encounters';
import type {NpcRank} from '../src/data/npc-ranks';
export function rankRewardFixture(rank:NpcRank,draws:number[],path=':memory:',owner='owner'){
 const f=challengerFixture(path,owner,20);
 f.store.db.prepare("UPDATE run_rules SET rule='chaos' WHERE run_id=?").run(f.run);
 const candidate={...challengerDefinition(npcSamples.find(s=>s.id==='ace-setup')!,rank,20),...snapshotRankReward(f.store.db,f.run,rank,()=>draws.shift()??0)};
 candidate.encounter=generateNpcEncounter(20,[1,2,3,4],candidate.sample,rank,'chaos');
 f.store.db.prepare('UPDATE challenger_encounters SET candidates_json=? WHERE event_id=?').run(JSON.stringify([candidate]),f.event.id);
 return {...f,candidate};
}
