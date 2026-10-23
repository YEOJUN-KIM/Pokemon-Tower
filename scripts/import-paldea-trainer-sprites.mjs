import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {cachedSourceText,trainerSpriteIndex} from './lib/source-cache.mjs';
const directory='public/sprites/trainers';
const index=await cachedSourceText(trainerSpriteIndex);
if(process.argv.includes('--check-sources')){console.log('Trainer importer sources ready; no runtime files written.');process.exit(0);}
const manifest=JSON.parse(readFileSync(`${directory}/sources.json`,'utf8'));
for(const portrait of ['sada-ai','turo-ai']){
 const url=`https://play.pokemonshowdown.com/sprites/trainers/${portrait}.png`,path=`${directory}/${portrait}.png`;
 if(!existsSync(path)){
  const response=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error(`${portrait}: ${response.status}`);
  const data=Buffer.from(await response.arrayBuffer());if(data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Not a PNG');writeFileSync(path,data);
 }
 const figure=index.split(`<figure id="${portrait}.png">`)[1]?.split('</figure>')[0],artist=figure?.match(/<br\s*\/>by ([^<]+)/)?.[1].trim();
 if(!manifest.portraits.some(p=>p.portrait===portrait))manifest.portraits.push({portrait,url,status:'downloaded',...(artist?{artist,creditSource:'https://play.pokemonshowdown.com/sprites/trainers/'}:{})});
}
writeFileSync(`${directory}/sources.json`,JSON.stringify(manifest,null,2)+'\n');
console.log('AI Sada / AI Turo portraits ready.');
