import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {projectRoot, safeRelative} from '../pokerogue/common.mjs';
export {projectRoot, safeRelative, sha256, cliOptions, walk} from '../pokerogue/common.mjs';

export const repository = 'YEOJUN-KIM/Pokemon-Tower';
export const revision = '171800c61af9d6b38b5f8b11c393e4ae865651dd';
export const sourceBase = `https://raw.githubusercontent.com/${repository}/${revision}/public/vendor/showdown/pokemon/`;
export const acceptsUrl = url => url.href.startsWith(sourceBase) && !url.search && !url.hash && !url.username && !url.password;

export async function loadDefinition() {
  const [lock, manifest] = await Promise.all([
    readFile(new URL('sources.lock.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(path.join(projectRoot, 'docs/assets/manifests/showdown-pokemon-runtime-assets.json'), 'utf8').then(JSON.parse),
  ]);
  if (lock.repository !== repository || lock.revision !== revision || manifest.baseline !== revision) throw new Error('Showdown snapshot revision mismatch');
  const validEntry = entry => {
    safeRelative(entry.path);
    if (!Number.isSafeInteger(entry.bytes) || entry.bytes < 0 || !/^[a-f0-9]{64}$/.test(entry.sha256)) throw new Error(`Invalid hash/size: ${entry.path}`);
  };
  manifest.files.forEach(validEntry); lock.files.forEach(validEntry);
  const expected = new Map(manifest.files.map(entry => [entry.path, entry]));
  if (expected.size !== manifest.files.length || manifest.fileCount !== expected.size || manifest.totalBytes !== manifest.files.reduce((n, entry) => n + entry.bytes, 0)) throw new Error('Incomplete golden manifest');
  if (new Set(lock.files.map(entry => entry.path)).size !== expected.size || lock.files.length !== expected.size) throw new Error('Snapshot coverage mismatch');
  for (const entry of lock.files) {
    const golden = expected.get(entry.path);
    if (!golden || entry.bytes !== golden.bytes || entry.sha256 !== golden.sha256 || entry.url !== sourceBase + entry.path) throw new Error(`Unlocked snapshot file: ${entry.path}`);
  }
  return {lock, manifest};
}
