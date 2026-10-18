import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const base='https://play.pokemonshowdown.com/sprites/trainers/';
const index=await fetch(base);if(!index.ok)throw Error('Sprite index unavailable');
const html=await index.text();
const path='public/sprites/trainers/sources.json',manifest=JSON.parse(readFileSync(path,'utf8'));
for(const portrait of ['colress','n']){
 const figure=html.match(new RegExp(`<figure id="${portrait}.png">([\\s\\S]*?)</figure>`))?.[1];
 if(!figure)throw Error(`Missing index entry ${portrait}`);
 const artist=figure.match(/<br\s*\/?>\s*by ([^<]+)/)?.[1]?.trim();
 const url=base+portrait+'.png',response=await fetch(url);if(!response.ok)throw Error(url);
 const bytes=Buffer.from(await response.arrayBuffer());if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Not PNG');
 writeFileSync(`public/sprites/trainers/${portrait}.png`,bytes);
 const entry={portrait,url,status:'downloaded',reviewedOn:'2026-10-18',review:artist?'credited-asset':'game-character-no-individual-credit-listed',...(artist?{artist,creditSource:base}:{}),sha256:createHash('sha256').update(bytes).digest('hex')};
 const old=manifest.portraits.find(p=>p.portrait===portrait);if(old)Object.assign(old,entry);else manifest.portraits.push(entry);
 console.log(entry);
}
writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');

