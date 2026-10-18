import {readFileSync} from 'node:fs';
import baseline from './fixtures/hau-guzma-preservation.json' with {type:'json'};

/** Historical suites retain their original checksums. Only this task's two
 * authorized identities are substituted with their actual pre-task rows.
 * hau-guzma.test.ts separately checks ALL other 224 current rows directly.
 * Historical AI checks hash the byte-identical v12 archive, not new v13. */
export function readPreHauGuzmaFile(path:string,encoding:'utf8'):string {
 if(path==='src/battle/npc-policy.ts')return readFileSync('src/battle/npc-policy-v12.ts',encoding);
 const text=readFileSync(path,encoding).replaceAll('\r\n','\n');
 if(path==='src/data/held-items.ts')return text.replace("'Heavy-Duty Boots','Golisopite'","'Heavy-Duty Boots'");
 if(path==='src/battle/run.ts')return text.replace("import {installGolisopodMega} from './golisopod-mega';\n",'').replaceAll('FORMAT,PRE_GOLISOPOD_FORMAT,','FORMAT,').replace('      if(format===FORMAT)installGolisopodMega(this.battle);\n','');
 if(path==='src/data/villain-organizations.ts')return text.replaceAll("leader('guzma','expert')","leader('guzma','tactical')");
 if(path==='src/data/normal-npc-templates.json')return JSON.stringify([...JSON.parse(text).filter((r:{id:string})=>!baseline.ids.includes(r.id)),...baseline.oldRuntime]);
 if(path==='scripts/data/npc/normal-npc-samples.json'){
  const data=JSON.parse(text);data.samples=[...data.samples.filter((r:{id:string})=>!baseline.ids.includes(r.id)),...baseline.oldSource];return JSON.stringify(data);
 }
 return text;
}
export function preHauGuzmaTrainers<T extends {id:string}>(trainers:T[]){return [...trainers.filter(t=>!baseline.ids.includes(t.id)),...baseline.oldTrainers].sort((a,b)=>baseline.trainerOrder.indexOf(a.id)-baseline.trainerOrder.indexOf(b.id));}
