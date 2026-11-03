import {rollShiny} from '../data/shiny-odds';
// Shared wild/NPC encounter odds. Raid uses exactly the same single draw.
export const encounterShinyDenominator=8192;
export function rollEncounterShiny(roll:(max:number)=>number){return roll(encounterShinyDenominator)===0;}
// Tower opponents: charm level 0 keeps the original draw; higher levels use the tower table.
export function rollTowerShiny(roll:(max:number)=>number,charmLevel:number){return charmLevel>0?rollShiny('tower',charmLevel,roll):rollEncounterShiny(roll);}
