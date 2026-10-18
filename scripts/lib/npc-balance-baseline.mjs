import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
// Read-only dataset substitution in this simulation process. Never swaps the live file.
const target=new URL('../../src/data/normal-npc-templates.json',import.meta.url).href;
if(process.env.NPC_BALANCE_BASELINE){
 const source=readFileSync(process.env.NPC_BALANCE_BASELINE,'utf8');
 registerHooks({load(url,context,next){return url===target?{format:'json',source,shortCircuit:true}:next(url,context);}});
}
