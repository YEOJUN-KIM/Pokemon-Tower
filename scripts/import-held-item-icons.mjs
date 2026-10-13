import {mkdir,writeFile,access} from 'node:fs/promises';
import {heldItemKeys,itemIcon,itemIconExtension} from '../src/data/held-items.ts';

await mkdir('public/sprites/items',{recursive:true});
for(const item of heldItemKeys){
  if(itemIconExtension(item)==='svg')continue; // Original local SVGs and shared gimmick icons.
  const file=`${itemIcon(item)}.png`,path=`public/sprites/items/${file}`;
  try{await access(path);continue;}catch{}
  const response=await fetch(`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${file}`);
  if(!response.ok)throw new Error(`${file}: HTTP ${response.status}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error(`${file}: invalid PNG`);
  await writeFile(path,bytes);console.log(file);
}
