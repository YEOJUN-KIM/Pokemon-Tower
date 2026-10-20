import {npcAi} from '../data/npc-ai';
import {HiddenBossEvents,hiddenBossEligible,hasHiddenBoss} from './hidden-boss-events';
import {VillainCampaigns} from './villain-campaigns';
import {isRocketStage} from '../data/villain-campaigns';
import {recentEncounters} from './encounter-history';
import {RewardInventory} from './reward-inventory';
import {RaidEvents} from './raid-events';
import type {RaidRecruitSet} from './raid-recruitment';
import {rollEncounterShiny} from './shiny';
import {RunBag} from './run-bag';
import {ownsRunItem,ownsMachine,runMachines} from './run-ownership';
import {readVitaminUsage,grantRunItem,grantEquipment,grantStoredReward,applyVitamin} from './inventory-grants';
import {ChallengerEvents} from './challenger-events';
import type {SavedChallengerDefinition} from '../data/challengers';
import {trainNpcTeam} from './npc-training';
import {generateNpcEncounter} from './npc-encounters';
import {npcSamples,npcTrainerSample} from '../data/npc-samples';
import {spendCoins,grantCoins} from './player-wallet';
import {RunEvents} from './run-events';
import {eventDefinitions,type RunEventRegistry} from '../data/run-events';
import {isTrainerEquipment,type TrainerEquipment} from '../data/trainer-equipment';
import type {PermanentView,PermanentResult} from '../data/permanent-upgrades';
import {PermanentShop} from './permanent-shop';
import {isBattleRule,allowsGimmick,allowsRuleItem,type BattleRule} from '../data/run-rules';
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
import { packTeam, packPlayerTeam, pokemonSets, initialPartners,trainedSet } from '../data/teams';
import {equippedFormSet} from '../data/equipped-form';
import {isCollectibleSpecies} from '../data/pokedex-roster';
import { engineVersion, FORMAT, type BattleLog, type Seed } from '../battle/run';
import type { BattleView, MachineOffer, RunView, TowerView } from '../shared/contracts';
import { BattleRequestError } from './request-error';
import {initializeTowerDatabase} from './storage/migrations';
import {transaction} from './storage/transaction';
import {formTrainingSettings,trainingFormProfile,saveTrainingForm} from './storage/form-training';
import {moveLearnsets} from './move-learnsets';
import {profileLearnset} from './move-learnsets';
import {familyForms,selectedForm,collectionSpecies,separateForms,baseFormName} from '../data/selectable-forms';
import {pokemonName as importedPokemonName} from '../data/pokemon-catalog';
import {generateOpponentTeam,selectTrainerSample,encounterPool} from './opponent-team';
import {runOrganization,type VillainEvent} from '../data/villain-organizations';
import {opponentProfile} from './opponent-training';
import {normalNpcTemplate} from './npc-templates';
import {primalOrbs} from '../data/primal-forms';
import {heldItems,isHeldItem,normalizeHeldItem} from '../data/held-items';
import {itemShopRule} from '../data/held-item-shop';
import {canonicalShopProduct,rollShopProducts,shopProductOptions,shopChoiceGroups,isShopChoice} from '../data/shop-products';
import {equipmentFormSpecies,heldForm,hasFixedFormItem,formItems} from '../data/form-items';
import {machinePrice,machineRarity,rollMachineOffers} from '../data/machine-rarities';
import {trainerCatalog,trainerView,type TrainerSample} from '../data/trainer-catalog';
import {pokedexEntries} from './pokedex-entries';
import Showdown from 'pokemon-showdown';
import {upgrades,machineMoves,MACHINE_COUNT,isShopFloor,rerollPrice,vitaminPrice,VITAMIN_BOOST,VITAMIN_LIMIT,type UpgradeKind} from '../data/shop';
import {collectionGender,speciesGender,genderOptions} from './pokemon-gender';
import {npcGimmick,npcSpecies,type NpcGimmick} from '../data/npc-gimmicks';
import {normalNpcCategory,normalNpcGimmicksEnabled} from '../data/normal-mode-stages';
import {megaStones,DYNAMAX_ITEM} from '../data/gimmicks';
import {zCrystals} from '../data/z-crystals';
import {defaultProfile,trainingOptions,validateProfile} from './training';
import {trainingCost,statKeys,trainedStat,natures,type StatBlock,type IVGain,type MoveGain,type MoveSwap,type TrainingProfile,type TrainingView} from '../data/training';

