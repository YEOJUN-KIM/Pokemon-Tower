import type {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {towerThemes,type TowerTheme} from '../data/tower-themes';
import {namedTrainerSamples} from '../data/trainer-catalog';
import type {BattleRule} from '../data/run-rules';
import type {TowerProgression} from '../data/tower-progression';
import {floors} from '../data/floors';
import {snapshotTrainerEventBattle,type TrainerEventBattleSnapshot} from './trainer-event-battle';
import {applyRewardOption} from './rewards';

type Snapshot=TrainerEventBattleSnapshot&{floor:number;theme:TowerTheme;reward:import('../data/rewards').RewardOption};
type Row={event_id:string;snapshot_json:string;battle_id:string|null;claimed:number};
export function hasHiddenBoss(theme:TowerTheme|null|undefined){return !!theme&&'hiddenBoss' in towerThemes[theme];}
export function hiddenBossEligible(theme:TowerTheme|null,floor:number,bossId?:string){return hasHiddenBoss(theme)&&floor%50===0&&!!theme&&towerThemes[theme].champion===bossId;}
// A guaranteed chapter-completion event; never a second random encounter roll.
export class HiddenBossEvents{
 constructor(private readonly db:DatabaseSync){}
 row(eventId:string){return this.db.prepare('SELECT * FROM hidden_boss_events WHERE event_id=?').get(eventId) as Row|undefined;}
 forBattle(id:string){return this.db.prepare('SELECT * FROM hidden_boss_events WHERE battle_id=?').get(id) as Row|undefined;}
 snapshot(row:Row){return JSON.parse(row.snapshot_json) as Snapshot;}
 create(runId:string,floor:number,theme:TowerTheme,rule:BattleRule,progression:TowerProgression){
  const eventId=randomUUID(),source=namedTrainerSamples.find(sample=>sample.id===towerThemes[theme].final)!;
  const sample={...source,title:'히든 보스'};
  const snapshot:Snapshot={...snapshotTrainerEventBattle(eventId,sample,floor,rule,progression),floor,theme,reward:{id:'hidden-boss',title:'히든보스를 격파했다.',tone:'great',entries:[{kind:'coins',amount:floors[floor-1].reward}]}};
  const order=(this.db.prepare('SELECT cleared_count FROM run_encounter_progress WHERE run_id=?').get(runId) as {cleared_count:number}|undefined)?.cleared_count??0;
  this.db.prepare("INSERT INTO run_events(id,run_id,after_floor,kind,status,encounter_order) VALUES (?,?,?,'hidden-boss','choice',?)").run(eventId,runId,floor,order);
  this.db.prepare('INSERT INTO hidden_boss_events(event_id,snapshot_json) VALUES (?,?)').run(eventId,JSON.stringify(snapshot));
 }
 view(id:string){const row=this.row(id);if(!row)return {};const snapshot=this.snapshot(row);return {hiddenBoss:{name:snapshot.sample.name,portrait:snapshot.sample.portrait},...(row.battle_id&&!row.claimed?{phase:'battle' as const}:{})};}
 start(eventId:string,battleId:string){this.db.prepare('UPDATE hidden_boss_events SET battle_id=? WHERE event_id=?').run(battleId,eventId);this.db.prepare("UPDATE run_events SET choice_id='challenge' WHERE id=?").run(eventId);}
 retry(previous:string,next:string){this.db.prepare('UPDATE hidden_boss_events SET battle_id=? WHERE battle_id=?').run(next,previous);}
 win(row:Row,owner:string,runId:string){
  if(row.claimed)return;
  const result=applyRewardOption(this.db,owner,this.snapshot(row).reward,runId);
  this.db.prepare("UPDATE run_events SET status='reward',result_json=? WHERE id=?").run(JSON.stringify(result),row.event_id);
  this.db.prepare('UPDATE hidden_boss_events SET claimed=1 WHERE event_id=?').run(row.event_id);
 }
}
