import {createNpcPolicy} from '../battle/npc-policy';
import {applyPublicTypes} from '../battle/public-types';
import {packedNpcRule} from '../data/npc-gimmicks';
import {ZMovePolicy} from '../battle/z-move-policy';
import {moveInfo} from '../data/move-info';
import {TeraPolicy,GimmickPolicy,LegacyGimmickPolicy} from '../battle/gimmick-policy';
import {SwitchingPolicy,CautiousSwitchingPolicy} from '../battle/switch-policy';
import {LearningOpponentPolicy} from '../battle/learning-opponent-policy';
import {DYNAMAX_ITEM} from '../data/gimmicks';
import {normalizeHeldItem} from '../data/held-items';
import { randomBytes, randomUUID } from 'node:crypto';
import { setImmediate as settle } from 'node:timers/promises';
import { DamagePolicy, type Observation } from '../battle/policy';
import {TowerPolicy} from '../battle/tower-policy';
import { runBattle, type BattleLog, type Seed } from '../battle/run';
import type { BattleView,PokemonView } from '../shared/contracts';
import type {UpgradeKind} from '../data/shop';
import Showdown from 'pokemon-showdown';
import {playerTeam} from '../data/teams';
import {dynamaxDisplaySpecies} from '../data/selectable-forms';
import {genderFromDetails} from '../data/gender';
import {advanceField,emptyField} from '../battle/public-field';

const zStatNames:Record<string,string>={atk:'공격',def:'방어',spa:'특수공격',spd:'특수방어',spe:'스피드',accuracy:'명중률',evasion:'회피율'};
const zStatusEffects:Record<string,string>={heal:'자신의 HP를 전부 회복',healreplacement:'다음에 등장하는 포켓몬의 HP를 전부 회복',clearnegativeboost:'낮아진 능력치 랭크를 복구',redirect:'상대 공격을 자신에게 유도',crit2:'급소 확률 상승',curse:'고스트 타입은 HP 전부 회복, 그 외 타입은 공격 1단계 상승'};

import {BattleRequestError} from './request-error';
export {BattleRequestError} from './request-error';

export class BattleSession {
  readonly id: string;
  private requestId = 0;
  private observation: Observation | null = null;
  private pending: {resolve: (action: string) => void; reject: (error: Error) => void} | null = null;
  private status: 'processing' | 'waiting' | 'complete' | 'error' = 'processing';
  private winner: string | null = null;
  private turns = 0;
  private messages: string[] = [];
  private requestPublicIndex = 0;
  private ownConditions = new Map<string, string>();
  private ownActiveSpecies:string|null=null;
  private ownDetails=new Map<string,Partial<PokemonView>>();
  private initialSpecies=new Map<string,string>();
  private movePP:NonNullable<BattleView['movePP']>=[];
  private field=emptyField();
  private trainerEquipment?:readonly import('../data/trainer-equipment').TrainerEquipment[];
  private initialTeraTickets=0;
  private opponentRule?:import('../data/run-rules').BattleRule;
  private opponentPrimal=false;
  private teraSpent=false;
  private maxMovePP:BattleView['maxMovePP'];
  private zMovePP:BattleView['zMovePP'];
  private failure: string | null = null;
  private disposed = false;
  private listeners = new Set<() => void>();
  readonly finished: Promise<void>;
  private saveInput?: (requestId: number, action: string) => void;

