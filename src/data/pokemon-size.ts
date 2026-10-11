import megaForms from './mega-forms.json' with {type:'json'};
import heights from './pokemon-heights.json' with {type:'json'};
export const pokemonHeights:Record<string,number>={...heights,...Object.fromEntries(Object.entries(megaForms).map(([name,form])=>[name,form.heightm]))};
// Compress real heights to keep tiny species readable and giants inside the arena.
export function pokemonBattleScale(name:string):number {
  const height=pokemonHeights[name];
  return height ? Math.max(.32,Math.min(1,.7+.2*Math.log2(height))) : .7;
}
