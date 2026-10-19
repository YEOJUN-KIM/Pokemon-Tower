import {trainerCatalog} from '../src/data/trainer-catalog.ts';
import {villainOrganizations,villainLeaders} from '../src/data/villain-organizations.ts';
import {existsSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';

const directory='public/sprites/trainers';mkdirSync(directory,{recursive:true});
const portraits=[...new Set([...trainerCatalog.map(s=>s.portrait),...villainOrganizations.map(s=>s.portrait),...Object.values(villainLeaders).flatMap(g=>[g.executive.portrait,...(g.executives??[]).map(s=>s.portrait),g.boss.portrait])])];
const only=process.argv.find(arg=>arg.startsWith('--only='))?.slice(7);
if(only&&!portraits.includes(only))throw Error(`Unknown registered portrait: ${only}`);
const selectedPortraits=only?[only]:portraits;
const sources=[];
const indexResponse=await fetch('https://play.pokemonshowdown.com/sprites/trainers/',{signal:AbortSignal.timeout(20000)});
if(!indexResponse.ok)throw Error('Cannot fetch sprite credits');
const spriteIndex=await indexResponse.text();
const spriteArtists=new Map([...spriteIndex.matchAll(/<figure id="([^"]+)">([\s\S]*?)<\/figure>/g)].map(([,filename,html])=>[filename,html.match(/<br\s*\/>by ([^<]+)/)?.[1].trim()]));
mkdirSync('.data/cache/import',{recursive:true});writeFileSync('.data/cache/import/trainer-sprite-index.html',spriteIndex);
const manifestPath='public/sprites/trainers/sources.json';
const previous=existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath,'utf8')).portraits : [];
const aliases={lorelei:['lorelei-gen3'],agatha:['agatha-gen3'],tateandliza:['tateandliza-gen3'],phoebe:['phoebe-gen3'],drake:['drake-gen3'],archie:['archie-gen3'],nemona:['nemona-s'],teamstargrunt:['stargrunt-s'],red:['red-gen2','red-gen4'],will:['will-gen2','will-gen4'],koga:['koga-gen2','koga-gen1','koga-gen4'],bruno:['bruno-gen2','bruno-gen1','bruno-gen4'],'dragon-tamer-gen4':['dragontamer-gen4','dragontamer','dragontamer-gen3'],'firebreather-gen4':['firebreather','firebreather-gen2'],'skier-gen4':['skier','skier-gen2'],'ruinmaniac-gen4':['ruinmaniac','ruinmaniac-gen3'],'birdkeeper-gen4':['birdkeeper','birdkeeper-gen3'],'bugcatcher-gen4':['bugcatcher','bugcatcher-gen3'],'maxie':['maxie-gen3','maxie-gen6'],'aromalady-gen4':['aromalady'],'channeler-gen3':['channeler'],'fairytalegirl':['fairytalegirl-gen6'],'blue':['blue-gen1','blue-gen3'],'kukui':['professorkukui'],'archer':['archer-gen4'],'giacomo':['giacomo-gen9']};
for(let i=0;i<selectedPortraits.length;i+=4){
  const results=await Promise.all(selectedPortraits.slice(i,i+4).map(async portrait=>{
    const path=`${directory}/${portrait}.png`;
    if(existsSync(path) && !process.argv.includes('--refresh'))return {portrait,url:previous.find(s=>s.portrait===portrait)?.url ?? `https://play.pokemonshowdown.com/sprites/trainers/${portrait}.png`,status:'existing'};
    for(const candidate of [portrait,...(aliases[portrait] ?? [])]){
      const url=`https://play.pokemonshowdown.com/sprites/trainers/${candidate}.png`;
      try{const response=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!response.ok)continue;const data=Buffer.from(await response.arrayBuffer());if(data.length<8 || data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')continue;writeFileSync(path,data);return {portrait,url,status:'downloaded'};}catch{}
    }
    return {portrait,status:'missing'};
  }));sources.push(...results);
}
const gruntArtists={magmagrunt:'ZacWeavile',flaregrunt:'kyledove',skullgrunt:'ZacWeavile',tabitha:'kyledove',xerosic:'Gnomowladny',plumeria:'Beliot419',guzma:'Gnomowladny'};
if(only)sources.unshift(...previous.filter(s=>s.portrait!==only));
writeFileSync('public/sprites/trainers/sources.json',JSON.stringify({source:'Pokémon Showdown trainer sprite directory',portraits:sources.map(source=>{const artist=spriteArtists.get(source.url?.split('/').at(-1))??gruntArtists[source.portrait];return {...source,...(artist ? {artist,creditSource:'https://play.pokemonshowdown.com/sprites/trainers/'} : {})};})},null,2)+'\n');
console.log(JSON.stringify({portraits:portraits.length,available:sources.filter(s=>s.status!=='missing').length,missing:sources.filter(s=>s.status==='missing').map(s=>s.portrait)}));
