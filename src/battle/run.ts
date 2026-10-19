import {isBattleRule,type BattleRule} from '../data/run-rules';
import {installRaid} from './raid';
import type {RaidSnapshot} from '../data/raids';
import {isTrainerEquipment} from '../data/trainer-equipment';
import {installBattleItems} from './battle-items';
import type {BattleItemBag} from '../data/battle-items';
import {setImmediate as settleItem} from 'node:timers/promises';
import {installTowerGimmicks} from './gimmicks';
import {installGolisopodMega} from './golisopod-mega';
import {DYNAMAX_ITEM,canEquipGimmick} from '../data/gimmicks';
import { createRequire } from 'node:module';
import Showdown from 'pokemon-showdown';
const { BattleStream, getPlayerStreams, Teams, TeamValidator } = Showdown;
import { playerTeam, opponentTeam, POINT_TEAM_MARKER,pointBonuses } from '../data/teams';
import {statKeys,trainedStat} from '../data/training';
import { legalActions, type Observation, type Policy, type Request } from './policy';
import {PublicSwitchInformation} from './switch-information';
import {upgrades,type UpgradeKind} from '../data/shop';

const require = createRequire(import.meta.url);
export const engineVersion: string = require('pokemon-showdown/package.json').version;
import {FORMAT,PRE_FORM_ITEM_FORMAT,PRE_GOLISOPOD_FORMAT,PRE_TERA_FORMAT,PRE_NPC_FORMAT,supportedFormats} from '../data/battle-rules';
import {equippedFormSet} from '../data/equipped-form';
export {FORMAT} from '../data/battle-rules';
export type Seed = [number, number, number, number];
export type BattleLog = {
  fixedOpponentOrder?:boolean;
  raid?:RaidSnapshot;
  opponentRule?:BattleRule;
  opponentTeraSpecies?:string;
  rule?:BattleRule;
  battleItems?:BattleItemBag;
  schemaVersion: 1; engineVersion: string; format: string; seed: Seed;
  teams: {p1: string; p2: string};
  decisions: {side: 'p1' | 'p2'; observation: Observation; action: string}[];
  publicProtocol: string[]; winner: string | null; turns: number;
  upgrades?: UpgradeKind[];
  teraTickets?:import('../data/tera').TeraTickets;
  trainerEquipment?:readonly import('../data/trainer-equipment').TrainerEquipment[];
};

