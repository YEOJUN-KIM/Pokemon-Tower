import {existsSync,readFileSync,rmSync,lstatSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const workspace=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const apply=process.argv.includes('--apply');
// Explicit, recreatable outputs; live databases and backups are never enumerated.
const targets=['test-results','playwright-report','.data/tests','.data/deploy-tests','.data/restart-tests','artifacts/temporary'];
let configured=process.env.TOWER_DB_PATH;
if(!configured&&existsSync(path.join(workspace,'.env.local')))configured=readFileSync(path.join(workspace,'.env.local'),'utf8').match(/^TOWER_DB_PATH=(.*)$/m)?.[1].trim().replace(/^['"]|['"]$/g,'');
const live=path.resolve(workspace,configured??'.data/tower.sqlite');
for(const relative of targets){
  const absolute=path.resolve(workspace,relative);
  if(!absolute.startsWith(workspace+path.sep)||absolute===workspace)throw new Error('Generated target outside workspace');
  if(live===absolute||live.startsWith(absolute+path.sep))throw new Error('Refusing to remove the configured live database directory');
  if(!existsSync(absolute))continue;
  if(lstatSync(absolute).isSymbolicLink())throw new Error('Refusing to follow a generated-directory link');
  if(apply)rmSync(absolute,{recursive:true,force:true});
  console.log(`${apply?'Removed':'Would remove'} ${relative}`);
}