  constructor(save: (log: BattleLog, id: string, view: BattleView) => Promise<void>, seed?: Seed,
    options: {npcAi?:import('../data/npc-ai').NpcAi;raid?:import('../data/raids').RaidSnapshot;opponentRule?:import('../data/run-rules').BattleRule;trainerEquipment?:readonly import('../data/trainer-equipment').TrainerEquipment[];rule?:import('../data/run-rules').BattleRule;opponentTeraSpecies?:string;id?: string; format?:string; aiVersion?:string; teams?: {p1: string; p2: string}; history?: string[]; battleItems?:import('../data/battle-items').BattleItemBag; upgrades?:UpgradeKind[];teraTickets?:import('../data/tera').TeraTickets; saveInput?: (requestId: number, action: string) => void} = {}) {
    this.id = options.id ?? randomUUID();
    this.trainerEquipment=options.trainerEquipment;
    this.initialTeraTickets=options.teraTickets?.p1 ?? 0;
    if(['tower-policy-v10','tower-policy-v11'].includes(options.aiVersion??'')){
      const team=Showdown.Teams.unpack(options.teams?.p2 ?? '') ?? [];
      this.opponentRule=options.opponentRule??packedNpcRule(team,options.teraTickets?.p2 ?? 0);
      this.opponentPrimal=team.some(p=>p.species==='Groudon' && p.item==='Red Orb' || p.species==='Kyogre' && p.item==='Blue Orb');
    }
    for(const set of Showdown.Teams.unpack(options.teams?.p1 ?? playerTeam) ?? []){
      this.initialSpecies.set(set.name || set.species,set.species);
      this.ownDetails.set(set.name || set.species,{nature:set.nature,ability:set.ability,item:set.item,teraType:set.teraType ?? Showdown.Dex.species.get(set.species).types[0],moves:set.moves.map(move=>Showdown.Dex.moves.get(move).name)});
    }
    this.saveInput = options.saveInput;
    const random = randomBytes(8);
    const battleSeed: Seed = seed ?? [0, 2, 4, 6].map(i => random.readUInt16BE(i)) as Seed;
    this.finished = runBattle({
      raid:options.raid,
      seed: battleSeed,
      format:options.format,
      teams: options.teams,
      rule:options.rule,opponentRule:this.opponentRule,opponentTeraSpecies:options.opponentTeraSpecies,battleItems:options.battleItems,upgrades:options.upgrades,teraTickets:options.teraTickets,trainerEquipment:options.trainerEquipment,
      opponent: options.aiVersion==='tower-policy-v11' ? createNpcPolicy(options.npcAi) : ['tower-policy-v10','tower-policy-v9'].includes(options.aiVersion ?? '') ? new ZMovePolicy() : options.aiVersion==='tower-policy-v8' ? new LearningOpponentPolicy() : options.aiVersion==='damage-policy-v1' ? new DamagePolicy() : options.aiVersion==='tower-policy-v7' ? new CautiousSwitchingPolicy() : options.aiVersion==='tower-policy-v6' ? new SwitchingPolicy() : options.aiVersion==='tower-policy-v5' ? new TeraPolicy() : options.aiVersion==='tower-policy-v4' ? new GimmickPolicy() : options.aiVersion==='tower-policy-v3' ? new LegacyGimmickPolicy() : new TowerPolicy(),
      player: {choose: observation => {
        if (observation.legalActions[0]?.command.startsWith('team ')) return 'team 123';
        this.observation = observation;
        this.ownActiveSpecies=observation.ownTeam.find(p=>p.active)?.ident.split(': ')[1] ?? null;
        for(const pokemon of observation.ownTeam)this.ownConditions.set(pokemon.ident.split(': ')[1],pokemon.condition);
        this.requestPublicIndex = this.messages.length;
        this.turns = observation.turn;
        this.requestId++;
        const replayed = options.history?.[this.requestId - 1];
        if (replayed !== undefined) return replayed;
        this.status = 'waiting';
        const choice = new Promise<string>((resolve, reject) => { this.pending = {resolve, reject}; });
        this.notify();
        return choice;
      }},
      onPublicLine: line => {
        // Public-only protocol; never includes private request messages.
        this.messages.push(line);
        if(line.startsWith('|-terastallize|p1'))this.teraSpent=true;
        this.field=advanceField(this.field,line);
        if (line.startsWith('|turn|')) this.turns = Number(line.split('|')[2]);
        if (line.startsWith('|win|')) this.winner = line.split('|')[2];
      },
      onPlayerLine: line => {
        if(line.startsWith('|request|')){
          const request=JSON.parse(line.slice(9));
          if(!request || request.wait)return;
          const current=request.side?.pokemon.find((p:{active:boolean})=>p.active),tera=current?.terastallized;
          this.movePP=(request.active?.[0]?.moves ?? []).map((move:{id:string;pp:number;maxpp:number})=>{
            const base=Showdown.Dex.moves.get(move.id);
            return {name:base.name,pp:move.pp,maxpp:move.maxpp,...(move.id==='terablast' && tera ? {type:tera,power:tera==='Stellar'?100:80,accuracy:true,category:current.stats.atk>current.stats.spa?'Physical' as const:'Special' as const} : {})};
          });
          this.zMovePP=request.active?.[0]?.canZMove?.map((option:{move:string}|null,index:number)=>{
            if(!option)return null;
            const base=Showdown.Dex.moves.get(request.active[0].moves[index].id),z=Showdown.Dex.moves.get(option.move);
            const status=option.move.startsWith('Z-');
            const effect=base.zMove?.boost ? '추가 효과: '+Object.entries(base.zMove.boost).map(([stat,value])=>(zStatNames[stat] ?? stat)+' '+value+'단계').join(' · ') : base.zMove?.effect ? '추가 효과: '+(zStatusEffects[base.zMove.effect] ?? base.zMove.effect) : '';
            return {...this.movePP[index],name:option.move,displayName:status?'Z-'+(moveInfo[base.name]?.name ?? base.name):moveInfo[z.name]?.name ?? z.name,type:status?base.type:z.type,category:status?'Status' as const:z.basePower===1?base.category:z.category,power:status?0:z.basePower===1?base.zMove?.basePower || 0:z.basePower,accuracy:status?base.accuracy:z.accuracy,description:status?effect+' · '+(moveInfo[base.name]?.description ?? ''):moveInfo[z.name]?.description ?? '팀당 배틀 한 번 사용하는 Z기술입니다.'};
          });
          this.maxMovePP=request.active?.[0]?.maxMoves?.maxMoves.map((max:{move:string},index:number)=>{
            const base=Showdown.Dex.moves.get(request.active[0].moves[index].id),move=Showdown.Dex.moves.get(max.move);
            return {...this.movePP[index],name:move.name,power:base.category==='Status'?0:base.maxMove?.basePower ?? 100,category:base.category,type:move.type,accuracy:true};
          });
          if(this.maxMovePP && !request.active[0].canDynamax)this.movePP=this.maxMovePP;
          for(const pokemon of request.side?.pokemon ?? []){
            const name=pokemon.ident.split(': ')[1],old=this.ownDetails.get(name);
            const hp=Number(pokemon.condition.split(' ')[0].split('/')[1]) || old?.stats?.hp || 0;
            this.ownDetails.set(name,{...old,terastallized:pokemon.terastallized || old?.terastallized,stats:{hp,...pokemon.stats},item:pokemon.item==='dynamaxband' ? DYNAMAX_ITEM : pokemon.item ? Showdown.Dex.items.get(pokemon.item).name : '',ability:Showdown.Dex.abilities.get(pokemon.ability ?? pokemon.baseAbility).name,moves:pokemon.moves.map((move:string)=>Showdown.Dex.moves.get(move).name)});
          }
          return;
        }
        const [, event, actor, value, condition] = line.split('|');
        if (!actor?.startsWith('p1a:')) return;
        const name = event!=='switch' && this.ownActiveSpecies==='Zoroark' ? 'Zoroark' : actor.split(': ')[1];
        if(event==='-terastallize')this.ownDetails.set(name,{...this.ownDetails.get(name),terastallized:value});
        if(event==='-enditem')this.ownDetails.set(name,{...this.ownDetails.get(name),item:'',berryUsed:value==='Sitrus Berry' && line.split('|').includes('[eat]')});
        if(event==='-item')this.ownDetails.set(name,{...this.ownDetails.get(name),item:normalizeHeldItem(value)??value});
        if (event === 'switch') {this.ownActiveSpecies=name;this.ownConditions.set(name, condition);}
        if (['-damage', '-heal'].includes(event)) this.ownConditions.set(name, value);
        if (event === 'faint') this.ownConditions.set(name, '0 fnt');
      },
    }).then(async log => {
      this.winner = log.winner;
      this.turns = log.turns;
      this.status = 'complete';
      await save(log, this.id, this.view());
      this.notify();
    }).catch(error => {
      this.status = 'error';
      this.failure = '배틀을 계속할 수 없습니다. 새 배틀을 시작해 주세요.';
      if (!this.disposed) console.error('Battle session failed:', error instanceof Error ? error.message : 'Unknown error');
      this.notify();
    });
  }

