import {readFile,writeFile,access} from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {inventory,preparePublicFiles,verifyFolder,hash} from './windows-player-package.mjs';
if(process.platform!=='win32'||process.arch!=='x64')throw Error('Build this release on Windows x64 with Node.js 24+.');
const args=process.argv.slice(2);if(args.length&&!(args.length===2&&args[0]==='--output-root'&&args[1]))throw Error('Expected --output-root <new directory>, or no options');
const root=process.cwd(),pkg=JSON.parse(await readFile('package.json','utf8'));
const config=JSON.parse(await readFile('scripts/player/config.json','utf8'));
if(pkg.version!==config.appVersion||!/^\d+\.\d+\.\d+(?:-[\w.]+)?$/.test(pkg.version))throw Error('Align package and player versions first.');
const name='PokemonTower-Windows-v'+pkg.version,directory=path.resolve(args[1]??'dist',name),zip=directory+'.zip';
for(const file of [directory,zip]){try{await access(file);}catch(e){if(e.code==='ENOENT')continue;throw e;}throw Error('Output already exists: '+file);}
function run(file,args){const r=spawnSync(file,args,{cwd:root,stdio:'inherit',windowsHide:true});if(r.error||r.status!==0)throw Error('Release step failed: '+file+' '+args.join(' '));}
run(process.execPath,['scripts/assets/manage.mjs','verify']);
run(process.execPath,['--require','./scripts/windows-build-links.cjs','node_modules/next/dist/bin/next','build']);
run(process.execPath,['scripts/package-deploy.mjs','--player','--output',directory]);
// Remove development-only npm scripts/dependencies from the traced root metadata.
await writeFile(path.join(directory,'package.json'),JSON.stringify({name:pkg.name,version:pkg.version,private:true,type:'module',engines:pkg.engines,dependencies:pkg.dependencies},null,2)+'\n');
await preparePublicFiles(directory,root);
await writeFile(path.join(directory,'README.txt'),'\ufeff'+`Pokémon Tower v${pkg.version}\r\n\r\n필수: Windows 11 x64 / Node.js 24 이상\r\nWindows 기본 .NET Framework를 사용합니다. 별도 .NET SDK는 필요 없습니다.\r\n\r\n실행:\r\n1. ZIP을 완전히 압축 해제합니다.\r\n2. 폴더 안의 PokemonTower.exe를 실행합니다.\r\n3. 최초 준비가 끝나면 기본 브라우저에서 게임이 열립니다.\r\n다음부터는 전체 재설치 없이 빠르게 실행합니다.\r\n폴더 안의 파일을 함께 보관해 주세요. EXE만 옮기면 실행할 수 없습니다.\r\n\r\n다시 열기: 알림 영역 아이콘 더블클릭 또는 우클릭 → Pokemon Tower 열기\r\n종료: 알림 영역 아이콘 우클릭 → 종료\r\n\r\n저장: %LOCALAPPDATA%\\PokemonTower\\saves\\tower.sqlite\r\n로그: %LOCALAPPDATA%\\PokemonTower\\logs\r\n배포 폴더를 교체해도 위 저장 폴더를 삭제하지 않으면 저장이 유지됩니다.\r\npnpm, Python, Git, Visual Studio, .NET SDK는 필요 없습니다.\r\n`);
const revision=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true});
await writeFile(path.join(directory,'release-manifest.json'),JSON.stringify({schemaVersion:1,version:pkg.version,platform:'win32',arch:'x64',sourceCommit:revision.status===0?revision.stdout.trim():null,workingTreeChangesIncluded:true,createdAt:new Date().toISOString(),files:await inventory(directory)},null,2)+'\n');
await verifyFolder(directory);
run(process.execPath,[path.join(directory,'scripts/assets/manage.mjs'),'verify']);
run('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File','scripts/windows-player-zip.ps1','-Mode','create','-Directory',directory,'-ZipPath',zip]);
run('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File','scripts/windows-player-zip.ps1','-Mode','verify','-Directory',directory,'-ZipPath',zip]);
const digest=hash(await readFile(zip));await writeFile(zip+'.sha256',digest+'  '+path.basename(zip)+'\n');
console.log(`Windows release ready: ${zip}\nSHA256 ${digest}`);
