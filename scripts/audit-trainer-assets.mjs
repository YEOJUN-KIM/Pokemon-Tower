import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
const directory='public/sprites/trainers',manifest=JSON.parse(readFileSync(`${directory}/sources.json`,'utf8'));
const sources=new Map(manifest.portraits.map(entry=>[entry.portrait,entry]));
const assets=Object.fromEntries(readdirSync(directory).filter(name=>name.endsWith('.png')).sort().map(name=>{
 const data=readFileSync(`${directory}/${name}`),key=name.slice(0,-4),width=data.readUInt32BE(16),height=data.readUInt32BE(20),source=sources.get(key);
 const kind=source?.review?.includes('artwork')?'illustration':width>300||height>300?'sprite-sheet':'battle-sprite';
 return [key,{kind,width,height}];
}));
writeFileSync('src/data/trainer-assets.json',JSON.stringify(assets,null,2)+'\n');
console.log(JSON.stringify({count:Object.keys(assets).length,nonBattle:Object.entries(assets).filter(([,asset])=>asset.kind!=='battle-sprite')},null,2));
