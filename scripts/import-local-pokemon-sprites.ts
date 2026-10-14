import {mkdir, readFile, writeFile, rename, unlink} from 'node:fs/promises';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {pokedexEntries} from '../src/server/pokedex-entries';
import {species} from '../src/web/catalog';
import {missingDotAnimation} from '../src/data/sprite-animation';
import {pixelSprites} from '../src/data/pixel-sprites';
import forms from '../src/data/form-sprite-availability.json' with {type:'json'};
import removedIds from '../src/data/removed-pokemon-sprite-ids.json' with {type:'json'};

// Use the revision already audited by this project, rather than changing art
// when the upstream master branch changes. Never overwrite existing assets.
const commit='a3a1432e688ea028f12c51371d5253037cb9f17b';
const source=`https://raw.githubusercontent.com/PokeAPI/sprites/${commit}/sprites/pokemon/`;
const destination='public/vendor/pokeapi/pokemon';
const keys=new Map<string,number>();
const removed=new Set<string>(removedIds);
const addKey=(key:string|number,id:number)=>{if(!removed.has(String(key)))keys.set(String(key),Math.min(keys.get(String(key)) ?? id,id));};
for(const entry of pokedexEntries()) {
  addKey(entry.id,entry.id);
  for(const form of entry.forms ?? [])addKey(form.spriteKey,entry.id);
}
for(const entry of Object.values(species))addKey(entry.spriteKey ?? entry.id,entry.id);
const files=new Map<string,boolean>();
for(const [key,id] of keys)for(const back of [false,true])for(const shiny of [false,true]) {
  const side=back?'back/':'';
  files.set(`${side}${shiny?'shiny/':''}${key}.png`,!back && !shiny && id<650 && !key.includes('-'));
  const form=(forms as Record<string,{dotBoth:boolean}>)[key];
  if(shiny ? id<650 : ((id<650 || !pixelSprites[key]) && (form ? form.dotBoth : !missingDotAnimation.has(id))))
    files.set(`versions/generation-v/black-white/animated/${side}${shiny?'shiny/':''}${key}.gif`,false);
}
const tasks=[...files.entries()].sort(([a],[b])=>a.localeCompare(b));
const records:{path:string;bytes:number;sha256:string}[]=[],missing:string[]=[];
let cursor=0,finished=0;
await Promise.all(Array.from({length:8},async()=>{
  while(cursor<tasks.length) {
    const [path,required]=tasks[cursor++],target=`${destination}/${path}`;
    let data:Buffer|undefined;
    try {data=await readFile(target);}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
    const existing=!!data;
    for(let attempt=0;!data && attempt<3;attempt++) {
      try {
        const response=await fetch(source+path,{signal:AbortSignal.timeout(20000)});
        if(response.status===404 && !required){missing.push(path);break;}
        if(!response.ok)throw Error(`${path}: HTTP ${response.status}`);
        data=Buffer.from(await response.arrayBuffer());
      }catch(error){if(attempt===2)throw error;}
    }
    if(data) {
      const valid=path.endsWith('.gif')?data.subarray(0,4).toString()==='GIF8':data.subarray(0,8).toString('hex')==='89504e470d0a1a0a';
      if(!valid)throw Error(`Invalid image: ${path}`);
      if(!existing) {
        await mkdir(dirname(target),{recursive:true});
        const temporary=target+'.download';await writeFile(temporary,data);
        // The plan contains unique filenames; atomic writes keep failed runs resumable.
        await rename(temporary,target).catch(async error=>{await unlink(temporary);throw error;});
      }
      records.push({path,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});
    }
    finished++;
    if(finished%200===0)console.log(`${finished}/${tasks.length} checked (${missing.length} unavailable)`);
  }
}));
records.sort((a,b)=>a.path.localeCompare(b.path));missing.sort();
await mkdir('artifacts/qa/assets/reports',{recursive:true});
await writeFile('artifacts/qa/assets/reports/local-pokemon-sprites.json',JSON.stringify({commit,source,files:records,missing},null,2)+'\n');
await writeFile('src/data/local-sprite-missing.json',JSON.stringify(missing,null,2)+'\n');
console.log(`Imported ${records.length} local sprites (${records.reduce((sum,row)=>sum+row.bytes,0)} bytes); ${missing.length} optional variants absent upstream.`);
