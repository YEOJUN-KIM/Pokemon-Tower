import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {defaultProfile,validateProfile} from '../src/server/training';
import {pokemonSets,packTeam} from '../src/data/teams';
import {runBattle} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
import {statKeys,type TrainingProfile} from '../src/data/training';
import {moveLearnsets} from '../src/server/move-learnsets';

const old=JSON.parse(readFileSync('artifacts/diverse-team-cases.json','utf8'));
const cases=old.filter((c:{id:string;category:string})=>c.id.endsWith('-trained')||c.category==='mixed').map((c:object)=>({...c,recruitment:'adaptive'}));
for(const g of [1,7,9]){const c=old.find((c:{id:string})=>c.id===`gen${g}-trained`);cases.push({...c,id:`gen${g}-mid`,label:`${g}세대 중간 육성`,iv:15,points:33,recruitment:'adaptive'});}
cases.push({id:'screen-setup',label:'벽 + 랭크업',category:'roles',team:['Espeon','Gyarados','Scizor'],iv:31,points:66,recruitment:'adaptive',moves:{Espeon:['Psychic','Reflect','Light Screen','Baton Pass'],Gyarados:['Waterfall','Ice Fang','Earthquake','Dragon Dance'],Scizor:['Bullet Punch','U-turn','Roost','Swords Dance']}});
const slow=(attack:'atk'|'spa',nature:string):Partial<TrainingProfile>=>({ivs:{hp:31,atk:31,def:31,spa:31,spd:31,spe:0},evs:{hp:32,atk:0,def:2,spa:0,spd:0,spe:0,[attack]:32},nature});
cases.push({id:'trick-room',label:'트릭룸 + 저속 딜러',category:'roles',team:['Slowbro','Snorlax','Torkoal'],iv:31,points:66,recruitment:'adaptive',profiles:{Slowbro:slow('spa','Quiet'),Snorlax:slow('atk','Brave'),Torkoal:slow('spa','Quiet')},moves:{Slowbro:['Scald','Psychic','Slack Off','Trick Room'],Snorlax:['Body Slam','Crunch','Curse','Rest'],Torkoal:['Flamethrower','Earth Power','Solar Beam','Protect']}});
// Deterministic broad samples from the whole playable roster, not just high-BST species.
const pool=Object.keys(pokemonSets).sort();
for(let i=0;i<3;i++){
 const ordered=pool.map(name=>({name,key:createHash('sha256').update(`composition-sample-v1:${i}:${name}`).digest('hex')})).sort((a,b)=>a.key.localeCompare(b.key));
 const team=ordered.slice(0,3).map(c=>c.name);
 cases.push({id:`random-${i+1}`,label:`전체 도감 혼합 ${i+1}`,category:'random',team,iv:31,points:66,recruitment:'adaptive'});
}
for(const c of cases){
 const profiles=Object.fromEntries(c.team.map((name:string)=>{const p=defaultProfile(name);p.ivs=Object.fromEntries(statKeys.map(k=>[k,c.iv])) as TrainingProfile['ivs'];return[name,p];}));
 for(const [name,moves] of Object.entries(c.moves??{}) as [string,string[]][]){if(moves.some(m=>!moveLearnsets[name].legalMoves.includes(m)))throw Error(`Illegal move ${c.id}/${name}`);profiles[name].moves=moves;}
 for(const [name,value] of Object.entries(c.profiles??{}))Object.assign(profiles[name],value);
 for(const name of c.team)validateProfile(name,profiles[name]);
 const team=packTeam(c.team,profiles);await runBattle({rule:'basic',teams:{p1:team,p2:team},player:new DamagePolicy(),opponent:new DamagePolicy()});
 console.log('Validated '+c.id+' '+c.team.join('/'));
}
writeFileSync('artifacts/composition-team-cases.json',JSON.stringify(cases,null,2));
