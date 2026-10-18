import Showdown from 'pokemon-showdown';
const { Dex } = Showdown;

export type Action = {command: string; label: string; estimatedDamage: number};
export type OwnPokemon = {
  ident: string; details: string; condition: string; active: boolean;
  stats: {atk: number; def: number; spa: number; spd: number; spe: number};
  moves?:string[];item?:string;ability?:string;terastallized?:string;
};
export type Request = {
  wait?: boolean; teamPreview?: boolean; forceSwitch?: boolean[];
  side: {pokemon: OwnPokemon[]};
  active?: {trapped?: boolean;maybeTrapped?:boolean; canMegaEvo?:boolean;canDynamax?:boolean;canTerastallize?:string;canZMove?:({move:string;target:string}|null)[];maxMoves?:{maxMoves:{move:string;disabled?:boolean}[]}; moves: {id: string; move: string; pp?: number; disabled?: boolean | string}[]}[];
};
export type Observation = {
  turn: number;
  ownTeam: OwnPokemon[];
  opponent: {species: string; condition: string} | null;
  legalActions: Action[];
  lastOpponentMove?:string;
  switching?:{hazards:{spikes:number;toxicSpikes:number;stealthRock:boolean;stickyWeb:boolean};boosts:Record<string,number>;dynamax:boolean;opponentTypes:string[];maybeTrapped?:boolean};
};
export interface Policy {
  readonly fixedOrder?:boolean;
  observePublicLine?(line:string):void;
  readonly switchingInformation?:boolean;
  readonly uncertainSwitchingInformation?:boolean;
  choose(observation: Readonly<Observation>): string | Promise<string>;
}

// Only an approximation: opponent base stats + assumed neutral level-50 stats.
// Never reads the opponent's actual spread, item, ability or chosen action.
export function estimateDamage(moveId: string, own: OwnPokemon, opponent: string | undefined): number {
  const move = Dex.moves.get(moveId);
  if (move.category === 'Status') return 0;
  const attacker = Dex.species.get(own.details.split(',')[0]);
  const target = Dex.species.get(opponent ?? '');
  const types = target.exists ? target.types : ['Normal'];
  if (!Dex.getImmunity(move.type, types)) return 0;
  const effectiveness = 2 ** Dex.getEffectiveness(move.type, types);
  const defenseBase = move.category === 'Physical' ? target.baseStats?.def : target.baseStats?.spd;
  const defense = Math.floor(((2 * (defenseBase || 80) + 31) * 50) / 100) + 5;
  const attack = move.category === 'Physical' ? own.stats.atk : own.stats.spa;
  const stab = attacker.types.includes(move.type) ? 1.5 : 1;
  const accuracy = move.accuracy === true ? 1 : move.accuracy / 100;
  return ((22 * move.basePower * attack / defense) / 50 + 2) * stab * effectiveness * accuracy * 0.925;
}

export function legalActions(request: Request, opponent?: string): Action[] {
  if (request.wait) return [];
  if (request.teamPreview) return [{command: 'team 123', label: '고정 팀 순서로 시작', estimatedDamage: 0}];
  const actions: Action[] = [];
  const own = request.side.pokemon.find(p => p.active);
  if (!request.forceSwitch?.[0] && own) {
    request.active?.[0].moves.forEach((move, index) => {
      const z=request.active![0].canZMove?.[index];
      if(z && (move.pp===undefined || move.pp>0)){
        const base=Dex.moves.get(move.id),zMove=Dex.moves.get(z.move);
        const power=base.category==='Status'?0:zMove.basePower>1?zMove.basePower:base.zMove?.basePower || 0;
        const score=base.category==='Status'?0:estimateDamage(move.id,own,opponent)*power/Math.max(1,base.basePower);
        actions.push({command:`move ${index+1} zmove`,label:z.move,estimatedDamage:score});
      }
      if (!move.disabled && (move.pp === undefined || move.pp > 0)) {
        const active=request.active![0],max=active.maxMoves?.maxMoves[index],isMax=!!active.maxMoves && !active.canDynamax;
        const label=isMax && max ? Dex.moves.get(max.move).name : move.move;
        const score=estimateDamage(move.id,own,opponent);
        if(!isMax || !max?.disabled)actions.push({command: `move ${index+1}`,label,estimatedDamage:score});
        if(active.canTerastallize)actions.push({command:`move ${index+1} terastallize`,label:move.move,estimatedDamage:score});
        if(active.canMegaEvo)actions.push({command: `move ${index+1} mega`,label:move.move,estimatedDamage:score});
        if(active.canDynamax && max && !max.disabled)actions.push({command: `move ${index+1} dynamax`,label:Dex.moves.get(max.move).name,estimatedDamage:score});
      }
    });
  }
  if (request.forceSwitch?.[0] || !request.active?.[0].trapped) {
    request.side.pokemon.forEach((pokemon, index) => {
      if (!pokemon.active && !pokemon.condition.endsWith('fnt')) {
        actions.push({command: `switch ${index + 1}`, label: `교체: ${pokemon.details.split(',')[0]} (${pokemon.condition})`, estimatedDamage: -1});
      }
    });
  }
  return actions;
}

export class DamagePolicy implements Policy {
  choose(observation: Observation): string {
    const best = [...observation.legalActions].sort((a, b) => b.estimatedDamage - a.estimatedDamage)[0];
    if (!best) throw new Error('No legal actions');
    return best.command;
  }
}
