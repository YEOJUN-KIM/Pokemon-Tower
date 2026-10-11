import {mkdir,writeFile} from 'node:fs/promises';
const names=['x-attack','x-speed','guard-spec','x-defense','x-sp-atk','x-sp-def','x-accuracy','dire-hit','hp-up','protein','iron','calcium','zinc','carbos'];
await mkdir('public/sprites/items',{recursive:true});
for(const name of names){
  const response=await fetch(`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${name}.png`);
  if(!response.ok)throw new Error(`${name}: HTTP ${response.status}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error(`${name}: invalid PNG`);
  await writeFile(`public/sprites/items/${name}.png`,bytes);
  console.log(`${name}: ${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`);
}
