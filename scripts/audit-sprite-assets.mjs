import {readFile,writeFile,mkdir} from 'node:fs/promises';
const read=async path=>JSON.parse(await readFile(path,'utf8'));
const roster=await read('src/data/battle-roster.json'),forms=await read('src/data/battle-forms.json');
const source=await read('docs/assets/manifests/local-pokemon-sprites.json');
const url=`https://api.github.com/repos/PokeAPI/sprites/git/trees/${source.commit}?recursive=1`;
await mkdir('.data/cache/import',{recursive:true});
await mkdir('artifacts/qa/assets/reports',{recursive:true});
async function getTree(sha,recursive=false){const cache=`.data/cache/import/sprite-tree-${sha}-${recursive}.json`;try{return await read(cache);}catch{const response=await fetch(`https://api.github.com/repos/PokeAPI/sprites/git/trees/${sha}${recursive ? '?recursive=1' : ''}`,{headers:{'User-Agent':'pokemon-tower-asset-audit'},signal:AbortSignal.timeout(120000)});if(!response.ok)throw Error(`Sprite tree: ${response.status}`);const tree=await response.json();if(tree.truncated)throw Error(`Incomplete subtree ${sha}`);await writeFile(cache,JSON.stringify(tree));return tree;}}
async function folder(path){let sha=source.commit;for(const name of path.split('/')){const tree=await getTree(sha),next=tree.tree.find(entry=>entry.path===name && entry.type==='tree');if(!next)throw Error(`Missing directory ${path}`);sha=next.sha;}return sha;}
const files=new Set();
// Query only relevant complete subtrees; the repository-wide recursive listing is truncated.
for(const [path,recursive] of [['sprites/pokemon',false],['sprites/pokemon/back',false],['sprites/pokemon/other/showdown',true],['sprites/pokemon/versions/generation-v/black-white/animated',true]]){const tree=await getTree(await folder(path),recursive);for(const entry of tree.tree)if(entry.type==='blob')files.add(`${path}/${entry.path}`);}
const has=(id,side,folder,ext)=>files.has(`sprites/pokemon/${folder}${side ? 'back/' : ''}${id}.${ext}`);
const detail=id=>({front:has(id,false,'','png'),back:has(id,true,'','png'),dotBoth:has(id,false,'versions/generation-v/black-white/animated/','gif') && has(id,true,'versions/generation-v/black-white/animated/','gif'),showdownBoth:has(id,false,'other/showdown/','gif') && has(id,true,'other/showdown/','gif')});
const base=Object.entries(roster).map(([species,entry])=>({species,id:entry.id,...detail(entry.id)}));
const battleForms=Object.entries(forms).map(([species,entry])=>({species,id:entry.id,spriteKey:entry.spriteKey ?? entry.id,baseId:roster[entry.baseSpecies].id,...detail(entry.spriteKey ?? entry.id)}));
const formAvailability=Object.fromEntries(battleForms.map(entry=>[entry.spriteKey,{dotBoth:entry.dotBoth,showdownBoth:entry.showdownBoth,front:entry.front,back:entry.back,baseId:entry.baseId}]));
const sharedBaseArt=battleForms.filter(entry=>String(entry.spriteKey)===String(entry.baseId) && entry.species!=='Minior-Meteor').map(entry=>entry.species);
await writeFile('src/data/form-sprite-availability.json',JSON.stringify(formAvailability,null,2)+'\n');
await writeFile('artifacts/qa/assets/reports/battle-sprite-audit.json',JSON.stringify({checkedAt:new Date().toISOString(),source:url,commit:source.commit,total:base.length,front:base.filter(entry=>entry.front).length,back:base.filter(entry=>entry.back).length,animatedBoth:base.filter(entry=>entry.dotBoth || entry.showdownBoth).length,missingBase:base.filter(entry=>!entry.front || !entry.back),battleForms: battleForms.length,sharedBaseArt,formsWithBaseFallback:battleForms.filter(entry=>!entry.front || !entry.back),forms:battleForms},null,2)+'\n');
console.log(`Sprites: ${base.filter(entry=>entry.front && entry.back).length}/${base.length} front/back; ${base.filter(entry=>entry.dotBoth || entry.showdownBoth).length} animated; battle-only forms ${battleForms.length}; fallback forms ${battleForms.filter(entry=>!entry.front || !entry.back).length}`);
if(base.some(entry=>!entry.front || !entry.back))process.exitCode=1;
