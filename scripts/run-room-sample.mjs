import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,readdirSync,existsSync,openSync,closeSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';

const id=process.argv[2]??'20261011',prefix=`artifacts/experiments/samples/room-sample-${id}`;
if(!/^\d{1,12}$/.test(id)||existsSync(prefix+'-manifest.json'))throw Error('Use a new numeric experiment ID');
const baseFile='artifacts/experiments/samples/reliable-samples-20261010-cases.json',courseFile='artifacts/experiments/samples/sample-holdout-20261011-courses.json';
const digest=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const previous=JSON.parse(readFileSync('artifacts/experiments/ai/opponent-learning-20261011-manifest.json','utf8'));
for(const path of [baseFile,courseFile])assert.equal(digest(path),previous.files.find(f=>f.path===path).sha256);
const replacements={baseline:{},steel:{'Steel Roller':'Iron Head'},psychic:{'Future Sight':'Zen Headbutt'},both:{'Steel Roller':'Iron Head','Future Sight':'Zen Headbutt'}};
const caseFiles={};
for(const [mode,changes] of Object.entries(replacements)){
 const cases=JSON.parse(readFileSync(baseFile,'utf8')),c=cases.find(c=>c.id==='auto-room-1');
 c.moves.Bronzong=c.moves.Bronzong.map(m=>changes[m]??m);
 c.profiles.Bronzong.moves=c.profiles.Bronzong.moves.map(m=>changes[m]??m);
 assert.deepEqual(c.moves.Bronzong,c.profiles.Bronzong.moves);
 const errors=new Showdown.TeamValidator('gen9nationaldexag@@@Max Team Size = 3,Adjust Level = 50').validateSet({species:'Bronzong',name:'Bronzong',ability:c.profiles.Bronzong.ability,nature:c.profiles.Bronzong.nature,level:50,evs:{hp:1},moves:c.moves.Bronzong},{});
 assert(!errors,JSON.stringify(errors));
 const restored=structuredClone(cases),original=JSON.parse(readFileSync(baseFile,'utf8'));
 restored.find(c=>c.id==='auto-room-1').moves.Bronzong=original.find(c=>c.id==='auto-room-1').moves.Bronzong;
 restored.find(c=>c.id==='auto-room-1').profiles.Bronzong.moves=original.find(c=>c.id==='auto-room-1').profiles.Bronzong.moves;
 assert.deepEqual(restored,original,'Only the two Bronzong move fields may change');
 caseFiles[mode]=prefix+`-${mode}-cases.json`;
 writeFileSync(caseFiles[mode],JSON.stringify(cases,null,2),{flag:'wx'});
}
const sources=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?sources(dir+'/'+e.name):/\.(ts|tsx|json)$/.test(e.name)?[dir+'/'+e.name]:[]);
const files=[...sources('src'),...sources('scripts/lib'),baseFile,courseFile,...Object.values(caseFiles),'pnpm-lock.yaml','scripts/simulate-opponent-learning.ts','scripts/run-room-sample.mjs','scripts/audit-room-sample.ts'];
const manifest={id,modes:Object.keys(replacements),replacements,rules:['basic','mega','dynamax','tera','chaos'],caseFiles,baseFile,courseFile,caseId:'auto-room-1',courses:18,totalFloors:100,files:files.map(path=>({path,sha256:digest(path)})),notes:'Targeted 2x2 Bronzong move intervention. Identical 18 reused courses, current v8 NPC, immunity-only player, original composition, prices and shop behavior. Only initial Bronzong moves change; recruitment and later purchases can diverge after different outcomes. Correlated simulated climbs, not human win rates or a fresh holdout.'};
writeFileSync(prefix+'-manifest.json',JSON.stringify(manifest,null,2),{flag:'wx'});
function run(args,env,log){return new Promise((resolve,reject)=>{const fd=openSync(log,'wx'),child=spawn(process.execPath,args,{env,stdio:['ignore',fd,fd],windowsHide:true});closeSync(fd);child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error('Exit '+code+'; see '+log)));});}
const env={...process.env,BALANCE_PLAYER:'immunity',BALANCE_OPPONENT:'v8',BALANCE_STAGES:'auto-room-1',BALANCE_FLOORS:'100',BALANCE_PER_THEME:'2',BALANCE_COMPOSITION:'synergy',BALANCE_BEHAVIOR:'balanced',BALANCE_COURSES:courseFile,COMPOSITION_WALLS:'original'};
delete env.BALANCE_PRICE_FILE;
const jobs=manifest.modes.flatMap(mode=>manifest.rules.map(rule=>({mode,rule})));let cursor=0;
async function worker(){while(cursor<jobs.length){const {mode,rule}=jobs[cursor++],name=`room-sample-${id}-${rule}-${mode}`;
 await run(['node_modules/tsx/dist/cli.mjs','scripts/simulate-opponent-learning.ts',name],{...env,BALANCE_CASES:caseFiles[mode],BALANCE_RULE:rule,BALANCE_DATASET:prefix+`-${rule}-${mode}-battles.jsonl`,COMPOSITION_TRACE:prefix+`-${rule}-${mode}-trace.jsonl`},prefix+`-${rule}-${mode}.log`);
 console.log('Completed '+mode+' '+rule);
}}
const results=await Promise.allSettled([worker(),worker(),worker()]);for(const r of results)if(r.status==='rejected')throw r.reason;
await run(['node_modules/tsx/dist/cli.mjs','scripts/audit-room-sample.ts',id],env,prefix+'-audit.log');
console.log('Audit complete: '+prefix+'-report.md');
