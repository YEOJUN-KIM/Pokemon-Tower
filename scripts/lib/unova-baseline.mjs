import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
// Isolated simulation-only source substitution. Never overwrites live files.
const snapshots=new Map();
if(process.env.UNOVA_METADATA_BASELINE){
 const files=JSON.parse(readFileSync(process.env.UNOVA_METADATA_BASELINE,'utf8'));
 for(const [path,source]of Object.entries(files))snapshots.set(new URL('../../'+path,import.meta.url).href,{format:'module-typescript',source,shortCircuit:true});
}
if(process.env.NPC_BALANCE_BASELINE)snapshots.set(new URL('../../src/data/normal-npc-templates.json',import.meta.url).href,{format:'json',source:readFileSync(process.env.NPC_BALANCE_BASELINE,'utf8'),shortCircuit:true});
registerHooks({load(url,context,next){return snapshots.get(url)??next(url,context);}});
