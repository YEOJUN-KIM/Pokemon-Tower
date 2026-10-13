import {readFile,writeFile,readdir,unlink,mkdir} from 'node:fs/promises';
import {resolve,basename,sep} from 'node:path';
import Showdown from 'pokemon-showdown';
import {isCollectibleSpecies} from '../src/data/pokedex-roster';
import {retainedUnevolvedOpponents} from '../src/data/opponent-species';
import pixelInventory from '../src/data/pixel-sprites.json' with {type:'json'};
import dex from '../src/data/pokedex.json' with {type:'json'};

// Preserve actual NPC images, including Red's Pikachu and Galar's Gmax ace.
const requiredNpc=new Set([...retainedUnevolvedOpponents,'Pikachu','Duraludon']);
const removedIds=new Set<string>(),removedKeys=new Set<string>();
const inspect=(id:string,name:string)=>{
 const species=Showdown.Dex.species.get(name);
 if(!species.exists||!species.nfe||isCollectibleSpecies(species.name)||requiredNpc.has(species.baseSpecies))return;
 removedIds.add(id);removedKeys.add(species.spriteid);
};
for(const entry of dex)inspect(String(entry.id),entry.species);
for(const line of (await readFile('.data/form-import-cache/pokemon.csv','utf8')).trim().split(/\r?\n/).slice(1)){
 const [id,name]=line.split(',');inspect(id,name);
}
for(const [id,value] of Object.entries(pixelInventory))if(removedIds.has(id))removedKeys.add(value.key);
const roots=['public/vendor/pokeapi/pokemon','public/vendor/showdown/pokemon'],files:{path:string;bytes:number}[]=[];
async function scan(directory:string,kind:number){
 const root=resolve(roots[kind]);
 for(const entry of await readdir(directory,{withFileTypes:true})){
  const path=resolve(directory,entry.name);
  if(!path.startsWith(root+sep))throw Error('Sprite path outside expected root: '+path);
  if(entry.isDirectory())await scan(path,kind);
  else if(entry.isFile()&&/\.(png|gif)$/.test(entry.name)){
   const key=basename(entry.name).replace(/\.(png|gif)$/,'');
   if((kind===0?removedIds:removedKeys).has(key))files.push({path:path.slice(resolve('.').length+1).replaceAll('\\','/'),bytes:(await readFile(path)).length});
  }
 }
}
for(let i=0;i<roots.length;i++)await scan(resolve(roots[i]),i);
const report={removedIds:[...removedIds].sort((a,b)=>Number(a)-Number(b)),requiredNpc:[...requiredNpc],files,bytes:files.reduce((n,f)=>n+f.bytes,0)};
await mkdir('artifacts/reports',{recursive:true});
await writeFile('artifacts/reports/unevolved-sprite-pruning.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({ids:removedIds.size,files:files.length,bytes:report.bytes,apply:process.argv.includes('--apply')}));
if(process.argv.includes('--apply')){
 for(const file of files){const path=resolve(file.path);if(!roots.some(root=>path.startsWith(resolve(root)+sep)))throw Error('Unsafe sprite deletion: '+path);await unlink(path);}
 for(const id of removedIds)delete (pixelInventory as Record<string,unknown>)[id];
 await writeFile('src/data/pixel-sprites.json',JSON.stringify(pixelInventory,null,2)+'\n');
 await writeFile('src/data/removed-pokemon-sprite-ids.json',JSON.stringify(report.removedIds,null,2)+'\n');
 const missing=new Set<string>(JSON.parse(await readFile('src/data/local-sprite-missing.json','utf8')));
 for(const file of files)if(file.path.startsWith(roots[0]+'/'))missing.add(file.path.slice(roots[0].length+1));
 await writeFile('src/data/local-sprite-missing.json',JSON.stringify([...missing].sort(),null,2)+'\n');
}