  private notify() { for (const listener of this.listeners) listener(); }

  async ready(): Promise<BattleView> {
    if (this.status === 'processing') {
      await new Promise<void>((resolve, reject) => {
        const done = () => { clearTimeout(timeout); this.listeners.delete(done); resolve(); };
        const timeout = setTimeout(() => {
          this.listeners.delete(done);
          reject(new BattleRequestError('응답이 지연되고 있습니다. 새로고침해 상태를 확인해 주세요.', 503));
        }, 10_000);
        this.listeners.add(done);
      });
    }
    // Let public stream consumption finish before serializing the state.
    await settle();
    return this.view();
  }

  submit(id: string, requestId: number, action: string): Promise<BattleView> {
    if (id !== this.id || requestId !== this.requestId || this.status !== 'waiting' || !this.pending) {
      throw new BattleRequestError('이미 처리되었거나 오래된 행동입니다. 현재 상태를 다시 확인해 주세요.', 409);
    }
    if (!this.observation?.legalActions.some(a => a.command === action)) {
      throw new BattleRequestError('지금 선택할 수 없는 행동입니다.', 400);
    }
    const pending = this.pending;
    // Journal accepted input before advancing the engine; a crash can replay it.
    this.saveInput?.(requestId, action);
    this.pending = null;
    this.status = 'processing';
    pending.resolve(action);
    return this.ready();
  }

