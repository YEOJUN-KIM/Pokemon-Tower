import unavailable from './local-sprite-missing.json' with {type:'json'};
import forms from './form-sprite-availability.json' with {type:'json'};

const root='/vendor/pokeapi/pokemon/';
const missing=new Set<string>(unavailable);

export function localPokemonSources(paths:string[],id:number|string,spriteKey:number|string,back=false,shiny=false):string[] {
  const available=paths.filter(path=>!missing.has(path));
  if(available.length)return available.map(path=>root+path);
  const form=(forms as Record<string,{baseId:number;artwork?:string;shinyArtwork?:string}>)[spriteKey];
  // A real form illustration is more accurate than substituting its base species.
  const artwork=shiny ? form?.shinyArtwork??form?.artwork : form?.artwork;
  if(artwork)return [root+artwork];
  const base=form?.baseId ?? id;
  const side=back?'back/':'';
  // Some upstream forms lack alternate art. Keep a local base-species fallback.
  const fallback=[...(shiny?[`${side}shiny/${base}.png`]:[]),`${side}${spriteKey}.png`,`${side}${base}.png`];
  return [...new Set(fallback)].filter(path=>!missing.has(path)).map(path=>root+path);
}

export function localPokemonPng(spriteKey:number|string,back=false):string {
  return localPokemonSources([`${back?'back/':''}${spriteKey}.png`],spriteKey,spriteKey,back)[0] ?? '';
}
