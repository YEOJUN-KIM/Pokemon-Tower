import {readFile,lstat} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {projectRoot,safeRelative,sha256,walk,cliOptions} from '../pokerogue/common.mjs';
import {downloadSources} from '../lib/download.mjs';
import {restoreFiles} from '../lib/restore-files.mjs';

const approved = new Map([
  ['YEOJUN-KIM/Pokemon-Tower',new Set(['43aa154688a1ef31e75f175ee6bde90198caa58a'])],
  ['PokeAPI/sprites',new Set(['0dc105d5b12416932f29b594078282ab4be045f5','a3a1432e688ea028f12c51371d5253037cb9f17b'])],
  ['msikma/pokesprite',new Set(['c5aaa610ff2acdf7fd8e2dccd181bca8be9fcb3e'])],
  ['pagefaultgames/pokerogue-assets',new Set(['325c7de68e6c323e12243271ea510c6b0e1b992e'])],
]);
export async function loadDefinition(){
  const definition=JSON.parse(await readFile(new URL('../../../docs/assets/manifests/mixed-runtime-assets.json',import.meta.url),'utf8'));
  const seen=new Set(),ids=new Set();
  for(const group of definition.groups){
    if(ids.has(group.id)||!approved.get(group.repository)?.has(group.revision)||!definition.folders.includes(group.folder))throw Error('Unapproved or duplicate mixed group');
    ids.add(group.id);safeRelative(group.id);
    if(group.fileCount!==group.files.length||group.totalBytes!==group.files.reduce((n,f)=>n+f.bytes,0))throw Error('Incomplete mixed golden');
    const base=`https://raw.githubusercontent.com/${group.repository}/${group.revision}/`;
    for(const file of group.files){
      const url=new URL(file.url);
      if(!url.href.startsWith(base)||url.search||url.hash||url.username||url.password)throw Error('Source must use approved pinned URL');
      safeRelative(url.href.slice(base.length));
      if(!file.path.startsWith(group.folder+'/'))throw Error('Cross-folder restore entry');
    }
  }
  for(const file of [...definition.groups.flatMap(g=>g.files),...definition.retained]){
    safeRelative(file.path);
    if(seen.has(file.path)||!definition.folders.includes(file.path.split('/')[0])||!Number.isSafeInteger(file.bytes)||file.bytes<0||!/^[a-f0-9]{64}$/.test(file.sha256))throw Error('Invalid or duplicate mixed path/hash');
    seen.add(file.path);
  }
  return definition;
}

// Mixed folders retain original art and source records. Only the audited group
// contributes missing/hash errors; files outside the complete ownership inventory
// are reported as extra, never silently adopted or deleted.
export async function verifyGroup(output,group,definition){
  const actual=new Set((await Promise.all(definition.folders.map(async folder=>{
    const directory=path.join(output,folder);
    try{if((await lstat(directory)).isSymbolicLink())throw Error(`Symlink not allowed in pack: ${folder}`);}
    catch(error){if(error.code!=='ENOENT')throw error;}
    return (await walk(directory)).map(p=>folder+'/'+p);
  }))).flat());
  const known=new Set([...definition.groups.flatMap(g=>g.files),...definition.retained].map(f=>f.path));
  const missing=[],mismatched=[];let matching=0,bytes=0;
  for(const file of group.files){
    if(!actual.has(file.path)){missing.push(file.path);continue;}
    const data=await readFile(path.join(output,file.path));
    if(data.length!==file.bytes||sha256(data)!==file.sha256)mismatched.push(file.path);
    else{matching++;bytes+=data.length;}
  }
  const extra=[...actual].filter(p=>!known.has(p));
  return {group:group.id,ok:!missing.length&&!mismatched.length&&!extra.length,matching,bytes,missing,extra,mismatched};
}
const requireVerified=result=>{if(!result.ok)throw Error('Mixed runtime verification failed:\n'+JSON.stringify(result,null,2));return result;};
export function restoreGroup(options,group,definition,dependencies={}){
  const base=`https://raw.githubusercontent.com/${group.repository}/${group.revision}/`;
  return restoreFiles(options,{lock:{files:group.files},manifest:group},{
    fetcher:dependencies.fetcher,
    downloadSources:(lock,cache,opts)=>downloadSources(lock,cache,{...opts,acceptsUrl:url=>url.href.startsWith(base)&&!url.search&&!url.hash&&!url.username&&!url.password}),
    verifyOutput:output=>verifyGroup(output,group,definition),requireVerified,
  });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{
    const [action,selector,...argv]=process.argv.slice(2);
    if(!['restore','verify'].includes(action))throw Error('Expected restore or verify');
    const options=cliOptions(argv,action==='restore'?['--output','--cache','--offline']:['--output']);
    const definition=await loadDefinition(),groups=definition.groups.filter(g=>selector==='all'||g.folder===selector||g.id===selector);
    if(!groups.length)throw Error(`No external restore group: ${selector}`);
    for(const group of groups){
      const output=path.resolve(options.output??path.join(projectRoot,'public/sprites'));
      const cache=path.resolve(options.cache?path.join(options.cache,group.id):path.join(projectRoot,'external/pokemon-ip/mixed',group.id,'source'));
      const result=action==='verify'?requireVerified(await verifyGroup(output,group,definition)):await restoreGroup({output,cache,offline:options.offline},group,definition);
      console.log(JSON.stringify(result));
    }
  }catch(error){console.error(error.message);process.exitCode=1;}
}
