import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const types=['Normal','Fire','Water','Electric','Grass','Ice','Fighting','Poison','Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy','Stellar'];
const root='public/sprites/gimmicks/tera';await mkdir(root,{recursive:true});
const files=await Promise.all(types.map(async type=>{
 const url=`https://play.pokemonshowdown.com/sprites/types/Tera${type}.png`;
 const response=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error(`${type}: ${response.status}`);
 const bytes=Buffer.from(await response.arrayBuffer());if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error(`Invalid icon: ${type}`);
 const path=`${root}/Tera${type}.png`;await writeFile(path,bytes);
 return {type,path,url,sha256:createHash('sha256').update(bytes).digest('hex'),width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
}));
await writeFile(`${root}/sources.json`,JSON.stringify({source:'Pokemon Showdown type sprites',importedAt:new Date().toISOString(),transformation:'None',files},null,2)+'\n');
console.log(`Imported ${files.length} Tera type icons`);
