import megaForms from './mega-forms.json' with {type:'json'};
import heights from './pokemon-heights.json' with {type:'json'};
import {selectableForms} from './selectable-forms';
export const pokemonHeights:Record<string,number>={...heights,...Object.fromEntries(Object.entries(selectableForms).map(([name,form])=>[name,form.heightm])),...Object.fromEntries(Object.entries(megaForms).map(([name,form])=>[name,form.heightm]))};
// Keep species size ordering, but soften both extremes: dex height can describe
// a long body as well as standing height. Approach the .56–.92 display limits
// smoothly so tiny species stay readable and giants never fill the whole frame.
export function pokemonBattleScale(name:string):number {
  const height=pokemonHeights[name];
  return height>0 && Number.isFinite(height) ? .56+.36*height/(height+.8) : .76;
}
