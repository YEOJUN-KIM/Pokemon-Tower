import {assetPaths,musicFiles,placeholders} from './paths';
import {pokemonSpriteSources} from './pokemon-sprites';
import {projectileVfx} from './projectile-vfx';

// No cries are bundled or cleared for use. Future approved recordings are registered here.
const cries:Readonly<Partial<Record<number,string>>>={};
export const assetRegistry = {
  pokemon:pokemonSpriteSources,
  trainer:assetPaths.trainer,
  item:assetPaths.item,
  moveEffect:assetPaths.moveEffect,
  projectileVfx,
  mega:assetPaths.mega,
  tera:assetPaths.tera,
  musicFiles,
  cry:(id:number):string|null=>cries[id]??null,
  placeholders,
};
