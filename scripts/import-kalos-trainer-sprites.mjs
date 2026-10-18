import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
// Original game-character artwork; Showdown has no Aliana sprite in its index.
const filename='XY_Aliana.png',hash=createHash('md5').update(filename).digest('hex');
const url=`https://archives.bulbagarden.net/media/upload/${hash[0]}/${hash.slice(0,2)}/${filename}`;
const response=await fetch(url);if(!response.ok)throw Error(`${url}: ${response.status}`);
const bytes=Buffer.from(await response.arrayBuffer());if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Not PNG');
writeFileSync('public/sprites/trainers/aliana.png',bytes);
const path='public/sprites/trainers/sources.json',manifest=JSON.parse(readFileSync(path,'utf8'));
const entry={portrait:'aliana',url,status:'downloaded',reviewedOn:'2026-10-18',review:'original-game-character-artwork',creditSource:'https://archives.bulbagarden.net/wiki/File:XY_Aliana.png',sha256:createHash('sha256').update(bytes).digest('hex')};
const old=manifest.portraits.find(p=>p.portrait==='aliana');if(old)Object.assign(old,entry);else manifest.portraits.push(entry);
writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');console.log(entry);
