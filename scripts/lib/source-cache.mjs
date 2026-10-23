import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';

/** @typedef {{provider:string,url:string,revision:string,cachePath:string}} DownloadSource */
/** @param {DownloadSource} source @param {typeof fetch} [fetcher] */
export async function cachedSourceText(source,fetcher=globalThis.fetch){
  try{return await readFile(source.cachePath,'utf8');}catch(error){if(/** @type {NodeJS.ErrnoException} */(error).code!=='ENOENT')throw error;}
  const response=await fetcher(source.url,{signal:AbortSignal.timeout(30_000)});
  if(!response.ok)throw Error(`${source.provider}: HTTP ${response.status} (${source.url})`);
  const text=await response.text();
  if(!text.trim())throw Error(`${source.provider}: empty response (${source.url})`);
  await mkdir(dirname(source.cachePath),{recursive:true});
  await writeFile(source.cachePath,text);
  return text;
}
// Preserve the existing data revision. Pinning a new upstream commit requires a data review.
export const pokeapiCsvRevision='master';
/** @param {string} name @param {'import'|'forms'} [area] @returns {DownloadSource} */
export function pokeapiCsv(name,area='import'){
  if(!/^[a-z_]+$/.test(name))throw Error('Invalid PokeAPI CSV name');
  return {provider:'PokeAPI',revision:pokeapiCsvRevision,url:`https://raw.githubusercontent.com/PokeAPI/pokeapi/${pokeapiCsvRevision}/data/v2/csv/${name}.csv`,cachePath:`.data/cache/${area}/${name}.csv`};
}
export const trainerSpriteIndex={provider:'Pokemon Showdown',revision:'live directory',url:'https://play.pokemonshowdown.com/sprites/trainers/',cachePath:'.data/cache/import/trainer-sprite-index.html'};