export async function runBattle(options: {
  fixedOpponentOrder?:boolean;
  raid?:RaidSnapshot;
  opponentRule?:BattleRule;
  opponentTeraSpecies?:string;
  rule?:BattleRule;
  battleItems?:BattleItemBag;
  player: Policy; opponent: Policy; seed?: Seed; format?:string;
  teams?: {p1: string; p2: string};
  onPublicLine?: (line: string) => void;
  onPlayerLine?: (line: string) => void;
  upgrades?: UpgradeKind[];
  teraTickets?:import('../data/tera').TeraTickets;
  trainerEquipment?:readonly import('../data/trainer-equipment').TrainerEquipment[];
}): Promise<BattleLog> {
  if(options.rule!==undefined&&!isBattleRule(options.rule))throw Error('Invalid battle rule');
  if(options.opponentRule!==undefined&&!isBattleRule(options.opponentRule))throw Error('Invalid opponent rule');
  if(options.trainerEquipment!==undefined&&(!Array.isArray(options.trainerEquipment)||options.trainerEquipment.some(item=>!isTrainerEquipment(item))||new Set(options.trainerEquipment).size!==options.trainerEquipment.length))throw Error('Invalid trainer equipment');
  const seed: Seed = options.seed ?? [1, 2, 3, 4];
  if (seed.length !== 4 || seed.some(n => !Number.isInteger(n) || n < 0 || n > 65535)) throw new Error('Invalid seed');
  const format=options.format ?? FORMAT;if(!supportedFormats.includes(format))throw Error('Unsupported battle format');
  const towerFormat=[FORMAT,PRE_FORM_ITEM_FORMAT,PRE_GOLISOPOD_FORMAT,PRE_NPC_FORMAT,PRE_TERA_FORMAT].includes(format);
  if(options.teraTickets && ['p1','p2'].some(side=>!Number.isSafeInteger(options.teraTickets![side as 'p1'|'p2']) || options.teraTickets![side as 'p1'|'p2']<0))throw Error('Invalid tera tickets');
  const teams = options.teams ?? {p1: playerTeam, p2: opponentTeam};
  const fixedOpponentOrder=options.fixedOpponentOrder??options.opponent.fixedOrder??false;
  if(options.raid){
    if(options.raid.opponentTeam!==teams.p2||options.raid.phases.length<2||options.raid.phases.length>3)throw Error('Invalid raid team snapshot');
    for(const phase of options.raid.phases){
      const form=Showdown.Dex.species.get(phase.species);
      if(!form.exists||![form.name,form.baseSpecies].includes(options.raid.species)||!Object.values(form.abilities).includes(phase.ability))throw Error('Invalid raid phase form/ability');
    }
  }
  const packed=Object.fromEntries(Object.entries(teams).map(([side,team])=>[side,Teams.unpack(team)!])) as Record<'p1'|'p2',NonNullable<ReturnType<typeof Teams.unpack>>>;
  if(towerFormat)for(const set of Object.values(packed).flat())if(!canEquipGimmick(set.species,set.item))throw Error('Incompatible gimmick item');
  if(format===FORMAT)for(const side of ['p1','p2'] as const)packed[side]=packed[side].map(set=>equippedFormSet(set));
  const engineTeams=format===FORMAT?{p1:Teams.pack(packed.p1),p2:Teams.pack(packed.p2)}:teams;
  const active=[...new Set(options.upgrades ?? [])].sort() as UpgradeKind[];
  if(active.some(kind=>!Object.hasOwn(upgrades,kind))) throw new Error('Invalid upgrade');
  for (const [side,team] of Object.entries(engineTeams)) {
    const unpacked = Teams.unpack(team);
    if (!unpacked || unpacked.length !== (side==='p2'&&options.raid?options.raid.phases.length:3)) throw new Error('Expected fixed 3-Pokemon team');
    const legality=structuredClone(unpacked);
    for(const set of legality) {
      if(towerFormat && Showdown.toID(set.item)==='dynamaxband')set.item='';
      if(Showdown.toID(set.pokeball).startsWith('towerlegacyboost')){pointBonuses(Showdown.toID(set.pokeball));set.pokeball='';continue;}
      if(Showdown.toID(set.pokeball)!==POINT_TEAM_MARKER && !Showdown.toID(set.pokeball).startsWith(POINT_TEAM_MARKER+'boost'))continue;
      pointBonuses(Showdown.toID(set.pokeball));
      set.evs ??= {hp:0,atk:0,def:0,spa:0,spd:0,spe:0};
      if(statKeys.some(key=>!Number.isInteger(set.evs![key]) || set.evs![key]<0 || set.evs![key]>32) || statKeys.reduce((sum,key)=>sum+set.evs![key],0)>66)throw new Error('Invalid stat points');
      set.pokeball='';set.evs={hp:1,atk:0,def:0,spa:0,spd:0,spe:0};
      // Collection IVs are earned here, independent of cartridge event/transfer IV guarantees.
      // Validate move/species/ability origins with a legal IV proxy; use real saved IVs in battle.
      set.ivs={hp:31,atk:31,def:31,spa:31,spd:31,spe:31};
      // Gender is freely selectable in the collection, just like earned IVs.
      // Check event origins with a gender proxy; use the saved sex in battles/replays.
      set.gender='';
      // Tower collection rewards can unlock shiny species independently of
      // cartridge event locks. Keep the actual shiny flag in the battle team.
      set.shiny=false;
    }
    const errors = new TeamValidator(format).validateTeam(legality);
    if (errors?.length) throw new Error(errors.join('\n'));
  }
  const log: BattleLog = {schemaVersion: 1, engineVersion, format, seed: [...seed], teams,
    decisions: [], publicProtocol: [], winner: null, turns: 0};
  if(options.rule)log.rule=options.rule;
  if(fixedOpponentOrder)log.fixedOpponentOrder=true;
  if(options.raid)log.raid=structuredClone(options.raid);
  if(options.opponentRule)log.opponentRule=options.opponentRule;
  if(options.opponentTeraSpecies)log.opponentTeraSpecies=options.opponentTeraSpecies;
  if(active.length) log.upgrades=active;
  if(options.trainerEquipment!==undefined)log.trainerEquipment=[...options.trainerEquipment];
  if(options.teraTickets)log.teraTickets={...options.teraTickets};
  let itemController:ReturnType<typeof installBattleItems>|undefined;
  if(options.battleItems)log.battleItems={...options.battleItems};
  class TowerBattleStream extends BattleStream {
    override _writeLine(type:string,message:string) {
      super._writeLine(type,message);
      if(type!=='start' || !this.battle) return;
      if(options.battleItems)itemController=installBattleItems(this.battle,options.battleItems);
      if(towerFormat)installTowerGimmicks(this.battle,packed,format!==PRE_TERA_FORMAT ? options.teraTickets : undefined,options.rule,options.opponentRule,options.opponentTeraSpecies,options.trainerEquipment,format===FORMAT);
      if(format===FORMAT||format===PRE_FORM_ITEM_FORMAT)installGolisopodMega(this.battle);
      if(options.raid)installRaid(this.battle,options.raid);
      // Phase bosses cannot be pulled into a later phase by Roar/Red Card.
      if(fixedOpponentOrder)this.battle.onEvent('DragOut',this.battle.format,(pokemon:import('pokemon-showdown').Pokemon)=>pokemon.side.id==='p2'?false:undefined);
      const original=this.battle.statModify.bind(this.battle);
      this.battle.statModify=(base,set,key)=>Showdown.toID(set.pokeball).startsWith(POINT_TEAM_MARKER)
        ? key==='hp' && base.hp===1 ? 1 : trainedStat(base[key],set.ivs[key],set.evs[key]+(pointBonuses(Showdown.toID(set.pokeball))[key as keyof import("../data/training").StatBlock]??0),key,set.nature)
        : original(base,set,key)+(base.hp===1&&key==='hp'?0:Math.floor((pointBonuses(Showdown.toID(set.pokeball))[key as keyof import('../data/training').StatBlock]??0)*(key==='hp'?1:(Showdown.Dex.natures.get(set.nature).plus===key?1.1:Showdown.Dex.natures.get(set.nature).minus===key?.9:1))));
      // Register on this battle only; the shared Dex and other players are untouched.
      const usedBerries=new WeakSet<object>();
      this.battle.onEvent('UseItem',this.battle.format,(item:{id:string},pokemon:{side:{id:string}})=>{
        if((towerFormat || pokemon.side.id==='p1') && item.id==='sitrusberry' && usedBerries.has(pokemon))return false;
      });
      this.battle.onEvent('EatItem',this.battle.format,(item:{id:string},pokemon:{side:{id:string}})=>{
        if(pokemon.side.id==='p1' && item.id==='sitrusberry')usedBerries.add(pokemon);
      });
      if(active.includes('guard'))this.battle.onEvent('TryBoost',this.battle.format,(boosts:Record<string,number>,pokemon:{side:{id:string}},source:unknown)=>{if(pokemon.side.id==='p1' && source!==pokemon)for(const stat of Object.keys(boosts))if(boosts[stat]<0)boosts[stat]=0;});
      for(const event of [...(active.includes('attack') ? ['ModifyAtk','ModifySpA'] : []),...(active.includes('speed') ? ['ModifySpe'] : [])]) {
        this.battle.onEvent(event,this.battle.format,(stat:number,pokemon:{side:{id:string}})=>pokemon.side.id==='p1' ? Math.floor(stat*1.2) : stat);
      }
      // Keep old attack snapshots/replays unchanged; Special Up can stack with Plus Power.
      for(const [kind,event] of [['defense','ModifyDef'],['specialAttack','ModifySpA'],['specialDefense','ModifySpD']] as const){
        if(active.includes(kind))this.battle.onEvent(event,this.battle.format,(stat:number,pokemon:{side:{id:string}})=>pokemon.side.id==='p1'?Math.floor(stat*1.2):stat);
      }
      if(active.includes('accuracy'))this.battle.onEvent('ModifyAccuracy',this.battle.format,(accuracy:number|true,_target:unknown,source:{side:{id:string}})=>typeof accuracy==='number'&&source?.side.id==='p1'?Math.min(100,accuracy*1.2):accuracy);
      if(active.includes('critical'))this.battle.onEvent('ModifyCritRatio',this.battle.format,(ratio:number,source:{side:{id:string}})=>source.side.id==='p1'?ratio+1:ratio);
    }
  }
  const engine = new TowerBattleStream();
  const streams = getPlayerStreams(engine);
  const consume = async (side: 'p1' | 'p2', policy: Policy) => {
    const switching=policy.switchingInformation ? new PublicSwitchInformation(side) : null;
    let turn = 0;
    let opponent: Observation['opponent'] = null;
    let lastOpponentMove:string|undefined;
    for await (const chunk of streams[side]) {
      for (const line of chunk.split('\n')) {
        switching?.consume(line);
        if(line.startsWith('|') && !line.startsWith('|request|') && !line.startsWith('|error|'))policy.observePublicLine?.(line);
        if (side === 'p1') options.onPlayerLine?.(line);
        const parts = line.split('|');
        if (parts[1] === 'error') throw new Error(parts.slice(2).join('|'));
        if (parts[1] === 'turn') {
          turn = Number(parts[2]);
          if (turn > 200) throw new Error('Battle exceeded the integration turn limit');
        }
        const isOpponent = parts[2]?.startsWith(side === 'p1' ? 'p2a:' : 'p1a:');
        if (isOpponent && ['switch', 'drag', 'replace'].includes(parts[1])) {
          opponent = {species: parts[3].split(',')[0], condition: parts[4] || (opponent as Observation['opponent'])?.condition || '100/100'};
          lastOpponentMove=undefined;
        }
        if(isOpponent && parts[1]==='move')lastOpponentMove=parts[3];
        if(isOpponent && opponent && ['-formechange','detailschange'].includes(parts[1]))opponent.species=parts[3].split(',')[0];
        if (isOpponent && opponent && ['-damage', '-heal'].includes(parts[1])) opponent.condition = parts[3];
        if(isOpponent && opponent && parts[1]==='-status')opponent.condition=`${opponent.condition.split(' ')[0]} ${parts[3]}`;
        if(isOpponent && opponent && parts[1]==='-curestatus')opponent.condition=opponent.condition.split(' ')[0];
        if (parts[1] !== 'request') continue;
        const request = JSON.parse(parts.slice(2).join('|')) as Request | null;
        if (!request || request.wait) continue;
        // Explicit whitelist: do not pass the engine, the other side, or raw logs to a policy.
        const observation: Observation = {
          turn, opponent: structuredClone(opponent),
          ownTeam: request.side.pokemon.map(p => ({ident: p.ident, details: p.details,
            condition: p.condition, active: p.active, stats: {...p.stats},...(switching ? {moves:[...(p.moves??[])],item:p.item,ability:p.ability,terastallized:p.terastallized} : {})})),
          legalActions: legalActions(request, opponent?.species),
          lastOpponentMove,
          ...(switching ? {switching:{...switching.view(),...(policy.uncertainSwitchingInformation?{maybeTrapped:!!request.active?.[0].maybeTrapped}: {})}} : {}),
        };
        while(true){
          observation.legalActions=legalActions(request,opponent?.species);
          if(side==='p2'&&(options.raid||fixedOpponentOrder)&&!observation.legalActions[0]?.command.startsWith('team ')){
            const forced=observation.legalActions.every(a=>a.command.startsWith('switch '));
            observation.legalActions=forced?observation.legalActions.slice(0,1):observation.legalActions.filter(a=>a.command.startsWith('move ')&&(!options.raid||!/ (mega|dynamax|terastallize|zmove)/.test(a.command)));
          }
          if(switching && observation.switching)observation.switching={...observation.switching,...switching.view()};
          if(side==='p1' && itemController)observation.legalActions.push(...itemController.legal().map(kind=>({command:'item '+kind,label:upgrades[kind].name,estimatedDamage:0})));
          let action = await policy.choose(structuredClone(observation));
          if(side==='p2'&&format===FORMAT&&observation.legalActions.some(a=>a.command===action+' ultra'))action+=' ultra';
          if (!observation.legalActions.some(a => a.command === action)) throw new Error(`Illegal action: ${action}`);
          log.decisions.push({side, observation:structuredClone(observation), action});
          if(side==='p1' && action.startsWith('item ') && itemController){itemController.use(action.slice(5) as UpgradeKind);await settleItem();continue;}
          await streams[side].write(action);break;
        }
      }
    }
  };
  const collect = async () => {
    for await (const chunk of streams.spectator) {
      for (const line of chunk.split('\n')) {
        if (!line) continue;
        log.publicProtocol.push(line);
        const parts = line.split('|');
        if (parts[1] === 'turn') log.turns = Number(parts[2]);
        if (parts[1] === 'win') log.winner = parts[2];
        if (parts[1] === 'tie') log.winner = 'tie';
        options.onPublicLine?.(line);
      }
    }
  };
  const tasks = [consume('p1', options.player), consume('p2', options.opponent), collect()];
  try {
    await streams.omniscient.write([
      `>start ${JSON.stringify({formatid: format, seed})}`,
      `>player p1 ${JSON.stringify({name: 'Player', team: engineTeams.p1})}`,
      `>player p2 ${JSON.stringify({name: 'Tower AI', team: engineTeams.p2})}`,
    ].join('\n'));
    await Promise.all(tasks);
    if (!log.winner) throw new Error('Battle ended without a result');
    return log;
  } finally {
    await engine.writeEnd();
    await Promise.allSettled(tasks);
  }
}

