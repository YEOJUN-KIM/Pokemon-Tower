import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const commit='0dc105d5b12416932f29b594078282ab4be045f5';
const source=`https://raw.githubusercontent.com/PokeAPI/sprites/${commit}/sprites/items/`;
const mega=JSON.parse(await readFile('src/data/mega-items.json','utf8'));
const crystals=JSON.parse(await readFile('src/data/z-crystals.json','utf8'));
const items=[...Object.keys(mega),...Object.keys(crystals)];
const directory='public/sprites/items';await mkdir(directory,{recursive:true});
const files=[];let cursor=0;
await Promise.all(Array.from({length:6},async()=>{while(cursor<items.length){
 const item=items[cursor++],key=item.toLowerCase().replaceAll(' ','-');
 const candidates=Object.hasOwn(crystals,item)?[`${key}--bag.png`,`${key}--held.png`]:[`${key}.png`,`gen9/${key}.png`];
 let found=false;
 for(const candidate of candidates){
  const url=source+candidate;
  const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
  if(response.status===404)continue;
  if(!response.ok)throw Error(`${url}: ${response.status}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error(`Invalid PNG: ${url}`);
  const path=`${directory}/${key}.png`;
  await writeFile(path,bytes);
  files.push({item,path,url,bytes:bytes.length,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),sha256:createHash('sha256').update(bytes).digest('hex')});
  found=true;break;
 }
 if(!found)throw Error(`No individual icon found for ${item}`);
}}));
files.sort((a,b)=>a.item.localeCompare(b.item));
await writeFile(`${directory}/gimmick-icon-sources.json`,JSON.stringify({source:'PokeAPI/sprites',commit,importedAt:new Date().toISOString(),transformation:'None; original PNG bytes with local item filenames.',files},null,2)+'\n');
console.log(JSON.stringify({mega:Object.keys(mega).length,zCrystals:Object.keys(crystals).length,imported:files.length}));
