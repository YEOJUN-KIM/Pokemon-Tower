import { createHash } from 'node:crypto';
import {RaidEvents} from './raid-events';
import { resolve } from 'node:path';
import { BattleSession } from './battle-session';
import { BattleRequestError } from './request-error';
import { AI_VERSION, TowerStore, type BattleRow } from './tower-store';
import {supportedFormats} from '../data/battle-rules';
import { engineVersion, type Seed } from '../battle/run';
import type { BattleResponse, BattleView } from '../shared/contracts';

export class TowerService {
  private sessions = new Map<string, {session: BattleSession; accessed: number}>();
  constructor(readonly store: TowerStore) {}
  private session(owner: string, row: BattleRow): BattleSession {
    if (row.engine_version !== engineVersion || !supportedFormats.includes(row.format) || ![AI_VERSION,'tower-policy-v12','tower-policy-v11','tower-policy-v10','tower-policy-v9','tower-policy-v8','tower-policy-v7','tower-policy-v6','tower-policy-v5','tower-policy-v4','tower-policy-v3','tower-policy-v2','damage-policy-v1'].includes(row.ai_version)) {
      throw new BattleRequestError('이 배틀을 만든 엔진·규칙 버전과 현재 버전이 다릅니다. 기존 버전에서 복구하거나 도전을 종료해 주세요.', 409);
    }
    const cached = this.sessions.get(row.id);
    if (cached && !cached.session.isFinished()) { cached.accessed = Date.now(); return cached.session; }
    for (const [id, entry] of this.sessions) {
      if (entry.session.isFinished() || Date.now() - entry.accessed > 30 * 60 * 1000) {
        this.sessions.delete(id);
        void entry.session.dispose();
      }
    }
    if (this.sessions.size >= 128) throw new BattleRequestError('동시 배틀 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.', 503);
    const savedNpc=JSON.parse(row.boss ?? row.trainer ?? 'null') as import('../shared/contracts').BossView|null;
    const session = new BattleSession(async (log, id, view) => {
      this.store.complete(id, log, view);
    }, JSON.parse(row.seed) as Seed, {
      id: row.id, format:row.format,aiVersion:row.ai_version,npcAi:savedNpc?.npcAi,teams: {p1: row.player_team, p2: row.opponent_team},
      raid:(()=>{const events=new RaidEvents(this.store.db),raid=events.forBattle(row.id);return raid?events.snapshot(raid):undefined;})(),
      trainerEquipment:row.trainer_equipment==null?undefined:JSON.parse(row.trainer_equipment),rule:row.rule,battleItems:JSON.parse(row.battle_items),upgrades:JSON.parse(row.upgrades),teraTickets:JSON.parse(row.tera_tickets),
      opponentRule:savedNpc?.mirror?savedNpc.mirrorRule:undefined,
      opponentTeraSpecies:['tower-policy-v10','tower-policy-v11','tower-policy-v12',AI_VERSION].includes(row.ai_version) && savedNpc?.gimmick?.rule==='tera' ? savedNpc.gimmick.species : undefined,
      history: this.store.history(row.id),
      saveInput: (requestId, command) => this.store.input(owner, row.id, requestId, command),
    });
    this.sessions.set(row.id, {session, accessed: Date.now()});
    return session;
  }
  async state(owner: string): Promise<BattleResponse> {
    this.store.prepareHiddenBossEvent(owner);
    const row = this.store.currentBattle(owner);
    let battle: BattleView | null = null;
    if (row?.status === 'complete') battle = JSON.parse(row.view!) as BattleView;
    else if (row) battle = await this.session(owner, row).ready();
    const tower=this.store.view(owner),equipment=tower.run?.trainerEquipment??[];
    if(battle)battle={...battle,trainerEquipment:equipment,actions:battle.actions.filter(action=>
      (!action.command.endsWith(' dynamax')||equipment.includes('Dynamax Band'))&&
      (!action.command.endsWith(' terastallize')||equipment.includes('Tera Orb')))};
    return {battle,tower};
  }
  async action(owner: string, id: string, requestId: number, action: string) {
    const current = this.store.currentBattle(owner);
    if (!current) throw new BattleRequestError('진행 중인 배틀이 없습니다.', 404);
    if (current.id !== id || current.status !== 'active') throw new BattleRequestError('이미 처리되었거나 다른 배틀의 행동입니다.', 409);
    const session = this.session(owner, current);
    await session.ready();
    await session.submit(id, requestId, action);
    const response=await this.state(owner);
    // Special wins return the run to selection immediately. The action still
    // needs its completed turn so the client can play the final hit and faint.
    if(!response.battle){
      const finished=this.store.battle(id);
      if(finished.status==='complete'&&finished.view)response.battle=JSON.parse(finished.view) as BattleView;
    }
    return response;
  }
  async abandon(owner: string, id: string) {
    const current = this.store.currentBattle(owner);
    // Wait for a currently resolving turn before changing the run state.
    if (current?.status === 'active') await this.session(owner, current).ready();
    this.store.abandon(owner, id);
    if (current) {
      const entry = this.sessions.get(current.id);
      this.sessions.delete(current.id);
      if (entry) await entry.session.dispose();
    }
    return this.state(owner);
  }
  async dispose() {
    await Promise.all([...this.sessions.values()].map(entry => entry.session.dispose()));
    this.sessions.clear();
  }
}

export const playerKey = (token: string) => createHash('sha256').update(token).digest('hex');
const globalStore = globalThis as typeof globalThis & {towerPersistentService?: TowerService;towerPersistentServiceVersion?:number};
export function getTowerService() {
  // Refresh the development singleton once when this schema/behavior version changes.
  // Its recorded inputs recover the battle in the new service without spending tickets twice.
  if(globalStore.towerPersistentServiceVersion!==79){
    const previous=globalStore.towerPersistentService;
    globalStore.towerPersistentService=undefined;globalStore.towerPersistentServiceVersion=79;
    if(previous)void previous.dispose().then(()=>previous.store.close()).catch(error=>console.error('Previous tower service shutdown failed',error));
  }
  // Runtime save data must not be traced into the deployment bundle.
  return globalStore.towerPersistentService ??= new TowerService(new TowerStore(resolve(/* turbopackIgnore: true */ process.env.TOWER_DB_PATH ?? '.data/tower.sqlite')));
}
