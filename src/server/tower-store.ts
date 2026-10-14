import {pokemonRarity,eggRarity} from '../data/pokemon-rarity';
import {permanentPrices,EGG_SHINY_ODDS,type PermanentView,type PermanentResult,type EggResult} from '../data/permanent-upgrades';
import {isBattleRule,allowsGimmick,allowsRuleItem,type BattleRule} from '../data/run-rules';
import {TERA_TICKET_PRICE} from '../data/tera';
import {canEquipGimmick} from '../data/gimmicks';
import {retainsHeldItemAfterActivation} from '../data/additional-held-items';
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, randomUUID, randomInt } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { floors } from '../data/floors';
import {towerTrainerEncounter,type TowerTheme} from '../data/tower-trainers';
import {isTowerTheme,randomTowerTheme,secondTowerTheme,towerThemes} from '../data/tower-themes';
import {CURRENT_PROGRESSION,opponentTeraTickets,type TowerProgression} from '../data/tower-progression';
import { packTeam, packPlayerTeam, pokemonSets, initialPartners } from '../data/teams';
import {isCollectibleSpecies} from '../data/pokedex-roster';
import { engineVersion, FORMAT, type BattleLog, type Seed } from '../battle/run';
import type { BattleView, MachineOffer, RunView, TowerView } from '../web/contracts';
import { BattleRequestError } from './battle-session';
import { schema } from './schema';
import {moveLearnsets} from './move-learnsets';
import {profileLearnset} from './move-learnsets';
import {familyForms,selectedForm,collectionSpecies,separateForms,baseFormName} from '../data/selectable-forms';
import {pokemonName as importedPokemonName} from '../web/catalog';
import {generateOpponentTeam,selectTrainerSample,encounterPool} from './opponent-team';
import {runOrganization,villainGrunt,villainEncounter,villainLeaders,type VillainEvent} from '../data/villain-organizations';
import {opponentProfile} from './opponent-training';
import {normalNpcTemplate} from './npc-templates';
import {primalOrbs} from '../data/primal-forms';
import {heldItems,isHeldItem,normalizeHeldItem} from '../data/held-items';
import {itemShopRule,rollItemOffers} from '../data/held-item-shop';
import {machinePrice,machineRarity,rollMachineOffers} from '../data/machine-rarities';
import {trainerCatalog,trainerView,type TrainerSample} from '../data/trainer-catalog';
import {pokedexEntries} from './pokedex-entries';
import Showdown from 'pokemon-showdown';
import {upgrades,UPGRADE_FLOORS,SHOP_REROLL_LIMIT,machineMoves,isShopFloor,rerollPrice,vitamins,vitaminPrice,VITAMIN_BOOST,VITAMIN_LIMIT,type UpgradeKind} from '../data/shop';
import {collectionGender,speciesGender,genderOptions} from './pokemon-gender';
import {npcGimmick,npcSpecies,type NpcGimmick} from '../data/npc-gimmicks';
import {normalNpcCategory,normalNpcGimmicksEnabled} from '../data/normal-mode-stages';
import {megaStones,DYNAMAX_ITEM} from '../data/gimmicks';
import {zCrystals} from '../data/z-crystals';
import {defaultProfile,trainingOptions,validateProfile} from './training';
import {trainingCost,statKeys,trainedStat,natures,type StatBlock,type IVGain,type MoveGain,type MoveSwap,type TrainingProfile,type TrainingView} from '../data/training';

