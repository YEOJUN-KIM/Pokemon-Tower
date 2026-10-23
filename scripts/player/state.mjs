import {readFile,mkdir,access,open,rename,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
export const markerName='.install-complete.json';
export const requiredRoots=['public/vendor/pokerogue','public/vendor/showdown/pokemon','public/vendor/pokeapi','public/sprites/trainers','public/sprites/gimmicks','public/sprites/items'];
export const sentinels=['public/vendor/pokerogue/pokemon/front/908.gif','public/vendor/showdown/pokemon/gen5/miraidon.png','public/vendor/pokeapi/pokemon/6.png','public/sprites/trainers/falkner.png','public/sprites/gimmicks/tera/TeraFire.png','public/sprites/items/leftovers.png'];
export function childPath(root,relative){
 if(typeof relative!=='string'||!relative||path.isAbsolute(relative))throw Error('설치 경로 기록이 잘못되었습니다. 파일 복구를 실행해 주세요.');
 const full=path.resolve(root,relative),rel=path.relative(path.resolve(root),full);
 if(!rel||rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))throw Error('설치 경로가 허용 범위를 벗어납니다.');return full;
}
export async function readMarker(home,config){
 try{
  const marker=JSON.parse(await readFile(path.join(home,markerName),'utf8'));
  for(const key of ['schemaVersion','launcherVersion','appVersion','assetVersion','buildVersion'])if(marker[key]!==config[key])return {ok:false,reason:'게임 버전이 변경되어 다시 준비해야 합니다.'};
  const directory=childPath(home,marker.package),node=childPath(home,marker.node);
  for(const file of ['server.js','scripts/start-deploy.mjs','scripts/dependency-links.json','.next/BUILD_ID','package.json',...requiredRoots,...sentinels])await access(path.join(directory,file));
  await access(node);
  return {ok:true,marker,directory,node};
 }catch(error){return {ok:false,reason:error.code==='ENOENT'?'게임 설치 파일이 없거나 일부가 누락됐습니다.':`설치 완료 기록을 읽을 수 없습니다. ${error.message}`};}
}
export async function ensureWritableSaves(home){
 const saves=path.join(home,'saves'),db=path.join(saves,'tower.sqlite');
 const probe=path.join(saves,`.write-test-${randomUUID()}`);
 try{
  await mkdir(saves,{recursive:true});
  const file=await open(probe,'wx');await file.close();await import('node:fs/promises').then(fs=>fs.unlink(probe));
  try{const existing=await open(db,'r+');await existing.close();}catch(error){if(error.code!=='ENOENT')throw error;}
 }
 catch(error){throw Error(`저장 폴더에 쓸 수 없습니다. 폴더 권한을 확인해 주세요: ${saves} (${error.code??'오류'})`);}
 return db;
}
export async function publishMarker(home,config,directory,node){
 const marker={...config,installedAt:new Date().toISOString(),package:path.relative(home,directory),node:path.relative(home,node)};
 childPath(home,marker.package);childPath(home,marker.node);
 const temporary=path.join(home,markerName+'.'+randomUUID()+'.tmp');await writeFile(temporary,JSON.stringify(marker,null,2),{flag:'wx'});await rename(temporary,path.join(home,markerName));return marker;
}
export function requireNode(version=process.versions.node){if(Number(version.split('.')[0])<24)throw Error('게임 실행 도구가 오래되었습니다. Node.js 24 이상을 설치한 뒤 다시 실행해 주세요. https://nodejs.org/');}
