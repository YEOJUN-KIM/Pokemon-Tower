import inventory from './pixel-sprites.json' with {type:'json'};
export const pixelSprites:Record<string,{key:string;animatedFront:boolean;animatedBack:boolean}>=inventory;
const root='/vendor/showdown/pokemon/';
export function pixelSpriteSources(spriteKey:string|number,back=false,animated=false):string[] {
  const sprite=pixelSprites[spriteKey];if(!sprite)return [];
  const png=`${root}gen5${back ? '-back' : ''}/${sprite.key}.png`;
  return animated && (back ? sprite.animatedBack : sprite.animatedFront) ? [`${root}gen5ani${back ? '-back' : ''}/${sprite.key}.gif`,png] : [png];
}
