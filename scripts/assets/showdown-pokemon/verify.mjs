import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {cliOptions, loadDefinition, projectRoot} from './common.mjs';
import {verifyOutput} from '../pokerogue/verify.mjs';
export {verifyOutput};

export function requireVerified(result) {
  if (!result.ok) throw new Error(`Showdown Pokémon verification failed:\n${JSON.stringify(result, null, 2)}`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const options = cliOptions(process.argv.slice(2), ['--output']);
    const {manifest} = await loadDefinition();
    console.log(JSON.stringify(requireVerified(await verifyOutput(path.resolve(options.output ?? path.join(projectRoot, 'public/vendor/showdown/pokemon')), manifest)), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