// Wall-clock timestamps are metadata, not deterministic battle events.
export const battleEvents = (protocol: string[]) => protocol.filter(line => !line.startsWith('|t:|'));

export async function replayBattle(record: BattleLog): Promise<BattleLog> {
  if (record.engineVersion !== engineVersion || !supportedFormats.includes(record.format)) throw new Error('Replay environment mismatch');
  const makePolicy = (side: 'p1' | 'p2'): Policy => {
    const actions = record.decisions.filter(d => d.side === side);
    let index = 0;
    return {choose: () => {
      const next = actions[index++];
      if (!next) throw new Error('Replay action missing');
      return next.action;
    }};
  };
  const result = await runBattle({fixedOpponentOrder:record.fixedOpponentOrder,raid:record.raid,seed: record.seed, rule:record.rule,opponentRule:record.opponentRule,opponentTeraSpecies:record.opponentTeraSpecies,format:record.format, teams: record.teams, battleItems:record.battleItems,upgrades:record.upgrades,teraTickets:record.teraTickets,trainerEquipment:record.trainerEquipment, player: makePolicy('p1'), opponent: makePolicy('p2')});
  if (JSON.stringify(battleEvents(result.publicProtocol)) !== JSON.stringify(battleEvents(record.publicProtocol))) throw new Error('Replay diverged');
  if (result.winner !== record.winner || result.turns !== record.turns) throw new Error('Replay result mismatch');
  if (result.decisions.length !== record.decisions.length) throw new Error('Unused replay actions');
  return result;
}
