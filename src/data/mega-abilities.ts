// Confirmed newer Mega abilities absent from pokemon-showdown 0.11.11.
// Preview metadata only: these four forms do not have usable tower Mega stones.
// Source: https://github.com/smogon/pokemon-showdown/blob/490b7fb8c2e5e548df9b752f93a589a2a42ce398/data/pokedex.ts
export const megaAbilityCorrections:Record<string,string>={
 'Absol-Mega-Z':'Sharpness',
 'Garchomp-Mega-Z':'Levitate',
 'Lucario-Mega-Z':'Aura Guard',
 'Golisopod-Mega':'Tough Claws',
};
export const previewAbility=(species:string,nativeAbility:string)=>megaAbilityCorrections[species]??nativeAbility;
