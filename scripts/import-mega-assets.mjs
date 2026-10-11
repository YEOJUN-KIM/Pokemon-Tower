import {readFileSync,writeFileSync,mkdirSync,existsSync,unlinkSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
const dex=JSON.parse(readFileSync('src/data/pokedex.json','utf8'));
const ids=new Map(readFileSync('.data/import-cache/pokemon.csv','utf8').trim().split(/\r?\n/).slice(1).map(l=>{const p=l.split(',');return [Showdown.Dex.species.get(p[1]).name,Number(p[0])];}));
const items={},forms={},sources=[],animated=new Set();
for(const item of Showdown.Dex.items.all().filter(i=>i.megaStone)){
 for(const [base,name] of Object.entries(item.megaStone)){
  const form=Showdown.Dex.species.get(name),entry=dex.find(e=>e.species===base),id=ids.get(name);
  if(!id || !entry || form.gen>=9)continue;
  const korean=entry.name+(item.name.endsWith(' X')?'나이트X':item.name.endsWith(' Y')?'나이트Y':'나이트');
  // Conventional names that omit the final syllable or use a different stem.
  const names={'Charizardite X':'리자몽나이트X','Charizardite Y':'리자몽나이트Y',Venusaurite:'이상해꽃나이트',Blastoisinite:'거북왕나이트',Gengarite:'팬텀나이트',Kangaskhanite:'캥카나이트',Scizorite:'핫삼나이트',Garchompite:'한카리아스나이트',Gyaradosite:'갸라도스나이트',Tyranitarite:'마기라스나이트',Metagrossite:'메타그로스나이트',Lucarionite:'루카리오나이트'};
  items[item.name]={name:names[item.name]??korean,species:base,forme:name,price:2500,description:entry.name+'에게 지니게 하면 기술 사용 전에 메가진화할 수 있습니다. 팀에서 특수 기믹은 배틀당 한 번만 사용합니다.',consumable:false};
  forms[name]={id:entry.id,baseSpecies:base,spriteKey:String(id),types:form.types,heightm:form.heightm,key:form.name.toLowerCase().replace(/-mega-([xy])$/,'-mega$1')};
 }
}
mkdirSync('artifacts/reports',{recursive:true});mkdirSync('public/sprites/gimmicks',{recursive:true});
writeFileSync('src/data/mega-items.json',JSON.stringify(items,null,2)+'\n');
writeFileSync('src/data/mega-forms.json',JSON.stringify(forms,null,2)+'\n');
if(process.argv.includes('--metadata-only')){console.log(Object.keys(items).length+' stones');process.exit(0);}
const jobs=[];
for(const [name,form] of Object.entries(forms))for(const back of [false,true]){
 const directory='public/sprites/gimmicks/'+(back?'back':'front');mkdirSync(directory,{recursive:true});
 for(const [ext,folder]of [['png',back?'gen5-back':'gen5'],['gif',back?'gen5ani-back':'gen5ani']]){
  const path=directory+'/'+form.key+'.'+ext,url='https://play.pokemonshowdown.com/sprites/'+folder+'/'+form.key+'.'+ext;
  jobs.push(async()=>{if(ext==='png' && existsSync(path)){sources.push({name,url,path});return;}const response=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!response.ok){if(ext==='gif' && response.status===404){if(existsSync(path))unlinkSync(path);return;}throw Error(url+' '+response.status);}writeFileSync(path,Buffer.from(await response.arrayBuffer()));sources.push({name,url,path});if(ext==='gif')animated.add(path);});
 }
}
let next=0;await Promise.all(Array.from({length:6},async()=>{while(next<jobs.length)await jobs[next++]();}));
const inventory={};for(const [name,f]of Object.entries(forms))inventory[f.spriteKey]={key:f.key,animatedFront:animated.has('public/sprites/gimmicks/front/'+f.key+'.gif'),animatedBack:animated.has('public/sprites/gimmicks/back/'+f.key+'.gif')};
writeFileSync('src/data/mega-sprite-availability.json',JSON.stringify(inventory,null,2)+'\n');
writeFileSync('artifacts/reports/mega-sprite-sources.json',JSON.stringify({source:'Pokemon Showdown sprite collection',importedAt:new Date().toISOString(),sources},null,2)+'\n');
console.log('Imported '+Object.keys(items).length+' stones/forms and '+sources.length+' sprite files');

