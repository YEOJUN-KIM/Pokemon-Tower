import {cp, mkdir, access, readFile, writeFile, lstat, readdir, readlink} from 'node:fs/promises';
import {resolve, basename, relative, dirname} from 'node:path';
import {loadDefinition} from './assets/pokerogue/common.mjs';
import {verifyOutput} from './assets/pokerogue/verify.mjs';
import {loadDefinition as loadShowdown} from './assets/showdown-pokemon/common.mjs';
import {loadDefinition as loadPokeapi} from './assets/pokeapi/common.mjs';
import {loadDefinition as loadMixed,verifyGroup} from './assets/mixed/runtime.mjs';
import {spawnSync} from 'node:child_process';
const argumentsList=process.argv.slice(2);
const player=argumentsList.includes('--player');
let explicitOutput;
for(let i=0;i<argumentsList.length;i++){
  if(['--check','--player'].includes(argumentsList[i]))continue;
  if(argumentsList[i]==='--output'&&argumentsList[i+1])explicitOutput=resolve(argumentsList[++i]);
  else throw Error('Unknown packaging option: '+argumentsList[i]);
}

const {manifest} = await loadDefinition();
const assets = await verifyOutput(resolve('public/vendor/pokerogue'), manifest);
const {manifest:showdownManifest} = await loadShowdown();
const showdownAssets = await verifyOutput(resolve('public/vendor/showdown/pokemon'), showdownManifest);
const {manifest:pokeapiManifest} = await loadPokeapi();
const pokeapiAssets = await verifyOutput(resolve('public/vendor/pokeapi'), pokeapiManifest);
const readinessErrors = [];
const mixed = await loadMixed();
for (const group of mixed.groups) {
  const result = await verifyGroup(resolve('public/sprites'), group, mixed);
  if (!result.ok) readinessErrors.push(`${group.id} runtime is not ready: ${result.missing.length} missing, ${result.extra.length} extra, ${result.mismatched.length} mismatched. Run pnpm assets:${group.id}, then pnpm assets:${group.id}:verify before deployment.`);
}
if (!pokeapiAssets.ok) {
  readinessErrors.push(`PokeAPI runtime pack is not ready: ${pokeapiAssets.missing.length} missing, ${pokeapiAssets.extra.length} extra, ${pokeapiAssets.mismatched.length} mismatched. Run pnpm assets:pokeapi, then pnpm assets:pokeapi:verify before deployment.`);
}
if (!showdownAssets.ok) {
  readinessErrors.push(`Showdown Pokémon runtime pack is not ready: ${showdownAssets.missing.length} missing, ${showdownAssets.extra.length} extra, ${showdownAssets.mismatched.length} mismatched. Run pnpm assets:showdown-pokemon, then pnpm assets:showdown-pokemon:verify before deployment.`);
}
if (!assets.ok) {
  readinessErrors.push(`PokéRogue runtime pack is not ready: ${assets.missing.length} missing, ${assets.extra.length} extra, ${assets.mismatched.length} mismatched. Run pnpm assets:pokerogue, then pnpm assets:pokerogue:verify before deployment.`);
}
if (readinessErrors.length) {
  console.error(readinessErrors.join('\n'));
  process.exit(1);
}

