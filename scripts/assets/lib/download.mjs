import {readFile, mkdir, writeFile, rename, rm} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {safeRelative, sha256} from '../pokerogue/common.mjs';

export async function sourceBytes(entry, cache, {offline = false, fetcher = fetch, acceptsUrl} = {}) {
  const target = path.join(cache, safeRelative(entry.path));
  const valid = bytes => bytes.length === entry.bytes && sha256(bytes) === entry.sha256;
  try {
    const bytes = await readFile(target);
    if (!valid(bytes)) throw new Error(`Cache hash mismatch: ${entry.path}; move the damaged cache file aside and retry online`);
    return bytes;
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (offline) throw new Error(`Offline source missing: ${entry.path}`);
  const url = new URL(entry.url);
  if (!acceptsUrl?.(url)) {
    throw new Error(`Source must use an approved pinned URL: ${entry.url}`);
  }
  let bytes;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetcher(entry.url, {signal: AbortSignal.timeout(60_000)});
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${entry.url}`);
      bytes = Buffer.from(await response.arrayBuffer());
      if (!valid(bytes)) throw new Error(`Source hash/size mismatch: ${entry.url}`);
      break;
    } catch (error) { if (attempt === 2) throw error; }
  }
  await mkdir(path.dirname(target), {recursive: true});
  const temporary = target + '.' + randomUUID() + '.tmp';
  try { await writeFile(temporary, bytes, {flag: 'wx'}); await rename(temporary, target); }
  finally { await rm(temporary, {force: true}); }
  return bytes;
}

export async function downloadSources(lock, cache, options = {}) {
  let cursor = 0;
  await Promise.all(Array.from({length: 8}, async () => {
    while (cursor < lock.files.length) await sourceBytes(lock.files[cursor++], cache, options);
  }));
}
