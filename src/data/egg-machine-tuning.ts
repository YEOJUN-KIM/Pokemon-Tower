import type {TowerTheme} from './tower-themes';
import type {TeraType} from './tera';

// Reuse the game's nine region keys and the engine-backed type vocabulary.
export type PokemonRegion=TowerTheme;
export type PokemonType=TeraType;
export type EggMachineTuning=
  | {kind:'none'}
  | {kind:'region';region:PokemonRegion}
  | {kind:'type';pokemonType:PokemonType}
  | {kind:'event';eventId:string};

export const eggMachineTuningRules={focusedPrice:250,focusWeight:50,otherWeight:50} as const;

export type EggFocusTarget=
  | {kind:'region';region:PokemonRegion}
  | {kind:'type';pokemonType:PokemonType}
  | {kind:'species';species:readonly string[]};
// Targets are combined with OR. Only trusted server definitions supply targets;
// clients send an event ID. Availability/scheduling can be added by the server.
export type EggTuningEvent={id:string;targets:readonly EggFocusTarget[]};
export const eggTuningEvents:readonly EggTuningEvent[]=[];

export type EggMachineHatchRequest={
  type:'permanent';requestId:string;action:'hatch';product:'egg';count:1|10;
  species?:null;tuning?:EggMachineTuning;
};
