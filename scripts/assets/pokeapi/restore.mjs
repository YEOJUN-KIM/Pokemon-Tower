import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {cliOptions, loadDefinition, projectRoot} from './common.mjs';
import {downloadSources} from './download.mjs';
import {requireVerified} from './verify.mjs';
import {restoreFiles} from '../lib/restore-files.mjs';

export const restore = (options, definition, dependencies = {}) => restoreFiles(options, definition, {...dependencies, downloadSources, requireVerified});

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const options = cliOptions(process.argv.slice(2), ['--output', '--cache', '--offline']);
    console.log(JSON.stringify(await restore({output: options.output ?? path.join(projectRoot, 'public/vendor/pokeapi'), cache: options.cache ?? path.join(projectRoot, 'external/pokemon-ip/pokeapi/source'), offline: options.offline}, await loadDefinition()), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
