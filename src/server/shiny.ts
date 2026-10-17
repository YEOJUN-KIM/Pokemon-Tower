// Shared wild/NPC encounter odds. Raid uses exactly the same single draw.
export const encounterShinyDenominator=8192;
export function rollEncounterShiny(roll:(max:number)=>number){return roll(encounterShinyDenominator)===0;}
