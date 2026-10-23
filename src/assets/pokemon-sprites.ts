import megaSprites from '../data/mega-sprite-availability.json' with {type:'json'};
import {missingDotAnimation} from '../data/sprite-animation';
import formAvailability from '../data/form-sprite-availability.json' with {type:'json'};
import {pixelSpriteSources} from '../data/pixel-sprites';
import {localPokemonSources} from '../data/local-pokemon-sprites';
import additionalAnimations from '../data/additional-animations.json' with {type:'json'};
import {assetPaths} from './paths';
export function pokemonSpriteSources(id:number,back=false,animated=false,spriteKey:string|number=id,shiny=false):string[] {
  const view=shiny?(back?'shinyBack':'shinyFront'):(back?'back':'front');
  const extra=(additionalAnimations as Record<string,Partial<Record<string,{gif:string;png:string}>>>)[spriteKey]?.[view];
  if(animated && extra)return [extra.gif,extra.png];
  const local=(paths:string[])=>{const sources=localPokemonSources(paths,id,spriteKey,back,shiny);return sources.length?sources:extra?[extra.png]:[];};
  if(shiny){const pixel=pixelSpriteSources(spriteKey,back,animated,true);if(pixel.length)return pixel;const side=back?'back/':'';return local(id<650 ? [`versions/generation-v/black-white/animated/${side}shiny/${spriteKey}.gif`,`${side}shiny/${spriteKey}.png`] : [`${side}shiny/${spriteKey}.png`]);}
  const mega=(megaSprites as Record<string,{key:string;animatedFront:boolean;animatedBack:boolean}>)[spriteKey];
  if(mega){return animated && (back?mega.animatedBack:mega.animatedFront) ? [assetPaths.mega(mega.key,back,'gif'),assetPaths.mega(mega.key,back,'png')] : [assetPaths.mega(mega.key,back,'png')];}
  // Modern species use community pixel sprites, never the model-rendered GIF fallback.
  if(id>=650 || String(spriteKey)!==String(id)){const pixel=pixelSpriteSources(spriteKey,back,animated);if(pixel.length)return pixel;}
  const side=back ? 'back/' : '',png=`${side}${spriteKey}.png`;
  const form=(formAvailability as Record<string,{dotBoth:boolean;showdownBoth:boolean}>)[spriteKey];
  if(!animated || (form ? !form.dotBoth : missingDotAnimation.has(id)))return local([png]);
  return local([`versions/generation-v/black-white/animated/${side}${spriteKey}.gif`,png]);
}

