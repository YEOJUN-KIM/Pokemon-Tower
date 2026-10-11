import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {pokemonSets} from '../src/data/teams';
import {defaultProfile,validateProfile} from '../src/server/training';
import {moveLearnsets} from '../src/server/move-learnsets';
import {statKeys,type TrainingProfile} from '../src/data/training';
import {auditProfile,auditTeam} from './lib/sample-audit';

const seed=process.argv[2]??'20261010';if(!/^\d{1,12}$/.test(seed))throw Error('Use a numeric seed');
const prefix=`artifacts/auto-suite-${seed}`;
if(existsSync(prefix+'-cases.json'))throw Error('Existing suite preserved; choose a new seed');
const pool=Object.keys(pokemonSets).sort();
// Transformation/indirect-only species remain audited, but need a dedicated generation role.
const attackingPool=pool.filter(n=>defaultProfile(n).moves.some(m=>Showdown.Dex.moves.get(m).category!=='Status')); 
let counter=0;const random=()=>createHash('sha256').update(seed+':'+counter++).digest().readUInt32BE(0)/4294967296;
const pick=(names:string[])=>names[Math.floor(random()*names.length)];
const starters=[['Charizard','Blastoise','Venusaur'],['Meganium','Typhlosion','Feraligatr'],['Sceptile','Blaziken','Swampert'],['Torterra','Infernape','Empoleon'],['Serperior','Emboar','Samurott'],['Chesnaught','Delphox','Greninja'],['Decidueye','Incineroar','Primarina'],['Rillaboom','Cinderace','Inteleon'],['Meowscarada','Skeledirge','Quaquaval']];
function profile(name:string,role='attack'){
 const p=defaultProfile(name),species=Showdown.Dex.species.get(name);
 const validator=new Showdown.TeamValidator('gen9nationaldexag@@@Max Team Size = 3,Adjust Level = 50');
 const legal=moveLearnsets[name].legalMoves.filter(m=>!validator.validateSet({...structuredClone(pokemonSets[name]),moves:[m]},{}));
 const physical=['hugepower','purepower'].includes(Showdown.toID(p.ability))||species.baseStats.atk>=species.baseStats.spa;
 const category=physical?'Physical':'Special';
 const score=(text:string)=>{const m=Showdown.Dex.moves.get(text);return (m.basePower||30)*(species.types.includes(m.type)?1.5:1)*(m.category===category?1:.55)*(m.accuracy===true?1:m.accuracy/100)*(m.flags.charge?.4:1);};
 const attacks=legal.filter(m=>Showdown.Dex.moves.get(m).category!=='Status').sort((a,b)=>score(b)-score(a)||a.localeCompare(b));
 const chosen:string[]=[];
 const keep=(m:string)=>{if(legal.includes(m)&&!chosen.includes(m)&&chosen.length<4)chosen.push(m);};
 if(role==='screens'){keep('Reflect');keep('Light Screen');}
 if(role==='room')keep('Trick Room');
 keep(attacks[0]);
 for(const m of attacks)if(!chosen.some(n=>Showdown.Dex.moves.get(n).type===Showdown.Dex.moves.get(m).type))keep(m);
 for(const m of attacks)keep(m);
 p.moves=chosen;p.ivs=Object.fromEntries(statKeys.map(k=>[k,31])) as TrainingProfile['ivs'];
 const attackingMoves=p.moves.map(m=>Showdown.Dex.moves.get(m)).filter(m=>m.category!=='Status');
 const value=(category:string)=>attackingMoves.filter(m=>m.category===category).reduce((s,m)=>s+(m.basePower||30),0);
 const attack=value('Physical')*(physical?1.5:1)>=value('Special')?'atk':'spa';
 p.evs={hp:13,atk:0,def:0,spa:0,spd:0,spe:21,[attack]:32};p.nature=attack==='atk'?'Adamant':'Modest';
 if(role==='screens'){p.evs={hp:32,atk:0,def:16,spa:0,spd:18,spe:0};p.nature='Careful';if(species.abilities.H==='Prankster')p.ability='Prankster';}
 if(role==='room'||role==='slow'){p.ivs.spe=0;p.evs={hp:32,atk:0,def:2,spa:0,spd:0,spe:0,[attack]:32};p.nature=attack==='atk'?'Brave':'Quiet';}
 if(role==='screens'&&attack==='spa')p.nature='Calm';
 validateProfile(name,p);return p;
}
const cases:any[]=starters.map((team,i)=>({id:'auto-gen'+(i+1),category:'generation-starters',team}));
for(const category of ['screens','room','mixed'])for(let i=0;i<3;i++){
 const setters=category==='screens'?['Espeon','Grimmsnarl','Klefki']:category==='room'?['Slowbro','Bronzong','Reuniclus']:pool;
 const team=[pick(setters)];const partners=category==='room'?attackingPool.filter(n=>Showdown.Dex.species.get(n).baseStats.spe<=65):attackingPool;
 while(team.length<3){const next=pick(partners);if(!team.includes(next))team.push(next);}
 cases.push({id:`auto-${category}-${i+1}`,category,team});
}
for(const c of cases){
 c.profiles=Object.fromEntries(c.team.map((n:string,i:number)=>[n,profile(n,c.category==='room'?(i===0?'room':'slow'):c.category==='screens'&&i===0?'screens':'attack')]));
 c.moves=Object.fromEntries(c.team.map((n:string)=>[n,c.profiles[n].moves]));c.iv=31;c.points=66;c.recruitment='adaptive';
}
const catalogAudit=pool.map(species=>{try{return{species,issues:auditProfile(species,defaultProfile(species))};}catch(e){return{species,issues:[{kind:'default-profile-error',detail:String(e)}]};}});
const sourceFiles=['artifacts/support-recheck-climb-cases.json','artifacts/support-corrected-climb-cases.json'];
const fixtures=sourceFiles.flatMap(file=>JSON.parse(readFileSync(file,'utf8')).map((c:any)=>({source:file,caseId:c.id,...auditTeam(c.team,c.profiles,pool)})));
const generatedAudit=cases.map(c=>({caseId:c.id,category:c.category,...auditTeam(c.team,c.profiles,pool)}));
if(generatedAudit.some(a=>a.issues.some(i=>i.kind.startsWith('illegal'))))throw Error('Generated invalid cases');
writeFileSync(prefix+'-cases.json',JSON.stringify(cases,null,2));
writeFileSync(prefix+'-samples.json',JSON.stringify({seed,catalogSpecies:pool.length,catalogAudit,fixtures,generatedAudit,notes:'Offline static diagnostics; all target abilities are hypothetical scenarios, never player inputs. Gaps may be solved by status/weather/teammates in battle. Warnings do not automatically mutate samples.'},null,2));
const files=['scripts/prepare-auto-suite-v2.ts','scripts/lib/sample-audit.ts','scripts/simulate-immunity-climb.ts','src/battle/matchup-aware-support-player-policy.ts','src/battle/revealed-immunity.ts','src/data/type-effectiveness.ts','src/data/type-chart.json','artifacts/observed-damage-validation-courses.json',prefix+'-cases.json'];
writeFileSync(prefix+'-manifest.json',JSON.stringify({seed,caseCount:cases.length,courses:9,rules:['basic','tera','chaos'],files:files.map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}))},null,2));
console.log(JSON.stringify({seed,cases:cases.length,uniqueSpecies:new Set(cases.flatMap(c=>c.team)).size,catalogSpecies:pool.length,fixtureIssues:fixtures.flatMap(f=>f.issues).length,staticGapCases:generatedAudit.filter(a=>a.gaps.length).length}));
