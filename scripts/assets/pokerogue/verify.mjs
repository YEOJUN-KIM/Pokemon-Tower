import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {canonicalBytes, cliOptions, loadDefinition, projectRoot, safeRelative, sha256, walk} from './common.mjs';

export async function verifyOutput(directory, manifest) {
  const actual = new Set(await walk(directory));
  const expected = new Set(manifest.files.map(entry => safeRelative(entry.path)));
  const missing = [], mismatched = [];
  let matching = 0, bytes = 0;
  for (const entry of manifest.files) {
    if (!actual.has(entry.path)) { missing.push(entry.path); continue; }
    const data = canonicalBytes(await readFile(path.join(directory, entry.path)), entry);
    if (data.length !== entry.bytes || sha256(data) !== entry.sha256) mismatched.push(entry.path);
    else { matching++; bytes += data.length; }
  }
  const extra = [...actual].filter(file => !expected.has(file));
  return {ok: !missing.length && !extra.length && !mismatched.length, matching, bytes, missing, extra, mismatched};
}
export function requireVerified(result) {
  if (!result.ok) throw new Error(`PokéRogue verification failed:\n${JSON.stringify(result, null, 2)}`);
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const options = cliOptions(process.argv.slice(2), ['--output']);
    const {manifest} = await loadDefinition();
    console.log(JSON.stringify(requireVerified(await verifyOutput(path.resolve(options.output ?? path.join(projectRoot, 'public/vendor/pokerogue')), manifest)), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
