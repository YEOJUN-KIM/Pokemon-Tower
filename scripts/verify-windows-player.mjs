import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {verifyFolder,hash} from './windows-player-package.mjs';
const pkg=JSON.parse(await readFile('package.json','utf8'));
if(process.argv.length>3)throw Error('Expected at most one package directory');
const directory=path.resolve(process.argv[2]??'dist/PokemonTower-Windows-v'+pkg.version),zip=directory+'.zip';
const manifest=await verifyFolder(directory);
for(const [file,args]of [[process.execPath,[path.join(directory,'scripts/assets/manage.mjs'),'verify']],['powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File','scripts/windows-player-zip.ps1','-Mode','verify','-Directory',directory,'-ZipPath',zip]]]){
 const r=spawnSync(file,args,{stdio:'inherit',windowsHide:true});if(r.error||r.status!==0)throw Error('Release verify failed');
}
const expected=(await readFile(zip+'.sha256','utf8')).split(/\s/)[0];if(hash(await readFile(zip))!==expected)throw Error('ZIP checksum mismatch');
console.log(`Verified v${manifest.version}: ${manifest.files.length} files, exact ZIP contents and SHA256; Windows Explorer modeled maximum ${manifest.extraction.maxModeledPath}/${manifest.extraction.policy.maxFullPath} UTF-16 units (extraction root budget ${manifest.extraction.policy.extractionRootBudget}).`);
