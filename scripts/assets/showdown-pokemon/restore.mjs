import {mkdir, mkdtemp, copyFile, rm, lstat} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {cliOptions, loadDefinition, projectRoot} from './common.mjs';
import {downloadSources} from './download.mjs';
import {verifyOutput, requireVerified} from './verify.mjs';

async function noSymlinkParents(target) {
  for (let current = path.resolve(target); ; current = path.dirname(current)) {
    try { if ((await lstat(current)).isSymbolicLink()) throw new Error(`Symlink output/cache is not allowed: ${current}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (path.dirname(current) === current) break;
  }
}

export async function restore({output, cache, offline = false}, definition, dependencies = {}) {
  const {lock, manifest} = definition;
  output = path.resolve(output); cache = path.resolve(cache);
  const contains = (parent, child) => child === parent || child.startsWith(parent + path.sep);
  if (contains(output, cache) || contains(cache, output)) throw new Error('Output and cache must be separate directories');
  for (const target of [output, cache]) {
    if (target === projectRoot || ['src', '.data', '.git', 'scripts', 'docs'].some(dir => contains(path.join(projectRoot, dir), target))) throw new Error('Output/cache must be asset directories or separate temporary directories');
    await noSymlinkParents(target);
  }
  const existing = await verifyOutput(output, manifest);
  if (existing.extra.length || existing.mismatched.length) throw new Error(`Existing output differs; move it aside before restore:\n${JSON.stringify(existing, null, 2)}`);
  await downloadSources(lock, cache, {offline, fetcher: dependencies.fetcher});
  await mkdir(path.join(cache, 'work'), {recursive: true});
  const temporary = await mkdtemp(path.join(cache, 'work', 'restore-'));
  const stage = path.join(temporary, 'output');
  try {
    for (const entry of manifest.files) {
      const target = path.join(stage, entry.path);
      await mkdir(path.dirname(target), {recursive: true});
      await copyFile(path.join(cache, entry.path), target, 1);
    }
    const result = requireVerified(await verifyOutput(stage, manifest));
    for (const file of existing.missing) {
      const target = path.join(output, file);
      await mkdir(path.dirname(target), {recursive: true});
      await copyFile(path.join(stage, file), target, 1);
    }
    requireVerified(await verifyOutput(output, manifest));
    return {...result, output, offline, sources: lock.files.length};
  } finally { await rm(temporary, {recursive: true, force: true}); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const options = cliOptions(process.argv.slice(2), ['--output', '--cache', '--offline']);
    console.log(JSON.stringify(await restore({output: options.output ?? path.join(projectRoot, 'public/vendor/showdown/pokemon'), cache: options.cache ?? path.join(projectRoot, 'external/pokemon-ip/showdown/pokemon/source'), offline: options.offline}, await loadDefinition()), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