const releaseNotes='docs/releases/NONCOMBAT_EVENTS_RELEASE.md';
await access(releaseNotes);
if(process.argv.includes('--check')) {
  await Promise.all(['docs/operations/DEPLOYMENT.md','docs/operations/ACCOUNTS.md','docs/references/THIRD_PARTY.md',releaseNotes,'scripts/backup-db.mjs','scripts/import-save.mjs','scripts/start-deploy.mjs'].map(file=>access(file)));
  console.log(`Deployment sprite packs (PokéRogue ${assets.matching}, Showdown ${showdownAssets.matching}, PokeAPI ${pokeapiAssets.matching}, mixed ${mixed.groups.reduce((n,g)=>n+g.fileCount,0)} hashes in ${mixed.groups.length} providers), document and script inputs OK; no build, copy, server or database changes.`);
  process.exit(0);
}
await access('.next/standalone/server.js');
const target = explicitOutput ?? resolve(`dist/tower-${new Date().toISOString().replace(/[:.]/g,'-')}`);
for(const protectedPath of ['.data','.git','src','node_modules','public','scripts','docs']){
  const protectedRoot=resolve(protectedPath),suffix=relative(protectedRoot,target);
  if(!suffix||(!suffix.startsWith('..')&&!suffix.startsWith('\\')&&!suffix.includes(':')))throw Error('Package output must not be inside a source/data directory');
}
await mkdir(dirname(target), {recursive:true});
await mkdir(target); // A package is immutable: never overwrite an existing install.
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
await cp(standalone, target, {recursive:true, filter:async source=> !basename(source).startsWith('.env') && !['.data','logs','test-results'].includes(basename(source)) && !(await lstat(source)).isSymbolicLink() && (!player||!(/\.(?:map|nft\.json|d\.ts)$/.test(source)||['cache','.git'].includes(basename(source))))});
await cp('.next/static', `${target}/.next/static`, {recursive:true});
await cp('public', `${target}/public`, {recursive:true});
await mkdir(`${target}/scripts`, {recursive:true});
if(!player){
await cp('scripts/backup-db.mjs', `${target}/scripts/backup-db.mjs`);
await cp('scripts/import-save.mjs', `${target}/scripts/import-save.mjs`);
}
await cp('scripts/start-deploy.mjs', `${target}/scripts/start-deploy.mjs`);
await writeFile(`${target}/scripts/dependency-links.json`,JSON.stringify(links));
await cp('scripts/player',`${target}/scripts/player`,{recursive:true});
await cp('scripts/player-launcher.mjs',`${target}/scripts/player-launcher.mjs`);
await cp('scripts/assets',`${target}/scripts/assets`,{recursive:true,filter:source=>!player||!(/\.(?:md|py)$/.test(source))});
await mkdir(`${target}/docs/assets/manifests`,{recursive:true});
for(const file of ['pokerogue-runtime-assets.json','showdown-pokemon-runtime-assets.json','pokeapi-runtime-assets.json','mixed-runtime-assets.json'])await cp(`docs/assets/manifests/${file}`,`${target}/docs/assets/manifests/${file}`);
if(process.platform==='win32'){
  const build=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File','scripts/build-player-launcher.ps1','-OutputPath',`${target}/PokemonTower.exe`],{encoding:'utf8',windowsHide:true});
  if(build.error||build.status!==0)throw Error('Player EXE build failed: '+(build.error?.message??build.stderr??build.stdout));
}
if(!player){
const deploymentGuide=await readFile('docs/operations/DEPLOYMENT.md','utf8');
await writeFile(`${target}/DEPLOYMENT.md`,deploymentGuide.replace('../releases/NONCOMBAT_EVENTS_RELEASE.md','RELEASE_NOTES.md'));
await cp(releaseNotes, `${target}/RELEASE_NOTES.md`);
await cp('docs/operations/ACCOUNTS.md',`${target}/ACCOUNTS.md`);
}
await mkdir(`${target}/licenses`,{recursive:true});
await cp('docs/references/THIRD_PARTY.md',`${target}/licenses/THIRD_PARTY.md`);
await cp('node_modules/pokemon-showdown/LICENSE',`${target}/licenses/pokemon-showdown.txt`);
if(!player)await writeFile(`${target}/.env.example`, 'HOSTNAME=127.0.0.1\nPORT=3000\nTOWER_DB_PATH=/absolute/path/to/tower.sqlite\nTOWER_ORIGIN=http://127.0.0.1:3000\n');
console.log(`Deployment package: ${target}\nNode.js 24 required. Built dependencies target this OS/architecture; build Docker on Linux for Linux hosting.`);
