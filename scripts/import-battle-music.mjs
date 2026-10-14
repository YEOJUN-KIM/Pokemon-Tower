import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const tracks=[
  {id:'trainer',title:'Boss Battle Theme',author:'Cleyton Kauffman',source:'https://opengameart.org/content/boss-battle-theme',url:'https://opengameart.org/sites/default/files/CleytonRX%20-%20Battle%20RPG%20Theme_1.mp3',file:'gym-rpg.mp3'},
  {id:'elite',title:'RPG Battle Theme II / Fighting is not an option',author:'Cleyton Kauffman',source:'https://opengameart.org/node/51807',url:'https://opengameart.org/sites/default/files/Fighting%20is%20not%20an%20option_0.mp3',file:'villain-rpg-v2.mp3'},
  {id:'gym',title:'Battle Theme A',author:'cynicmusic / Alex Smith',source:'https://opengameart.org/content/battle-theme-a',url:'https://opengameart.org/sites/default/files/battleThemeA.mp3',file:'gym-battle-a.mp3'},
  {id:'villain',title:'Unchained Destiny [Rock]',author:'nene',source:'https://opengameart.org/content/unchained-destiny-rock',url:'https://opengameart.org/sites/default/files/unchained_destiny_loop.wav',file:'elite-rock.wav'},
  {id:'champion',title:'Battle Theme A',author:'cynicmusic / Alex Smith',source:'https://opengameart.org/content/battle-theme-a',url:'https://opengameart.org/sites/default/files/battleThemeA.mp3',file:'gym-battle-a.mp3'},
  {id:'reward',title:'Victory Theme for RPG',author:'cynicmusic / Alex Smith',source:'https://opengameart.org/content/victory-theme-for-rpg',url:'https://opengameart.org/sites/default/files/Victory1_1.mp3',file:'reward-victory-v2.mp3'},
  {id:'rare',title:'The Final Battle',author:'skrjablin',source:'https://opengameart.org/content/the-final-battle',url:'https://opengameart.org/sites/default/files/the_final_battle.ogg',file:'rare-epic.ogg'},
];
await mkdir('public/audio/bgm',{recursive:true});
const manifest=[];
for(const track of tracks){
  const path=`public/audio/bgm/${track.file}`;
  let bytes;try{bytes=await readFile(path);}catch{
    const response=await fetch(track.url,{signal:AbortSignal.timeout(60000)});
    if(!response.ok)throw Error(`${track.id}: HTTP ${response.status}`);
    bytes=Buffer.from(await response.arrayBuffer());
  }
  const valid=track.file.endsWith('.ogg') ? bytes.toString('ascii',0,4)==='OggS' : track.file.endsWith('.wav') ? bytes.toString('ascii',0,4)==='RIFF' : bytes.toString('ascii',0,3)==='ID3' || (bytes[0]===255 && (bytes[1]&224)===224);
  if(bytes.length<10000 || !valid)throw Error(`${track.id}: invalid audio file`);
  await writeFile(path,bytes);
  manifest.push({...track,license:'CC0-1.0',licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/',verifiedAt:'2026-10-09',path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),changes:'Original file, renamed only. Browser repeats the complete file; no seamless-loop guarantee.'});
  console.log(`${track.id}: ${bytes.length} bytes`);
}
await writeFile('public/audio/music-sources.json',JSON.stringify(manifest,null,2)+'\n');
