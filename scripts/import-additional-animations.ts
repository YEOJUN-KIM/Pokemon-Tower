// Recheck only views which currently resolve to static art. Existing animations stay intact.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import {pokemonImageSources} from '../src/web/pokemon-image';
import {battlePreviewForms} from '../src/data/battle-preview-forms';
import {isCollectibleSpecies,namedReferenceSpecies} from '../src/data/pokedex-roster';

const read=async(path:string)=>JSON.parse(await readFile(path,'utf8'));
const cache='.data/cache/import/animation-reaudit';
await mkdir(cache,{recursive:true});
async function download(url:string,path:string) {
  try{return await readFile(path);}catch{}
  for(let attempt=0;attempt<3;attempt++)try{
    const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw Error(`${response.status}: ${url}`);
    const bytes=Buffer.from(await response.arrayBuffer());
    await mkdir(path.replace(/\/[^/]+$/,''),{recursive:true});await writeFile(path,bytes);return bytes;
  }catch(error){if(attempt===2)throw error;}
  throw Error(url);
}
const commit=process.env.POKEROGUE_ASSETS_COMMIT??'325c7de68e6c323e12243271ea510c6b0e1b992e';
const tree=JSON.parse((await download(`https://api.github.com/repos/pagefaultgames/pokerogue-assets/git/trees/${commit}?recursive=1`,`${cache}/tree.json`)).toString());
if(tree.truncated||tree.sha!==commit)throw Error('Incomplete or mismatched source tree');
const paths=new Set<string>(tree.tree.map((entry:{path:string})=>entry.path));
const raw=`https://raw.githubusercontent.com/pagefaultgames/pokerogue-assets/${commit}/`;
const dex=(await read('src/data/pokedex.json')).filter((entry:{species:string})=>isCollectibleSpecies(entry.species)||namedReferenceSpecies.has(entry.species));
const battle=await read('src/data/battle-forms.json');
const entries=new Map<string,{id:number;species:string}>();
for(const entry of dex)entries.set(String(entry.id),{id:entry.id,species:entry.species});
for(const file of ['selectable-forms','mega-forms','gigantamax-forms'])for(const [name,form]of Object.entries(await read(`src/data/${file}.json`)) as [string,{id?:number;spriteKey?:string;baseSpecies?:string}][]){
 const id=Showdown.Dex.species.get(name).num;entries.set(String(form.spriteKey??form.id),{id,species:name});
}
for(const name of [...Object.keys(battlePreviewForms),'Cherrim-Sunshine']){
 const form=battle[name],key=String(form.spriteKey??form.id);
 if(!entries.has(key))entries.set(key,{id:Showdown.Dex.species.get(name).num,species:name});
}
for(const [name,form]of Object.entries(battle) as [string,{id:number;spriteKey?:string;baseSpecies:string}][]){
 const key=String(form.spriteKey??form.id);
 if(!entries.has(key)&&(isCollectibleSpecies(form.baseSpecies)||namedReferenceSpecies.has(form.baseSpecies)))entries.set(key,{id:Showdown.Dex.species.get(name).num,species:name});
}
const aliases:Record<string,string>={
 Cherrim:'421-overcast',Palafin:'964-zero',Ogerpon:'1017-teal-mask',
 Vivillon:'666-meadow',Florges:'671-red',Xerneas:'716-active',Mimikyu:'778-disguised',
 Enamorus:'905-incarnate',Maushold:'925-four',Squawkabilly:'931-green-plumage',Tatsugiri:'978-curly',
 Koraidon:'1007-apex-build',Miraidon:'1008-ultimate-mode',Sinistcha:'1013-unremarkable',
 'Toxtricity-Low-Key-Gmax':'849-gigantamax',
 'Ogerpon-Wellspring':'1017-wellspring-mask','Ogerpon-Hearthflame':'1017-hearthflame-mask','Ogerpon-Cornerstone':'1017-cornerstone-mask',
 'Urshifu-Gmax':'892-gigantamax-single','Urshifu-Rapid-Strike-Gmax':'892-gigantamax-rapid',
 'Ursaluna-Bloodmoon':'8901','Zygarde-10%':'718-10','Eiscue-Noice':'875-no-ice',
 'Minior':'774-red','Minior-Meteor':'774-red-meteor',
};
function atlasKey(name:string,id:number){
 if(aliases[name])return aliases[name];
 const form=Showdown.Dex.species.get(name).forme;
 if(!form)return String(id);
 const regional=form.match(/^(Alola|Galar|Hisui|Paldea)(?:-(.*))?$/);
 if(regional){const offsets:Record<string,number>={Alola:2000,Galar:4000,Hisui:6000,Paldea:8000};const suffix=regional[2];return String(id+offsets[regional[1]])+(suffix&&suffix!=='Combat'?'-'+suffix.toLowerCase():'');}
 return `${id}-${form.toLowerCase().replace('gmax','gigantamax')}`;
}
const orientations=[{name:'front',back:false,shiny:false},{name:'back',back:true,shiny:false},{name:'shinyFront',back:false,shiny:true},{name:'shinyBack',back:true,shiny:true}] as const;
const inventory=await read('src/data/additional-animations.json');
const checked:object[]=[],jobs:any[]=[];
const work=[...entries].flatMap(([key,entry])=>orientations.map(view=>({key,...entry,...view})));
const pixels=await read('src/data/pixel-sprites.json'),megas=await read('src/data/mega-sprite-availability.json');
const showdown='https://play.pokemonshowdown.com/sprites/';
const restored:any[]=[];
const indexes=new Map<string,Set<string>>();
for(const folder of ['gen5ani','gen5ani-back','gen5ani-shiny','gen5ani-back-shiny']){
 const response=await fetch(showdown+folder+'/',{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Showdown index '+response.status);
 indexes.set(folder,new Set([...(await response.text()).matchAll(/href=["']([^"']+\.gif)["']/g)].map(match=>match[1].split('/').at(-1)!)));
}
for(const view of work){
 const before=pokemonImageSources(view.id,view.back,true,view.key,view.shiny);
 // Repair missing local files behind an already-enabled Showdown animation too.
 if(before[0]?.endsWith('.gif')){for(const url of before)if(url.startsWith('/vendor/showdown/pokemon/')&&!existsSync('public'+url)){const source=showdown+url.replace('/vendor/showdown/pokemon/','');const bytes=await download(source,'public'+url);restored.push({path:'public'+url,source,sha256:createHash('sha256').update(bytes).digest('hex')});}continue;}
 const key=(megas[view.key]??pixels[view.key])?.key;if(!key)continue;
 const suffix=(view.back?'-back':'')+(view.shiny?'-shiny':''),folder='gen5ani'+suffix;
 if(!indexes.get(folder)?.has(key+'.gif'))continue;
 const source=showdown+folder+'/'+key+'.gif',sourceGif=`${cache}/showdown/${folder}/${key}.gif`;
 await download(source,sourceGif);
 jobs.push({spriteKey:view.key,species:view.species,view:view.name,before:before[0],source,sourceGif,gif:`public/vendor/showdown/pokemon/${folder}/${key}.gif`,png:`public/vendor/showdown/pokemon/gen5${suffix}/${key}.png`});
}
let cursor=0;
await Promise.all(Array.from({length:8},async()=>{while(cursor<work.length){
 const view=work[cursor++],before=pokemonImageSources(view.id,view.back,true,view.key,view.shiny)[0];
 if(before?.endsWith('.gif'))continue;
 const key=atlasKey(view.species,view.id),suffix=`${view.back?'back/':''}${view.shiny?'shiny/':''}${key}`;
 const record:any={spriteKey:view.key,species:view.species,view:view.name,before,checked:[]};checked.push(record);
 for(const style of ['', 'exp/']){
  const path=`images/pokemon/${style}${suffix}.json`;
  if(!paths.has(path)){record.checked.push({path,status:'missing'});continue;}
  const atlasPath=`${cache}/${path}`,bytes=await download(raw+path,atlasPath),atlas=JSON.parse(bytes.toString());
  const textures=atlas.textures??[{image:atlas.meta?.image??path.split('/').at(-1)!.replace('.json','.png'),frames:Array.isArray(atlas.frames)?atlas.frames:Object.entries(atlas.frames).map(([filename,frame]:[string,any])=>({filename,...frame}))}];
  const count=textures.reduce((sum:number,texture:any)=>sum+texture.frames.length,0);
  const unique=new Set(textures.flatMap((texture:any)=>texture.frames.map((frame:any)=>JSON.stringify([texture.image,frame.frame,frame.spriteSourceSize])))).size;
  record.checked.push({path,frames:count});if(count<2)continue;
  if(unique<2)continue;
  for(const texture of textures){if(texture.image.includes('/')||texture.image.includes('..'))throw Error('Unexpected texture path');const imagePath=path.replace(/[^/]+$/,texture.image);await download(raw+imagePath,`${cache}/${imagePath}`);}
  const root=`public/vendor/pokerogue/pokemon/${view.name}/${view.key}`;
  jobs.push({...record,atlas:atlasPath,gif:root+'.gif',png:root+'.png',source:raw+path,sourceSha256:createHash('sha256').update(bytes).digest('hex')});
  break;
 }
}}));
const jobsPath=`${cache}/jobs.json`;await writeFile(jobsPath,JSON.stringify(jobs,null,2));
if(jobs.length){const result=spawnSync(process.env.PYTHON??'python',['scripts/convert-pokemon-atlas.py',jobsPath],{stdio:'inherit'});if(result.status!==0)throw Error('Atlas conversion failed');}
const converted=await read(jobsPath);
for(const job of converted)if(job.frames>1){inventory[job.spriteKey]??={};inventory[job.spriteKey][job.view]={gif:job.gif.replace(/^public/,''),png:job.png.replace(/^public/,'')};}
await writeFile('src/data/additional-animations.json',JSON.stringify(inventory,null,2)+'\n');
const notices='public/vendor/pokerogue';await mkdir(notices,{recursive:true});
let previous:any={imported:[]};try{previous=await read(`${notices}/sources.json`);}catch{}
const imported=new Map(previous.imported.map((row:any)=>[`${row.spriteKey}/${row.view}`,row]));
for(const job of converted)if(job.frames>1)imported.set(`${job.spriteKey}/${job.view}`,job);
await writeFile(`${notices}/sources.json`,JSON.stringify({commit,source:raw,credits:'https://github.com/pagefaultgames/pokerogue/blob/beta/CREDITS.md',imported:[...imported.values()],restored:[...(previous.restored??[]),...restored]},null,2)+'\n');
for(const file of ['README.md','REUSE.toml','images/REUSE.toml','LICENSES/CC-BY-NC-SA-4.0.txt','LICENSES/LicenseRef-FAIR-USE.txt']){
 if(!paths.has(file))continue;const dest=`${notices}/source-${file.replaceAll('/','-')}`;await writeFile(dest,await download(raw+file,`${cache}/${file}`));
}
const creditsUrl='https://raw.githubusercontent.com/pagefaultgames/pokerogue/beta/CREDITS.md';await writeFile(`${notices}/CREDITS.md`,await download(creditsUrl,`${cache}/CREDITS.md`));
await mkdir('artifacts/qa/assets/reports',{recursive:true});
await writeFile('artifacts/qa/assets/reports/animation-reaudit.json',JSON.stringify({checkedAt:new Date().toISOString(),commit,entries:entries.size,views:work.length,staticViews:checked.length,imported:converted,checked},null,2)+'\n');
console.log(JSON.stringify({entries:entries.size,staticViews:checked.length,imported:converted.filter((row:any)=>row.frames>1).length,spriteKeys:Object.keys(inventory).length}));
