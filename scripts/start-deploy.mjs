import {readFile, mkdir, lstat, unlink, symlink, access} from 'node:fs/promises';
import {resolve, dirname, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const links=JSON.parse(await readFile(new URL('./dependency-links.json',import.meta.url),'utf8'));
for(const link of links) {
  const path=resolve(root,link.path);
  const target=resolve(root,link.target);
  if(relative(root,path).startsWith('..') || relative(root,target).startsWith('..'))throw new Error('Dependency link outside package');
  await access(target);
  try {
    const existing=await lstat(path);
    if(!existing.isSymbolicLink())throw new Error(`Dependency link conflicts with a file: ${path}`);
    await unlink(path);
  } catch(error) {if(error.code!=='ENOENT')throw error;}
  await mkdir(dirname(path),{recursive:true});
  await symlink(process.platform==='win32'?target:relative(dirname(path),target),path,process.platform==='win32'?'junction':'dir');
}
createRequire(import.meta.url)(`${root}/server.js`);
