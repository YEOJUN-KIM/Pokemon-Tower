import {cp, mkdir, access, readFile, writeFile, lstat, readdir, readlink} from 'node:fs/promises';
import {resolve, basename, relative, dirname} from 'node:path';

const releaseNotes='docs/releases/NONCOMBAT_EVENTS_RELEASE.md';
await access(releaseNotes);
if(process.argv.includes('--check')) {
  await Promise.all(['docs/operations/DEPLOYMENT.md','docs/operations/ACCOUNTS.md','docs/references/THIRD_PARTY.md',releaseNotes,'scripts/backup-db.mjs','scripts/import-save.mjs','scripts/start-deploy.mjs'].map(file=>access(file)));
  console.log('Deployment document and script inputs OK; no build, copy, server or database changes.');
  process.exit(0);
}
await access('.next/standalone/server.js');
const target = resolve(`dist/tower-${new Date().toISOString().replace(/[:.]/g,'-')}`);
await mkdir(target, {recursive:true});
const standalone=resolve('.next/standalone');
const links=[];
async function inventory(directory) {
  for(const entry of await readdir(directory)) {
    const source=resolve(directory,entry);
    const info=await lstat(source);
    if(info.isSymbolicLink()) {
      const original=resolve(dirname(source),await readlink(source));
      // Windows Next output may point at the original pnpm store; rebase into the package.
      const suffix=relative(original.startsWith(standalone) ? standalone : resolve('.'),original);
      if(suffix.startsWith('..'))throw new Error(`Dependency points outside the project: ${source}`);
      const destination=resolve(target,suffix);
      links.push({path:relative(standalone,source),target:relative(target,destination)});
    } else if(info.isDirectory())await inventory(source);
  }
}
await inventory(standalone);
await cp(standalone, target, {recursive:true, filter:async source=> !basename(source).startsWith('.env') && !['.data','logs','test-results'].includes(basename(source)) && !(await lstat(source)).isSymbolicLink()});
await cp('.next/static', `${target}/.next/static`, {recursive:true});
await cp('public', `${target}/public`, {recursive:true});
await mkdir(`${target}/scripts`, {recursive:true});
await cp('scripts/backup-db.mjs', `${target}/scripts/backup-db.mjs`);
await cp('scripts/import-save.mjs', `${target}/scripts/import-save.mjs`);
await cp('scripts/start-deploy.mjs', `${target}/scripts/start-deploy.mjs`);
await writeFile(`${target}/scripts/dependency-links.json`,JSON.stringify(links));
const deploymentGuide=await readFile('docs/operations/DEPLOYMENT.md','utf8');
await writeFile(`${target}/DEPLOYMENT.md`,deploymentGuide.replace('../releases/NONCOMBAT_EVENTS_RELEASE.md','RELEASE_NOTES.md'));
await cp(releaseNotes, `${target}/RELEASE_NOTES.md`);
await cp('docs/operations/ACCOUNTS.md',`${target}/ACCOUNTS.md`);
await mkdir(`${target}/licenses`,{recursive:true});
await cp('docs/references/THIRD_PARTY.md',`${target}/licenses/THIRD_PARTY.md`);
await cp('node_modules/pokemon-showdown/LICENSE',`${target}/licenses/pokemon-showdown.txt`);
await writeFile(`${target}/.env.example`, 'HOSTNAME=127.0.0.1\nPORT=3000\nTOWER_DB_PATH=/absolute/path/to/tower.sqlite\nTOWER_ORIGIN=http://127.0.0.1:3000\n');
console.log(`Deployment package: ${target}\nNode.js 24 required. Built dependencies target this OS/architecture; build Docker on Linux for Linux hosting.`);
