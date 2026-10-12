import inventory from './pixel-sprites.json' with {type:'json'};
import frontOnlyBacks from './front-only-back-sprites.json' with {type:'json'};
const invalidBacks=new Set<string>(frontOnlyBacks);
export const pixelSprites:Record<string,{key:string;animatedFront:boolean;animatedBack:boolean}>=inventory;
const root='/vendor/showdown/pokemon/';
export function pixelSpriteSources(spriteKey:string|number,back=false,animated=false):string[] {
  const sprite=pixelSprites[spriteKey];if(!sprite)return [];
  if(back && invalidBacks.has(String(spriteKey)))return [];
  const png=`${root}gen5${back ? '-back' : ''}/${sprite.key}.png`;
  return animated && (back ? sprite.animatedBack : sprite.animatedFront) ? [`${root}gen5ani${back ? '-back' : ''}/${sprite.key}.gif`,png] : [png];
}
