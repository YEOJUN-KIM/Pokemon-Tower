import {readFile, writeFile, mkdir, mkdtemp, copyFile, rm, lstat} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {cliOptions, loadDefinition, projectRoot, safeRelative} from './common.mjs';
import {downloadSources} from './download.mjs';
import {verifyOutput, requireVerified} from './verify.mjs';

async function noSymlinkParents(target) {
  for (let current = path.resolve(target); ; current = path.dirname(current)) {
    try { if ((await lstat(current)).isSymbolicLink()) throw new Error(`Symlink output/cache is not allowed: ${current}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (path.dirname(current) === current) break;
  }
}
export function convert(jobsFile, python, pack) {
  const probe = spawnSync(python, ['-c', 'import sys; print("%d.%d" % sys.version_info[:2]); import PIL; print(PIL.__version__)'], {encoding: 'utf8'});
  if (probe.error) throw new Error(`Python 3 required; set PYTHON or --python (${probe.error.message})`);
  if (probe.status !== 0) throw new Error(`Python 3 and Pillow required. Install Pillow==${pack.pillow} manually.\n${probe.stderr}`);
  const [version, pillow] = probe.stdout.trim().split(/\r?\n/);
  const [major, minor] = version.split('.').map(Number);
  if (major !== 3 || minor < 10) throw new Error('Python 3.10 or newer required');
  if (pillow !== pack.pillow) throw new Error(`Pillow==${pack.pillow} required for baseline encoding; found ${pillow}`);
  const result = spawnSync(python, [fileURLToPath(new URL('convert.py', import.meta.url)), jobsFile], {encoding: 'utf8', maxBuffer: 4 * 1024 * 1024});
  if (result.error || result.status !== 0) throw new Error(`PokéRogue conversion failed: ${result.error?.message ?? result.stderr}`);
  console.log(result.stdout.trim());
}
export async function restore({output, cache, offline = false, python = process.env.PYTHON ?? 'python'}, definition, dependencies = {}) {
  const {pack, lock, manifest} = definition;
  output = path.resolve(output); cache = path.resolve(cache);
  const contains = (parent, child) => child === parent || child.startsWith(parent + path.sep);
  if (contains(output, cache) || contains(cache, output)) throw new Error('Output and cache must be separate directories');
  if (output === projectRoot || ['src', '.data', '.git', 'scripts', 'docs'].some(dir => contains(path.join(projectRoot, dir), output))) throw new Error('Output must be a runtime pack or separate temporary directory');
  await noSymlinkParents(output); await noSymlinkParents(cache);
  // Refuse to overwrite unknown or damaged existing files. Partial valid output is recoverable.
  const existing = await verifyOutput(output, manifest);
  if (existing.extra.length || existing.mismatched.length) throw new Error(`Existing output differs; move it aside before restore:\n${JSON.stringify(existing, null, 2)}`);
  await downloadSources(lock, cache, {offline, fetcher: dependencies.fetcher});
  await mkdir(path.join(cache, 'work'), {recursive: true});
  const temporary = await mkdtemp(path.join(cache, 'work', 'restore-'));
  const stage = path.join(temporary, 'output');
  try {
    await mkdir(stage);
    const jobs = pack.recipes.map(recipe => ({atlas: path.join(cache, safeRelative(recipe.atlas)), gif: path.join(stage, safeRelative(recipe.gif)), png: path.join(stage, safeRelative(recipe.png))}));
    const jobsFile = path.join(temporary, 'jobs.json');
    await writeFile(jobsFile, JSON.stringify(jobs));
    await (dependencies.convert ?? convert)(jobsFile, python, pack);
    for (const entry of pack.metadata) {
      const target = path.join(stage, safeRelative(entry.path));
      const data = entry.snapshot
        ? await readFile(new URL(safeRelative(entry.snapshot), import.meta.url))
        : await readFile(path.join(cache, safeRelative(entry.source)));
      await writeFile(target, entry.text ? Buffer.from(data.toString('utf8').replace(/\r\n/g, '\n')) : data);
    }
    const result = requireVerified(await verifyOutput(stage, manifest));
    await mkdir(output, {recursive: true});
    for (const file of existing.missing) {
      const target = path.join(output, file); await mkdir(path.dirname(target), {recursive: true});
      await copyFile(path.join(stage, file), target, 1); // COPYFILE_EXCL: never overwrite a concurrent change.
    }
    requireVerified(await verifyOutput(output, manifest));
    return {...result, output, offline, sources: lock.files.length};
  } finally { await rm(temporary, {recursive: true, force: true}); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const options = cliOptions(process.argv.slice(2), ['--output', '--cache', '--offline', '--python']);
    const definition = await loadDefinition();
    console.log(JSON.stringify(await restore({output: options.output ?? path.join(projectRoot, 'public/vendor/pokerogue'), cache: options.cache ?? path.join(projectRoot, 'external/pokemon-ip/pokerogue/source'), offline: options.offline, python: options.python}, definition), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
