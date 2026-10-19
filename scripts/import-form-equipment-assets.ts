import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {formItems} from '../src/data/form-items';
const sourceManifest='public/sprites/items/form-equipment-sources.json';
const files:{path:string;url:string;sha256:string}[]=existsSync(sourceManifest)?JSON.parse(readFileSync(sourceManifest,'utf8')).files:[];
async function asset(path:string,urls:string[]){
 if(existsSync(path))return;
 for(const url of urls){const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(response.status===404)continue;if(!response.ok)throw Error(`${url}: ${response.status}`);const data=Buffer.from(await response.arrayBuffer());if(data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Invalid PNG '+url);mkdirSync(path.slice(0,path.lastIndexOf('/')),{recursive:true});writeFileSync(path,data);files.push({path,url,sha256:createHash('sha256').update(data).digest('hex')});return;}
 throw Error('No sprite: '+path);
}
for(const item of [...Object.keys(formItems),'Zygardite']){
 const key=item.toLowerCase().replaceAll(' ','-');
 await asset(`public/sprites/items/${key}.png`,[`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${key}.png`,`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/gen9/${key}.png`,`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${key}--bag.png`]);
}
const pixel=JSON.parse(readFileSync('src/data/pixel-sprites.json','utf8')),forms:Record<string,unknown>={};
for(const data of Object.values(formItems)){
 if(!data.forme||!['Arceus','Silvally','Genesect'].includes(data.species))continue;
 const s=Showdown.Dex.species.get(data.forme),key=data.forme.toLowerCase(),spriteKey='equipment-'+key;
 for(const back of [false,true])for(const shiny of [false,true]){
  const folder='gen5'+(back?'-back':'')+(shiny?'-shiny':'');
  await asset(`public/vendor/showdown/pokemon/${folder}/${key}.png`,[`https://play.pokemonshowdown.com/sprites/${folder}/${key}.png`]);
 }
 pixel[spriteKey]={key,animatedFront:false,animatedBack:false,front:true,back:true,shinyFront:true,shinyBack:true};
 forms[data.forme]={id:s.num,baseSpecies:data.species,spriteKey,types:s.types};
}
writeFileSync('src/data/equipment-forms.json',JSON.stringify(forms,null,2)+'\n');
writeFileSync('src/data/pixel-sprites.json',JSON.stringify(pixel,null,2)+'\n');
writeFileSync('public/sprites/items/form-equipment-sources.json',JSON.stringify({importedAt:new Date().toISOString(),files},null,2)+'\n');
console.log({items:Object.keys(formItems).length+1,forms:Object.keys(forms).length,downloaded:files.length});
