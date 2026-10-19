import type {DatabaseSync} from 'node:sqlite';
import {randomInt} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {raidBossDefinitions,type RaidSnapshot} from '../data/raids';
import {statKeys,type StatBlock} from '../data/training';
import {npcRankTraining} from '../data/npc-ranks';
import {npcTrainingProfile} from './npc-training';
import {snapshotRankReward} from './challenger-rewards';
import {rollEncounterShiny} from './shiny';
import {speciesGender} from './pokemon-gender';
import {POINT_TEAM_MARKER} from '../data/teams';
import {applyRewardOption} from './rewards';

function weighted<T extends {weight:number}>(pool:readonly T[],random:()=>number):T{
 let draw=random()*pool.reduce((sum,p)=>sum+p.weight,0);
 const result=pool.find(p=>(draw-=p.weight)<0)??pool.at(-1);
 if(!result)throw Error('No eligible raid boss');return result;
}
export function createRaidSnapshot(db:DatabaseSync,runId:string,floor:number,random=()=>randomInt(0x1000000)/0x1000000,fixture?:{bossId:string;routeId?:string}):RaidSnapshot{
 const boss=fixture?raidBossDefinitions.find(b=>b.id===fixture.bossId)!:weighted(raidBossDefinitions.filter(b=>floor>=b.minFloor),random);
 if(!boss)throw Error('Unknown raid fixture');
 const route=fixture?.routeId?boss.routes.find(r=>r.id===fixture.routeId)!:weighted(boss.routes,random);
 if(!route)throw Error('Unknown raid route');
 const individual=npcTrainingProfile(boss.species,[...route.recruit.moves],floor,boss.battleTraining,route.attack==='spa'?'special':'physical',random,npcRankTraining(floor,'elite'));
 const perfect=new Set(boss.ivRule.protected),remaining=statKeys.filter(k=>!perfect.has(k));
 while(perfect.size<boss.ivRule.perfect)perfect.add(remaining.splice(Math.floor(random()*remaining.length),1)[0]);
 individual.ivs=Object.fromEntries(statKeys.map(k=>[k,perfect.has(k)?31:Math.floor(random()*31)])) as StatBlock;
 individual.nature=route.recruit.nature;individual.ability=route.recruit.ability;
 individual.shiny=rollEncounterShiny(max=>Math.floor(random()*max));
 individual.gender=speciesGender(boss.species,random());
 const set=(profile:typeof individual)=>({name:boss.species,species:boss.species,level:50,item:'',pokeball:POINT_TEAM_MARKER,...structuredClone(profile),gender:profile.gender??'N'});
 // The saved starting slots are separate from the current-form validation view.
 const opponentTeam=Showdown.Teams.pack(route.phases.map(phase=>set({...individual,moves:[...phase.moves]})));
 const recruitProfile={...individual,evs:Object.fromEntries(statKeys.map(k=>[k,0])) as StatBlock};
 const reward=snapshotRankReward(db,runId,boss.rewardProfile,random).rewardDefinition;
 return {version:1,transformationAdapter:1,bossId:boss.id,species:boss.species,category:boss.category,routeId:route.id,individual,phases:structuredClone(route.phases) as RaidSnapshot['phases'],opponentTeam,recruitTeam:Showdown.Teams.pack([set(recruitProfile)]),reward:{...reward,title:'특별한 보상'}};
}
type RaidRow={event_id:string;snapshot_json:string;battle_id:string|null};
export class RaidEvents{
 constructor(private readonly db:DatabaseSync){}
 create(eventId:string,runId:string,floor:number){const snapshot=createRaidSnapshot(this.db,runId,floor);this.db.prepare('INSERT INTO raid_encounters(event_id,snapshot_json) VALUES (?,?)').run(eventId,JSON.stringify(snapshot));}
 row(eventId:string){return this.db.prepare('SELECT * FROM raid_encounters WHERE event_id=?').get(eventId) as RaidRow|undefined;}
 forBattle(battleId:string){return this.db.prepare('SELECT * FROM raid_encounters WHERE battle_id=?').get(battleId) as RaidRow|undefined;}
 snapshot(row:RaidRow){return JSON.parse(row.snapshot_json) as RaidSnapshot;}
 view(eventId:string){const row=this.row(eventId);if(!row)return {};const saved=this.snapshot(row),status=(this.db.prepare('SELECT status FROM run_events WHERE id=?').get(eventId) as {status:string}).status;return {raid:{spriteId:Showdown.Dex.species.get(saved.species).num,category:saved.category},phase:status==='reward'?'reward' as const:row.battle_id?'battle' as const:'choice' as const};}
 start(eventId:string,battleId:string){this.db.prepare('UPDATE raid_encounters SET battle_id=? WHERE event_id=?').run(battleId,eventId);this.db.prepare("UPDATE run_events SET choice_id='challenge' WHERE id=?").run(eventId);}
 retry(previous:string,next:string){this.db.prepare('UPDATE raid_encounters SET battle_id=? WHERE battle_id=?').run(next,previous);}
 win(row:RaidRow,owner:string,runId:string){const result=applyRewardOption(this.db,owner,this.snapshot(row).reward,runId);this.db.prepare("UPDATE run_events SET status='reward',result_json=? WHERE id=?").run(JSON.stringify(result),row.event_id);}
}
