import {readdir,readFile,writeFile,lstat} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
export const explorerPolicy=JSON.parse(readFileSync(new URL('./windows-player-path-policy.json',import.meta.url),'utf8'));
export function assertExplorerPaths(names){
 const ranked=names.map(name=>({path:explorerPolicy.archiveRoot+'/'+name,relativeLength:(explorerPolicy.archiveRoot+'/'+name).length})).sort((a,b)=>b.relativeLength-a.relativeLength);
 for(const entry of ranked){
  if(entry.relativeLength+explorerPolicy.extractionRootBudget+1>explorerPolicy.maxFullPath)throw Error(`Windows Explorer path budget exceeded (${entry.relativeLength}+${explorerPolicy.extractionRootBudget}+1 > ${explorerPolicy.maxFullPath}): ${entry.path}`);
  if(entry.path.split('/').some(p=>p.length>255))throw Error('Windows filename component too long: '+entry.path);
 }
 return {maxRelativePath:ranked[0]?.relativeLength??0,maxModeledPath:(ranked[0]?.relativeLength??0)+explorerPolicy.extractionRootBudget+1,policy:explorerPolicy,longest:ranked.slice(0,20)};
}
export const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function stampPlayerBuild(directory){
 const file=path.join(directory,'scripts/player/config.json');
 const config=JSON.parse(await readFile(file,'utf8'));
 const build=(await readFile(path.join(directory,'.next/BUILD_ID'),'utf8')).trim();
 if(!build)throw Error('Missing player build identity');
 // Same-version rebuilds must invalidate the launcher's installed-package cache.
 config.buildVersion=`${config.appVersion}-player.${build}`;
 await writeFile(file,JSON.stringify(config,null,2)+'\n');
 return config;
}
export async function files(root,prefix=''){
 const result=[];
 for(const entry of await readdir(path.join(root,prefix),{withFileTypes:true})){
  const name=prefix+entry.name,full=path.join(root,name);
  if((await lstat(full)).isSymbolicLink())throw Error('Package contains a link: '+name);
  if(entry.isDirectory())result.push(...await files(root,name+'/'));else result.push(name);
 }
 return result.sort();
}
export function assertPlayerPath(name){
 if(name.includes('\\')||name.split('/').some(p=>p==='..'||p===''))throw Error('Unsafe package path: '+name);
 if(name.split('/').some(p=>['.git','.github','.codex','.agents','.data','saves','logs','test-results','playwright-report','artifacts','cache'].includes(p)||p.startsWith('.env')||p.startsWith('.install-complete')||p==='.launcher.lock')||/\.(?:sqlite(?:-wal|-shm)?|db|log|map|nft\.json|pdb|py)$/i.test(name))throw Error('Forbidden package file: '+name);
 if(!/^(?:PokemonTower\.exe|README\.txt|release-manifest\.json|package\.json|server\.js|(?:\.next|node_modules|public|licenses)\/.*|scripts\/(?:start-deploy\.mjs|dependency-links\.json|player-launcher\.mjs|(?:player|assets)\/.*)|docs\/assets\/manifests\/[\w-]+\.json)$/.test(name))throw Error('Unexpected player file: '+name);
}
const textFile=name=>/\.(?:js|mjs|cjs|json|html|txt|md|css|svg)$/i.test(name);
export function assertPublicText(text,name,secrets=[]){
 // Two upstream source comments use fixed example paths, not build-machine data.
 let paths=text;
 if(name.endsWith('/bindings/bindings.js'))paths=paths.replaceAll('/home/nate/node-native-module','<upstream-example>');
 if(name.endsWith('/next/dist/server/patch-error-inspect.js'))paths=paths.replaceAll('/Users/foo/APP','<upstream-example>').replaceAll('C:\\Users\\foo\\APP','<upstream-example>');
 if(/[A-Z]:[\\/]+Users[\\/]+[^\\/\s"']+/i.test(paths)||/\/(?:home|Users)\/[^/\s"']+/.test(paths))throw Error('Private local path in '+name);
 if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}/.test(text)||secrets.some(secret=>text.includes(secret)))throw Error('Potential credential in '+name);
}
export async function preparePublicFiles(directory,sourceRoot){
 // Next serializes build-machine roots into server.js/config metadata. Rebase these
 // diagnostics to a relative path; runtime resolution already uses __dirname.
 const roots=[sourceRoot,sourceRoot.replaceAll('\\','/'),JSON.stringify(sourceRoot).slice(1,-1)];
 for(const name of await files(directory))if(textFile(name)){
  const full=path.join(directory,name),original=await readFile(full,'utf8');let text=original;
  for(const root of roots.sort((a,b)=>b.length-a.length))text=text.split(root).join('.');
  if(text!==original)await writeFile(full,text);
 }
}
export async function inventory(directory){
 const secrets=Object.entries(process.env).filter(([k,v])=>/TOKEN|PASSWORD|SECRET|CREDENTIAL|API_KEY/i.test(k)&&v&&v.length>=12).map(([,v])=>v);
 const result=[];
 for(const name of await files(directory)){
  assertPlayerPath(name);if(name==='release-manifest.json')continue;
  const bytes=await readFile(path.join(directory,name));
  if(textFile(name))assertPublicText(bytes.toString('utf8'),name,secrets);
  result.push({path:name,bytes:bytes.length,sha256:hash(bytes)});
 }
 return result;
}
export async function verifyFolder(directory){
 const manifest=JSON.parse(await readFile(path.join(directory,'release-manifest.json'),'utf8'));
 const config=JSON.parse(await readFile(path.join(directory,'scripts/player/config.json'),'utf8'));
 const pkg=JSON.parse(await readFile(path.join(directory,'package.json'),'utf8'));
 if(manifest.version!==config.appVersion||manifest.version!==pkg.version||manifest.platform!=='win32'||manifest.arch!=='x64')throw Error('Release metadata mismatch');
 const actual=await inventory(directory);
 const extraction=assertExplorerPaths([...actual.map(f=>f.path),'release-manifest.json']);
 if(JSON.stringify(actual)!==JSON.stringify(manifest.files))throw Error('Release inventory/hash mismatch');
 for(const required of ['PokemonTower.exe','README.txt','server.js','.next/BUILD_ID','scripts/start-deploy.mjs','scripts/dependency-links.json','scripts/player-launcher.mjs','scripts/player/managed-start.mjs','licenses/THIRD_PARTY.md'])if(!actual.some(f=>f.path===required))throw Error('Missing '+required);
 if(!(await readFile(path.join(directory,'PokemonTower.exe'))).subarray(0,2).equals(Buffer.from('MZ')))throw Error('Invalid Windows EXE');
 const links=JSON.parse(await readFile(path.join(directory,'scripts/dependency-links.json'),'utf8'));
 for(const link of links)for(const key of ['path','target']){
  const relative=path.relative(directory,path.resolve(directory,link[key]));
  if(!relative||relative.startsWith('..')||path.isAbsolute(relative))throw Error('Dependency link escapes package');
  if(key==='target')await lstat(path.join(directory,link.target));
 }
 return {...manifest,extraction};
}