  isFinished() { return this.status === 'complete' || this.status === 'error'; }

  async dispose() {
    this.disposed = true;
    // Expire sessions only at a human-input boundary (or after completion).
    this.pending?.reject(new Error('Session expired'));
    this.pending = null;
    await this.finished;
  }

  private view(): BattleView {
    const team:PokemonView[] = this.observation?.ownTeam.map(p => ({
      ...this.ownDetails.get(p.ident.split(': ')[1]),
      gender:genderFromDetails(p.details),shiny:p.details.split(', ').includes('shiny'),species: p.ident.split(': ')[1], displaySpecies:p.details.split(',')[0], condition: this.status === 'complete' ? this.ownConditions.get(p.ident.split(': ')[1]) ?? p.condition : p.condition, active: p.active,
    })) ?? [];
    let opponent:BattleView['opponent'] = this.observation?.opponent ? {...this.observation.opponent} : null;
    // Also apply the last turn after the last human request, including a final KO.
    for (const [index,line] of this.messages.entries()) {
      const [, event, actor, data, condition] = line.split('|');
      if (!actor || !['switch', 'drag', 'replace', '-damage', '-heal', 'faint', '-status', '-curestatus','-formechange','detailschange','-start','-end','-transform','-terastallize'].includes(event)) continue;
      if (actor.startsWith('p2a:')) {
        if (['switch', 'drag', 'replace'].includes(event)) opponent = {gender:genderFromDetails(data),shiny:data.split(', ').includes('shiny'),species: data.split(',')[0],terastallized:data.match(/tera:([A-Za-z]+)/)?.[1], condition:condition ?? opponent?.condition ?? '100/100'};
        else if (opponent && ['-damage', '-heal'].includes(event)) opponent.condition = data;
        else if (opponent && event === 'faint') opponent.condition = '0 fnt';
        else if (opponent && event === '-status') opponent.condition = `${opponent.condition.split(' ')[0]} ${data}`;
        else if (opponent && event === '-curestatus') opponent.condition = opponent.condition.split(' ')[0];
        else if(opponent && ['-formechange','detailschange'].includes(event))opponent.displaySpecies=data.split(',')[0];
        else if(opponent && ['-start','-end'].includes(event) && data==='Dynamax'){
          opponent.dynamax=event==='-start';
          if(event==='-start' && condition==='Gmax')opponent.displaySpecies=dynamaxDisplaySpecies(opponent.species,true);
          else if(event==='-end' && opponent.displaySpecies?.endsWith('-Gmax'))opponent.displaySpecies=dynamaxDisplaySpecies(opponent.displaySpecies,false);
        }
        else if(opponent && event==='-terastallize')opponent.terastallized=data;
        else if(opponent && event==='-transform'){const target=team.find(p=>p.species===data.split(': ')[1]);if(target)opponent.displaySpecies=target.displaySpecies ?? target.species;}
      }
      if(index>=this.requestPublicIndex && actor.startsWith('p1a:') && ['-formechange','-transform'].includes(event)) {
        const pokemon=team.find(p=>p.species===actor.split(': ')[1]);
        if(pokemon && ['-formechange','detailschange'].includes(event))pokemon.displaySpecies=data.split(',')[0];
        if(pokemon && event==='-transform' && opponent)pokemon.displaySpecies=opponent.displaySpecies ?? opponent.species;
      }
      if(actor.startsWith('p1a:') && event==='-terastallize'){const p=team.find(p=>p.species===actor.split(': ')[1]);if(p)p.terastallized=data;}
      if(actor.startsWith('p1a:') && ['-start','-end'].includes(event) && data==='Dynamax'){const p=team.find(p=>p.species===actor.split(': ')[1]);if(p){p.dynamax=event==='-start';if(event==='-start' && condition==='Gmax')p.displaySpecies=dynamaxDisplaySpecies(this.initialSpecies.get(p.species)??p.species,true);else if(event==='-end' && p.displaySpecies?.endsWith('-Gmax'))p.displaySpecies=dynamaxDisplaySpecies(p.displaySpecies,false);}}
      if (actor.startsWith('p1a:') && this.status === 'complete') {
        const pokemon = team.find(p => p.species === actor.split(': ')[1]);
        if (pokemon && event === 'faint') pokemon.condition = '0 fnt';
      }
    }
    const typeView={team,opponent} as BattleView;
    for(const pokemon of team){const form=Showdown.Dex.species.get(pokemon.displaySpecies ?? pokemon.species);if(form.isPrimal)pokemon.ability=form.abilities[0];}
    for(const line of this.messages)applyPublicTypes(typeView,line);
    return {
      id: this.id, requestId: this.requestId,
      status: this.status === 'processing' ? 'waiting' : this.status,
      turn: this.turns, team, opponent,
      actions: this.status === 'waiting' ? this.observation?.legalActions.map(({command, label}) => ({command, label})) ?? [] : [],
      messages: this.messages.slice(-300), winner: this.winner, error: this.failure,
      trainerEquipment:this.trainerEquipment,opponentPrimal:this.opponentPrimal || undefined,opponentRule:this.opponentRule,teraTickets:Math.max(0,this.initialTeraTickets-(this.teraSpent?1:0)),field:structuredClone(this.field),maxMovePP:this.maxMovePP,zMovePP:this.zMovePP,movePP:this.movePP.map(move=>({...move})),
    };
  }
}
