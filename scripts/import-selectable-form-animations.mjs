import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{Dex}=require('pokemon-showdown');
const battlePreviews=process.argv.includes('--battle-previews');
const forms=battlePreviews?await (async()=>{
 const {battlePreviewForms}=await import('../src/data/battle-preview-forms.ts');
 const battleForms=JSON.parse(await readFile('src/data/battle-forms.json','utf8'));
 return Object.fromEntries(Object.keys(battlePreviewForms).map(name=>[name,battleForms[name]]));
})():JSON.parse(await readFile('src/data/selectable-forms.json','utf8'));
const inventory=JSON.parse(await readFile('src/data/pixel-sprites.json','utf8'));
const availability=JSON.parse(await readFile('src/data/form-sprite-availability.json','utf8'));
const source='https://play.pokemonshowdown.com/sprites/',root='public/vendor/showdown/pokemon/';
const records=[];
function frames(bytes){
 if(!['GIF87a','GIF89a'].includes(bytes.subarray(0,6).toString()))return 0;
 let offset=13,count=0;if(bytes[10]&128)offset+=3*(1<<((bytes[10]&7)+1));
 const blocks=()=>{while(offset<bytes.length){const length=bytes[offset++];if(!length)return;offset+=length;}};
 while(offset<bytes.length){const kind=bytes[offset++];if(kind===59)break;if(kind===33){offset++;blocks();}else if(kind===44){const packed=bytes[offset+8];offset+=9;if(packed&128)offset+=3*(1<<((packed&7)+1));offset++;blocks();count++;}else throw Error('Invalid GIF block');}
 return count;
}
const folders=['gen5','gen5-back','gen5-shiny','gen5-back-shiny','gen5ani','gen5ani-back','gen5ani-shiny','gen5ani-back-shiny'];
for(const folder of folders)await mkdir(root+folder,{recursive:true});
let cursor=0;const entries=Object.entries(forms).filter(([,form])=>!process.argv.includes('--regional')||form.region);
await Promise.all(Array.from({length:5},async()=>{
 while(cursor<entries.length){
  const [name,form]=entries[cursor++],species=Dex.species.get(name),key=species.spriteid;
  const record={name,id:form.id,key,files:[]};
  for(const folder of folders){const gif=folder.startsWith('gen5ani'),path=folder+'/'+key+(gif?'.gif':'.png'),url=source+path;
   const response=await fetch(url,{signal:AbortSignal.timeout(20000)});if(response.status===404){record.files.push({path,exists:false});continue;}if(!response.ok)throw Error(url+': '+response.status);
   const bytes=Buffer.from(await response.arrayBuffer());const frameCount=gif?frames(bytes):0;
   if(gif?!frameCount:bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Invalid sprite '+url);
   await writeFile(root+path,bytes);record.files.push({path,exists:true,frames:frameCount,sha256:createHash('sha256').update(bytes).digest('hex')});
  }
  const has=(folder,animated=false)=>record.files.some(f=>f.path===folder+'/'+key+(folder.startsWith('gen5ani')?'.gif':'.png')&&f.exists&&(!animated||f.frames>1));
  // Only select community sources if the corresponding static fallback exists.
  if(has('gen5'))inventory[form.id]={key,animatedFront:has('gen5ani',true),animatedBack:has('gen5ani-back',true),animatedShinyFront:has('gen5ani-shiny',true),animatedShinyBack:has('gen5ani-back-shiny',true),front:has('gen5'),back:has('gen5-back'),shinyFront:has('gen5-shiny'),shinyBack:has('gen5-back-shiny')};
  availability[form.id]={...availability[form.id],showdownBoth:has('gen5ani',true)&&has('gen5ani-back',true)};
  records.push(record);
 }
}));
await writeFile('src/data/pixel-sprites.json',JSON.stringify(inventory,null,2)+'\n');await writeFile('src/data/form-sprite-availability.json',JSON.stringify(availability,null,2)+'\n');
await mkdir('artifacts/reports',{recursive:true});const report={source,forms:records.sort((a,b)=>a.id-b.id),animatedFront:records.filter(r=>inventory[r.id]?.animatedFront).length,animatedBack:records.filter(r=>inventory[r.id]?.animatedBack).length};
await writeFile('artifacts/reports/'+(battlePreviews?'battle-form-animations':process.argv.includes('--regional')?'regional-form-animations':'selectable-form-animations')+'.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({forms:records.length,animatedFront:report.animatedFront,animatedBack:report.animatedBack,staticOnly:records.filter(r=>!inventory[r.id]?.animatedFront).map(r=>r.name)}));
