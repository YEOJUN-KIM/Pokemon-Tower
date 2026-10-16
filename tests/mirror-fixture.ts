import {challengerFixture} from './challenger-fixture';
import {addMirrorCandidate,snapshotMirrorReward} from '../src/server/mirror-challenger';
import {drawChallengers,type ChallengerDefinition} from '../src/data/challengers';
import type {BattleRule} from '../src/data/run-rules';
export function mirrorFixture(path=':memory:',owner='owner',floor=20,rule:BattleRule='basic'){
 const f=challengerFixture(path,owner,floor,'random');
 f.store.db.prepare('UPDATE run_rules SET rule=? WHERE run_id=?').run(rule,f.run);
 f.store.db.prepare('UPDATE battles SET rule=? WHERE run_id=?').run(rule,f.run);
 const normal=drawChallengers(floor,()=>0),candidates=addMirrorCandidate(f.store.db,f.event.id,f.run,floor,rule,normal,()=>0);
 const mirror=candidates.find(c=>c.mirror);if(!mirror)throw Error('Mirror fixture failed');
 const save=(rewardRoll?:number)=>{
  if(rewardRoll!==undefined){const reward=snapshotMirrorReward(f.store.db,f.run,()=>rewardRoll);Object.assign(mirror,reward);mirror.mirror!.rewardKind=reward.rewardKind;}
  f.store.db.prepare('UPDATE challenger_encounters SET candidates_json=? WHERE event_id=?').run(JSON.stringify(candidates),f.event.id);
 };
 save();return {...f,normal,candidates,mirror:mirror as ChallengerDefinition&{mirror:NonNullable<ChallengerDefinition['mirror']>},save};
}