export const AI_VERSION = 'tower-policy-v13';
const favoriteSpecies=new Set(pokedexEntries().map(entry=>entry.species));
type RunRow = {id: string; player_id: string; floor: number; state: RunView['state']; total_floors: number};
export type BattleRow = {
  stage:number;
  encounter_order:number;rule:BattleRule;id: string; run_id: string; floor: number; player_team: string; opponent_team: string; seed: string;
  engine_version: string; format: string; ai_version: string; status: 'active' | 'complete';
  reward: number; candidates: string; log: string | null; view: string | null; boss: string | null; trainer:string|null;upgrades:string;battle_items:string;tera_tickets:string;trainer_equipment:string|null;villain_event:string|null;
};
export class TowerStore {
  readonly db: DatabaseSync;
  constructor(path: string,private readonly roll=(max:number)=>randomInt(max),private readonly eventRegistry:RunEventRegistry=eventDefinitions) {
    if (path !== ':memory:') mkdirSync(dirname(path), {recursive: true});
    this.db = new DatabaseSync(path);
    initializeTowerDatabase(this.db,()=>this.repairArchivedOwnership(),()=>this.repairFormHeldItems());
  }
  private repairFormHeldItems(){
    // Preserve masks already granted by old selected-form saves exactly once.
    for(const run of this.db.prepare('SELECT id,profiles FROM runs WHERE NOT EXISTS (SELECT 1 FROM run_form_item_rules WHERE run_id=runs.id)').all() as {id:string;profiles:string}[]){
      const profiles=JSON.parse(run.profiles) as Record<string,TrainingProfile>;
      const item=selectedForm('Ogerpon',profiles.Ogerpon?.forme)?.requiredItem;
      if(item&&this.roster(run.id).includes('Ogerpon'))this.db.prepare('INSERT OR IGNORE INTO run_held_items VALUES (?,?,?)').run(run.id,'Ogerpon',item);
      this.db.prepare('INSERT INTO run_form_item_rules VALUES (?,1)').run(run.id);
    }
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
    return transaction(this.db,fn);
  }
  private rewardInventory(owner:string,runId:string,floor:number){return new RewardInventory(this.db,{owner,runId,floor,roster:this.roster(runId),profiles:this.runProfiles(runId),known:species=>this.unlockedMoves(owner,species)});}
  private runBag(owner:string,runId:string){return new RunBag(this.db,{runId,roster:this.roster(runId),profiles:this.runProfiles(runId),held:this.heldItems(runId),rule:this.runRule(runId),partners:this.machinePartners(owner,runId)});}
  useBag(owner:string,runId:string,requestId:unknown,entryId:unknown,target:unknown,slot:unknown=null){this.tx(()=>{const run=this.ownedRun(owner,runId);if(run.state!=='select')throw new BattleRequestError('배낭은 비전투 준비 중 사용할 수 있습니다.',409);this.runBag(owner,runId).use(requestId,entryId,target,slot,(species,item)=>this.setHeldItem(runId,species,item));});}
  useReward(owner:string,runId:string,requestId:unknown,entryId:unknown,choiceId:unknown){this.tx(()=>{const run=this.ownedRun(owner,runId);if(run.state!=='select'||this.events.view(runId)&&!this.retryState(runId).pending_battle_id)throw new BattleRequestError('이벤트를 마친 뒤 출전 준비에서 사용하세요.',409);this.rewardInventory(owner,runId,run.floor).use(requestId,entryId,choiceId);});}
  private get events(){return new RunEvents(this.db,this.roll,this.eventRegistry);}
  chooseEvent(owner:string,runId:string,eventId:string,choice:unknown){this.tx(()=>{
    const row=this.events.owned(owner,runId,eventId);
    if(row.kind==='hidden-boss'&&choice==='challenge'){
      const hidden=new HiddenBossEvents(this.db),saved=hidden.row(eventId)!;
      if(saved.battle_id)return;
      if(row.status!=='choice'||row.choice_id)throw new BattleRequestError('이미 마친 이벤트입니다.',409);
      const snapshot=hidden.snapshot(saved);
      const battle=this.createBattle(runId,snapshot.floor,this.suggestedTeam(runId),undefined,snapshot);
      hidden.start(eventId,battle);return;
    }
    if((isRocketStage(row.kind)||row.kind==='villain-campaign')&&choice==='challenge'){
      const campaigns=new VillainCampaigns(this.db),saved=campaigns.row(eventId)!;
      if(saved.battle_id)return;
      if(row.status!=='choice'||row.choice_id)throw new BattleRequestError('이미 마친 이벤트입니다.',409);
      const snapshot=campaigns.snapshot(saved);
      const battle=this.createBattle(runId,snapshot.floor??row.after_floor+1,this.suggestedTeam(runId),undefined,snapshot);
      campaigns.start(eventId,battle);return;
    }
    if(row.kind==='raid-encounter'&&choice==='challenge'){
      const raids=new RaidEvents(this.db),saved=raids.row(eventId)!;
      if(saved.battle_id)return;
      if(row.status!=='choice'||row.choice_id)throw new BattleRequestError('이미 마친 이벤트입니다.',409);
      const battle=this.createRaidBattle(runId,row.after_floor+1,this.suggestedTeam(runId),raids.snapshot(saved));
      raids.start(eventId,battle);return;
    }
    if(row.kind!=='challenger-selection'||choice==='back'){this.events.choose(owner,runId,eventId,choice);this.events.followup(runId);return;}
    const events=new ChallengerEvents(this.db),saved=events.row(eventId)!;
    const definition=events.definition(eventId,choice);
    if(saved.selected_id){if(saved.selected_id===definition.id)return;throw new BattleRequestError('이미 다른 도전자를 선택했습니다.',409);}
    if(row.status!=='choice')throw new BattleRequestError('이미 마친 이벤트입니다.',409);
    const battle=this.createBattle(runId,row.after_floor+1,this.suggestedTeam(runId),definition);
    events.start(eventId,definition.id,battle);
  });}
  selectEventReward(owner:string,runId:string,eventId:string,selectionId:unknown,candidateId:unknown){this.tx(()=>this.events.selectReward(owner,runId,eventId,selectionId,candidateId));}
  continueEvent(owner:string,runId:string,eventId:string){this.tx(()=>{
    const before=this.events.owned(owner,runId,eventId);this.events.continue(owner,runId,eventId);
    if(before.kind==='hidden-boss'&&before.status==='reward'){
      const run=this.ownedRun(owner,runId);
      this.db.prepare('UPDATE run_routes SET pending_boss=0 WHERE run_id=?').run(runId);
      if(run.floor===run.total_floors){this.db.prepare("UPDATE runs SET state='cleared' WHERE id=?").run(runId);this.settleGrowth(runId,'cleared');}
      else {this.db.prepare("UPDATE runs SET state='select',floor=floor+1 WHERE id=?").run(runId);this.events.encounter(runId,run.floor);}
    }
    this.events.followup(runId);
  });}
  purchaseHiddenShop(owner:string,runId:string,eventId:string,productId:unknown,destination:unknown='bag',species:unknown=null){this.tx(()=>{
    const row=this.events.owned(owner,runId,eventId);if(row.kind!=='hidden-shop'||row.status!=='choice')throw new BattleRequestError('열려 있는 히든상점이 아닙니다.',409);
    const snapshot=JSON.parse((this.db.prepare('SELECT snapshot_json FROM hidden_shop_events WHERE event_id=?').get(eventId) as {snapshot_json:string}).snapshot_json),offer=snapshot.offers.find((o:{id:string})=>o.id===productId);
    if(offer?.purchased)return;
    if(destination!=='bag'&&destination!=='use')throw new BattleRequestError('구매 후 처리 방식을 선택하세요.',400);
    this.events.purchase(owner,runId,eventId,productId);
    if(destination==='use'){
      if(typeof species!=='string'||!this.roster(runId).includes(species))throw new BattleRequestError('사용할 포켓몬을 선택하세요.',400);
      if(offer.effect.kind==='item-exchange'){this.setHeldItem(runId,species,offer.effect.items[0]);}
      else if(offer.effect.kind==='vitamin'){
        const entry=this.db.prepare("SELECT id FROM run_reward_inventory WHERE run_id=? AND quantity>0 AND json_extract(effect_json,'$.kind')='vitamin' AND json_extract(effect_json,'$.stat')=? ORDER BY rowid ASC LIMIT 1").get(runId,offer.effect.stat) as {id:string};
        this.runBag(owner,runId).use(createHash('sha256').update(eventId+':'+productId).digest('hex'),entry.id,species,null,(name,item)=>this.setHeldItem(runId,name,item));
      }else throw new BattleRequestError('이 상품은 배낭에 자동 등록합니다.',400);
    }
  });}
  private get permanentShop(){
    return new PermanentShop(this.db,this.roll,(owner,species)=>this.savedTraining(owner,species),(owner,species)=>this.unlockedMoves(owner,species));
  }
  permanentView(owner:string):PermanentView {return this.permanentShop.view(owner);}
  permanentAction(owner:string,requestId:unknown,action:unknown,product:unknown,count:unknown,species:unknown,eggKind:unknown='normal',tuning:unknown=undefined,rewardTicket=false):PermanentResult {
    return this.permanentShop.action(owner,requestId,action,product,count,species,eggKind,tuning,rewardTicket);
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
    if(run.state==='cleared')return this.db.prepare('SELECT * FROM battles WHERE run_id=? ORDER BY encounter_order DESC,attempt DESC LIMIT 1').get(run.id) as BattleRow??null;
    const event=new ChallengerEvents(this.db).pending(run.id);
    if(event?.phase==='battle' && event.battle_id)return this.battle(event.battle_id);
    return this.db.prepare('SELECT * FROM battles WHERE run_id = ? AND floor = ? AND stage = ? ORDER BY encounter_order DESC, attempt DESC LIMIT 1').get(run.id, run.floor,this.route(run.id)?.pending_boss===run.floor?1:0) as BattleRow ?? null;
  }
  private suggestedTeam(runId: string): string[] {
    const previous = this.db.prepare('SELECT id, player_team FROM battles WHERE run_id = ? ORDER BY encounter_order DESC, attempt DESC LIMIT 1').get(runId) as {id: string; player_team: string} | undefined;
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
    const villainEncounter=row?this.db.prepare("SELECT json_extract(v.snapshot_json,'$.stage') AS stage,COALESCE(json_extract(v.snapshot_json,'$.floor')-1,e.after_floor) AS afterFloor FROM villain_event_encounters v JOIN run_events e ON e.id=v.event_id WHERE e.run_id=? AND e.status!='complete'").get(row.id) as import('../shared/contracts').RunView['villainEncounter']:null;
    const battle = this.currentBattle(owner);
    const raidBattle=!!battle&&!!new RaidEvents(this.db).forBattle(battle.id);
    const retry=row?this.retryState(row.id):null;
    const retryBattle=retry?.pending_battle_id?this.battle(retry.pending_battle_id):null;
    const earned = row ? this.db.prepare('SELECT COALESCE(SUM(rewards.amount),0) AS coins, COUNT(*) AS wins FROM rewards JOIN battles ON battles.id = rewards.battle_id WHERE battles.run_id = ?').get(row.id) as {coins: number; wins: number} : null;
    const favorites=(this.db.prepare('SELECT species FROM favorites WHERE player_id=? ORDER BY rowid').all(owner) as {species:string}[]).map(entry=>entry.species);
    return {coins: row && ['select','battle','recruit'].includes(row.state) ? player.coins : 0, growthPoints:player.growth_points, permanent:this.permanentView(owner), unlocked, favorites, totalFloors: floors.length, run: row ? {
      raid:raidBattle,villainEncounter,
      id: row.id, rule:this.runRule(row.id),theme:this.runTheme(row.id), hiddenBossPending:this.route(row.id)?.pending_boss===row.floor, hiddenBossNext:!raidBattle && !!this.route(row.id) && row.floor%50===0 && hasHiddenBoss(this.runTheme(row.id)) && this.route(row.id)?.pending_boss!==row.floor, floor: row.floor, totalFloors: row.total_floors, floorName: row.floor===row.total_floors ? row.total_floors===3 ? '작은 타워의 정상' : '타워의 정상' : floors[row.floor - 1]?.name ?? '타워', state: row.state,
      retries:{limit:retry!.retry_limit,used:retry!.used,remaining:Math.max(0,retry!.retry_limit-retry!.used),canRetry:row.state==='lost'&&retry!.used<retry!.retry_limit&&!this.db.prepare('SELECT 1 FROM growth_rewards WHERE run_id=?').get(row.id),preparing:row.state==='select'&&!!retryBattle,opponents:retryBattle?(Showdown.Teams.unpack(retryBattle.opponent_team)??[]).map(p=>({species:p.species,moves:p.moves,item:p.item})):[]},
      roster: this.roster(row.id), partnerForms:Object.fromEntries(Object.entries(this.runProfiles(row.id)).flatMap(([name,profile])=>{const form=equipmentFormSpecies.has(name)?heldForm(name,this.heldItems(row.id)[name]):profile.forme;return form&&form!==name?[[name,form]]:[];})), battleId: battle?.id ?? null,
      rewardInventory:this.rewardInventory(owner,row.id,row.floor).view(),bag:row.state==='select'?this.runBag(owner,row.id).view():undefined,
      event:row.state==='select'&&!retryBattle?this.events.view(row.id):null,
      earnedCoins: (earned?.coins ?? 0)+this.events.earnedCoins(row.id), victories: earned?.wins ?? 0,
      growthReward: (this.db.prepare('SELECT amount FROM growth_rewards WHERE run_id=?').get(row.id) as {amount:number}|undefined)?.amount ?? 0,
      restartReward:this.growthBase(row.id),
      upgrades: this.activeUpgrades(row.id,row.floor).map(upgrade=>({kind:upgrade.kind,remainingFloors:['recruit','cleared'].includes(row.state) ? Math.max(0,upgrade.end_floor-row.floor) : upgrade.end_floor-row.floor+1})),
      heldItems:this.heldItems(row.id),trainerEquipment:this.trainerEquipment(row.id),
      teraTickets:this.teraQuantity(row.id),
      teraShop:null,
      itemBag:Object.fromEntries((this.db.prepare('SELECT item,quantity FROM run_item_bag WHERE run_id=? AND quantity>0').all(row.id) as {item:string;quantity:number}[]).map(entry=>[entry.item,entry.quantity])),
      itemPurchases:this.itemPurchases(row),
      battleItems:this.battleItemBag(row.id),
      adjustment:row.state==='select' && (retryBattle||!this.events.view(row.id))?{entries:this.trainingCollection(owner).filter(entry=>this.roster(row.id).includes(entry.species)).map(entry=>{const profile=this.runProfiles(row.id)[entry.species]??entry.profile;return {...entry,profile,...trainingOptions(entry.species,profile.forme),selfMoves:profileLearnset(entry.species,profile.forme).selfMoves,unlockedMoves:[...new Set([...entry.unlockedMoves,...profileLearnset(entry.species,profile.forme).selfMoves])]} ;}),snapshot:createHash('sha256').update(JSON.stringify(this.runProfiles(row.id))).digest('hex')}:null,
      consumableOffers:row.state==='select' && isShopFloor(row.floor,row.total_floors)?this.consumableOffers(row):[],
      shopRerolls:Object.fromEntries(['items','machines'].map(kind=>{const count=this.shopRevision(row,kind);return [kind,{count,limit:this.permanentView(owner).rerollLimit,price:rerollPrice(count)}];})) as RunView['shopRerolls'],
      vitaminShop:null,vitaminUsage:readVitaminUsage(this.db,row.id,row.floor),
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
      candidates: row.state === 'recruit' && battle ? this.recruitmentTeam(battle).map(set=>set.species).filter(isCollectibleSpecies) : [],
      candidateIVs: row.state==='recruit' && battle ? Object.fromEntries(this.recruitmentTeam(battle).map(set=>[set.species,set.ivs ?? pokemonSets[set.species as keyof typeof pokemonSets].ivs])) : {},
      collectionIVs:row.state==='recruit' && battle ? Object.fromEntries((this.recruitmentTeam(battle).map(set=>set.species)).map(name=>[name,this.savedTraining(owner,name).profile.ivs])) : {},
      candidateMoves: row.state==='recruit' && battle ? Object.fromEntries(this.recruitmentTeam(battle).map(set=>[set.species,set.moves])) : {},
      candidateDetails:row.state==='recruit' && battle?Object.fromEntries(this.recruitmentTeam(battle).filter(set=>isCollectibleSpecies(set.species)).map(set=>[set.species,{gender:(set.gender||'N') as import('../data/gender').PokemonGender,...(set.raidForme?{forme:set.raidForme}:{}),ability:set.ability,nature:set.nature,...(new RaidEvents(this.db).forBattle(battle.id)?{evs:{...set.evs} as StatBlock}:{}),moves:set.moves.map(m=>Showdown.Dex.moves.get(m).name),baseStats:{...Showdown.Dex.species.get(set.raidForme??set.species).baseStats},types:[...Showdown.Dex.species.get(set.raidForme??set.species).types],teraType:set.teraType as import('../data/tera').TeraType|undefined,shiny:!!set.shiny}])):{},
      collectionMoves: row.state==='recruit' && battle ? Object.fromEntries(this.recruitmentTeam(battle).map(set=>[set.species,this.unlockedMoves(owner,set.species)])) : {},
      currentMoves: row.state==='recruit' && battle ? Object.fromEntries(this.recruitmentTeam(battle).map(set=>[set.species,(JSON.parse((this.db.prepare('SELECT profiles FROM runs WHERE id=?').get(row.id) as {profiles:string}).profiles)[set.species] ?? this.savedTraining(owner,set.species).profile).moves])) : Object.fromEntries(this.roster(row.id).map(name=>[name,this.runProfiles(row.id)[name]?.moves ?? this.savedTraining(owner,name).profile.moves])),
      lastMoveGain: (()=>{const saved=this.db.prepare('SELECT move_gain FROM recruitments JOIN battles ON battles.id=recruitments.battle_id WHERE battles.run_id=? ORDER BY battles.encounter_order DESC, battles.attempt DESC LIMIT 1').get(row.id) as {move_gain:string|null}|undefined;return saved?.move_gain ? JSON.parse(saved.move_gain) : null;})(),
      lastIVGain: (()=>{const saved=this.db.prepare('SELECT iv_gain FROM recruitments JOIN battles ON battles.id=recruitments.battle_id WHERE battles.run_id=? ORDER BY battles.encounter_order DESC, battles.attempt DESC LIMIT 1').get(row.id) as {iv_gain:string|null}|undefined;return saved?.iv_gain ? JSON.parse(saved.iv_gain) : null;})(),
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
  start(owner: string, selected: unknown,rule:unknown='chaos',options:{events?:boolean}={}): string {
    if(!isBattleRule(rule))throw new BattleRequestError('배틀 룰을 선택하세요.',400);
    return this.tx(() => {
      const current = this.latest(owner);
      if (current && ['select', 'battle', 'recruit'].includes(current.state)) throw new BattleRequestError('이미 진행 중인 도전이 있습니다.', 409);
      const allowed = (this.db.prepare('SELECT species FROM unlocks WHERE player_id = ?').all(owner) as {species: string}[]).map(p => p.species).filter(isCollectibleSpecies);
      this.validateSelection(selected, allowed);
      if(current?.state==='lost')this.settleGrowth(current.id,'lost');
      this.db.prepare('UPDATE players SET coins=? WHERE id=?').run(this.permanentView(owner).startingCoins??0,owner);
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
      this.db.prepare('INSERT INTO run_npc_rules VALUES (?,1)').run(id);
      if(options.events)this.events.enable(id);
      this.db.prepare('INSERT INTO run_tera_tickets VALUES (?,0)').run(id);
      selected.forEach((name, slot) => this.db.prepare('INSERT INTO members VALUES (?, ?, ?)').run(id, slot, name));
      const profiles=Object.fromEntries(this.trainingCollection(owner).map(entry=>[entry.species,entry.profile]));
      if(profiles.Ogerpon){profiles.Ogerpon={...profiles.Ogerpon,ability:'Defiant',teraType:'Grass'};delete profiles.Ogerpon.forme;}
      this.db.prepare('INSERT INTO run_form_item_rules VALUES (?,1)').run(id);
      this.db.prepare('UPDATE runs SET profiles=? WHERE id=?').run(JSON.stringify(profiles),id);
      if(options.events&&this.eventRegistry===eventDefinitions)new VillainCampaigns(this.db).enableTrack(id);
      return this.createBattle(id, 1, selected);
    });
  }
  enter(owner: string, runId: string, expectedFloor: number, selected: unknown): string {
    return this.tx(() => {
      const run = this.ownedRun(owner, runId);
      if (run.state !== 'select' || run.floor !== expectedFloor || run.floor > run.total_floors) throw new BattleRequestError('이미 진행되었거나 잘못된 층입니다.', 409);
      if(this.events.view(runId) && !this.retryState(runId).pending_battle_id)throw new BattleRequestError('상자 이벤트를 먼저 마쳐 주세요.',409);
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
    const player=packPlayerTeam(selected,this.boostedProfiles(runId,profiles),Object.fromEntries(Object.entries(this.heldItems(runId)).filter(([,item])=>allowsRuleItem(rule,item))),this.trainerEquipment(runId).includes('Dynamax Band'));
    const attempt=(this.db.prepare('SELECT MAX(attempt) AS n FROM battles WHERE run_id=? AND encounter_order=? AND stage=(SELECT stage FROM battles WHERE id=?)').get(runId,previous.encounter_order,previousId) as {n:number}).n+1;
    this.db.prepare(`INSERT INTO battles(id,run_id,floor,player_team,opponent_team,seed,engine_version,format,ai_version,status,reward,candidates,boss,trainer,upgrades,battle_items,tera_tickets,villain_event,rule,stage,attempt,encounter_order)
      SELECT ?,run_id,floor,?,opponent_team,seed,engine_version,format,ai_version,'active',reward,candidates,boss,trainer,?,?,?,?,rule,stage,?,encounter_order FROM battles WHERE id=?`).run(id,player,JSON.stringify(this.activeUpgrades(runId,previous.floor).map(u=>u.kind).sort()),JSON.stringify(this.battleItemBag(runId)),JSON.stringify({...JSON.parse(previous.tera_tickets),p1:this.teraQuantity(runId)}),previous.villain_event,attempt,previousId);
    this.db.prepare('UPDATE battles SET trainer_equipment=?,tera_tickets=? WHERE id=?').run(JSON.stringify(this.trainerEquipment(runId)),JSON.stringify({...JSON.parse(previous.tera_tickets),p1:0}),id);
    new ChallengerEvents(this.db).retry(previousId,id);
    new RaidEvents(this.db).retry(previousId,id);
    new VillainCampaigns(this.db).retry(previousId,id);
    new HiddenBossEvents(this.db).retry(previousId,id);
    this.db.prepare('UPDATE run_retries SET pending_battle_id=NULL WHERE run_id=?').run(runId);
    this.db.prepare("UPDATE runs SET state='battle' WHERE id=?").run(runId);
    return id;
  }
  private createRaidBattle(runId:string,floor:number,selected:string[],raid:import('../data/raids').RaidSnapshot){
    const id=randomUUID(),seed=[0,1,2,3].map(()=>randomInt(65536)) as Seed,rule=this.runRule(runId);
    const player=packPlayerTeam(selected,this.boostedProfiles(runId,this.runProfiles(runId)),Object.fromEntries(Object.entries(this.heldItems(runId)).filter(([,item])=>allowsRuleItem(rule,item))),this.trainerEquipment(runId).includes('Dynamax Band'));
    const attempt=0;
    this.db.prepare(`INSERT INTO battles(id,run_id,floor,player_team,opponent_team,seed,engine_version,format,ai_version,status,reward,candidates,rule,stage,attempt,battle_items,upgrades,tera_tickets,trainer_equipment,encounter_order)
      VALUES (?,?,?,?,?,?,?,?,?,'active',0,?,?,0,?,?,?,?,?,(SELECT COALESCE(MAX(encounter_order),0)+1 FROM battles WHERE run_id=?))`).run(id,runId,floor,player,raid.opponentTeam,JSON.stringify(seed),engineVersion,FORMAT,'tower-policy-v10',JSON.stringify([raid.species]),rule,attempt,JSON.stringify(this.battleItemBag(runId)),JSON.stringify(this.activeUpgrades(runId,floor).map(u=>u.kind).sort()),JSON.stringify({p1:0,p2:0}),JSON.stringify(this.trainerEquipment(runId)),runId);
    this.db.prepare("UPDATE runs SET state='battle' WHERE id=?").run(runId);return id;
  }
  private recruitmentTeam(battle:BattleRow):RaidRecruitSet[]{const raids=new RaidEvents(this.db),row=raids.forBattle(battle.id);return row?raids.recruitmentTeam(row):Showdown.Teams.unpack(battle.opponent_team)??[];}
  private createBattle(runId: string, floor: number, selected: string[],challenger?:SavedChallengerDefinition,special?:import('./trainer-event-battle').TrainerEventBattleSnapshot): string {
    const pending=this.retryState(runId).pending_battle_id;
    if(pending)return this.createRetryBattle(runId,selected,pending);
    const rule=special?.rule??this.runRule(runId);
    const rankedChallenger=challenger&&'rank' in challenger?challenger:undefined;
    const oldChallenger=challenger&&!('rank' in challenger)?challenger:undefined;
    if(rankedChallenger&&!rankedChallenger.encounter)throw new BattleRequestError('저장된 도전자 팀을 찾을 수 없습니다.',409);
    const config = floors[floor - 1];
    if (!config) throw new BattleRequestError('지원하지 않는 층입니다.', 400);
    const id = randomUUID();
    const bytes = randomBytes(8);
    const seed: Seed = special?.seed??rankedChallenger?.encounter?.seed??[0, 2, 4, 6].map(i => bytes.readUInt16BE(i)) as Seed;
    const profiles=JSON.parse((this.db.prepare('SELECT profiles FROM runs WHERE id=?').get(runId) as {profiles:string}).profiles) as Record<string,TrainingProfile>;
    const progression:TowerProgression=(this.db.prepare('SELECT version FROM run_progression WHERE run_id=?').get(runId) as {version:typeof CURRENT_PROGRESSION}|undefined)?.version ?? 'legacy';
    const previous=recentEncounters(this.db,runId);
    const trainer=challenger||special?null:this.encounter(runId,floor);
    const common=!!this.db.prepare('SELECT 1 FROM run_npc_rules WHERE run_id=?').get(runId);
    const sample:TrainerSample|undefined=special?special.sample:rankedChallenger?npcTrainerSample(rankedChallenger.encounter!.sample,rankedChallenger.encounter!.rank):oldChallenger?{id:oldChallenger.trainerId,name:oldChallenger.title,title:'도전자',kind:oldChallenger.kind,generation:null,specialty:null,tactic:oldChallenger.tactic,portrait:oldChallenger.portrait,minFloor:1,concept:oldChallenger.battleStyle}:trainer ? undefined : selectTrainerSample(floor,seed,previous.flatMap(row=>{const saved=row.trainer ? JSON.parse(row.trainer) : null;const entry=[...trainerCatalog,...npcSamples].find(s=>s.id===saved?.id);return entry ? [{id:entry.id,specialty:entry.specialty}] : [];}),progression,{common});
    const legacyChallenger=oldChallenger&&!oldChallenger.trainingTier?oldChallenger:undefined;
    const encounterFloor=legacyChallenger?Math.max(floor<=50?1:51,Math.min(floor<=50?50:100,floor+legacyChallenger.floorOffset)):floor;
    const concept=sample?.npcRank?npcSamples.find(s=>s.id===sample.id):undefined;
    const rankedEncounter=rankedChallenger?structuredClone(rankedChallenger.encounter!):concept?generateNpcEncounter(floor,seed,concept,sample!.npcRank!,rule,progression):null;
    const generated=special?.team??rankedEncounter?.team??generateOpponentTeam(encounterFloor,seed,previous.flatMap(row=>(Showdown.Teams.unpack(row.opponent_team) ?? []).map(set=>set.species)),trainer,sample,progression);
    const encounter=oldChallenger?.trainingTier?trainNpcTeam(generated,floor,oldChallenger.trainingTier,oldChallenger.tactic,seed,rule):generated;
    const npcId=sample?.id ?? trainer?.boss.id ?? '';
    const npcGeneration=sample?.generation ?? trainer?.boss.generation ?? null;
    const npcAce=sample?.ace ?? trainer?.ace;
    const template=progression!=='legacy'&&(trainer || sample?.kind==='named')?normalNpcTemplate(npcId,floor,sample?.role ?? trainer?.boss.role):null;
    let signature:NpcGimmick|null=rankedEncounter?.gimmick??null;
    const npcGimmicksAllowed=rankedEncounter?!!signature:normalNpcGimmicksEnabled(floor,normalNpcCategory(sample?.role ?? trainer?.boss.role,sample?.id ?? trainer?.boss.id,sample?.kind ?? 'named'));
    if(progression!=='legacy' && npcGimmicksAllowed && (trainer || sample?.kind==='named')){
      const plan=template?.signature ?? npcGimmick(npcId,npcGeneration,encounter.map(p=>p.name),npcAce?npcSpecies(npcAce,npcId,npcGeneration):undefined);
      const carrier=encounter.find(p=>p.item && (megaStones[p.item] || primalOrbs[p.item] || p.item===DYNAMAX_ITEM || zCrystals[p.item]));
      signature=carrier?{rule:primalOrbs[carrier.item!]? 'primal':megaStones[carrier.item!]? 'mega':carrier.item===DYNAMAX_ITEM?'dynamax':'z',species:carrier.name,item:carrier.item}:plan?.rule==='tera'||plan?.rule==='dynamax'&&encounter.some(p=>p.name===plan.species&&p.gigantamax)?plan:null;
      if(trainer && signature)trainer.boss.gimmick=signature;
    }
    if(legacyChallenger)for(const entry of encounter){
      if(legacyChallenger.attacksOnly)entry.moves=entry.moves.filter(move=>Showdown.Dex.moves.get(move).category!=='Status');
      if(!entry.moves.length)entry.moves=[...pokemonSets[entry.name].moves];
      if(legacyChallenger.fallbackItem && !entry.item && allowsRuleItem(rule,legacyChallenger.fallbackItem))entry.item=legacyChallenger.fallbackItem;
    }
    const opponents=encounter.map(entry=>entry.name);
    const opponentProfiles=Object.fromEntries(encounter.map(({name,moves,ability,profile})=>{
      return [name,{shiny:rollEncounterShiny(this.roll),...(profile ?? opponentProfile(name,moves,encounterFloor,Object.fromEntries(statKeys.map(stat=>[stat,randomBytes(1)[0]%32])) as StatBlock,progression)),gender:speciesGender(name,this.roll(1000000)/1000000),...(ability ? {ability} : {})}];
    }));
    if(legacyChallenger)for(const profile of Object.values(opponentProfiles)){
      for(const stat of statKeys){profile.evs[stat]=Math.min(32,Math.floor(profile.evs[stat]*legacyChallenger.trainingScale));profile.ivs[stat]=Math.min(31,Math.floor(profile.ivs[stat]*legacyChallenger.trainingScale));}
      profile.evs.hp=Math.min(32,profile.evs.hp+(legacyChallenger.hpPoints??0));
      const total=statKeys.reduce((sum,stat)=>sum+profile.evs[stat],0);
      if(total>66)for(const stat of statKeys)profile.evs[stat]=Math.floor(profile.evs[stat]*66/total);
    }
    if(signature?.rule==='tera' && !template)opponentProfiles[signature.species].teraType=(sample?.specialty ?? trainer?.boss.specialty ?? Showdown.Dex.species.get(signature.species).types[0]) as import('../data/tera').TeraType;
    // Pending snapshots without an AI version predate tiers and retain their old policy.
    const aiVersion=special?.aiVersion??(progression==='legacy'?'tower-policy-v9':special?'tower-policy-v10':rankedChallenger?(rankedChallenger.aiVersion??'tower-policy-v10'):AI_VERSION);
    this.db.prepare(`INSERT INTO battles(id, run_id, floor, player_team, opponent_team, seed, engine_version, format, ai_version, status, reward, candidates, boss, stage,attempt,encounter_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(encounter_order),0)+1 FROM battles WHERE run_id=?))`).run(id, runId, floor, packPlayerTeam(selected,this.boostedProfiles(runId,profiles),Object.fromEntries(Object.entries(this.heldItems(runId)).filter(([,item])=>allowsRuleItem(rule,item))),this.trainerEquipment(runId).includes('Dynamax Band')), packTeam(opponents,opponentProfiles,Object.fromEntries(encounter.map(entry=>[entry.name,entry.item && (progression!=='legacy' || allowsRuleItem(rule,entry.item))?entry.item:''])),encounter.filter(p=>p.gigantamax).map(p=>p.name)), JSON.stringify(seed), engineVersion, FORMAT, aiVersion, config.reward, JSON.stringify(opponents), trainer ? JSON.stringify(trainer.boss) : null,this.route(runId)?.pending_boss===floor?1:0,0,runId);

    this.db.prepare('UPDATE battles SET rule=? WHERE id=?').run(rule,id);
    if(rankedChallenger?.mirror)this.db.prepare('UPDATE battles SET opponent_team=? WHERE id=?').run(rankedChallenger.mirror.opponentTeam,id);
    this.db.prepare('UPDATE battles SET battle_items=? WHERE id=?').run(JSON.stringify(this.battleItemBag(runId)),id);
    const hasNpcItem=encounter.some(p=>p.item && (megaStones[p.item] || primalOrbs[p.item] || p.item===DYNAMAX_ITEM || zCrystals[p.item]));
    const npcTeraTickets=rankedEncounter?(signature?.rule==='tera'?1:0):npcGimmicksAllowed?(signature?.rule==='tera'?1:!hasNpcItem && sample?.kind==='elite'?opponentTeraTickets(floor,'elite'):0):0;
    this.db.prepare('UPDATE battles SET tera_tickets=?,trainer_equipment=? WHERE id=?').run(JSON.stringify({p1:0,p2:progression==='legacy'?(allowsGimmick(rule,'terastallize')?1:0):npcTeraTickets}),JSON.stringify(this.trainerEquipment(runId)),id);
    this.db.prepare("UPDATE runs SET state = 'battle' WHERE id = ?").run(runId);
    if(sample){const theme=this.runTheme(runId);this.db.prepare('UPDATE battles SET trainer=? WHERE id=?').run(JSON.stringify({...trainerView({...sample,...(theme?{generation:towerThemes[theme].generation}: {})}),...(signature?{gimmick:signature}:{}),...(rankedChallenger?.mirror?{name:'???',title:'',mirror:true,mirrorRule:rankedChallenger.mirror.opponentRule}:{})}),id);}
    if(!special && aiVersion===AI_VERSION){
      const row=this.battle(id),column=row.boss?'boss':'trainer';
      const saved=JSON.parse(row.boss??row.trainer??'null');
      if(saved){
        const descriptor=sample??{...trainer!.boss,kind:'named' as const,tactic:trainer!.tactic};
        saved.npcAi=rankedChallenger?.npcAi??npcAi(floor,descriptor,{challenger:!!challenger,boss:floor%50===0});
        this.db.prepare(`UPDATE battles SET ${column}=? WHERE id=?`).run(JSON.stringify(saved),id);
      }
    }
    this.db.prepare('UPDATE battles SET upgrades=? WHERE id=?').run(JSON.stringify(this.activeUpgrades(runId,floor).map(upgrade=>upgrade.kind).sort()),id);
    if(special)this.db.prepare('UPDATE battles SET opponent_team=?,reward=0,candidates=?,trainer=?,tera_tickets=? WHERE id=?').run(special.opponentTeam,'[]',JSON.stringify({...special.trainer,introduction:''}),JSON.stringify({p1:0,p2:special.opponentTeraTickets}),id);
    return id;
  }
  trainerEquipment(runId:string):TrainerEquipment[]{return (this.db.prepare('SELECT item FROM run_trainer_equipment WHERE run_id=? ORDER BY item').all(runId) as {item:TrainerEquipment}[]).map(row=>row.item);}
  private teraQuantity(runId:string){return (this.db.prepare('SELECT quantity FROM run_tera_tickets WHERE run_id=?').get(runId) as {quantity:number}|undefined)?.quantity ?? 0;}
  purchaseTera(owner:string,id:string,floor:number){this.ownedRun(owner,id);throw new BattleRequestError('테라권 판매는 종료되었습니다. 도구 상점에서 테라스탈오브를 구매하세요.',409);}
  private activeUpgrades(runId:string,floor:number) {
    return this.db.prepare('SELECT kind,end_floor FROM run_upgrades WHERE run_id=? AND start_floor<=? AND end_floor>=? ORDER BY kind').all(runId,floor,floor) as {kind:UpgradeKind;end_floor:number}[];
  }
  private heldItems(runId:string):Record<string,string> {
    const items=Object.fromEntries((this.db.prepare('SELECT species,item FROM run_held_items WHERE run_id=?').all(runId) as {species:string;item:string}[]).map(row=>[row.species,row.item]));
    for(const [name,profile] of Object.entries(this.runProfiles(runId))){const item=selectedForm(name,profile.forme)?.requiredItem;if(hasFixedFormItem(name,item)&&this.roster(runId).includes(name))items[name]=item!;}
    return items;
  }
  private canHoldItem(runId:string,name:string,item:string){const form=this.runProfiles(runId)[name]?.forme;return isTrainerEquipment(item)||!hasFixedFormItem(name,selectedForm(name,form)?.requiredItem)&&canEquipGimmick(name,item,form);}
  private itemOffers(run:RunRow,regenerate=false):string[]{
    const saved=this.db.prepare('SELECT offers FROM item_shops WHERE run_id=? AND floor=?').get(run.id,run.floor) as {offers:string}|undefined;
    const roster=this.roster(run.id);
    const eligible=(item:string)=>isHeldItem(item)&&allowsRuleItem(this.runRule(run.id),item)&&!ownsRunItem(this.db,run.id,item)&&!Object.values(this.heldItems(run.id)).includes(item)&&roster.some(name=>this.canHoldItem(run.id,name,item));
    const existing=saved&&!regenerate ? [...new Set((JSON.parse(saved.offers) as string[]).map(canonicalShopProduct))].filter(id=>shopProductOptions(id).some(item=>allowsRuleItem(this.runRule(run.id),item)&&roster.some(name=>this.canHoldItem(run.id,name,item)))) : [];
    if(existing.length===4)return existing;
    let counter=0;const random=()=>createHash('sha256').update(`${run.id}:item-shop:${run.floor}:${this.shopRevision(run,"items") ? "roll"+this.shopRevision(run,"items")+":" : ""}${counter++}`).digest().readUInt32LE(0)/4294967296;
    const offers=rollShopProducts(run.floor-1,random,eligible,existing);
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
   const count=this.shopRevision(run,kind);if(count>=this.permanentView(owner).rerollLimit)throw new BattleRequestError('이번 상점의 리롤을 모두 사용했습니다.',409);const price=rerollPrice(count);if(!spendCoins(this.db,owner,price))throw new BattleRequestError('보유 자금이 부족합니다.',400);
   this.db.prepare('INSERT INTO shop_rerolls VALUES (?,?,?,?) ON CONFLICT(run_id,floor,kind) DO UPDATE SET count=excluded.count').run(id,floor,kind,count+1);
   if(kind==='items')this.itemOffers(run,true);else this.machineOffers(owner,run,true);
  });}
  private runBonuses(id:string){const result:Record<string,Partial<StatBlock>>={};for(const x of this.db.prepare('SELECT species,stat,points FROM run_stat_boosts WHERE run_id=?').all(id) as {species:string;stat:keyof StatBlock;points:number}[]){(result[x.species]??={})[x.stat]=x.points;}return result;}
  private boostedProfiles(id:string,profiles:Record<string,TrainingProfile>){const bonuses=this.runBonuses(id);return Object.fromEntries(Object.entries(profiles).map(([name,p])=>[name,{...p,...(bonuses[name]?{runBonuses:bonuses[name]}:{})}]));}
  purchaseVitamin(owner:string,id:string,floor:number,stat:unknown,name:unknown){
    this.ownedRun(owner,id);throw new BattleRequestError('영양제 상점 판매는 종료되었습니다. 보상 보관함에서 사용하세요.',409);
  }

  private bagItem(runId:string,item:string,quantity:number) {
    grantRunItem(this.db,runId,item,quantity);
  }
  private setHeldItem(runId:string,species:string,item:string|null) {
    if(isTrainerEquipment(item))throw new BattleRequestError('트레이너 장비는 포켓몬에게 장착하지 않습니다.',400);
    if(hasFixedFormItem(species,selectedForm(species,this.runProfiles(runId)[species]?.forme)?.requiredItem))throw new BattleRequestError('이 모습은 전용 도구가 고정되어 있습니다.',400);
    if(item&&!allowsRuleItem(this.runRule(runId),item))throw new BattleRequestError('이 룰에서는 사용할 수 없는 도구입니다.',409);
    if(item && !canEquipGimmick(species,item,this.runProfiles(runId)[species]?.forme))throw new BattleRequestError('이 포켓몬에게 맞는 기믹 도구가 아닙니다.',400);
    const old=(this.db.prepare('SELECT item FROM run_held_items WHERE run_id=? AND species=?').get(runId,species) as {item:string}|undefined)?.item;if(old===item)return;
    if(item && this.db.prepare('SELECT 1 FROM run_held_items WHERE run_id=? AND item=? AND species<>?').get(runId,item,species))throw new BattleRequestError('같은 종류의 도구는 한 마리만 장착할 수 있습니다. 먼저 다른 포켓몬의 도구를 해제하세요.',409);
    if(item && !this.db.prepare('UPDATE run_item_bag SET quantity=quantity-1 WHERE run_id=? AND item=? AND quantity>0').run(runId,item).changes)throw new BattleRequestError('가방에 없는 도구입니다.',409);
    this.db.prepare('DELETE FROM run_held_items WHERE run_id=? AND species=?').run(runId,species);
    if(old)this.bagItem(runId,old,1);
    if(item)this.db.prepare('INSERT INTO run_held_items VALUES (?,?,?)').run(runId,species,item);
    if(species==='Ogerpon'){
      const profiles=this.runProfiles(runId),profile=profiles[species]??defaultProfile(species),form=heldForm(species,item);
      profile.ability=formItems[item??'']?.ability??'Defiant';profile.teraType=(formItems[item??'']?.type??'Grass') as TrainingProfile['teraType'];
      delete profile.forme;if(form!==species)profile.forme=form;
      profiles[species]=profile;this.db.prepare('UPDATE runs SET profiles=? WHERE id=?').run(JSON.stringify(profiles),runId);
    }
  }
  purchaseItem(owner:string,runId:string,expectedFloor:number,item:unknown,species:unknown,revision:unknown=0,product?:unknown) {
    this.tx(()=>{
      const run=this.ownedRun(owner,runId);
      if(run.state!=='select' || run.floor!==expectedFloor || !isShopFloor(run.floor,run.total_floors))throw new BattleRequestError('도구는 체크포인트 클리어 후 상점에서 구매할 수 있습니다.',409);
      this.checkShopRevision(run,'items',revision);
      const productId=typeof product==='string'?product:typeof item==='string'?canonicalShopProduct(item):'';
      if(!shopProductOptions(productId).includes(item as string))throw new BattleRequestError('상품의 실제 아이템 하나를 선택하세요.',400);
      const receipt=this.db.prepare('SELECT item FROM shop_choice_receipts WHERE run_id=? AND floor=? AND revision=? AND product=?').get(runId,expectedFloor,revision as number,productId) as {item:string}|undefined;
      if(receipt){if(receipt.item!==item)throw new BattleRequestError('이미 다른 아이템을 선택한 상품입니다.',409);return;}
      if(this.db.prepare('SELECT 1 FROM shop_receipts WHERE run_id=? AND floor=? AND kind=? AND revision=? AND product=?').get(runId,expectedFloor,'items',revision as number,productId))return;
      if(!isHeldItem(item) || (species!==null && (typeof species!=='string' || !this.roster(runId).includes(species))))throw new BattleRequestError('도구와 파티 포켓몬을 선택하세요.',400);
      if(isTrainerEquipment(item)&&species!==null)throw new BattleRequestError('트레이너 장비는 포켓몬을 선택하지 않고 구매합니다.',400);
      if(ownsRunItem(this.db,runId,item) || Object.values(this.heldItems(runId)).includes(item))throw new BattleRequestError('이미 보유한 도구입니다.',409);
      if(itemShopRule(item).minClearedFloor>run.floor-1 || !this.itemOffers(run).includes(productId))throw new BattleRequestError('이번 상점에서 판매하지 않는 도구입니다.',409);
      if(!this.roster(runId).some(name=>this.canHoldItem(runId,name,item)))throw new BattleRequestError('파티에 맞는 포켓몬이 없는 도구입니다.',400);
      if(this.itemPurchases(run).map(canonicalShopProduct).includes(productId))throw new BattleRequestError('이번 상점에서 이미 구매한 도구입니다.',409);
      const price=shopChoiceGroups[productId]?.price??heldItems[item].price;
      if(!spendCoins(this.db,owner,price))throw new BattleRequestError('보유 자금이 부족합니다.',400);
      this.db.prepare('INSERT OR IGNORE INTO item_purchases VALUES (?,?,?)').run(runId,run.floor,productId);
      this.db.prepare('INSERT INTO shop_receipts VALUES (?,?,?,?,?,?)').run(runId,run.floor,'items',this.shopRevision(run,'items'),productId,species);
      if(isShopChoice(productId))this.db.prepare('INSERT INTO shop_choice_receipts VALUES (?,?,?,?,?)').run(runId,run.floor,revision as number,productId,item);
      if(isTrainerEquipment(item))grantEquipment(this.db,runId,item);
      else {this.bagItem(runId,item,1);if(typeof species==='string')this.setHeldItem(runId,species,item);}
    });
  }
  equipItem(owner:string,runId:string,expectedFloor:number,species:unknown,item:unknown,swapFrom?:unknown) {
    this.tx(()=>{
      const run=this.ownedRun(owner,runId);
      if(run.state!=='select' || run.floor!==expectedFloor)throw new BattleRequestError('도구는 다음 층 준비에서 변경할 수 있습니다.',409);
      if(typeof species!=='string' || !this.roster(runId).includes(species) || (item!==null && !isHeldItem(item)))throw new BattleRequestError('도구와 파티 포켓몬을 선택하세요.',400);
      if(isTrainerEquipment(item))throw new BattleRequestError('트레이너 장비는 포켓몬에게 장착하지 않습니다.',400);
      const holder=item?(this.db.prepare('SELECT species FROM run_held_items WHERE run_id=? AND item=? AND species<>?').get(runId,item,species) as {species:string}|undefined)?.species:undefined;
      if(holder){
        if(swapFrom!==undefined&&swapFrom!==holder)throw new BattleRequestError('도구 소지자가 바뀌었습니다.',409);
        this.setHeldItem(runId,holder,null);this.setHeldItem(runId,species,item as string);return;
      }
      if(swapFrom!==undefined)throw new BattleRequestError('도구 소지자가 바뀌었습니다. 다시 선택해 주세요.',409);
      this.setHeldItem(runId,species,item as string|null);
    });
  }
  private runProfiles(runId:string):Record<string,TrainingProfile> {
    const profiles=JSON.parse((this.db.prepare('SELECT profiles FROM runs WHERE id=?').get(runId) as {profiles:string}).profiles) as Record<string,TrainingProfile>;
    if(profiles.Ogerpon){const item=(this.db.prepare('SELECT item FROM run_held_items WHERE run_id=? AND species=?').get(runId,'Ogerpon') as {item:string}|undefined)?.item,form=heldForm('Ogerpon',item),p=profiles.Ogerpon;p.ability=formItems[item??'']?.ability??'Defiant';p.teraType=(formItems[item??'']?.type??'Grass') as TrainingProfile['teraType'];delete p.forme;if(form!=='Ogerpon')p.forme=form;}
    return profiles;
  }
  private machineOffers(owner:string,run:RunRow,regenerate=false):MachineOffer[] {
    const saved=this.db.prepare('SELECT offers FROM machine_shops WHERE run_id=? AND floor=?').get(run.id,run.floor) as {offers:string}|undefined;
    const purchases=(this.db.prepare('SELECT product AS move,buyer AS species FROM shop_receipts WHERE run_id=? AND floor=? AND kind=? AND revision=?').all(run.id,run.floor,'machines',this.shopRevision(run,'machines'))) as {move:string;species:string}[];
    const candidates=machineMoves.filter(move=>!ownsMachine(this.db,run.id,move)).map(move=>({move,rarity:machineRarity(move),price:machinePrice(move),targets:[],purchased:false}));
    const existing:MachineOffer[]=saved&&!regenerate?JSON.parse(saved.offers).filter((offer:MachineOffer)=>!ownsMachine(this.db,run.id,offer.move)||purchases.some(p=>p.move===offer.move)):[];
    let counter=0;const random=()=>createHash('sha256').update(run.id+':machine-shop:'+run.floor+':'+this.shopRevision(run,'machines')+':'+counter++).digest().readUInt32BE(0)/0x100000000;
    const offers=[...existing,...rollMachineOffers(candidates.filter(c=>!existing.some(o=>o.move===c.move)),run.floor-1,random).slice(0,Math.max(0,MACHINE_COUNT-existing.length))];
    this.db.prepare('INSERT INTO machine_shops VALUES (?,?,?) ON CONFLICT(run_id,floor) DO UPDATE SET offers=excluded.offers').run(run.id,run.floor,JSON.stringify(offers));
    return offers.map(offer=>({...offer,purchased:purchases.some(p=>p.move===offer.move)}));
  }
  purchaseMachine(owner:string,runId:string,expectedFloor:number,move:unknown,_name:unknown=null,_slot:unknown=null,revision:unknown=0) {
    this.tx(()=>{
      const run=this.ownedRun(owner,runId);
      if(run.state!=='select'||run.floor!==expectedFloor||!isShopFloor(run.floor,run.total_floors))throw new BattleRequestError('기술머신은 정비 상점에서 구매하세요.',409);
      this.checkShopRevision(run,'machines',revision);
      if(this.db.prepare('SELECT 1 FROM shop_receipts WHERE run_id=? AND floor=? AND kind=? AND revision=? AND product=?').get(runId,expectedFloor,'machines',revision as number,typeof move==='string'?move:''))return;
      const offer=this.machineOffers(owner,run).find(o=>o.move===move);if(!offer)throw new BattleRequestError('진열된 기술머신을 선택하세요.',400);
      if(ownsMachine(this.db,runId,offer.move))throw new BattleRequestError('이미 배낭에 보유한 기술머신입니다.',409);
      if(!spendCoins(this.db,owner,offer.price))throw new BattleRequestError('보유 자금이 부족합니다.',400);
      grantStoredReward(this.db,runId,{kind:'machine',move:offer.move,amount:1});
      this.db.prepare('INSERT OR IGNORE INTO machine_purchases VALUES (?,?,?,?,?,?)').run(runId,expectedFloor,offer.move,'bag',null,offer.price);
      this.db.prepare('INSERT INTO shop_receipts VALUES (?,?,?,?,?,?)').run(runId,expectedFloor,'machines',revision as number,offer.move,'bag');
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
      const paid=spendCoins(this.db,owner,item.price);
      if(!paid) throw new BattleRequestError('보유 자금이 부족합니다.',400);
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
      const equipment=command.endsWith(' dynamax')?'Dynamax Band':command.endsWith(' terastallize')?'Tera Orb':null;
      if(battle.trainer_equipment!=null && equipment && !this.trainerEquipment(run.id).includes(equipment))throw new BattleRequestError('먼저 상점에서 해당 트레이너 장비를 구매해야 합니다.',409);
      if(command.startsWith('item ')){const kind=command.slice(5);if(!Object.hasOwn(upgrades,kind)||!this.db.prepare('UPDATE run_battle_items SET quantity=quantity-1 WHERE run_id=? AND kind=? AND quantity>0').run(run.id,kind).changes)throw new BattleRequestError('보유한 배틀 아이템이 없습니다.',409);}
      if(command.endsWith(' terastallize')&&battle.trainer_equipment==null){
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
    if(JSON.stringify(log.trainerEquipment??null)!==(battle.trainer_equipment??'null'))throw new Error('Battle equipment mismatch');
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
      const hidden=new HiddenBossEvents(this.db),hiddenBattle=hidden.forBattle(id);
      if(log.winner==='Player'&&hiddenBattle){hidden.win(hiddenBattle,run.player_id,run.id);this.db.prepare("UPDATE runs SET state='select' WHERE id=?").run(run.id);return;}
      const campaigns=new VillainCampaigns(this.db),villain=campaigns.forBattle(id);
      if(log.winner==='Player'&&villain){
        campaigns.win(villain,run.id,run.player_id);
        this.db.prepare("UPDATE runs SET state='select' WHERE id=?").run(run.id);return;
      }
      const challengerEvent=new ChallengerEvents(this.db).pending(run.id);
      const raids=new RaidEvents(this.db),raid=raids.forBattle(id);
      if(raid&&JSON.stringify(log.raid)!==raid.snapshot_json)throw Error('Raid snapshot mismatch');
      if(log.winner==='Player'&&raid){
        raids.win(raid,run.player_id,run.id);
        this.db.prepare("UPDATE runs SET state='recruit' WHERE id=?").run(run.id);return;
      }
      if(log.winner==='Player' && challengerEvent?.battle_id===id){
        new ChallengerEvents(this.db).win(challengerEvent.event_id,run.player_id);
        this.db.prepare("UPDATE runs SET state='select' WHERE id=?").run(run.id);return;
      }
      if (log.winner === 'Player') {
        const event=battle.villain_event ? JSON.parse(battle.villain_event) as VillainEvent : null;
        if(event?.rank==='boss')this.db.prepare('UPDATE run_villain_campaigns SET defeated_battle_id=? WHERE run_id=? AND defeated_battle_id IS NULL').run(id,run.id);
        this.db.prepare('INSERT INTO rewards VALUES (?, ?, ?)').run(id, run.player_id, battle.reward);
        grantCoins(this.db,run.player_id,battle.reward);
        if(this.route(run.id)&&battle.stage===0&&hiddenBossEligible(this.runTheme(run.id),run.floor,battle.boss?JSON.parse(battle.boss).id:undefined)){
          this.scheduleHiddenBoss(run,battle);return;
        }
        this.db.prepare("UPDATE runs SET state = 'recruit' WHERE id = ?").run(run.id);
      } else {
        this.db.prepare("UPDATE runs SET state = 'lost' WHERE id = ?").run(run.id);
        const retry=this.retryState(run.id);
        if(retry.used>=retry.retry_limit)this.settleGrowth(run.id,'lost');
      }
    });
  }
  private scheduleHiddenBoss(run:RunRow,battle:BattleRow,recordClear=true){
    if(recordClear){
      this.db.prepare('INSERT INTO recruitments(battle_id,species,replaced) VALUES (?,NULL,NULL)').run(battle.id);
      this.db.prepare('INSERT INTO run_encounter_progress(run_id,cleared_count) VALUES (?,1) ON CONFLICT(run_id) DO UPDATE SET cleared_count=cleared_count+1').run(run.id);
    }
    this.db.prepare('UPDATE run_routes SET pending_boss=? WHERE run_id=?').run(run.floor,run.id);
    this.db.prepare("UPDATE runs SET state='select' WHERE id=?").run(run.id);
    const progression=(this.db.prepare('SELECT version FROM run_progression WHERE run_id=?').get(run.id) as {version:TowerProgression}|undefined)?.version??'legacy';

    new HiddenBossEvents(this.db).create(run.id,run.floor,this.runTheme(run.id)!,this.runRule(run.id),progression);
  }
  prepareHiddenBossEvent(owner:string){this.tx(()=>{
    const run=this.latest(owner);
    if(!run||run.state!=='select'||this.route(run.id)?.pending_boss!==run.floor||this.events.view(run.id))return;
    const progression=(this.db.prepare('SELECT version FROM run_progression WHERE run_id=?').get(run.id) as {version:TowerProgression}|undefined)?.version??'legacy';
    new HiddenBossEvents(this.db).create(run.id,run.floor,this.runTheme(run.id)!,this.runRule(run.id),progression);
  });}
  recruit(owner: string, runId: string, battleId: string, chosen: string | null, replaced: string | null, swap?:unknown, collectOnly=false) {
    this.tx(() => {
      const run = this.ownedRun(owner, runId);
      const battle = this.battle(battleId);
      if (run.state !== 'recruit' || battle.run_id !== run.id || battle.floor !== run.floor || battle.status !== 'complete') throw new BattleRequestError('이미 처리되었거나 영입할 수 없는 상태입니다.', 409);
      if(this.currentBattle(owner)?.id!==battleId)throw new BattleRequestError('현재 승리한 배틀에서만 영입할 수 있습니다.',409);
      const candidates = this.recruitmentTeam(battle).map(set=>set.species).filter(isCollectibleSpecies);
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
          const fixed=selectedForm(replaced,this.runProfiles(run.id)[replaced]?.forme)?.requiredItem;if(fixed){this.bagItem(run.id,fixed,1);this.db.prepare('DELETE FROM run_held_items WHERE run_id=? AND species=?').run(run.id,replaced);}else this.setHeldItem(run.id,replaced,null);
          this.db.prepare('UPDATE members SET species = ? WHERE run_id = ? AND species = ?').run(chosen, run.id, replaced);
        } else {
          if (replaced !== null) throw new BattleRequestError('빈자리가 있으므로 교체 없이 영입하세요.', 400);
          this.db.prepare('INSERT INTO members VALUES (?, ?, ?)').run(run.id, roster.length, chosen);
        }
        const wasUnlocked=!!this.db.prepare('SELECT 1 FROM unlocks WHERE player_id=? AND species=?').get(owner,chosen);
        this.db.prepare('INSERT OR IGNORE INTO unlocks VALUES (?, ?)').run(owner, chosen);
        const opponent=this.recruitmentTeam(battle).find(set=>set.species===chosen)!;
        const incoming=(opponent.ivs ?? pokemonSets[chosen as keyof typeof pokemonSets].ivs) as StatBlock,before=this.savedTraining(owner,chosen);
        const raidRow=new RaidEvents(this.db).forBattle(battleId);
        const raidIndividual:Partial<TrainingProfile>=raidRow?{...(new RaidEvents(this.db).snapshot(raidRow).rewardProfile==='raid-premium'?{evs:{...opponent.evs} as StatBlock}:{}),nature:opponent.nature,ability:opponent.ability,moves:opponent.moves,teraType:opponent.teraType as TrainingProfile['teraType'],gender:opponent.gender as TrainingProfile['gender'],shiny:!!opponent.shiny,forme:opponent.raidForme}:{};
        const improved=Object.fromEntries(statKeys.map(stat=>[stat,Math.max(before.profile.ivs[stat],incoming[stat])])) as StatBlock;
        ivGain={species:chosen,changes:statKeys.filter(stat=>improved[stat]>before.profile.ivs[stat]).map(stat=>({stat,from:before.profile.ivs[stat],to:improved[stat]}))};
        this.db.prepare('INSERT INTO pokemon_training VALUES (?,?,?,?) ON CONFLICT(player_id,species) DO UPDATE SET profile=excluded.profile,revision=excluded.revision').run(owner,chosen,JSON.stringify({...before.profile,...raidIndividual,gender:wasUnlocked ? before.profile.gender : opponent.gender || 'N',ivs:improved,shiny:!!before.profile.shiny||!!opponent.shiny}),before.revision+1);
        if(raidIndividual.forme)saveTrainingForm(this.db,owner,chosen,{...before.profile,...raidIndividual,ivs:improved});
        const snapshots=JSON.parse((this.db.prepare('SELECT profiles FROM runs WHERE id=?').get(run.id) as {profiles:string}).profiles) as Record<string,TrainingProfile>;
        const current=snapshots[chosen] ?? structuredClone(before.profile);Object.assign(current,raidIndividual);if(!roster.includes(chosen))current.gender=(opponent.gender || 'N') as import('../data/gender').PokemonGender;
        const known=this.unlockedMoves(owner,chosen);
        const available=opponent.moves.filter(move=>(opponent.raidForme?profileLearnset(chosen,opponent.raidForme):moveLearnsets[chosen]).legalMoves.includes(move));
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
          snapshots[chosen]={...current,ivs:new RaidEvents(this.db).forBattle(battleId)?{...incoming}:Object.fromEntries(statKeys.map(stat=>[stat,Math.max(current.ivs[stat],incoming[stat])])) as StatBlock};
          this.db.prepare('UPDATE runs SET profiles=? WHERE id=?').run(JSON.stringify(snapshots),run.id);
        }
      } else if (replaced !== null || (swap!==undefined && swap!==null)) throw new BattleRequestError('영입하지 않으면 교체할 수 없습니다.', 400);
      this.db.prepare('INSERT INTO recruitments(battle_id,species,replaced,iv_gain,move_gain) VALUES (?, ?, ?, ?, ?)').run(battle.id, chosen, replaced,ivGain ? JSON.stringify(ivGain) : null,moveGain ? JSON.stringify(moveGain) : null);
      if(new RaidEvents(this.db).forBattle(battleId)){this.db.prepare("UPDATE runs SET state='select' WHERE id=?").run(run.id);return;}
      this.db.prepare('INSERT INTO run_encounter_progress(run_id,cleared_count) VALUES (?,1) ON CONFLICT(run_id) DO UPDATE SET cleared_count=cleared_count+1').run(run.id);
      const route=this.route(run.id),theme=this.runTheme(run.id);
      if(route && run.floor%50===0 && hasHiddenBoss(theme) && route.pending_boss!==run.floor){this.scheduleHiddenBoss(run,battle,false);return;}
      if(route?.pending_boss===run.floor)this.db.prepare('UPDATE run_routes SET pending_boss=0 WHERE run_id=?').run(run.id);
      if (run.floor === run.total_floors) {
        this.db.prepare("UPDATE runs SET state = 'cleared' WHERE id = ?").run(run.id);
        this.settleGrowth(run.id,'cleared');
      }
      else {
        this.db.prepare("UPDATE runs SET state = 'select', floor = floor + 1 WHERE id = ?").run(run.id);
        this.events.encounter(run.id,run.floor);
      }
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
      const formOptions=forms.length?[{species,name:baseFormName(species,importedPokemonName(species)),spriteKey:String(separateForms[species]?.id??Showdown.Dex.species.get(species).num),moves:base.moves,settings:formTrainingSettings(trainingFormProfile(this.db,owner,species,saved.profile,species)),ability:base.ability,learnableMoves:trainingOptions(species).learnableMoves,selfMoves:profileLearnset(species).selfMoves,abilities:trainingOptions(species).abilities,baseStats:trainingOptions(species).baseStats,teraType:base.teraType!},...forms.map(([name,form])=>({species:name,name:form.name,spriteKey:String(form.id),moves:form.moves,settings:formTrainingSettings(trainingFormProfile(this.db,owner,species,saved.profile,name)),ability:form.ability,learnableMoves:trainingOptions(species,name).learnableMoves,selfMoves:profileLearnset(species,name).selfMoves,abilities:form.abilities,baseStats:form.baseStats,teraType:defaultProfile(species,name).teraType!,requiredItem:form.requiredItem}))]:undefined;
      return {species,genders:genderOptions(species),...saved,...trainingOptions(species,saved.profile.forme),selfMoves:profileLearnset(species,saved.profile.forme).selfMoves,unlockedMoves:this.unlockedMoves(owner,species),...(formOptions?{formOptions}:{})};
    });
  }
  private unlockedMoves(owner:string,species:string):string[] {
    const saved=this.savedTraining(owner,species);
    const formMoves=(this.db.prepare('SELECT settings FROM pokemon_form_training WHERE player_id=? AND base_species=?').all(owner,species) as {settings:string}[]).flatMap(row=>(JSON.parse(row.settings) as import('../data/training').FormTrainingSettings).moves);
    return [...new Set([...formMoves,...moveLearnsets[species].selfMoves,...profileLearnset(species,saved.profile.forme).selfMoves,...saved.profile.moves,...(this.db.prepare('SELECT move FROM move_unlocks WHERE player_id=? AND species=?').all(owner,species) as {move:string}[]).map(row=>row.move)])];
  }
  private machinePartners(owner:string,runId:string) {
    const profiles=this.boostedProfiles(runId,this.runProfiles(runId));
    return Object.fromEntries(this.roster(runId).map(name=>{
      const profile=profiles[name] ?? this.savedTraining(owner,name).profile,set=equippedFormSet({...trainedSet(name,profile),item:this.heldItems(runId)[name]??''}),base=Showdown.Dex.species.get(set.species).baseStats;
      const level=pokemonSets[name].level,nature=natures.find(value=>value.id===profile.nature);
      const stats=Object.fromEntries(statKeys.map(key=>{
        if(profile.statSystem==='points')return [key,trainedStat(base[key],profile.ivs[key],profile.evs[key]+(profile.runBonuses?.[key]??0),key,profile.nature)];
        const neutral=Math.floor((2*base[key]+profile.ivs[key]+Math.floor(profile.evs[key]/4))*level/100)+(key==='hp' ? level+10 : 5);
        return [key,key==='hp' ? base.hp===1 ? 1 : neutral+(profile.runBonuses?.[key]??0) : Math.floor((neutral+(profile.runBonuses?.[key]??0))*(nature?.plus===key ? 1.1 : nature?.minus===key ? .9 : 1))];
      })) as StatBlock;
      return [name,{stats,level,ability:set.ability,nature:profile.nature,knownMoves:this.unlockedMoves(owner,name)}];
    }));
  }
  private savedTraining(owner:string,species:string):{profile:TrainingProfile;revision:number} {
    const saved=this.db.prepare('SELECT profile,revision FROM pokemon_training WHERE player_id=? AND species=?').get(owner,species) as {profile:string;revision:number}|undefined;
    const profile:TrainingProfile=saved ? {...defaultProfile(species),...JSON.parse(saved.profile)} : defaultProfile(species);
    profile.gender ??= saved ? pokemonSets[species].gender as import('../data/gender').PokemonGender : collectionGender(species,owner);
    return {profile:trainingFormProfile(this.db,owner,species,profile),revision:saved?.revision ?? 0};
  }
  train(owner:string,name:string,revision:number,value:unknown,adjustment?:{id:string;floor:number;snapshot:string}) {
    this.tx(()=>{
      if(!isCollectibleSpecies(name))throw new BattleRequestError('현재 수집 목록에서 제외된 포켓몬입니다.',400);
      if(!this.db.prepare('SELECT 1 FROM unlocks WHERE player_id=? AND species=?').get(owner,name))throw new BattleRequestError('해금한 포켓몬만 설정할 수 있습니다.',403);
      const run=adjustment?this.ownedRun(owner,adjustment.id):null;
      if(run && (run.state!=='select'||run.floor!==adjustment!.floor||(!this.retryState(run.id).pending_battle_id&&!!this.events.view(run.id))||!this.roster(run.id).includes(name)))throw new BattleRequestError('정비 구간에서 보유 포켓몬만 조정할 수 있습니다.',409);
      if(run && adjustment!.snapshot!==createHash('sha256').update(JSON.stringify(this.runProfiles(run.id))).digest('hex'))throw new BattleRequestError('파티 설정이 변경됐습니다. 다시 확인하세요.',409);
      const before=this.trainingCollection(owner).find(entry=>entry.species===name)!;
      if(revision!==before.revision)throw new BattleRequestError('설정이 이미 변경됐습니다. 도감을 다시 불러오세요.',409);
      // Archive/raid acquisitions can leave the run individual and permanent IVs different.
      const baseline=run?this.runProfiles(run.id)[name]??before.profile:before.profile;
      const profile={...validateProfile(name,value),gender:(value as TrainingProfile).gender ?? baseline.gender,shiny:baseline.shiny ?? false};
      const formChanged=profile.forme!==baseline.forme;
      if(run&&formChanged)throw new BattleRequestError('모습은 출발 전에 설정하세요.',400);
      const target=trainingFormProfile(this.db,owner,name,before.profile,profile.forme??name);
      const cost=trainingCost(formChanged?{...baseline,ability:target.ability}:baseline,profile);
      const known=new Set([...before.unlockedMoves,...profileLearnset(name,profile.forme).selfMoves,...(run?runMachines(this.db,run.id):[])]);
      if(profile.moves.some(move=>!known.has(move)))throw new BattleRequestError('아직 해금하지 않은 기술입니다. 상대 포켓몬을 영입해 기술을 모으세요.',400);
      if(statKeys.some(stat=>profile.ivs[stat]!==baseline.ivs[stat]))throw new BattleRequestError('개체값은 상대 포켓몬 영입으로만 높일 수 있습니다.',400);
      if(!this.db.prepare('UPDATE players SET growth_points=growth_points-? WHERE id=? AND growth_points>=?').run(cost,owner,cost).changes)throw new BattleRequestError('성장 포인트가 부족합니다.',400);
      saveTrainingForm(this.db,owner,name,before.profile,false);
      const permanentProfile=run?{...profile,ivs:{...before.profile.ivs},shiny:before.profile.shiny??false,moves:profile.moves.every(move=>before.unlockedMoves.includes(move))?profile.moves:before.profile.moves}:profile;
      saveTrainingForm(this.db,owner,name,permanentProfile);
      this.db.prepare('INSERT INTO pokemon_training VALUES (?,?,?,?) ON CONFLICT(player_id,species) DO UPDATE SET profile=excluded.profile,revision=excluded.revision').run(owner,name,JSON.stringify(permanentProfile),revision+1);
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
