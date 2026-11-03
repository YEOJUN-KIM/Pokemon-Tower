import {createReadStream,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
import Showdown from 'pokemon-showdown';
import {inferProgressionRole} from '../src/server/npc-progression-builds';
import {npcAttackStyle} from '../src/server/npc-builds';

const dir='artifacts/build-progression-audit';mkdirSync(dir,{recursive:true});
const runs=Number(process.argv[2]??1000);
const before=process.argv[3]??`artifacts/progression-audit/encounters-${runs}.jsonl`,after=process.argv[4]??`${dir}/encounters-${runs}.jsonl`;
const bounds=[[1,10],[11,20],[21,30],[31,40],[41,49],[50,50],[51,60],[61,70],[71,80],[81,90],[91,99],[100,100]];
const setup=new Set(['swordsdance','dragondance','nastyplot','calmmind','bulkup','quiverdance','shellsmash']);
const recovery=new Set(['recover','roost','softboiled','slackoff','strengthsap','synthesis','moonlight','morningsun','shoreup','wish','rest']);
const pivot=new Set(['uturn','voltswitch','flipturn','partingshot','teleport','batonpass','chillyreception']);
const hazards=new Set(['stealthrock','spikes','toxicspikes','stickyweb']);
const inc=(o:any,k:string,n=1)=>o[k]=(o[k]??0)+n;
function add(g:any,r:any){
 g.n=(g.n??0)+1;g.slots=(g.slots??0)+r.team.length;
 for(const key of ['rank','gimmick','ai'])inc(g[key]??={},r[key]??'none');
 for(const key of ['bst','iv','ev','repeatSpecies','repeatPair','repeatTeam','mono'])g[key]=(g[key]??0)+Number(r[key]);
 const moves=r.team.flatMap((p:any)=>p.moves.map((m:string)=>Showdown.Dex.moves.get(m))),roles=r.team.map((p:any)=>inferProgressionRole(p.name,p.moves));
 const flags={setup:moves.some((m:any)=>setup.has(m.id)),pivot:moves.some((m:any)=>pivot.has(m.id)),status:moves.some((m:any)=>m.category==='Status'&&m.status),recovery:moves.some((m:any)=>recovery.has(m.id)),hazard:moves.some((m:any)=>hazards.has(m.id)),screen:moves.some((m:any)=>['reflect','lightscreen','auroraveil'].includes(m.id)),weather:r.weather,terrain:r.terrain,roleDuplicate:new Set(roles).size<roles.length};
 for(const [k,v] of Object.entries(flags))g[k]=(g[k]??0)+Number(v);
 for(const role of roles)inc(g.roles??={},role);
 g.items??={};g.species??={};g.types??={};g.moves??={};
 for(const p of r.team){
  inc(g.species,p.name);for(const t of p.types)inc(g.types,t);for(const m of p.moves)inc(g.moves,m);
  if(p.item){inc(g.items,p.item);g.itemSlots=(g.itemSlots??0)+1;}
  const attacks=p.moves.map((m:string)=>Showdown.Dex.moves.get(m)).filter((m:any)=>m.category!=='Status');
  g.attackTypes=(g.attackTypes??0)+new Set(attacks.map((m:any)=>m.type)).size;
  g.stab=(g.stab??0)+Number(attacks.some((m:any)=>p.types.includes(m.type)));
  const style=npcAttackStyle(p.name);g.aligned=(g.aligned??0)+Number(attacks.every((m:any)=>style==='mixed'||m.overrideOffensiveStat==='def'||m.category===(style==='physical'?'Physical':'Special')));
  const boosts=p.moves.map((m:string)=>Showdown.Dex.moves.get(m)).filter((m:any)=>setup.has(m.id));
  g.badSetup=(g.badSetup??0)+Number(boosts.some((m:any)=>attacks.filter((a:any)=>a.overrideOffensivePokemon!=='target'&&(m.boosts?.[a.overrideOffensiveStat??(a.category==='Physical'?'atk':'spa')]??0)>0).length<2));
  g.badChoice=(g.badChoice??0)+Number(['Choice Scarf','Choice Band','Choice Specs','Assault Vest'].includes(p.item)&&p.moves.some((m:string)=>Showdown.Dex.moves.get(m).category==='Status'));
 }
}
async function collect(path:string){
 if(!existsSync(path))throw Error('Missing raw audit: '+path);
 const bands:any={},byRank:any={},floors:any={},first:any={};let lastRun=-1,seen=false;
 for await(const line of createInterface({input:createReadStream(path),crlfDelay:Infinity})){
  const r=JSON.parse(line);if(r.run>=runs)break;if(r.run!==lastRun){lastRun=r.run;seen=false;}
  if(r.stage!==0)continue;
  if(!seen&&r.gimmick){inc(first,String(r.floor));seen=true;}
  const [a,b]=bounds.find(([a,b])=>r.floor>=a&&r.floor<=b)!,key=a===b?String(a):`${a}-${b}`;
  add(bands[key]??={},r);add(byRank[`${key}:${r.rank}`]??={},r);add(floors[r.floor]??={},r);
 }
 return {bands,byRank,floors,first};
}
const result={runs,before:await collect(before),after:await collect(after)};
writeFileSync(`${dir}/comparison-${runs}.json`,JSON.stringify(result,null,2));
const rate=(g:any,k:string)=>100*(g[k]??0)/(k==='itemSlots'||k==='stab'||k==='aligned'||k==='badChoice'?g.slots:g.n);
const headers=['version','band','rank','n','normal_pct','elite_pct','master_pct','named_pct','bst','iv','points','items_pct','gimmicks_pct','setup_pct','pivot_pct','status_pct','recovery_pct','hazard_pct','screen_pct','weather_pct','terrain_pct','role_duplicate_pct','stab_pct','aligned_pct','attack_types_per_pokemon','bad_choice_pct','repeat_species_pct','repeat_pair_pct','repeat_team_pct'];
const rows:string[]=[headers.join(',')];
for(const version of ['before','after'] as const)for(const [band,g] of Object.entries({...result[version].bands,...result[version].byRank}) as [string,any][]){
 const [name,rank='all']=band.split(':'),n=g.n;
 rows.push([version,name,rank,n,...['normal','elite','master','named'].map(k=>100*(g.rank[k]??0)/n),g.bst/n,g.iv/n,g.ev/n,rate(g,'itemSlots'),100*(n-(g.gimmick.none??0))/n,...['setup','pivot','status','recovery','hazard','screen','weather','terrain','roleDuplicate','stab','aligned'].map(k=>rate(g,k)),g.attackTypes/g.slots,rate(g,'badChoice'),100*g.repeatSpecies/g.slots,rate(g,'repeatPair'),rate(g,'repeatTeam')].join(','));
}
writeFileSync(`${dir}/comparison-${runs}.csv`,'\ufeff'+rows.join('\n')+'\n');
console.log('Compared',runs,'runs; before and after 100-floor and rank metrics saved');
