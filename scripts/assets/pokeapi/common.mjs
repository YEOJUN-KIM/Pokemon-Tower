import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {projectRoot, safeRelative} from '../pokerogue/common.mjs';
export {projectRoot, safeRelative, sha256, cliOptions, walk} from '../pokerogue/common.mjs';

export const repository = 'PokeAPI/sprites';
export const revision = 'a3a1432e688ea028f12c51371d5253037cb9f17b';
export const sourceBase = `https://raw.githubusercontent.com/${repository}/${revision}/sprites/`;
export const acceptsUrl = url => url.href.startsWith(sourceBase) && !url.search && !url.hash && !url.username && !url.password;

export async function loadDefinition() {
  const [lock, manifest] = await Promise.all([
    readFile(new URL('sources.lock.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(path.join(projectRoot, 'docs/assets/manifests/pokeapi-runtime-assets.json'), 'utf8').then(JSON.parse),
  ]);
  if (lock.repository !== repository || lock.revision !== revision || manifest.sourceRevision !== revision) throw new Error('PokeAPI source revision mismatch');
  const validEntry = entry => {
    safeRelative(entry.path);
    if (!entry.path.startsWith('pokemon/') || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0 || !/^[a-f0-9]{64}$/.test(entry.sha256)) throw new Error(`Invalid PokeAPI path/hash/size: ${entry.path}`);
  };
  manifest.files.forEach(validEntry); lock.files.forEach(validEntry);
  const expected = new Map(manifest.files.map(entry => [entry.path, entry]));
  if (expected.size !== manifest.files.length || manifest.fileCount !== expected.size || manifest.totalBytes !== manifest.files.reduce((n, entry) => n + entry.bytes, 0)) throw new Error('Incomplete golden manifest');
  if (new Set(lock.files.map(entry => entry.path)).size !== expected.size || lock.files.length !== expected.size) throw new Error('Source coverage mismatch');
  for (const entry of lock.files) {
    const golden = expected.get(entry.path);
    if (!golden || entry.bytes !== golden.bytes || entry.sha256 !== golden.sha256 || entry.url !== sourceBase + entry.path) throw new Error(`Unlocked PokeAPI file: ${entry.path}`);
  }
  return {lock, manifest};
}
