import {createHash} from 'node:crypto';
import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const projectRoot = fileURLToPath(new URL('../../../', import.meta.url));
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export function safeRelative(value) {
  if (typeof value !== 'string' || !value || value.includes('\\') || value.includes(':') || value.split('/').some(p => !p || p === '.' || p === '..')) {
    throw new Error(`Unsafe pack path: ${value}`);
  }
  return value;
}
export const canonicalBytes = (bytes, entry) => entry.text ? Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n')) : bytes;
export async function walk(directory, prefix = '') {
  let entries;
  try { entries = await readdir(directory, {withFileTypes: true}); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  const result = [];
  for (const entry of entries) {
    const relative = prefix + entry.name;
    if (entry.isSymbolicLink()) throw new Error(`Symlink not allowed in pack: ${relative}`);
    if (entry.isDirectory()) result.push(...await walk(path.join(directory, entry.name), relative + '/'));
    else if (entry.isFile()) result.push(relative);
  }
  return result.sort();
}
export async function loadDefinition() {
  const load = name => readFile(new URL(name, import.meta.url), 'utf8').then(JSON.parse);
  const [pack, lock, manifest] = await Promise.all([
    load('pack.json'), load('sources.lock.json'),
    readFile(path.join(projectRoot, 'docs/assets/manifests/pokerogue-runtime-assets.json'), 'utf8').then(JSON.parse),
  ]);
  if (pack.revision !== lock.revision || pack.revision !== manifest.revision) throw new Error('Pack revision mismatch');
  for (const entry of manifest.files) safeRelative(entry.path);
  for (const entry of lock.files) safeRelative(entry.path);
  if (new Set(manifest.files.map(f => f.path)).size !== manifest.files.length || manifest.fileCount !== manifest.files.length) throw new Error('Duplicate or incomplete output manifest');
  const inputs = new Set(lock.files.map(f => f.path));
  if (inputs.size !== lock.files.length) throw new Error('Duplicate source lock paths');
  const outputs = pack.recipes.flatMap(r => [safeRelative(r.gif), safeRelative(r.png)]).concat(pack.metadata.map(r => safeRelative(r.path)));
  if (outputs.length !== manifest.files.length || new Set(outputs).size !== outputs.length || outputs.some(p => !manifest.files.some(f => f.path === p))) throw new Error('Recipe coverage differs from golden manifest');
  for (const recipe of pack.recipes) if (!inputs.has(safeRelative(recipe.atlas))) throw new Error(`Unlocked atlas: ${recipe.atlas}`);
  for (const entry of pack.metadata) if (entry.source && !inputs.has(safeRelative(entry.source))) throw new Error(`Unlocked metadata: ${entry.source}`);
  return {pack, lock, manifest};
}
export function cliOptions(argv, allowed) {
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const name = argv[i];
    if (name === '--offline' && allowed.includes(name)) options.offline = true;
    else if (allowed.includes(name) && argv[i + 1] && !argv[i + 1].startsWith('--')) options[name.slice(2)] = argv[++i];
    else throw new Error(`Unknown option or missing value: ${name}`);
  }
  return options;
}