export const AI_VERSION = 'tower-policy-v10';
const favoriteSpecies=new Set(pokedexEntries().map(entry=>entry.species));
type RunRow = {id: string; player_id: string; floor: number; state: RunView['state']; total_floors: number};
export type BattleRow = {
  rule:BattleRule;id: string; run_id: string; floor: number; player_team: string; opponent_team: string; seed: string;
  engine_version: string; format: string; ai_version: string; status: 'active' | 'complete';
  reward: number; candidates: string; log: string | null; view: string | null; boss: string | null; trainer:string|null;upgrades:string;battle_items:string;tera_tickets:string;villain_event:string|null;
};
export class TowerStore {
  readonly db: DatabaseSync;
  constructor(path: string,private readonly roll=(max:number)=>randomInt(max)) {
    if (path !== ':memory:') mkdirSync(dirname(path), {recursive: true});
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
    const version = this.db.prepare('PRAGMA user_version').get() as {user_version: number};
    if (version.user_version > 28) throw new Error('Unsupported database schema');
    // SQLite requires foreign keys disabled outside the transaction while rebuilding a parent table.
    if(version.user_version<28)this.db.exec('PRAGMA foreign_keys=OFF');
    try {this.tx(() => {
      this.db.exec(schema);
      const playerColumns=this.db.prepare('PRAGMA table_info(players)').all() as {name:string}[];
      if(!playerColumns.some(column=>column.name==='growth_points')) {
        this.db.exec('ALTER TABLE players ADD COLUMN growth_points INTEGER NOT NULL DEFAULT 0 CHECK(growth_points>=0)');
        // Preserve the previous permanent wallet once. Existing climbs retain only their own earnings.
        this.db.exec('UPDATE players SET growth_points=coins, coins=0');
        this.db.exec(`UPDATE players SET coins=MAX(0,
          COALESCE((SELECT SUM(rewards.amount) FROM rewards JOIN battles ON battles.id=rewards.battle_id JOIN runs ON runs.id=battles.run_id WHERE runs.player_id=players.id AND runs.state IN ('select','battle','recruit')),0)
          -COALESCE((SELECT COUNT(*)*200 FROM run_upgrades JOIN runs ON runs.id=run_upgrades.run_id WHERE runs.player_id=players.id AND runs.state IN ('select','battle','recruit')),0))`);
        this.db.exec("INSERT OR IGNORE INTO growth_rewards SELECT id,0 FROM runs WHERE state IN ('lost','cleared','abandoned')");
      }
      const battleColumns = this.db.prepare('PRAGMA table_info(battles)').all() as {name: string}[];
      if (!battleColumns.some(column => column.name === 'boss')) this.db.exec('ALTER TABLE battles ADD COLUMN boss TEXT');
      if (!battleColumns.some(column => column.name === 'trainer')) this.db.exec('ALTER TABLE battles ADD COLUMN trainer TEXT');
      if (!battleColumns.some(column => column.name === 'upgrades')) this.db.exec("ALTER TABLE battles ADD COLUMN upgrades TEXT NOT NULL DEFAULT '[]'");
      if(!battleColumns.some(column=>column.name==='battle_items'))this.db.exec("ALTER TABLE battles ADD COLUMN battle_items TEXT NOT NULL DEFAULT '{}'");
      if(!battleColumns.some(column=>column.name==='tera_tickets'))this.db.exec(`ALTER TABLE battles ADD COLUMN tera_tickets TEXT NOT NULL DEFAULT '{"p1":0,"p2":0}'`);
      if(!battleColumns.some(column=>column.name==='villain_event'))this.db.exec('ALTER TABLE battles ADD COLUMN villain_event TEXT');
      if(!battleColumns.some(column=>column.name==='rule'))this.db.exec("ALTER TABLE battles ADD COLUMN rule TEXT NOT NULL DEFAULT 'chaos'");
      if(!battleColumns.some(column=>column.name==='stage')){
        const sql=(this.db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='battles'").get() as {sql:string}).sql;
        const definition=sql.replace(/^CREATE TABLE(?: IF NOT EXISTS)?\s+["`]?battles["`]?/i,'CREATE TABLE battles_route_migration').replace(/UNIQUE\s*\(\s*run_id\s*,\s*floor\s*\)/i,'stage INTEGER NOT NULL DEFAULT 0 CHECK(stage IN (0,1)), UNIQUE(run_id, floor, stage)');
        if(!definition.includes('stage INTEGER'))throw Error('Unsupported battle table migration');
        this.db.exec(definition);
        const names=(this.db.prepare('PRAGMA table_info(battles)').all() as {name:string}[]).map(column=>'"'+column.name.replaceAll('"','""')+'"').join(',');
        this.db.exec(`INSERT INTO battles_route_migration(${names}) SELECT ${names} FROM battles; DROP TABLE battles; ALTER TABLE battles_route_migration RENAME TO battles;`);
      }
      const columns = this.db.prepare('PRAGMA table_info(runs)').all() as {name: string}[];
      if(!columns.some(column=>column.name==='profiles'))this.db.exec("ALTER TABLE runs ADD COLUMN profiles TEXT NOT NULL DEFAULT '{}'");
      const recruitmentColumns=this.db.prepare('PRAGMA table_info(recruitments)').all() as {name:string}[];
      if(!recruitmentColumns.some(column=>column.name==='move_gain'))this.db.exec('ALTER TABLE recruitments ADD COLUMN move_gain TEXT');
      if(!recruitmentColumns.some(column=>column.name==='iv_gain'))this.db.exec('ALTER TABLE recruitments ADD COLUMN iv_gain TEXT');
      if (!columns.some(column => column.name === 'total_floors')) {
        // Old runs keep their three-floor finish, even when resumed after this update.
        this.db.exec('ALTER TABLE runs ADD COLUMN total_floors INTEGER NOT NULL DEFAULT 3 CHECK(total_floors BETWEEN 1 AND 30)');
      }
      if(version.user_version<7) {
        // Convert the collection once; existing run snapshots and packed battles keep their original rules.
        const saved=this.db.prepare('SELECT player_id,species,profile FROM pokemon_training').all() as {player_id:string;species:string;profile:string}[];
        for(const row of saved) {
          const profile=JSON.parse(row.profile) as TrainingProfile;
          if(profile.statSystem==='points')continue;
          profile.evs=Object.fromEntries(statKeys.map(key=>[key,Math.floor((profile.evs[key]+4)/8)])) as StatBlock;
          profile.nature=profile.nature ?? 'Serious';profile.statSystem='points';
          this.db.prepare('UPDATE pokemon_training SET profile=?,revision=revision+1 WHERE player_id=? AND species=?').run(JSON.stringify(profile),row.player_id,row.species);
        }
      }
      if(version.user_version<8) {
        // Preserve old players' configured moves, including unsaved defaults.
        const owned=this.db.prepare('SELECT player_id,species FROM unlocks').all() as {player_id:string;species:string}[];
        for(const row of owned) {
          const saved=this.db.prepare('SELECT profile FROM pokemon_training WHERE player_id=? AND species=?').get(row.player_id,row.species) as {profile:string}|undefined;
          const profile=saved ? JSON.parse(saved.profile) as TrainingProfile : {...defaultProfile(row.species),moves:[...pokemonSets[row.species as keyof typeof pokemonSets].moves]};
          if(!saved)this.db.prepare('INSERT INTO pokemon_training VALUES (?,?,?,1)').run(row.player_id,row.species,JSON.stringify(profile));
          for(const move of profile.moves)this.db.prepare('INSERT OR IGNORE INTO move_unlocks VALUES (?,?,?)').run(row.player_id,row.species,move);
        }
      }
      const runSQL=(this.db.prepare("SELECT sql FROM sqlite_master WHERE name='runs'").get() as {sql:string}).sql;
      if(version.user_version<15 || !runSQL.includes('BETWEEN 1 AND 100')){
        const definition=schema.match(/CREATE TABLE IF NOT EXISTS runs \([\s\S]*?\) STRICT;/)![0];
        this.db.exec(definition.replace('IF NOT EXISTS runs','runs_v12'));
        this.db.exec('INSERT INTO runs_v12(id,player_id,floor,state,created_at,total_floors,profiles) SELECT id,player_id,floor,state,created_at,total_floors,profiles FROM runs');
        this.db.exec('DROP TABLE runs; ALTER TABLE runs_v12 RENAME TO runs;');
        this.db.exec("CREATE UNIQUE INDEX one_active_run ON runs(player_id) WHERE state IN ('select','battle','recruit')");
        if(this.db.prepare('PRAGMA foreign_key_check').all().length)throw Error('Tower migration failed foreign key validation');
      }
      const upgradeSQL=(this.db.prepare("SELECT sql FROM sqlite_master WHERE name='run_upgrades'").get() as {sql:string}).sql;
      if(!upgradeSQL.includes("'critical'")){this.db.exec("ALTER TABLE run_upgrades RENAME TO run_upgrades_old; CREATE TABLE run_upgrades(run_id TEXT NOT NULL REFERENCES runs(id),kind TEXT NOT NULL CHECK(kind IN ('attack','speed','guard','defense','specialAttack','specialDefense','accuracy','critical')),start_floor INTEGER NOT NULL,end_floor INTEGER NOT NULL,PRIMARY KEY(run_id,kind)) STRICT; INSERT INTO run_upgrades SELECT * FROM run_upgrades_old; DROP TABLE run_upgrades_old;");}
      const ruleSQL=(this.db.prepare("SELECT sql FROM sqlite_master WHERE name='run_rules'").get() as {sql:string}).sql;
      if(!ruleSQL.includes("'z'")){
        this.db.exec("CREATE TABLE run_rules_z(run_id TEXT PRIMARY KEY REFERENCES runs(id),rule TEXT NOT NULL CHECK(rule IN ('basic','mega','dynamax','tera','z','chaos'))) STRICT; INSERT INTO run_rules_z SELECT * FROM run_rules; DROP TABLE run_rules; ALTER TABLE run_rules_z RENAME TO run_rules;");
      }
      if(!(this.db.prepare('PRAGMA table_info(battles)').all() as {name:string}[]).some(c=>c.name==='attempt')){
        const sql=(this.db.prepare("SELECT sql FROM sqlite_master WHERE name='battles'").get() as {sql:string}).sql;
        const definition=sql.replace(/^CREATE TABLE(?: IF NOT EXISTS)?\s+["`]?battles["`]?/i,'CREATE TABLE battles_retry_migration').replace(/UNIQUE\s*\(\s*run_id\s*,\s*floor\s*,\s*stage\s*\)/i,'attempt INTEGER NOT NULL DEFAULT 0 CHECK(attempt>=0), UNIQUE(run_id, floor, stage, attempt)');
        if(!definition.includes('attempt INTEGER'))throw Error('Unsupported retry migration');
        this.db.exec(definition);
        const names=(this.db.prepare('PRAGMA table_info(battles)').all() as {name:string}[]).map(c=>'"'+c.name+'"').join(',');
        this.db.exec(`INSERT INTO battles_retry_migration(${names}) SELECT ${names} FROM battles; DROP TABLE battles; ALTER TABLE battles_retry_migration RENAME TO battles;`);
        if(this.db.prepare('PRAGMA foreign_key_check').all().length)throw Error('Retry migration failed foreign key validation');
      }
      this.repairArchivedOwnership();
      this.repairFormHeldItems();
    });} finally {this.db.exec('PRAGMA foreign_keys=ON');}
  }
  private repairFormHeldItems(){
    const rows=this.db.prepare('SELECT run_id,species,item FROM run_held_items').all() as {run_id:string;species:string;item:string}[];
    for(const row of rows){
      const base=collectionSpecies(row.species);
      if(base===row.species || !this.roster(row.run_id).includes(base))continue;
      const current=this.db.prepare('SELECT item FROM run_held_items WHERE run_id=? AND species=?').get(row.run_id,base) as {item:string}|undefined;
      if(!current)this.db.prepare('INSERT INTO run_held_items VALUES (?,?,?)').run(row.run_id,base,row.item);
      else if(current.item!==row.item)this.db.prepare('INSERT INTO run_item_bag VALUES (?,?,1) ON CONFLICT(run_id,item) DO UPDATE SET quantity=quantity+1').run(row.run_id,row.item);
      this.db.prepare('DELETE FROM run_held_items WHERE run_id=? AND species=?').run(row.run_id,row.species);
    }
  }
  private repairArchivedOwnership() {
    const omitted=this.db.prepare(`SELECT runs.player_id,recruitments.species,battles.opponent_team
      FROM recruitments JOIN battles ON battles.id=recruitments.battle_id JOIN runs ON runs.id=battles.run_id
      WHERE recruitments.species IS NOT NULL AND NOT EXISTS
        (SELECT 1 FROM unlocks WHERE unlocks.player_id=runs.player_id AND unlocks.species=recruitments.species)`).all() as {player_id:string;species:string;opponent_team:string}[];
    for(const row of omitted) {
      const incoming=Showdown.Teams.unpack(row.opponent_team)?.find(set=>set.species===row.species);
      if(!incoming || !pokemonSets[row.species])continue;
      const before=this.savedTraining(row.player_id,row.species),ivs=incoming.ivs ?? pokemonSets[row.species].ivs;
      const profile={...before.profile,ivs:Object.fromEntries(statKeys.map(stat=>[stat,Math.max(before.profile.ivs[stat],ivs[stat] ?? 31)]))};
      this.db.prepare('INSERT OR IGNORE INTO unlocks VALUES (?,?)').run(row.player_id,row.species);
      this.db.prepare('INSERT INTO pokemon_training VALUES (?,?,?,?) ON CONFLICT(player_id,species) DO UPDATE SET profile=excluded.profile,revision=excluded.revision').run(row.player_id,row.species,JSON.stringify(profile),before.revision+1);
    }
  }
  private tx<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  permanentView(owner:string):PermanentView {
    const row=this.db.prepare('SELECT reroll_level,shiny_tickets,egg_tickets FROM permanent_upgrades WHERE player_id=?').get(owner) as {reroll_level:number;shiny_tickets:number;egg_tickets:number}|undefined;
    return {retryLimit:(this.db.prepare('SELECT level FROM permanent_retry_upgrades WHERE player_id=?').get(owner) as {level:number}|undefined)?.level??0,rerollLevel:row?.reroll_level??0,rerollLimit:1+(row?.reroll_level??0),shinyTickets:row?.shiny_tickets??0,eggTickets:row?.egg_tickets??0};
  }
  permanentAction(owner:string,requestId:unknown,action:unknown,product:unknown,count:unknown,species:unknown):PermanentResult {
    if(typeof requestId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(requestId))throw new BattleRequestError('구매 요청 번호가 올바르지 않습니다.',400);
    if(!['buy','hatch','shiny'].includes(String(action)) || !['reroll','retry','shiny','egg'].includes(String(product)) || (count!==1&&count!==10) || (action!=='hatch' && product!=='egg' && count!==1))throw new BattleRequestError('상품 요청이 올바르지 않습니다.',400);
    const payload=JSON.stringify({action,product,count,species:species??null});
    return this.tx(()=>{
      const old=this.db.prepare('SELECT payload,result FROM permanent_receipts WHERE player_id=? AND request_id=?').get(owner,requestId) as {payload:string;result:string}|undefined;
      if(old){if(old.payload!==payload)throw new BattleRequestError('같은 요청 번호에 다른 구매를 보낼 수 없습니다.',409);return JSON.parse(old.result) as PermanentResult;}
      this.db.prepare('INSERT OR IGNORE INTO permanent_upgrades(player_id) VALUES (?)').run(owner);
      const before=this.permanentView(owner);let result:PermanentResult;
      if(action==='buy'){
        if(product==='retry'&&before.retryLimit>=3)throw new BattleRequestError('다시하기는 최대 3회까지 확장할 수 있습니다.',409);
        if(product==='reroll'&&before.rerollLevel>=2)throw new BattleRequestError('리롤은 최대 3회까지 확장할 수 있습니다.',409);
        const price=product==='retry'?permanentPrices.retry[before.retryLimit]:product==='reroll'?permanentPrices.reroll[before.rerollLevel]:product==='shiny'?permanentPrices.shiny:permanentPrices.egg;
        const cost=price*count;
        if(!this.db.prepare('UPDATE players SET growth_points=growth_points-? WHERE id=? AND growth_points>=?').run(cost,owner,cost).changes)throw new BattleRequestError('성장 포인트가 부족합니다.',400);
        const column=product==='reroll'?'reroll_level':product==='shiny'?'shiny_tickets':'egg_tickets';
        if(product==='retry')this.db.prepare('INSERT INTO permanent_retry_upgrades VALUES (?,1) ON CONFLICT(player_id) DO UPDATE SET level=level+1').run(owner);
        else this.db.prepare(`UPDATE permanent_upgrades SET ${column}=${column}+? WHERE player_id=?`).run(count,owner);
        result={message:product==='retry'?`다음 도전부터 다시하기를 ${before.retryLimit+1}회 사용할 수 있어요!`:product==='reroll'?`무료 리롤이 종류별 ${before.rerollLimit+1}회로 확장됐어요!`:`${product==='shiny'?'이로치 교환권':'알 뽑기권'} ${count}장을 받았어요!`};
      }else if(action==='shiny'&&product==='shiny'){
        if(typeof species!=='string'||!this.db.prepare('SELECT 1 FROM unlocks WHERE player_id=? AND species=?').get(owner,species))throw new BattleRequestError('보유한 포켓몬을 선택하세요.',400);
        const saved=this.savedTraining(owner,species);
        if(saved.profile.shiny)throw new BattleRequestError('이미 이로치 외형을 해금한 포켓몬입니다.',409);
        if(!this.db.prepare('UPDATE permanent_upgrades SET shiny_tickets=shiny_tickets-1 WHERE player_id=? AND shiny_tickets>0').run(owner).changes)throw new BattleRequestError('이로치 교환권이 없습니다.',400);
        this.db.prepare('INSERT INTO pokemon_training VALUES (?,?,?,?) ON CONFLICT(player_id,species) DO UPDATE SET profile=excluded.profile,revision=excluded.revision').run(owner,species,JSON.stringify({...saved.profile,shiny:true}),saved.revision+1);
        result={message:'이로치 외형을 해금했어요! 다음 도전부터 적용됩니다.'};
      }else if(action==='hatch'&&product==='egg'){
        const tickets=Math.min(count,before.eggTickets),cost=(count-tickets)*permanentPrices.egg;
        if(!this.db.prepare('UPDATE players SET growth_points=growth_points-? WHERE id=? AND growth_points>=?').run(cost,owner,cost).changes)throw new BattleRequestError('티켓을 사용하고 남은 뽑기에 필요한 성장 포인트가 부족합니다.',400);
        this.db.prepare('UPDATE permanent_upgrades SET egg_tickets=egg_tickets-? WHERE player_id=?').run(tickets,owner);
        const pool=pokedexEntries().filter(entry=>entry.battleReady!==false).map(entry=>entry.species),eggs:EggResult[]=[];
        for(let i=0;i<count;i++){
          const rarity=eggRarity(this.roll(10000)),candidates=pool.filter(name=>pokemonRarity(name)===rarity);
          if(!candidates.length)throw new BattleRequestError('뽑기 대상 데이터를 확인해야 합니다.',500);
          const name=candidates[this.roll(candidates.length)],saved=this.savedTraining(owner,name),isNew=!this.db.prepare('SELECT 1 FROM unlocks WHERE player_id=? AND species=?').get(owner,name);
          const ivs=Object.fromEntries(statKeys.map(stat=>[stat,this.roll(32)])) as StatBlock;
          const improved=Object.fromEntries(statKeys.map(stat=>[stat,Math.max(saved.profile.ivs[stat],ivs[stat])])) as StatBlock;
          const ivGain:IVGain={species:name,changes:statKeys.filter(stat=>improved[stat]>saved.profile.ivs[stat]).map(stat=>({stat,from:saved.profile.ivs[stat],to:improved[stat]}))};
          const legal=trainingOptions(name).learnableMoves,known=this.unlockedMoves(owner,name),move=legal.length?legal[this.roll(legal.length)]:null,newMoves=move&&!known.includes(move)?[move]:[];
          const shiny=this.roll(EGG_SHINY_ODDS)===0,newShiny=shiny&&!saved.profile.shiny;
          this.db.prepare('INSERT OR IGNORE INTO unlocks VALUES (?,?)').run(owner,name);
          if(isNew||ivGain.changes.length||newShiny)this.db.prepare('INSERT INTO pokemon_training VALUES (?,?,?,?) ON CONFLICT(player_id,species) DO UPDATE SET profile=excluded.profile,revision=excluded.revision').run(owner,name,JSON.stringify({...saved.profile,ivs:improved,shiny:!!saved.profile.shiny||shiny}),saved.revision+1);
          for(const move of newMoves)this.db.prepare('INSERT OR IGNORE INTO move_unlocks VALUES (?,?,?)').run(owner,name,move);
          eggs.push({species:name,ivs,isNew,ivGain,newMoves,shiny,newShiny});
        }
        result={message:`${count}개의 알이 부화했어요!`,eggs};
      }else throw new BattleRequestError('교환 요청이 올바르지 않습니다.',400);
      this.db.prepare('INSERT INTO permanent_receipts VALUES (?,?,?,?)').run(owner,requestId,payload,JSON.stringify(result));
      return result;
    });
  }
  ensurePlayer(owner: string) {
    this.tx(() => {
      this.db.prepare('INSERT OR IGNORE INTO players(id) VALUES (?)').run(owner);
      for (const name of initialPartners) this.db.prepare('INSERT OR IGNORE INTO unlocks VALUES (?, ?)').run(owner, name);
    });
  }
  private latest(owner: string): RunRow | undefined {
    return this.db.prepare('SELECT * FROM runs WHERE player_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1').get(owner) as RunRow | undefined;
  }
  setFavorite(owner:string,name:unknown,enabled:unknown) {
    if(typeof name!=='string' || !favoriteSpecies.has(name) || typeof enabled!=='boolean')throw new BattleRequestError('즐겨찾기할 포켓몬을 선택하세요.',400);
    this.tx(()=>{
      if(enabled)this.db.prepare('INSERT OR IGNORE INTO favorites VALUES (?,?)').run(owner,name);
      else this.db.prepare('DELETE FROM favorites WHERE player_id=? AND species=?').run(owner,name);
    });
  }
  private ownedRun(owner: string, id: string): RunRow {
    const row = this.db.prepare('SELECT * FROM runs WHERE id = ? AND player_id = ?').get(id, owner) as RunRow | undefined;
    if (!row) throw new BattleRequestError('도전을 찾을 수 없습니다.', 404);
    return row;
  }
  roster(runId: string): string[] {
    return (this.db.prepare('SELECT species FROM members WHERE run_id = ? ORDER BY slot').all(runId) as {species: string}[]).map(p => p.species);
  }
  battle(id: string): BattleRow {
    const row = this.db.prepare('SELECT * FROM battles WHERE id = ?').get(id) as BattleRow | undefined;
    if (!row) throw new BattleRequestError('배틀을 찾을 수 없습니다.', 404);
    return row;
  }
  currentBattle(owner: string): BattleRow | null {
    const run = this.latest(owner);
    if (!run || ['select', 'abandoned'].includes(run.state)) return null;
    return this.db.prepare('SELECT * FROM battles WHERE run_id = ? AND floor = ? AND stage = ? ORDER BY attempt DESC LIMIT 1').get(run.id, run.floor,this.route(run.id)?.pending_boss===run.floor?1:0) as BattleRow ?? null;
  }
  private suggestedTeam(runId: string): string[] {
    const previous = this.db.prepare('SELECT id, player_team FROM battles WHERE run_id = ? ORDER BY floor DESC, stage DESC, attempt DESC LIMIT 1').get(runId) as {id: string; player_team: string} | undefined;
    const recruitment = previous ? this.db.prepare('SELECT species, replaced FROM recruitments WHERE battle_id = ?').get(previous.id) as {species: string | null; replaced: string | null} | undefined : undefined;
    const roster = this.roster(runId);
    const lastTeam = previous ? (Showdown.Teams.unpack(previous.player_team) ?? []).map(pokemon => collectionSpecies(pokemon.species)) : [];
    const preferred = lastTeam.map(name => recruitment?.replaced === name && recruitment.species ? recruitment.species : name);
    return [...new Set([...preferred, ...roster])].filter(name => roster.includes(name)).slice(0,3);
  }
  view(owner: string): TowerView {
    const player = this.db.prepare('SELECT coins,growth_points FROM players WHERE id = ?').get(owner) as {coins: number;growth_points:number} | undefined;
    if (!player) throw new BattleRequestError('저장 데이터를 찾을 수 없습니다.', 404);
    const unlocked = (this.db.prepare('SELECT species FROM unlocks WHERE player_id = ? ORDER BY rowid').all(owner) as {species: string}[]).map(p => p.species).filter(isCollectibleSpecies);
    const row = this.latest(owner);
    const battle = this.currentBattle(owner);
    const retry=row?this.retryState(row.id):null;
    const retryBattle=retry?.pending_battle_id?this.battle(retry.pending_battle_id):null;
    const earned = row ? this.db.prepare('SELECT COALESCE(SUM(rewards.amount),0) AS coins, COUNT(*) AS wins FROM rewards JOIN battles ON battles.id = rewards.battle_id WHERE battles.run_id = ?').get(row.id) as {coins: number; wins: number} : null;
    const favorites=(this.db.prepare('SELECT species FROM favorites WHERE player_id=? ORDER BY rowid').all(owner) as {species:string}[]).map(entry=>entry.species);
    return {coins: row && ['select','battle','recruit'].includes(row.state) ? player.coins : 0, growthPoints:player.growth_points, permanent:this.permanentView(owner), unlocked, favorites, totalFloors: floors.length, run: row ? {
      id: row.id, rule:this.runRule(row.id),theme:this.runTheme(row.id), hiddenBossPending:this.route(row.id)?.pending_boss===row.floor, hiddenBossNext:!!this.route(row.id) && row.floor%50===0 && ['johto','kanto'].includes(this.runTheme(row.id) ?? '') && this.route(row.id)?.pending_boss!==row.floor, floor: row.floor, totalFloors: row.total_floors, floorName: row.floor===row.total_floors ? row.total_floors===3 ? '작은 타워의 정상' : '타워의 정상' : floors[row.floor - 1]?.name ?? '타워', state: row.state,
      retries:{limit:retry!.retry_limit,used:retry!.used,remaining:Math.max(0,retry!.retry_limit-retry!.used),canRetry:row.state==='lost'&&retry!.used<retry!.retry_limit&&!this.db.prepare('SELECT 1 FROM growth_rewards WHERE run_id=?').get(row.id),preparing:row.state==='select'&&!!retryBattle,opponents:retryBattle?(Showdown.Teams.unpack(retryBattle.opponent_team)??[]).map(p=>({species:p.species,moves:p.moves,item:p.item})):[]},
      roster: this.roster(row.id), partnerForms:Object.fromEntries(Object.entries(this.runProfiles(row.id)).filter(([,profile])=>profile.forme).map(([name,profile])=>[name,profile.forme!])), battleId: battle?.id ?? null,
      earnedCoins: earned?.coins ?? 0, victories: earned?.wins ?? 0,
      growthReward: (this.db.prepare('SELECT amount FROM growth_rewards WHERE run_id=?').get(row.id) as {amount:number}|undefined)?.amount ?? 0,
      restartReward:this.growthBase(row.id),
      upgrades: this.activeUpgrades(row.id,row.floor).map(upgrade=>({kind:upgrade.kind,remainingFloors:['recruit','cleared'].includes(row.state) ? Math.max(0,upgrade.end_floor-row.floor) : upgrade.end_floor-row.floor+1})),
      heldItems:this.heldItems(row.id),
      teraTickets:this.teraQuantity(row.id),
      teraShop:allowsGimmick(this.runRule(row.id),'terastallize') && row.state==='select' && isShopFloor(row.floor,row.total_floors)?{price:TERA_TICKET_PRICE,purchased:!!this.db.prepare('SELECT 1 FROM tera_purchases WHERE run_id=? AND floor=?').get(row.id,row.floor)}:null,
      itemBag:Object.fromEntries((this.db.prepare('SELECT item,quantity FROM run_item_bag WHERE run_id=? AND quantity>0').all(row.id) as {item:string;quantity:number}[]).map(entry=>[entry.item,entry.quantity])),
      itemPurchases:this.itemPurchases(row),
      battleItems:this.battleItemBag(row.id),
      adjustment:row.state==='select' && (isShopFloor(row.floor,row.total_floors)||!!retryBattle)?{entries:this.trainingCollection(owner).filter(entry=>this.roster(row.id).includes(entry.species)).map(entry=>{const profile=this.runProfiles(row.id)[entry.species]??entry.profile;return {...entry,profile,...trainingOptions(entry.species,profile.forme),selfMoves:profileLearnset(entry.species,profile.forme).selfMoves,unlockedMoves:[...new Set([...entry.unlockedMoves,...profileLearnset(entry.species,profile.forme).selfMoves])]} ;}),snapshot:createHash('sha256').update(JSON.stringify(this.runProfiles(row.id))).digest('hex')}:null,
      consumableOffers:row.state==='select' && isShopFloor(row.floor,row.total_floors)?this.consumableOffers(row):[],
      shopRerolls:Object.fromEntries(['items','machines'].map(kind=>{const count=this.shopRevision(row,kind);return [kind,{count,limit:this.permanentView(owner).rerollLimit,price:rerollPrice(count)}];})) as RunView['shopRerolls'],
      vitaminShop:row.state==='select' && isShopFloor(row.floor,row.total_floors)?{offers:this.vitaminOffers(row),bonuses:this.runBonuses(row.id),partners:this.machinePartners(owner,row.id),counts:this.vitaminCounts(row.id),limit:VITAMIN_LIMIT}:null,
      itemOffers:row.state==='select' && isShopFloor(row.floor,row.total_floors) ? this.itemOffers(row) : [],
      machineShop: row.state==='select' && isShopFloor(row.floor,row.total_floors) ? {
        offers:this.machineOffers(owner,row),
        currentMoves:Object.fromEntries(this.roster(row.id).map(name=>[name,this.runProfiles(row.id)[name]?.moves ?? this.savedTraining(owner,name).profile.moves])),
        partners:this.machinePartners(owner,row.id),
      } : null,
      boss: row.state === 'select' ? retryBattle?.boss?JSON.parse(retryBattle.boss):this.encounter(row.id,row.floor)?.boss ?? null : battle?.boss ? JSON.parse(battle.boss) : null,
      trainer:row.state==='select' ? retryBattle?.trainer?JSON.parse(retryBattle.trainer):null : battle?.trainer ? JSON.parse(battle.trainer) : null,
      villainEvent:row.state!=='select' && battle?.villain_event ? {...JSON.parse(battle.villain_event),ended:!!this.db.prepare('SELECT defeated_battle_id FROM run_villain_campaigns WHERE run_id=? AND defeated_battle_id IS NOT NULL').get(row.id)} : null,
      suggestedTeam: row.state === 'select' ? this.suggestedTeam(row.id) : [],
      reward: row.state === 'recruit' ? battle?.reward ?? 0 : 0,
      candidates: row.state === 'recruit' && battle ? (Showdown.Teams.unpack(battle.opponent_team) ?? []).map(set=>set.species).filter(isCollectibleSpecies) : [],
      candidateIVs: row.state==='recruit' && battle ? Object.fromEntries((Showdown.Teams.unpack(battle.opponent_team) ?? []).map(set=>[set.species,set.ivs ?? pokemonSets[set.species as keyof typeof pokemonSets].ivs])) : {},
      collectionIVs:row.state==='recruit' && battle ? Object.fromEntries(((Showdown.Teams.unpack(battle.opponent_team) ?? []).map(set=>set.species)).map(name=>[name,this.savedTraining(owner,name).profile.ivs])) : {},
      candidateMoves: row.state==='recruit' && battle ? Object.fromEntries((Showdown.Teams.unpack(battle.opponent_team) ?? []).map(set=>[set.species,set.moves])) : {},
      candidateDetails:row.state==='recruit' && battle?Object.fromEntries((Showdown.Teams.unpack(battle.opponent_team) ?? []).filter(set=>isCollectibleSpecies(set.species)).map(set=>[set.species,{ability:set.ability,nature:set.nature,moves:set.moves.map(m=>Showdown.Dex.moves.get(m).name),baseStats:{...Showdown.Dex.species.get(set.species).baseStats},types:[...Showdown.Dex.species.get(set.species).types],teraType:set.teraType as import('../data/tera').TeraType|undefined,shiny:!!set.shiny}])):{},
      collectionMoves: row.state==='recruit' && battle ? Object.fromEntries((Showdown.Teams.unpack(battle.opponent_team) ?? []).map(set=>[set.species,this.unlockedMoves(owner,set.species)])) : {},
      currentMoves: row.state==='recruit' && battle ? Object.fromEntries((Showdown.Teams.unpack(battle.opponent_team) ?? []).map(set=>[set.species,(JSON.parse((this.db.prepare('SELECT profiles FROM runs WHERE id=?').get(row.id) as {profiles:string}).profiles)[set.species] ?? this.savedTraining(owner,set.species).profile).moves])) : Object.fromEntries(this.roster(row.id).map(name=>[name,this.runProfiles(row.id)[name]?.moves ?? this.savedTraining(owner,name).profile.moves])),
      lastMoveGain: (()=>{const saved=this.db.prepare('SELECT move_gain FROM recruitments JOIN battles ON battles.id=recruitments.battle_id WHERE battles.run_id=? ORDER BY battles.floor DESC, battles.stage DESC LIMIT 1').get(row.id) as {move_gain:string|null}|undefined;return saved?.move_gain ? JSON.parse(saved.move_gain) : null;})(),
      lastIVGain: (()=>{const saved=this.db.prepare('SELECT iv_gain FROM recruitments JOIN battles ON battles.id=recruitments.battle_id WHERE battles.run_id=? ORDER BY battles.floor DESC, battles.stage DESC LIMIT 1').get(row.id) as {iv_gain:string|null}|undefined;return saved?.iv_gain ? JSON.parse(saved.iv_gain) : null;})(),
    } : null};
  }
  private route(runId:string){return this.db.prepare('SELECT second_theme,pending_boss FROM run_routes WHERE run_id=?').get(runId) as {second_theme:TowerTheme;pending_boss:number}|undefined;}
  private encounter(runId:string,floor:number){return towerTrainerEncounter(floor,runId,this.runTheme(runId,floor),!!this.route(runId),this.route(runId)?.pending_boss===floor);}
  private runTheme(runId:string,floor?:number):TowerTheme|null {
    const currentFloor=floor ?? (this.db.prepare('SELECT floor FROM runs WHERE id=?').get(runId) as {floor:number}|undefined)?.floor ?? 1;
    const route=this.route(runId);if(route && currentFloor>50)return route.second_theme;
    const row=this.db.prepare('SELECT theme FROM run_themes WHERE run_id=?').get(runId) as {theme:string}|undefined;
    return isTowerTheme(row?.theme) ? row.theme : null;
  }
  private validateSelection(selected: unknown, allowed: string[]) : asserts selected is string[] {
    if (!Array.isArray(selected) || selected.length !== 3 || new Set(selected).size !== 3 ||
      selected.some(p => typeof p !== 'string' || !Object.hasOwn(pokemonSets, p) || !allowed.includes(p))) {
      throw new BattleRequestError('사용 가능한 서로 다른 포켓몬 3마리를 선택하세요.', 400);
    }
  }
  runRule(id:string):BattleRule{return (this.db.prepare('SELECT rule FROM run_rules WHERE run_id=?').get(id) as {rule:BattleRule}|undefined)?.rule ?? 'chaos';}
  start(owner: string, selected: unknown,rule:unknown='chaos'): string {
    if(!isBattleRule(rule))throw new BattleRequestError('배틀 룰을 선택하세요.',400);
    return this.tx(() => {
      const current = this.latest(owner);
      if (current && ['select', 'battle', 'recruit'].includes(current.state)) throw new BattleRequestError('이미 진행 중인 도전이 있습니다.', 409);
      const allowed = (this.db.prepare('SELECT species FROM unlocks WHERE player_id = ?').all(owner) as {species: string}[]).map(p => p.species).filter(isCollectibleSpecies);
      this.validateSelection(selected, allowed);
      if(current?.state==='lost')this.settleGrowth(current.id,'lost');
      this.db.prepare('UPDATE players SET coins=0 WHERE id=?').run(owner);
      const id = randomUUID();
      const theme=randomTowerTheme(id);
      this.db.prepare('INSERT INTO runs(id, player_id, floor, state, created_at, total_floors) VALUES (?, ?, 1, ?, ?, ?)').run(id, owner, 'select', Date.now(), floors.length);
      this.db.prepare('INSERT INTO run_rules VALUES (?,?)').run(id,rule);
      this.db.prepare('INSERT INTO run_retries(run_id,retry_limit) VALUES (?,?)').run(id,this.permanentView(owner).retryLimit);
      this.db.prepare('INSERT INTO run_villains VALUES (?,?)').run(id,runOrganization(id));
      this.db.prepare('INSERT INTO run_villain_campaigns(run_id) VALUES (?)').run(id);
      this.db.prepare('INSERT INTO run_themes VALUES (?,?)').run(id,theme);
      this.db.prepare('INSERT INTO run_routes(run_id,second_theme) VALUES (?,?)').run(id,secondTowerTheme(id,theme));
      this.db.prepare('INSERT INTO run_progression VALUES (?,?)').run(id,CURRENT_PROGRESSION);
      this.db.prepare('INSERT INTO run_tera_tickets VALUES (?,?)').run(id,allowsGimmick(rule,'terastallize')?1:0);
      selected.forEach((name, slot) => this.db.prepare('INSERT INTO members VALUES (?, ?, ?)').run(id, slot, name));
      const profiles=Object.fromEntries(this.trainingCollection(owner).map(entry=>[entry.species,entry.profile]));
      this.db.prepare('UPDATE runs SET profiles=? WHERE id=?').run(JSON.stringify(profiles),id);
      return this.createBattle(id, 1, selected);
    });
  }
  enter(owner: string, runId: string, expectedFloor: number, selected: unknown): string {
    return this.tx(() => {
      const run = this.ownedRun(owner, runId);
      if (run.state !== 'select' || run.floor !== expectedFloor || run.floor > run.total_floors) throw new BattleRequestError('이미 진행되었거나 잘못된 층입니다.', 409);
      this.validateSelection(selected, this.roster(runId));
      return this.createBattle(runId, run.floor, selected);
    });
  }
  private retryState(runId:string){return this.db.prepare('SELECT retry_limit,used,pending_battle_id FROM run_retries WHERE run_id=?').get(runId) as {retry_limit:number;used:number;pending_battle_id:string|null}|undefined ?? {retry_limit:0,used:0,pending_battle_id:null};}
  retry(owner:string,runId:string,battleId:string){
    this.tx(()=>{
      const run=this.ownedRun(owner,runId),state=this.retryState(runId);
      // Repeated delivery of the same retry request cannot spend another use.
      if(run.state==='select'&&state.pending_battle_id===battleId)return;
      if(run.state!=='lost'||this.currentBattle(owner)?.id!==battleId||this.latest(owner)?.id!==runId)throw new BattleRequestError('다시 도전할 패배 배틀이 아닙니다.',409);
      if(state.used>=state.retry_limit||this.db.prepare('SELECT 1 FROM growth_rewards WHERE run_id=?').get(runId))throw new BattleRequestError('다시하기 횟수가 없습니다.',409);
      this.db.prepare('UPDATE run_retries SET used=used+1,pending_battle_id=? WHERE run_id=?').run(battleId,runId);
      this.db.prepare("UPDATE runs SET state='select' WHERE id=?").run(runId);
    });
  }
  finishLoss(owner:string,runId:string){this.tx(()=>{
    const run=this.ownedRun(owner,runId);
    if(run.state!=='lost')throw new BattleRequestError('패배한 도전만 종료할 수 있습니다.',409);
    this.settleGrowth(runId,'lost');
  });}
  private createRetryBattle(runId:string,selected:string[],previousId:string){
    const previous=this.battle(previousId),id=randomUUID(),rule=this.runRule(runId);
    const profiles=this.runProfiles(runId);
    const player=packPlayerTeam(selected,this.boostedProfiles(runId,profiles),Object.fromEntries(Object.entries(this.heldItems(runId)).filter(([,item])=>allowsRuleItem(rule,item))));
    const attempt=(this.db.prepare('SELECT MAX(attempt) AS n FROM battles WHERE run_id=? AND floor=? AND stage=(SELECT stage FROM battles WHERE id=?)').get(runId,previous.floor,previousId) as {n:number}).n+1;
    this.db.prepare(`INSERT INTO battles(id,run_id,floor,player_team,opponent_team,seed,engine_version,format,ai_version,status,reward,candidates,boss,trainer,upgrades,battle_items,tera_tickets,villain_event,rule,stage,attempt)
      SELECT ?,run_id,floor,?,opponent_team,seed,engine_version,format,ai_version,'active',reward,candidates,boss,trainer,?,?,?,?,rule,stage,? FROM battles WHERE id=?`).run(id,player,JSON.stringify(this.activeUpgrades(runId,previous.floor).map(u=>u.kind).sort()),JSON.stringify(this.battleItemBag(runId)),JSON.stringify({...JSON.parse(previous.tera_tickets),p1:this.teraQuantity(runId)}),previous.villain_event,attempt,previousId);
    this.db.prepare('UPDATE run_retries SET pending_battle_id=NULL WHERE run_id=?').run(runId);
    this.db.prepare("UPDATE runs SET state='battle' WHERE id=?").run(runId);
    return id;
  }
  private createBattle(runId: string, floor: number, selected: string[]): string {
    const pending=this.retryState(runId).pending_battle_id;
    if(pending)return this.createRetryBattle(runId,selected,pending);
    const rule=this.runRule(runId);
    const config = floors[floor - 1];
    if (!config) throw new BattleRequestError('지원하지 않는 층입니다.', 400);
    const id = randomUUID();
    const bytes = randomBytes(8);
    const seed: Seed = [0, 2, 4, 6].map(i => bytes.readUInt16BE(i)) as Seed;
    const profiles=JSON.parse((this.db.prepare('SELECT profiles FROM runs WHERE id=?').get(runId) as {profiles:string}).profiles) as Record<string,TrainingProfile>;
    const progression:TowerProgression=(this.db.prepare('SELECT version FROM run_progression WHERE run_id=?').get(runId) as {version:typeof CURRENT_PROGRESSION}|undefined)?.version ?? 'legacy';
    const previous=this.db.prepare('SELECT opponent_team,trainer FROM battles WHERE run_id=? ORDER BY floor DESC, stage DESC LIMIT 3').all(runId) as {opponent_team:string;trainer:string|null}[];
    const trainer=this.encounter(runId,floor);
    const organization=this.db.prepare('SELECT organization FROM run_villains WHERE run_id=?').get(runId) as {organization:string}|undefined;
    const campaign=this.db.prepare('SELECT defeated_battle_id FROM run_villain_campaigns WHERE run_id=?').get(runId) as {defeated_battle_id:string|null}|undefined;
    const previousVillain=!!previous[0]?.trainer && JSON.parse(previous[0].trainer).role==='villain';
    // Reward rows record committed wins exactly once, including across app restarts.
    const victories=this.db.prepare('SELECT b.villain_event FROM battles b JOIN rewards r ON r.battle_id=b.id WHERE b.run_id=? AND b.villain_event IS NOT NULL').all(runId) as {villain_event:string}[];
    const progress={gruntWins:0,executiveWins:0};
    for(const victory of victories){const saved=JSON.parse(victory.villain_event) as VillainEvent;if(saved.organization!==organization?.organization)continue;if(saved.rank==='grunt')progress.gruntWins++;else if(saved.rank==='executive')progress.executiveWins++;}
    const pool=encounterPool(floor,progression);
    const eligibleRank=(sample:TrainerSample)=>{
      if(progression!=='legacy' && sample.kind==='named'){
        const group=organization?.organization,rank=sample===villainLeaders[group ?? '']?.boss?'boss':'executive';
        if(group && normalNpcTemplate(`${group}-${rank}-${sample.portrait}`,floor,sample.role))return true;
      }
      return sample.entries!.filter(name=>pool.includes(name)).length>=3 && (!sample.ace || pool.includes(sample.ace));
    };
    const event=organization && campaign ? villainEncounter(runId,floor,organization.organization,previousVillain,!!campaign.defeated_battle_id,progress,eligibleRank) : null;
    const villain=event?.sample ?? (organization && !campaign ? villainGrunt(runId,floor,organization.organization,previousVillain) : null);
    const fixedVillain=progression!=='legacy'&&villain?normalNpcTemplate(villain.id,floor,villain.role):null;
    const filteredVillain=villain ? {...villain,...(fixedVillain?{entries:fixedVillain.team.map(p=>p.species),ace:fixedVillain.ace}:{entries:villain.entries!.filter(name=>pool.includes(name))})} : null;
    const eligible=filteredVillain && (!filteredVillain.ace || filteredVillain.entries.includes(filteredVillain.ace)) ? filteredVillain : null;
    const sample=trainer ? undefined : eligible && eligible.entries.length>=3 ? eligible : selectTrainerSample(floor,seed,previous.flatMap(row=>{const saved=row.trainer ? JSON.parse(row.trainer) : null;const entry=trainerCatalog.find(s=>s.id===saved?.id);return entry ? [{id:entry.id,specialty:entry.specialty}] : [];}),progression);
    const encounter=generateOpponentTeam(floor,seed,previous.flatMap(row=>(Showdown.Teams.unpack(row.opponent_team) ?? []).map(set=>set.species)),trainer,sample,progression);
    const npcId=sample?.id ?? trainer?.boss.id ?? '';
    const npcGeneration=sample?.generation ?? trainer?.boss.generation ?? null;
    const npcAce=sample?.ace ?? trainer?.ace;
    const template=progression!=='legacy'&&(trainer || sample?.kind==='named')?normalNpcTemplate(npcId,floor,sample?.role ?? trainer?.boss.role):null;
    let signature:NpcGimmick|null=null;
    const npcGimmicksAllowed=normalNpcGimmicksEnabled(floor,normalNpcCategory(sample?.role ?? trainer?.boss.role,sample?.id ?? trainer?.boss.id,sample?.kind ?? 'named'));
    if(progression!=='legacy' && npcGimmicksAllowed && (trainer || sample?.kind==='named')){
      const plan=template?.signature ?? npcGimmick(npcId,npcGeneration,encounter.map(p=>p.name),npcAce?npcSpecies(npcAce,npcId,npcGeneration):undefined);
      const carrier=encounter.find(p=>p.item && (megaStones[p.item] || primalOrbs[p.item] || p.item===DYNAMAX_ITEM || zCrystals[p.item]));
      signature=carrier?{rule:primalOrbs[carrier.item!]? 'primal':megaStones[carrier.item!]? 'mega':carrier.item===DYNAMAX_ITEM?'dynamax':'z',species:carrier.name,item:carrier.item}:plan?.rule==='tera'?plan:null;
      if(trainer && signature)trainer.boss.gimmick=signature;
    }
    const opponents=encounter.map(entry=>entry.name);
    const opponentProfiles=Object.fromEntries(encounter.map(({name,moves,ability,profile})=>{
      return [name,{shiny:this.roll(8192)===0,...(profile ?? opponentProfile(name,moves,floor,Object.fromEntries(statKeys.map(stat=>[stat,randomBytes(1)[0]%32])) as StatBlock,progression)),gender:speciesGender(name,this.roll(1000000)/1000000),...(ability ? {ability} : {})}];
    }));
    if(signature?.rule==='tera' && !template)opponentProfiles[signature.species].teraType=(sample?.specialty ?? trainer?.boss.specialty ?? Showdown.Dex.species.get(signature.species).types[0]) as import('../data/tera').TeraType;
    this.db.prepare(`INSERT INTO battles(id, run_id, floor, player_team, opponent_team, seed, engine_version, format, ai_version, status, reward, candidates, boss, stage)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`).run(id, runId, floor, packPlayerTeam(selected,this.boostedProfiles(runId,profiles),Object.fromEntries(Object.entries(this.heldItems(runId)).filter(([,item])=>allowsRuleItem(rule,item)))), packTeam(opponents,opponentProfiles,Object.fromEntries(encounter.map(entry=>[entry.name,entry.item && (progression!=='legacy' || allowsRuleItem(rule,entry.item))?entry.item:''])),encounter.filter(p=>p.gigantamax).map(p=>p.name)), JSON.stringify(seed), engineVersion, FORMAT, progression==='legacy'?'tower-policy-v9':AI_VERSION, config.reward+(sample===eligible && event ? event.event.bonus : 0), JSON.stringify(opponents), trainer ? JSON.stringify(trainer.boss) : null,this.route(runId)?.pending_boss===floor?1:0);
    this.db.prepare('UPDATE battles SET rule=? WHERE id=?').run(rule,id);
    if(sample===eligible && event)this.db.prepare('UPDATE battles SET villain_event=? WHERE id=?').run(JSON.stringify(event.event),id);
    this.db.prepare('UPDATE battles SET battle_items=? WHERE id=?').run(JSON.stringify(this.battleItemBag(runId)),id);
    const hasNpcItem=encounter.some(p=>p.item && (megaStones[p.item] || primalOrbs[p.item] || p.item===DYNAMAX_ITEM || zCrystals[p.item]));
    const npcTeraTickets=npcGimmicksAllowed?(signature?.rule==='tera'?1:!hasNpcItem && sample?.kind==='elite'?opponentTeraTickets(floor,'elite'):0):0;
    this.db.prepare('UPDATE battles SET tera_tickets=? WHERE id=?').run(JSON.stringify({p1:this.teraQuantity(runId),p2:progression==='legacy'?(allowsGimmick(rule,'terastallize')?1:0):npcTeraTickets}),id);
    this.db.prepare("UPDATE runs SET state = 'battle' WHERE id = ?").run(runId);
    if(sample){const theme=this.runTheme(runId);this.db.prepare('UPDATE battles SET trainer=? WHERE id=?').run(JSON.stringify({...trainerView({...sample,...(theme?{generation:towerThemes[theme].generation}: {})}),...(signature?{gimmick:signature}:{})}),id);}
    this.db.prepare('UPDATE battles SET upgrades=? WHERE id=?').run(JSON.stringify(this.activeUpgrades(runId,floor).map(upgrade=>upgrade.kind).sort()),id);
    return id;
  }
  private teraQuantity(runId:string){return (this.db.prepare('SELECT quantity FROM run_tera_tickets WHERE run_id=?').get(runId) as {quantity:number}|undefined)?.quantity ?? 0;}
  purchaseTera(owner:string,id:string,floor:number){this.tx(()=>{
    if(!allowsGimmick(this.runRule(id),'terastallize'))throw new BattleRequestError('이 룰에서는 테라스탈을 사용할 수 없습니다.',409);
    const run=this.ownedRun(owner,id);
    if(run.state!=='select' || run.floor!==floor || !isShopFloor(floor,run.total_floors))throw new BattleRequestError('상점에서만 테라권을 구매할 수 있습니다.',409);
    if(this.db.prepare('SELECT 1 FROM tera_purchases WHERE run_id=? AND floor=?').get(id,floor))throw new BattleRequestError('이미 구매한 테라권입니다.',409);
    if(!this.db.prepare('UPDATE players SET coins=coins-? WHERE id=? AND coins>=?').run(TERA_TICKET_PRICE,owner,TERA_TICKET_PRICE).changes)throw new BattleRequestError('보유 자금이 부족합니다.',400);
    this.db.prepare('INSERT INTO tera_purchases VALUES (?,?)').run(id,floor);
    this.db.prepare('INSERT INTO run_tera_tickets VALUES (?,1) ON CONFLICT(run_id) DO UPDATE SET quantity=quantity+1').run(id);
  });}
  private activeUpgrades(runId:string,floor:number) {
    return this.db.prepare('SELECT kind,end_floor FROM run_upgrades WHERE run_id=? AND start_floor<=? AND end_floor>=? ORDER BY kind').all(runId,floor,floor) as {kind:UpgradeKind;end_floor:number}[];
  }
  private heldItems(runId:string):Record<string,string> {
    const items=Object.fromEntries((this.db.prepare('SELECT species,item FROM run_held_items WHERE run_id=?').all(runId) as {species:string;item:string}[]).map(row=>[row.species,row.item]));
    for(const [name,profile] of Object.entries(this.runProfiles(runId))){const item=selectedForm(name,profile.forme)?.requiredItem;if(item&&this.roster(runId).includes(name))items[name]=item;}
    return items;
  }
  private canHoldItem(runId:string,name:string,item:string){return !selectedForm(name,this.runProfiles(runId)[name]?.forme)?.requiredItem&&canEquipGimmick(name,item);}
  private itemOffers(run:RunRow,regenerate=false):string[]{
    const saved=this.db.prepare('SELECT offers FROM item_shops WHERE run_id=? AND floor=?').get(run.id,run.floor) as {offers:string}|undefined;
    const roster=this.roster(run.id);
    const existing=saved&&!regenerate ? (JSON.parse(saved.offers) as string[]).filter(isHeldItem).filter(item=>allowsRuleItem(this.runRule(run.id),item) && roster.some(name=>this.canHoldItem(run.id,name,item))) : [];
    if(existing.length===4)return existing;
    let counter=0;const random=()=>createHash('sha256').update(`${run.id}:item-shop:${run.floor}:${this.shopRevision(run,"items") ? "roll"+this.shopRevision(run,"items")+":" : ""}${counter++}`).digest().readUInt32LE(0)/4294967296;
    const held=Object.values(this.heldItems(run.id));
    const owned=(this.db.prepare('SELECT item FROM run_item_bag WHERE run_id=? AND quantity>0').all(run.id) as {item:string}[]).map(x=>x.item);
    const offers=rollItemOffers(run.floor-1,random,item=>allowsRuleItem(this.runRule(run.id),item) && !owned.includes(item) && !held.includes(item) && roster.some(name=>this.canHoldItem(run.id,name,item)),existing);
    this.db.prepare('INSERT INTO item_shops VALUES (?,?,?) ON CONFLICT(run_id,floor) DO UPDATE SET offers=excluded.offers').run(run.id,run.floor,JSON.stringify(offers));
    return offers;
  }

  private consumableOffers(run:RunRow):UpgradeKind[]{
    const saved=this.db.prepare('SELECT offers FROM consumable_shops WHERE run_id=? AND floor=?').get(run.id,run.floor) as {offers:string}|undefined;
    if(saved)return JSON.parse(saved.offers);
    const pool=Object.keys(upgrades) as UpgradeKind[];
    for(let i=pool.length-1;i>0;i--){const n=createHash('sha256').update(run.id+':consumables:'+run.floor+':'+i).digest().readUInt32BE(0);const j=Math.floor(n/4294967296*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    const offers=pool.slice(0,3);this.db.prepare('INSERT INTO consumable_shops VALUES (?,?,?)').run(run.id,run.floor,JSON.stringify(offers));return offers;
  }
  private shopRevision(run:RunRow,kind:string){return (this.db.prepare('SELECT count FROM shop_rerolls WHERE run_id=? AND floor=? AND kind=?').get(run.id,run.floor,kind) as {count:number}|undefined)?.count??0;}
  private checkShopRevision(run:RunRow,kind:string,revision:unknown){if(!Number.isSafeInteger(revision)||revision!==this.shopRevision(run,kind))throw new BattleRequestError('상점 상품이 변경됐습니다. 다시 선택하세요.',409);}
  private itemPurchases(run:RunRow){return this.shopRevision(run,'items')===0 ? (this.db.prepare('SELECT item FROM item_purchases WHERE run_id=? AND floor=?').all(run.id,run.floor) as {item:string}[]).map(x=>x.item) : (this.db.prepare('SELECT product FROM shop_receipts WHERE run_id=? AND floor=? AND kind=? AND revision=?').all(run.id,run.floor,'items',this.shopRevision(run,'items')) as {product:string}[]).map(x=>x.product);}
  rerollShop(owner:string,id:string,floor:number,kind:unknown,revision:unknown){this.tx(()=>{
   const run=this.ownedRun(owner,id);if(run.state!=='select'||run.floor!==floor||!isShopFloor(floor,run.total_floors))throw new BattleRequestError('상점에서만 리롤할 수 있습니다.',409);
   if(kind!=='items'&&kind!=='machines')throw new BattleRequestError('도구 또는 기술머신 상점을 선택하세요.',400);this.checkShopRevision(run,kind,revision);
   const count=this.shopRevision(run,kind);if(count>=this.permanentView(owner).rerollLimit)throw new BattleRequestError('이번 상점의 리롤을 모두 사용했습니다.',409);const price=rerollPrice(count);if(!this.db.prepare('UPDATE players SET coins=coins-? WHERE id=? AND coins>=?').run(price,owner,price).changes)throw new BattleRequestError('보유 자금이 부족합니다.',400);
   this.db.prepare('INSERT INTO shop_rerolls VALUES (?,?,?,?) ON CONFLICT(run_id,floor,kind) DO UPDATE SET count=excluded.count').run(id,floor,kind,count+1);
   if(kind==='items')this.itemOffers(run,true);else this.machineOffers(owner,run,true);
  });}
  private runBonuses(id:string){const result:Record<string,Partial<StatBlock>>={};for(const x of this.db.prepare('SELECT species,stat,points FROM run_stat_boosts WHERE run_id=?').all(id) as {species:string;stat:keyof StatBlock;points:number}[]){(result[x.species]??={})[x.stat]=x.points;}return result;}
  private boostedProfiles(id:string,profiles:Record<string,TrainingProfile>){const bonuses=this.runBonuses(id);return Object.fromEntries(Object.entries(profiles).map(([name,p])=>[name,{...p,...(bonuses[name]?{runBonuses:bonuses[name]}:{})}]));}
  private vitaminOffers(run:RunRow){let row=this.db.prepare('SELECT offers FROM vitamin_shops WHERE run_id=? AND floor=?').get(run.id,run.floor) as {offers:string}|undefined;
   if(!row){const keys=[...statKeys];let counter=0;const random=()=>createHash('sha256').update(run.id+':vitamins:'+run.floor+':'+counter++).digest().readUInt32LE(0)/4294967296;for(let i=keys.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[keys[i],keys[j]]=[keys[j],keys[i]];}this.db.prepare('INSERT INTO vitamin_shops VALUES (?,?,?)').run(run.id,run.floor,JSON.stringify(keys.slice(0,4)));row=this.db.prepare('SELECT offers FROM vitamin_shops WHERE run_id=? AND floor=?').get(run.id,run.floor) as {offers:string};}
   const purchased=(this.db.prepare('SELECT stat FROM vitamin_purchases WHERE run_id=? AND floor=?').all(run.id,run.floor) as {stat:string}[]).map(x=>x.stat);
   return (JSON.parse(row.offers) as (keyof StatBlock)[]).map(stat=>({stat,price:vitaminPrice(run.floor),purchased:purchased.includes(stat)}));
  }
  private vitaminCounts(runId:string):Record<string,number>{return Object.fromEntries((this.db.prepare('SELECT species,COUNT(*) AS count FROM vitamin_purchases WHERE run_id=? GROUP BY species').all(runId) as {species:string;count:number}[]).map(row=>[row.species,row.count]));}
  purchaseVitamin(owner:string,id:string,floor:number,stat:unknown,name:unknown){this.tx(()=>{
   const run=this.ownedRun(owner,id);if(run.state!=='select'||run.floor!==floor||!isShopFloor(floor,run.total_floors))throw new BattleRequestError('상점에서만 능력치를 강화할 수 있습니다.',409);
   const offer=this.vitaminOffers(run).find(x=>x.stat===stat);if(!offer||typeof name!=='string'||!this.roster(id).includes(name))throw new BattleRequestError('판매 중인 영양제와 파티 포켓몬을 선택하세요.',400);
   if(offer.purchased)throw new BattleRequestError('이미 구매한 영양제입니다.',409);
   if((this.vitaminCounts(id)[name]??0)>=VITAMIN_LIMIT)throw new BattleRequestError('한 포켓몬은 이번 도전에서 종류와 관계없이 영양제를 총 3개까지만 사용할 수 있습니다.',409);
   if(!this.db.prepare('UPDATE players SET coins=coins-? WHERE id=? AND coins>=?').run(offer.price,owner,offer.price).changes)throw new BattleRequestError('보유 자금이 부족합니다.',400);
   this.db.prepare('INSERT INTO vitamin_purchases VALUES (?,?,?,?,?)').run(id,floor,stat as string,name,offer.price);
   this.db.prepare('INSERT INTO run_stat_boosts VALUES (?,?,?,?) ON CONFLICT(run_id,species,stat) DO UPDATE SET points=points+excluded.points').run(id,name,stat as string,VITAMIN_BOOST);
  });}

  private bagItem(runId:string,item:string,quantity:number) {
    this.db.prepare('INSERT INTO run_item_bag VALUES (?,?,?) ON CONFLICT(run_id,item) DO UPDATE SET quantity=quantity+excluded.quantity').run(runId,item,quantity);
  }
  private setHeldItem(runId:string,species:string,item:string|null) {
    if(selectedForm(species,this.runProfiles(runId)[species]?.forme)?.requiredItem)throw new BattleRequestError('이 모습은 전용 도구가 고정되어 있습니다.',400);
    if(item&&!allowsRuleItem(this.runRule(runId),item))throw new BattleRequestError('이 룰에서는 사용할 수 없는 도구입니다.',409);
    if(item && !canEquipGimmick(species,item))throw new BattleRequestError('이 포켓몬에게 맞는 기믹 도구가 아닙니다.',400);
    const old=(this.db.prepare('SELECT item FROM run_held_items WHERE run_id=? AND species=?').get(runId,species) as {item:string}|undefined)?.item;if(old===item)return;
    if(item && this.db.prepare('SELECT 1 FROM run_held_items WHERE run_id=? AND item=? AND species<>?').get(runId,item,species))throw new BattleRequestError('같은 종류의 도구는 한 마리만 장착할 수 있습니다. 먼저 다른 포켓몬의 도구를 해제하세요.',409);
    if(item && !this.db.prepare('UPDATE run_item_bag SET quantity=quantity-1 WHERE run_id=? AND item=? AND quantity>0').run(runId,item).changes)throw new BattleRequestError('가방에 없는 도구입니다.',409);
    if(old)this.bagItem(runId,old,1);
    this.db.prepare('DELETE FROM run_held_items WHERE run_id=? AND species=?').run(runId,species);
    if(item)this.db.prepare('INSERT INTO run_held_items VALUES (?,?,?)').run(runId,species,item);
  }
  purchaseItem(owner:string,runId:string,expectedFloor:number,item:unknown,species:unknown,revision:unknown=0) {
    this.tx(()=>{
      const run=this.ownedRun(owner,runId);
      if(run.state!=='select' || run.floor!==expectedFloor || !isShopFloor(run.floor,run.total_floors))throw new BattleRequestError('도구는 체크포인트 클리어 후 상점에서 구매할 수 있습니다.',409);
      this.checkShopRevision(run,'items',revision);
      if(!isHeldItem(item) || (species!==null && (typeof species!=='string' || !this.roster(runId).includes(species))))throw new BattleRequestError('도구와 파티 포켓몬을 선택하세요.',400);
      if(itemShopRule(item).minClearedFloor>run.floor-1 || !this.itemOffers(run).includes(item))throw new BattleRequestError('이번 상점에서 판매하지 않는 도구입니다.',409);
      if((this.db.prepare('SELECT 1 FROM run_item_bag WHERE run_id=? AND item=? AND quantity>0').get(runId,item)) || Object.values(this.heldItems(runId)).includes(item))throw new BattleRequestError('이미 보유한 도구입니다. 가방에서 장착하세요.',409);
      if(!this.roster(runId).some(name=>this.canHoldItem(runId,name,item)))throw new BattleRequestError('파티에 맞는 포켓몬이 없는 도구입니다.',400);
      if(this.itemPurchases(run).includes(item))throw new BattleRequestError('이번 상점에서 이미 구매한 도구입니다.',409);
      const price=heldItems[item].price;
      if(!this.db.prepare('UPDATE players SET coins=coins-? WHERE id=? AND coins>=?').run(price,owner,price).changes)throw new BattleRequestError('보유 자금이 부족합니다.',400);
      this.db.prepare('INSERT OR IGNORE INTO item_purchases VALUES (?,?,?)').run(runId,run.floor,item);
      this.db.prepare('INSERT INTO shop_receipts VALUES (?,?,?,?,?,?)').run(runId,run.floor,'items',this.shopRevision(run,'items'),item,species);
      this.bagItem(runId,item,1);if(typeof species==='string')this.setHeldItem(runId,species,item);
    });
  }
  equipItem(owner:string,runId:string,expectedFloor:number,species:unknown,item:unknown,swapFrom?:unknown) {
    this.tx(()=>{
      const run=this.ownedRun(owner,runId);
      if(run.state!=='select' || run.floor!==expectedFloor)throw new BattleRequestError('도구는 다음 층 준비에서 변경할 수 있습니다.',409);
      if(typeof species!=='string' || !this.roster(runId).includes(species) || (item!==null && !isHeldItem(item)))throw new BattleRequestError('도구와 파티 포켓몬을 선택하세요.',400);
      const holder=item?(this.db.prepare('SELECT species FROM run_held_items WHERE run_id=? AND item=? AND species<>?').get(runId,item,species) as {species:string}|undefined)?.species:undefined;
      if(holder){
        if(swapFrom!==holder)throw new BattleRequestError('같은 도구는 한 마리만 장착합니다. 현재 소지자를 확인하고 도구 이동·교환을 승인하세요.',409);
        const old=this.heldItems(runId)[species];
        if(!allowsRuleItem(this.runRule(runId),item as string) || !canEquipGimmick(species,item as string) || old && !canEquipGimmick(holder,old))throw new BattleRequestError('두 포켓몬에게 맞는 도구만 교환할 수 있습니다.',400);
        if(selectedForm(species,this.runProfiles(runId)[species]?.forme)?.requiredItem || selectedForm(holder,this.runProfiles(runId)[holder]?.forme)?.requiredItem)throw new BattleRequestError('전용 도구가 고정된 모습은 도구를 교환할 수 없습니다.',400);
        this.db.prepare('DELETE FROM run_held_items WHERE run_id=? AND species IN (?,?)').run(runId,species,holder);
        this.db.prepare('INSERT INTO run_held_items VALUES (?,?,?)').run(runId,species,item);
        if(old)this.db.prepare('INSERT INTO run_held_items VALUES (?,?,?)').run(runId,holder,old);
        return;
      }
      if(swapFrom!==undefined)throw new BattleRequestError('도구 소지자가 바뀌었습니다. 다시 선택해 주세요.',409);
      this.setHeldItem(runId,species,item as string|null);
    });
  }
  private runProfiles(runId:string):Record<string,TrainingProfile> {
    return JSON.parse((this.db.prepare('SELECT profiles FROM runs WHERE id=?').get(runId) as {profiles:string}).profiles);
  }
  private machineOffers(owner:string,run:RunRow,regenerate=false):MachineOffer[] {
    let saved=this.db.prepare('SELECT offers FROM machine_shops WHERE run_id=? AND floor=?').get(run.id,run.floor) as {offers:string}|undefined;
    if(!saved||regenerate) {
      const roster=this.roster(run.id),profiles=this.runProfiles(run.id);
      const options=Object.fromEntries(roster.map(name=>[name,{known:this.unlockedMoves(owner,name),legal:trainingOptions(name,profiles[name]?.forme).learnableMoves,current:profiles[name]?.moves ?? this.savedTraining(owner,name).profile.moves}]));
      const candidates=machineMoves.map(move=>({move,rarity:machineRarity(move),price:machinePrice(move),targets:roster.filter(name=>options[name].legal.includes(move) && !options[name].known.includes(move) && !options[name].current.includes(move)),purchased:false})).filter(offer=>offer.targets.length);
      let counter=0;const random=()=>createHash('sha256').update(`${run.id}:machine-shop:${run.floor}:${this.shopRevision(run,"machines") ? "roll"+this.shopRevision(run,"machines")+":" : ""}${counter++}`).digest().readUInt32BE(0)/0x100000000;
      // A single saved row freezes the complete selection, including for existing checkpoints.
      this.db.prepare('INSERT INTO machine_shops VALUES (?,?,?) ON CONFLICT(run_id,floor) DO UPDATE SET offers=excluded.offers').run(run.id,run.floor,JSON.stringify(rollMachineOffers(candidates,run.floor-1,random)));
      saved=this.db.prepare('SELECT offers FROM machine_shops WHERE run_id=? AND floor=?').get(run.id,run.floor) as {offers:string};
    }
    const purchases=(this.shopRevision(run,'machines')===0 ? this.db.prepare('SELECT move,species FROM machine_purchases WHERE run_id=? AND floor=?').all(run.id,run.floor) : this.db.prepare('SELECT product AS move,buyer AS species FROM shop_receipts WHERE run_id=? AND floor=? AND kind=? AND revision=?').all(run.id,run.floor,'machines',this.shopRevision(run,'machines'))) as {move:string;species:string}[];
    return (JSON.parse(saved.offers) as MachineOffer[]).map(offer=>{const purchase=purchases.find(entry=>entry.move===offer.move);return {...offer,purchased:!!purchase,...(purchase ? {buyer:purchase.species} : {})};});
  }
  purchaseMachine(owner:string,runId:string,expectedFloor:number,move:unknown,name:unknown,slot:unknown=null,revision:unknown=0) {
    this.tx(()=>{
      const run=this.ownedRun(owner,runId);
      if(run.state!=='select' || !isShopFloor(run.floor,run.total_floors) || run.floor!==expectedFloor)throw new BattleRequestError('기술머신은 체크포인트 클리어 후 상점에서 구매할 수 있습니다.',409);
      this.checkShopRevision(run,'machines',revision);
      const offer=this.machineOffers(owner,run).find(offer=>offer.move===move);
      if(!offer)throw new BattleRequestError('상점에 제시된 기술머신을 선택하세요.',400);
      if(offer.purchased)throw new BattleRequestError('이미 구매한 기술머신입니다.',409);
      if(typeof name!=='string' || !this.roster(run.id).includes(name) || !offer.targets.includes(name) || !trainingOptions(name,this.runProfiles(run.id)[name]?.forme).learnableMoves.includes(offer.move))throw new BattleRequestError('이 기술을 배울 수 있는 파티 포켓몬을 선택하세요.',400);
      const snapshots=this.runProfiles(run.id),current=snapshots[name] ?? this.savedTraining(owner,name).profile;
      if(this.unlockedMoves(owner,name).includes(offer.move) || current.moves.includes(offer.move))throw new BattleRequestError('이미 수집한 기술입니다.',409);
      if(slot!==null) {
        if(!Number.isInteger(slot) || (slot as number)<0 || (slot as number)>Math.min(current.moves.length,3))throw new BattleRequestError('교체할 기술 칸을 선택하세요.',400);
        const edited=structuredClone(current);edited.moves[slot as number]=offer.move;
        snapshots[name]=validateProfile(name,edited);
      }
      if(!this.db.prepare('UPDATE players SET coins=coins-? WHERE id=? AND coins>=?').run(offer.price,owner,offer.price).changes)throw new BattleRequestError('보유 자금이 부족합니다.',400);
      this.db.prepare('INSERT OR IGNORE INTO machine_purchases VALUES (?,?,?,?,?,?)').run(run.id,run.floor,offer.move,name,slot as number|null,offer.price);
      this.db.prepare('INSERT INTO shop_receipts VALUES (?,?,?,?,?,?)').run(run.id,run.floor,'machines',this.shopRevision(run,'machines'),offer.move,name);
      this.db.prepare('INSERT INTO move_unlocks VALUES (?,?,?)').run(owner,name,offer.move);
      if(slot!==null)this.db.prepare('UPDATE runs SET profiles=? WHERE id=?').run(JSON.stringify(snapshots),run.id);
    });
  }
  private battleItemBag(id:string){return Object.fromEntries((this.db.prepare('SELECT kind,quantity FROM run_battle_items WHERE run_id=? AND quantity>0').all(id) as {kind:UpgradeKind;quantity:number}[]).map(x=>[x.kind,x.quantity]));}
  purchase(owner:string,runId:string,expectedFloor:number,kind:unknown) {
    return this.tx(()=>{
      const run=this.ownedRun(owner,runId);
      if(run.state!=='select' || !isShopFloor(run.floor,run.total_floors) || run.floor!==expectedFloor) throw new BattleRequestError('상점은 체크포인트 클리어 후 다음 층 준비에서 이용할 수 있습니다.',409);
      if(typeof kind!=='string' || !Object.hasOwn(upgrades,kind)) throw new BattleRequestError('구매할 강화를 선택하세요.',400);
      if(!this.consumableOffers(run).includes(kind as UpgradeKind))throw new BattleRequestError('현재 상점에서 판매 중인 소모품을 선택하세요.',400);
      const item=upgrades[kind as UpgradeKind];
      const paid=this.db.prepare('UPDATE players SET coins=coins-? WHERE id=? AND coins>=?').run(item.price,owner,item.price);
      if(!paid.changes) throw new BattleRequestError('보유 자금이 부족합니다.',400);
      this.db.prepare('INSERT INTO run_battle_items VALUES (?,?,1) ON CONFLICT(run_id,kind) DO UPDATE SET quantity=quantity+1').run(runId,kind);
    });
  }
  history(id: string): string[] {
    return (this.db.prepare('SELECT command FROM actions WHERE battle_id = ? ORDER BY request_id').all(id) as {command: string}[]).map(row => row.command);
  }
  input(owner: string, id: string, requestId: number, command: string) {
    this.tx(() => {
      const battle = this.battle(id);
      const run = this.ownedRun(owner, battle.run_id);
      const count = this.db.prepare('SELECT COUNT(*) AS n FROM actions WHERE battle_id = ?').get(id) as {n: number};
      if (battle.status !== 'active' || run.state !== 'battle' || requestId !== count.n + 1) throw new BattleRequestError('이미 처리된 행동입니다.', 409);
      if(command.startsWith('item ')){const kind=command.slice(5);if(!Object.hasOwn(upgrades,kind)||!this.db.prepare('UPDATE run_battle_items SET quantity=quantity-1 WHERE run_id=? AND kind=? AND quantity>0').run(run.id,kind).changes)throw new BattleRequestError('보유한 배틀 아이템이 없습니다.',409);}
      if(command.endsWith(' terastallize')){
        if(this.history(id).some(action=>action.endsWith(' terastallize')) || !this.db.prepare('UPDATE run_tera_tickets SET quantity=quantity-1 WHERE run_id=? AND quantity>0').run(run.id).changes)throw new BattleRequestError('사용할 테라권이 없습니다.',409);
      }
      this.db.prepare('INSERT INTO actions VALUES (?, ?, ?)').run(id, requestId, command);
    });
  }
  // Internal completion callback only. No HTTP endpoint accepts a client winner or amount.
  complete(id: string, log: BattleLog, view: BattleView) {
    this.tx(() => {
      const battle = this.battle(id);
      if (battle.status === 'complete') return;
      const run = this.db.prepare('SELECT * FROM runs WHERE id = ?').get(battle.run_id) as RunRow;
      if (run.state !== 'battle' || run.floor !== battle.floor || log.engineVersion !== battle.engine_version || log.format !== battle.format ||
        log.teams.p1 !== battle.player_team || log.teams.p2 !== battle.opponent_team || JSON.stringify(log.seed) !== battle.seed || JSON.stringify(log.upgrades ?? []) !== battle.upgrades ||
        (log.teraTickets ? JSON.stringify(log.teraTickets)!==battle.tera_tickets : log.publicProtocol.some(line=>line.startsWith('|-terastallize|')))) throw new Error('Battle result environment mismatch');
    if((log.rule??'chaos')!==battle.rule)throw new Error('Battle result rule mismatch');
      this.db.prepare("UPDATE battles SET status = 'complete', log = ?, view = ? WHERE id = ?").run(JSON.stringify(log), JSON.stringify(view), id);
      // Reconcile actual engine item events once, after the saved battle completes.
      const team=Showdown.Teams.unpack(battle.player_team) ?? [];
      const remaining=new Map(team.map(set=>[set.name || set.species,{species:collectionSpecies(set.species),item:set.item || null}]));
      for(const line of log.publicProtocol){
        const [,event,actor,value,...tags]=line.split('|');
        if(!actor?.startsWith('p1a:'))continue;
        const member=remaining.get(actor.split(': ')[1]);if(!member)continue;
        // Eating spends this battle's activation, not the equipped tool.
        // Other removal events (e.g. Knock Off) still remove the item.
        if(event==='-enditem' && !retainsHeldItemAfterActivation(normalizeHeldItem(value)??value,tags))member.item=null;
        // Frisk only reveals equipment; it never equips or removes a tool.
        else if(event==='-item' && !tags.includes('[from] ability: Frisk'))member.item=normalizeHeldItem(value);
      }
      for(const member of remaining.values()){
        this.db.prepare('DELETE FROM run_held_items WHERE run_id=? AND species=?').run(run.id,member.species);
        if(member.item)this.db.prepare('INSERT INTO run_held_items VALUES (?,?,?)').run(run.id,member.species,member.item);
      }
      if (log.winner === 'Player') {
        const event=battle.villain_event ? JSON.parse(battle.villain_event) as VillainEvent : null;
        if(event?.rank==='boss')this.db.prepare('UPDATE run_villain_campaigns SET defeated_battle_id=? WHERE run_id=? AND defeated_battle_id IS NULL').run(id,run.id);
        this.db.prepare('INSERT INTO rewards VALUES (?, ?, ?)').run(id, run.player_id, battle.reward);
        this.db.prepare('UPDATE players SET coins = coins + ? WHERE id = ?').run(battle.reward, run.player_id);
        this.db.prepare("UPDATE runs SET state = 'recruit' WHERE id = ?").run(run.id);
      } else {
        this.db.prepare("UPDATE runs SET state = 'lost' WHERE id = ?").run(run.id);
        const retry=this.retryState(run.id);
        if(retry.used>=retry.retry_limit)this.settleGrowth(run.id,'lost');
      }
    });
  }
  recruit(owner: string, runId: string, battleId: string, chosen: string | null, replaced: string | null, swap?:unknown, collectOnly=false) {
    this.tx(() => {
      const run = this.ownedRun(owner, runId);
      const battle = this.battle(battleId);
      if (run.state !== 'recruit' || battle.run_id !== run.id || battle.floor !== run.floor || battle.status !== 'complete') throw new BattleRequestError('이미 처리되었거나 영입할 수 없는 상태입니다.', 409);
      const candidates = (Showdown.Teams.unpack(battle.opponent_team) ?? []).map(set=>set.species).filter(isCollectibleSpecies);
      const roster = this.roster(run.id);
      let ivGain:IVGain|null=null,moveGain:MoveGain|null=null;
      if(typeof collectOnly!=='boolean' || (collectOnly && (chosen===null || replaced!==null || (swap!==undefined && swap!==null))))throw new BattleRequestError('기술만 저장할 때는 상대만 선택하세요.',400);
      if (chosen !== null) {
        if (!candidates.includes(chosen)) throw new BattleRequestError('상대 팀의 포켓몬을 선택하세요.', 400);
        if(collectOnly) {
          // Collection is permanent; joining this run is a separate choice.
        } else if(roster.includes(chosen)) {
          if(replaced!==null)throw new BattleRequestError('보유 포켓몬의 개체값 갱신에는 교체가 필요하지 않습니다.',400);
        } else if (roster.length >= 6) {
          if (!replaced || !roster.includes(replaced)) throw new BattleRequestError('보유 한도 6마리입니다. 교체할 멤버를 선택하세요.', 400);
          this.setHeldItem(run.id,replaced,null);
          this.db.prepare('UPDATE members SET species = ? WHERE run_id = ? AND species = ?').run(chosen, run.id, replaced);
        } else {
          if (replaced !== null) throw new BattleRequestError('빈자리가 있으므로 교체 없이 영입하세요.', 400);
          this.db.prepare('INSERT INTO members VALUES (?, ?, ?)').run(run.id, roster.length, chosen);
        }
        const wasUnlocked=!!this.db.prepare('SELECT 1 FROM unlocks WHERE player_id=? AND species=?').get(owner,chosen);
        this.db.prepare('INSERT OR IGNORE INTO unlocks VALUES (?, ?)').run(owner, chosen);
        const opponent=Showdown.Teams.unpack(battle.opponent_team)!.find(set=>set.species===chosen)!;
        const incoming=(opponent.ivs ?? pokemonSets[chosen as keyof typeof pokemonSets].ivs) as StatBlock,before=this.savedTraining(owner,chosen);
        const improved=Object.fromEntries(statKeys.map(stat=>[stat,Math.max(before.profile.ivs[stat],incoming[stat])])) as StatBlock;
        ivGain={species:chosen,changes:statKeys.filter(stat=>improved[stat]>before.profile.ivs[stat]).map(stat=>({stat,from:before.profile.ivs[stat],to:improved[stat]}))};
        this.db.prepare('INSERT INTO pokemon_training VALUES (?,?,?,?) ON CONFLICT(player_id,species) DO UPDATE SET profile=excluded.profile,revision=excluded.revision').run(owner,chosen,JSON.stringify({...before.profile,gender:wasUnlocked ? before.profile.gender : opponent.gender || 'N',ivs:improved,shiny:!!before.profile.shiny||!!opponent.shiny}),before.revision+1);
        const snapshots=JSON.parse((this.db.prepare('SELECT profiles FROM runs WHERE id=?').get(run.id) as {profiles:string}).profiles) as Record<string,TrainingProfile>;
        const current=snapshots[chosen] ?? structuredClone(before.profile);if(!roster.includes(chosen))current.gender=(opponent.gender || 'N') as import('../data/gender').PokemonGender;
        const known=this.unlockedMoves(owner,chosen);
        const available=opponent.moves.filter(move=>moveLearnsets[chosen].legalMoves.includes(move));
        moveGain={species:chosen,moves:available.filter(move=>!known.includes(move))};
        for(const move of available)this.db.prepare('INSERT OR IGNORE INTO move_unlocks VALUES (?,?,?)').run(owner,chosen,move);
        if(swap!==undefined && swap!==null) {
          const value=swap as MoveSwap;
          if(typeof value!=='object' || typeof value.move!=='string' || !Number.isInteger(value.slot) || value.slot<0 || value.slot>Math.min(current.moves.length,3) || !available.includes(value.move))throw new BattleRequestError('가져올 기술과 교체할 기술을 선택하세요.',400);
          if(current.moves.some((move,index)=>index!==value.slot && move===value.move))throw new BattleRequestError('같은 기술을 중복 배치할 수 없습니다.',400);
          moveGain.equipped={move:value.move,replaced:current.moves[value.slot] ?? '빈 기술 칸',slot:value.slot};
          current.moves=[...current.moves];current.moves[value.slot]=value.move;
        }
        if(!collectOnly) {
          snapshots[chosen]={...current,ivs:Object.fromEntries(statKeys.map(stat=>[stat,Math.max(current.ivs[stat],incoming[stat])])) as StatBlock};
          this.db.prepare('UPDATE runs SET profiles=? WHERE id=?').run(JSON.stringify(snapshots),run.id);
        }
      } else if (replaced !== null || (swap!==undefined && swap!==null)) throw new BattleRequestError('영입하지 않으면 교체할 수 없습니다.', 400);
      this.db.prepare('INSERT INTO recruitments(battle_id,species,replaced,iv_gain,move_gain) VALUES (?, ?, ?, ?, ?)').run(battle.id, chosen, replaced,ivGain ? JSON.stringify(ivGain) : null,moveGain ? JSON.stringify(moveGain) : null);
      const route=this.route(run.id),theme=this.runTheme(run.id);
      if(route && run.floor%50===0 && (theme==='johto'||theme==='kanto') && route.pending_boss!==run.floor){
        this.db.prepare('UPDATE run_routes SET pending_boss=? WHERE run_id=?').run(run.floor,run.id);
        this.db.prepare("UPDATE runs SET state='select' WHERE id=?").run(run.id);return;
      }
      if(route?.pending_boss===run.floor)this.db.prepare('UPDATE run_routes SET pending_boss=0 WHERE run_id=?').run(run.id);
      if (run.floor === run.total_floors) {
        this.db.prepare("UPDATE runs SET state = 'cleared' WHERE id = ?").run(run.id);
        this.settleGrowth(run.id,'cleared');
      }
      else this.db.prepare("UPDATE runs SET state = 'select', floor = floor + 1 WHERE id = ?").run(run.id);
    });
  }
  abandon(owner: string, runId: string) {
    this.tx(() => {
      const run = this.ownedRun(owner, runId);
      if (!['battle','select','recruit'].includes(run.state)) throw new BattleRequestError('진행 중인 도전이 아닙니다.', 409);
      this.db.prepare("UPDATE runs SET state = 'abandoned' WHERE id = ?").run(run.id);
      this.settleGrowth(run.id,'abandoned');
    });
  }
  private growthBase(runId:string) {
    const score=this.db.prepare(`SELECT COUNT(*) AS wins, COALESCE(SUM(CASE WHEN battles.boss IS NOT NULL THEN 1 ELSE 0 END),0) AS bosses FROM rewards JOIN battles ON battles.id=rewards.battle_id WHERE battles.run_id=?`).get(runId) as {wins:number;bosses:number};
    return score.wins*20+score.bosses*50;
  }
  trainingCollection(owner:string):TrainingView[] {
    const unlocked=this.db.prepare('SELECT species FROM unlocks WHERE player_id=? ORDER BY rowid').all(owner) as {species:string}[];
    return unlocked.filter(({species})=>isCollectibleSpecies(species)).map(({species})=>{
      const saved=this.savedTraining(owner,species),forms=familyForms(species),base=defaultProfile(species);
      const formOptions=forms.length?[{species,name:baseFormName(species,importedPokemonName(species)),spriteKey:String(separateForms[species]?.id??Showdown.Dex.species.get(species).num),moves:base.moves,ability:base.ability,abilities:trainingOptions(species).abilities,baseStats:trainingOptions(species).baseStats,teraType:base.teraType!},...forms.map(([name,form])=>({species:name,name:form.name,spriteKey:String(form.id),moves:form.moves,ability:form.ability,abilities:form.abilities,baseStats:form.baseStats,teraType:defaultProfile(species,name).teraType!,requiredItem:form.requiredItem}))]:undefined;
      return {species,genders:genderOptions(species),...saved,...trainingOptions(species,saved.profile.forme),selfMoves:profileLearnset(species,saved.profile.forme).selfMoves,unlockedMoves:this.unlockedMoves(owner,species),...(formOptions?{formOptions}:{})};
    });
  }
  private unlockedMoves(owner:string,species:string):string[] {
    const saved=this.savedTraining(owner,species);
    return [...new Set([...moveLearnsets[species].selfMoves,...profileLearnset(species,saved.profile.forme).selfMoves,...saved.profile.moves,...(this.db.prepare('SELECT move FROM move_unlocks WHERE player_id=? AND species=?').all(owner,species) as {move:string}[]).map(row=>row.move)])];
  }
  private machinePartners(owner:string,runId:string) {
    const profiles=this.boostedProfiles(runId,this.runProfiles(runId));
    return Object.fromEntries(this.roster(runId).map(name=>{
      const profile=profiles[name] ?? this.savedTraining(owner,name).profile,base=trainingOptions(name,profile.forme).baseStats;
      const level=pokemonSets[name].level,nature=natures.find(value=>value.id===profile.nature);
      const stats=Object.fromEntries(statKeys.map(key=>{
        if(profile.statSystem==='points')return [key,trainedStat(base[key],profile.ivs[key],profile.evs[key]+(profile.runBonuses?.[key]??0),key,profile.nature)];
        const neutral=Math.floor((2*base[key]+profile.ivs[key]+Math.floor(profile.evs[key]/4))*level/100)+(key==='hp' ? level+10 : 5);
        return [key,key==='hp' ? base.hp===1 ? 1 : neutral+(profile.runBonuses?.[key]??0) : Math.floor((neutral+(profile.runBonuses?.[key]??0))*(nature?.plus===key ? 1.1 : nature?.minus===key ? .9 : 1))];
      })) as StatBlock;
      return [name,{stats,level,ability:profile.ability,nature:profile.nature,knownMoves:this.unlockedMoves(owner,name)}];
    }));
  }
  private savedTraining(owner:string,species:string):{profile:TrainingProfile;revision:number} {
    const saved=this.db.prepare('SELECT profile,revision FROM pokemon_training WHERE player_id=? AND species=?').get(owner,species) as {profile:string;revision:number}|undefined;
    const profile:TrainingProfile=saved ? {...defaultProfile(species),...JSON.parse(saved.profile)} : defaultProfile(species);
    profile.gender ??= saved ? pokemonSets[species].gender as import('../data/gender').PokemonGender : collectionGender(species,owner);
    return {profile,revision:saved?.revision ?? 0};
  }
  train(owner:string,name:string,revision:number,value:unknown,adjustment?:{id:string;floor:number;snapshot:string}) {
    this.tx(()=>{
      if(!isCollectibleSpecies(name))throw new BattleRequestError('현재 수집 목록에서 제외된 포켓몬입니다.',400);
      if(!this.db.prepare('SELECT 1 FROM unlocks WHERE player_id=? AND species=?').get(owner,name))throw new BattleRequestError('해금한 포켓몬만 설정할 수 있습니다.',403);
      const run=adjustment?this.ownedRun(owner,adjustment.id):null;
      if(run && (run.state!=='select'||run.floor!==adjustment!.floor||(!isShopFloor(run.floor,run.total_floors)&&!this.retryState(run.id).pending_battle_id)||!this.roster(run.id).includes(name)))throw new BattleRequestError('정비 구간에서 보유 포켓몬만 조정할 수 있습니다.',409);
      if(run && adjustment!.snapshot!==createHash('sha256').update(JSON.stringify(this.runProfiles(run.id))).digest('hex'))throw new BattleRequestError('파티 설정이 변경됐습니다. 다시 확인하세요.',409);
      const before=this.trainingCollection(owner).find(entry=>entry.species===name)!;
      if(revision!==before.revision)throw new BattleRequestError('설정이 이미 변경됐습니다. 도감을 다시 불러오세요.',409);
      const profile={...validateProfile(name,value),gender:(value as TrainingProfile).gender ?? before.profile.gender,shiny:before.profile.shiny ?? false};
      const formChanged=profile.forme!==(run?this.runProfiles(run.id)[name]?.forme:before.profile.forme);
      if(run&&formChanged)throw new BattleRequestError('모습은 출발 전에 설정하세요.',400);
      const cost=trainingCost(formChanged?{...before.profile,ability:defaultProfile(name,profile.forme).ability}:before.profile,profile);
      const known=new Set([...before.unlockedMoves,...profileLearnset(name,profile.forme).selfMoves]);
      if(profile.moves.some(move=>!known.has(move)))throw new BattleRequestError('아직 해금하지 않은 기술입니다. 상대 포켓몬을 영입해 기술을 모으세요.',400);
      if(statKeys.some(stat=>profile.ivs[stat]!==before.profile.ivs[stat]))throw new BattleRequestError('개체값은 상대 포켓몬 영입으로만 높일 수 있습니다.',400);
      if(!this.db.prepare('UPDATE players SET growth_points=growth_points-? WHERE id=? AND growth_points>=?').run(cost,owner,cost).changes)throw new BattleRequestError('성장 포인트가 부족합니다.',400);
      this.db.prepare('INSERT INTO pokemon_training VALUES (?,?,?,?) ON CONFLICT(player_id,species) DO UPDATE SET profile=excluded.profile,revision=excluded.revision').run(owner,name,JSON.stringify(profile),revision+1);
      if(run){const snapshots=this.runProfiles(run.id);snapshots[name]=profile;this.db.prepare('UPDATE runs SET profiles=? WHERE id=?').run(JSON.stringify(snapshots),run.id);}
    });
  }
  private settleGrowth(runId:string,outcome:'lost'|'cleared'|'abandoned') {
    const amount=this.growthBase(runId)+(outcome==='cleared' ? 100 : outcome==='lost' ? 10 : 0);
    const saved=this.db.prepare('INSERT OR IGNORE INTO growth_rewards VALUES (?,?)').run(runId,amount);
    if(saved.changes) this.db.prepare('UPDATE players SET growth_points=growth_points+? WHERE id=(SELECT player_id FROM runs WHERE id=?)').run(amount,runId);
  }
  close() { this.db.close(); }
}
