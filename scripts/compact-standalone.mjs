import {readdir,lstat,mkdir,copyFile,readlink} from 'node:fs/promises';
import path from 'node:path';

// Preserve Next's traced files and pnpm dependency graph, but replace peer/version
// storage-directory names with short stable slots. Never rename package files.
export async function copyCompactStandalone(standalone,target,projectRoot){
 const store=path.join(standalone,'node_modules/.pnpm');
 const slots=new Map((await readdir(store)).sort().map((name,index)=>[name,index.toString(36)]));
 const normalized=value=>value.replaceAll('\\','/');
 function compact(relative){
  const parts=normalized(relative).split('/');
  if(parts[0]==='node_modules'&&parts[1]==='.pnpm'){
   if(!slots.has(parts[2]))throw Error('Unknown traced dependency slot: '+relative);
   parts.splice(1,2,'.p',slots.get(parts[2]));
  }
  return parts.join('/');
 }
 const links=[];let copied=0,omitted=0;
 async function visit(directory){
  for(const entry of await readdir(directory,{withFileTypes:true})){
   const source=path.join(directory,entry.name),relative=path.relative(standalone,source),info=await lstat(source);
   if(entry.name.startsWith('.env')||['.data','logs','test-results','cache','.git'].includes(entry.name)||/\.(?:map|nft\.json|d\.ts)$/.test(entry.name)){omitted++;continue;}
   if(info.isSymbolicLink()){
    const original=path.resolve(path.dirname(source),await readlink(source));
    let suffix=path.relative(standalone,original);
    if(suffix.startsWith('..')||path.isAbsolute(suffix))suffix=path.relative(projectRoot,original);
    if(suffix.startsWith('..')||path.isAbsolute(suffix))throw Error('Traced dependency escapes project: '+source);
    links.push({path:compact(relative),target:compact(suffix)});
   }else if(entry.isDirectory())await visit(source);
   else {
    const destination=path.join(target,compact(relative));
    await mkdir(path.dirname(destination),{recursive:true});await copyFile(source,destination,1);copied++;
   }
  }
 }
 await visit(standalone);
 return {links,copied,omitted,slots:slots.size};
}
