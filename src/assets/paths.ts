// Provider layout belongs here. Gameplay and renderers use resource resolvers.
export const placeholders = {
  pokemon:'/assets/original/pokemon-placeholder.svg',
  trainer:'/assets/original/trainer-placeholder.svg',
  item:'/assets/original/item-placeholder.svg',
  gimmick:'/assets/original/gimmick-placeholder.svg',
} as const;
export const musicFiles = {
  trainer:'/audio/bgm/gym-rpg.mp3',elite:'/audio/bgm/villain-rpg-v2.mp3',
  gym:'/audio/bgm/gym-battle-a.mp3',villain:'/audio/bgm/elite-rock.wav',
  champion:'/audio/bgm/gym-battle-a.mp3',rare:'/audio/bgm/rare-epic.ogg',reward:'/audio/bgm/reward-victory-v2.mp3',
} as const;
export const assetPaths = {
  pokeapi:(relative:string)=>'/vendor/pokeapi/pokemon/'+relative,
  showdown:(folder:string,key:string,extension:'png'|'gif')=>`/vendor/showdown/pokemon/${folder}/${key}.${extension}`,
  mega:(key:string,back:boolean,extension:'png'|'gif')=>`/sprites/gimmicks/${back?'back':'front'}/${key}.${extension}`,
  trainer:(key:string)=>`/sprites/trainers/${key}.png`,
  item:(key:string,extension='png')=>`/sprites/items/${key}.${extension}`,
  moveEffect:(key:string)=>key==='flamethrower-beam'?'/sprites/effects/flamethrower-beam.png':`/vendor/showdown/fx/${key}.png`,
  projectileEffect:(filename:string)=>'/assets/external-generated/devwizard-pixel-art-spells/'+encodeURIComponent(filename),
  tera:(type:string)=>`/sprites/gimmicks/tera/Tera${type}.png`,
};
