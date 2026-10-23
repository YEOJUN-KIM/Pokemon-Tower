import inventory from './pixel-sprites.json' with {type:'json'};
import frontOnlyBacks from './front-only-back-sprites.json' with {type:'json'};
import nonPixelFronts from './non-pixel-front-sprites.json' with {type:'json'};
import {assetPaths} from '../assets/paths';
const invalidBacks=new Set<string>(frontOnlyBacks);
const invalidFronts=new Set<string>(nonPixelFronts);
export const pixelSprites:Record<string,{key:string;animatedFront:boolean;animatedBack:boolean;animatedShinyFront?:boolean;animatedShinyBack?:boolean;front?:boolean;back?:boolean;shinyFront?:boolean;shinyBack?:boolean}>=inventory;
export function pixelSpriteSources(spriteKey:string|number,back=false,animated=false,shiny=false):string[] {
  const sprite=pixelSprites[spriteKey];if(!sprite)return [];
  // These gen5 PNGs are downscaled illustrations, not pixel sprites. Use local PokeAPI art.
  if(!back && !shiny && invalidFronts.has(String(spriteKey)))return [];
  if(back && invalidBacks.has(String(spriteKey)))return [];
  if(shiny && !(back?sprite.shinyBack:sprite.shinyFront))return [];
  if(!shiny && (back?sprite.back===false:sprite.front===false))return [];
  const suffix=(back?'-back':'')+(shiny?'-shiny':''),png=assetPaths.showdown(`gen5${suffix}`,sprite.key,'png');
  const available=shiny?(back?sprite.animatedShinyBack:sprite.animatedShinyFront):(back?sprite.animatedBack:sprite.animatedFront);
  return animated && available ? [assetPaths.showdown(`gen5ani${suffix}`,sprite.key,'gif'),png] : [png];
}
