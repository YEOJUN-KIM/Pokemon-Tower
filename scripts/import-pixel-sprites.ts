import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const sprites=JSON.parse(await readFile('src/data/pixel-sprites.json','utf8')) as Record<string,{key:string;animatedFront:boolean;animatedBack:boolean}>;
const source='https://play.pokemonshowdown.com/sprites/',destination='public/vendor/showdown/pokemon';
const files=[...new Set(Object.entries(sprites).filter(([id])=>Number(id)>=650).flatMap(([,sprite])=>[
  `gen5/${sprite.key}.png`,`gen5-back/${sprite.key}.png`,
  ...(sprite.animatedFront ? [`gen5ani/${sprite.key}.gif`] : []),
  ...(sprite.animatedBack ? [`gen5ani-back/${sprite.key}.gif`] : []),
]))];
for(const folder of ['gen5','gen5-back','gen5ani','gen5ani-back'])await mkdir(`${destination}/${folder}`,{recursive:true});
const report:{path:string;url:string;bytes:number;sha256:string}[]=[];
let cursor=0;
await Promise.all(Array.from({length:6},async()=>{
  while(cursor<files.length) {
    const path=files[cursor++],url=`${source}${path}`;
    let data:Buffer|undefined;
    try {data=await readFile(`${destination}/${path}`);} catch(error) {if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
    for(let attempt=0;!data && attempt<3;attempt++) {
      try {
        const response=await fetch(url,{signal:AbortSignal.timeout(20000)});
        if(!response.ok || !response.headers.get('content-type')?.startsWith('image/'))throw new Error(`${path}: ${response.status}`);
        data=Buffer.from(await response.arrayBuffer());break;
      } catch(error){if(attempt===2)throw error;}
    }
    if(!data)throw new Error(`Missing ${path}`);
    await writeFile(`${destination}/${path}`,data);
    report.push({path,url,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});
    if(report.length%100===0)console.log(`${report.length}/${files.length} pixel assets`);
  }
}));
report.sort((a,b)=>a.path.localeCompare(b.path));
await writeFile('artifacts/reports/pixel-sprite-assets.json',JSON.stringify({importedAt:new Date().toISOString(),source,total:report.length,files:report},null,2)+'\n');
console.log(`Imported ${report.length} assets, ${report.reduce((sum,entry)=>sum+entry.bytes,0)} bytes`);
