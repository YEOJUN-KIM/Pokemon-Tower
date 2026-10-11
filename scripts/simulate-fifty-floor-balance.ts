import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {starters,packTeam} from '../src/data/teams';
import {defaultProfile} from '../src/server/training';
import {statKeys,trainedStat,type StatBlock,type TrainingProfile} from '../src/data/training';
import {encounterRandom,generateOpponentTeam} from '../src/server/opponent-team';
import {opponentProfile} from '../src/server/opponent-training';
import {trainerCatalog} from '../src/data/trainer-catalog';
import {towerTrainerEncounter} from '../src/data/tower-trainers';
import {runBattle,engineVersion,FORMAT,type Seed} from '../src/battle/run';
import {TowerPolicy} from '../src/battle/tower-policy';
import {GimmickPolicy} from '../src/battle/gimmick-policy';
import {canEquipGimmick,megaStones,DYNAMAX_ITEM} from '../src/data/gimmicks';
import {johtoOriginalBuild} from '../src/data/johto-builds';
import {isShopFloor,upgrades,machineMoves,type UpgradeKind} from '../src/data/shop';
import {rollItemOffers} from '../src/data/held-item-shop';
import {heldItems,type HeldItem} from '../src/data/held-items';
import {rollMachineOffers,machinePrice} from '../src/data/machine-rarities';
import {moveLearnsets} from '../src/server/move-learnsets';
type Encounter={floor:number;seed:Seed;enemy:string;role:string;trainer:string;reward:number};
type Course={id:string;encounters:Encounter[]};
const phase=process.argv[2]??'before',count=Number(process.env.BALANCE_SAMPLES??32);
const path='artifacts/balance-50-courses.json';mkdirSync('artifacts',{recursive:true});
let courses:Course[];
if(existsSync(path))courses=JSON.parse(readFileSync(path,'utf8')).courses;
else{
 courses=[];const store=new TowerStore(':memory:');
 try{for(let i=0;i<count;i++){const owner='hard-balance-'+i;store.ensurePlayer(owner);const first=store.start(owner,starters),id=store.battle(first).run_id,encounters:Encounter[]=[];
 for(let floor=1;floor<=50;floor++){let battle=first;if(floor>1){store.db.prepare("UPDATE runs SET floor=?,state='select' WHERE id=?").run(floor,id);battle=store.enter(owner,id,floor,starters);}
 const row=store.battle(battle),trainer=JSON.parse(row.boss??row.trainer??'{}');
 encounters.push({floor,seed:JSON.parse(row.seed),enemy:row.opponent_team,role:trainer.role??'trainer',trainer:trainer.id??'unknown',reward:row.reward});}
 courses.push({id,encounters});}}finally{store.close();}
 writeFileSync(path,JSON.stringify({engineVersion,format:FORMAT,courses},null,2));
}
if(phase==='record'){console.log('Recorded '+courses.length+' live 50-floor courses');process.exit(0);}
const gimmickRun=['gimmick-baseline','gimmicks','shop-current','shop-mega-control','shop-dynamax-control'].includes(phase);
courses=courses.slice(0,count);
if(phase==='after' || gimmickRun)courses=courses.map(course=>({...course,encounters:course.encounters.map(e=>{
 const trainer=towerTrainerEncounter(e.floor,course.id,'johto'),sample=trainerCatalog.find(s=>s.id===e.trainer);
 if(!trainer)return e;
 const entries=generateOpponentTeam(e.floor,e.seed,[],trainer,sample),recorded=Showdown.Teams.unpack(e.enemy)!;
 if(phase==='gimmick-baseline')for(const p of entries)if(p.item===DYNAMAX_ITEM)p.item=johtoOriginalBuild(trainer.boss.id,p.name)?.item ?? '';
 const profiles=Object.fromEntries(entries.map((p,index)=>[p.name,{...opponentProfile(p.name,p.moves,e.floor,Object.fromEntries(statKeys.map(k=>[k,0])) as StatBlock),ivs:recorded[index].ivs as StatBlock,...(p.ability?{ability:p.ability}:{})}]));
 return {...e,enemy:packTeam(entries.map(p=>p.name),profiles,Object.fromEntries(entries.map(p=>[p.name,p.item??''])))};} )}));
const stages=[{id:'fresh',iv:0,points:0},{id:'mid',iv:15,points:33},{id:'trained',iv:31,points:66},{id:'collector',iv:31,points:66}];
function playerProfile(name:string,iv:number,points:number){
 const p=defaultProfile(name),base=Showdown.Dex.species.get(name).baseStats;
 p.ivs=Object.fromEntries(statKeys.map(k=>[k,iv])) as StatBlock;
 p.evs[base.atk>=base.spa?'atk':'spa']=Math.min(32,Math.ceil(points*.48));p.evs.spe=Math.min(32,Math.floor(points*.32));p.evs.hp=points-Object.values(p.evs).reduce((a,b)=>a+b,0);
 if(points===66)p.nature=base.atk>=base.spa?'Adamant':'Modest';return p;
}
function rank(move:string,name:string){const m=Showdown.Dex.moves.get(move),s=Showdown.Dex.species.get(name);return m.category==='Status'?15:(m.basePower||40)*(s.types.includes(m.type)?1.5:1)*(m.category==='Physical'?s.baseStats.atk:s.baseStats.spa)*(m.accuracy===true?1:m.accuracy/100)*(m.flags.charge?.55:1)*(m.self?.boosts?.spa&&m.self.boosts.spa<0?.8:1);}
function chooseTeam(profiles:Record<string,TrainingProfile>){const chosen:string[]=[];while(chosen.length<3){const used=new Set(chosen.flatMap(n=>Showdown.Dex.species.get(n).types));chosen.push(Object.keys(profiles).filter(n=>!chosen.includes(n)).sort((a,b)=>score(b)-score(a))[0]);function score(n:string){const s=Showdown.Dex.species.get(n),p=profiles[n],stats=Object.fromEntries(statKeys.map(k=>[k,trainedStat(s.baseStats[k],p.ivs[k],p.evs[k],k,p.nature)]));return stats.hp+stats.def+stats.spd+stats.spe+Math.max(stats.atk,stats.spa)*1.4+s.types.filter(t=>!used.has(t)).length*35;}}return chosen;}
function capture(enemy:string,profiles:Record<string,TrainingProfile>){const selected=Showdown.Teams.unpack(enemy)!.sort((a,b)=>Showdown.Dex.species.get(b.species).bst-Showdown.Dex.species.get(a.species).bst)[0];const p=profiles[selected.species]??playerProfile(selected.species,0,0);for(const k of statKeys)p.ivs[k]=Math.max(p.ivs[k],selected.ivs?.[k]??31);p.moves=[...new Set([...p.moves,...selected.moves])].sort((a,b)=>rank(b,selected.species)-rank(a,selected.species)).slice(0,4);profiles[selected.species]=p;if(Object.keys(profiles).length>6){const weak=Object.keys(profiles).filter(n=>n!==selected.species).sort((a,b)=>Showdown.Dex.species.get(a).bst-Showdown.Dex.species.get(b).bst)[0];delete profiles[weak];}}
function itemScore(item:HeldItem,p:TrainingProfile,n:string){if(!canEquipGimmick(n,item))return 0;if(item===DYNAMAX_ITEM)return 40;if(megaStones[item])return 45;const attacks=p.moves.map(m=>Showdown.Dex.moves.get(m)).filter(m=>m.category!=='Status');const hasStatus=attacks.length<p.moves.length;const d=heldItems[item].description;
 if(item==='Leftovers'||item==='Sitrus Berry')return 30;
 if(item==='Focus Sash'||item==='Heavy-Duty Boots'||item==='Light Clay'||item==='Eviolite')return 0;
 if(item==='Assault Vest')return hasStatus?0:25;
 if(item.startsWith('Choice'))return hasStatus?0:(item==='Choice Band'?attacks.filter(m=>m.category==='Physical').length: item==='Choice Specs'?attacks.filter(m=>m.category==='Special').length:3)*10;
 if(item==='Life Orb')return 35;if(item==='Expert Belt'||item==='Rocky Helmet')return 20;
 if(item==='Muscle Band')return attacks.filter(m=>m.category==='Physical').length*5;if(item==='Wise Glasses')return attacks.filter(m=>m.category==='Special').length*5;
 const type=Showdown.Dex.items.get(item).onBasePower ? attacks.some(m=>d.includes(({Fire:'불꽃',Water:'물',Grass:'풀',Electric:'전기',Ice:'얼음',Normal:'노말',Ground:'땅',Flying:'비행',Psychic:'에스퍼',Fighting:'격투',Dark:'악',Dragon:'드래곤',Steel:'강철',Poison:'독',Rock:'바위',Bug:'벌레',Ghost:'고스트',Fairy:'페어리'} as Record<string,string>)[m.type]+' 타입')):false;
 return type?20:item==='Wide Lens'?8:0;}
const policy=()=>gimmickRun ? new GimmickPolicy() : new TowerPolicy();
const activations=(log:{publicProtocol:string[]})=>log.publicProtocol.filter(l=>l.startsWith('|-mega|p2') || (l.startsWith('|-start|p2') && l.includes('|Dynamax'))).length;
const report={phase,engineVersion,format:FORMAT,courses:courses.length,notes:'Frozen live Johto courses. Both sides use deterministic public-information policies. Probes: fixed starters, no items. Climbs: recruit best BST and choose own stats/type coverage, no future enemy information; real weighted random 4-item/TM offers, prices, unique held items, attack/speed upgrades. Full restoration per floor, no voluntary switching. Purchase heuristics upgrade weaker held items and discount charging/special-attack-dropping moves. Shop RNG uses the recorded next battle seed; same live weighted offer algorithms, not the persisted live shop seed. Control phases grant one matching stone/band at floor 1, not a drop-rate measurement. Gimmick phases use v4 policy on both sides; baseline uses the same parties/IVs with original ace items, treatment equips boss bands. Weighted shop purchases can include compatible transformation items; no guaranteed player gimmick. Fresh/mid/trained are starter preparation levels, not human skill or measured human win rates. After replaces only named parties, preserving each recorded slot IVs. Collector starts with a previously collected Garchomp/Gyarados/Gengar trio and legal prepared moves; other stages use the three original starters.',stages:[] as unknown[]};
for(const stage of stages.filter(stage=>!process.env.BALANCE_STAGES || process.env.BALANCE_STAGES.split(',').includes(stage.id))){
 const probe=[];for(const floor of [1,5,10,15,20,25,30,35,40,45,50]){let wins=0,gimmickActivations=0;const byTrainer:Record<string,{wins:number;battles:number}>={};
 for(const c of courses){const e=c.encounters[floor-1],p=Object.fromEntries(starters.map(n=>[n,playerProfile(n,stage.iv,stage.points)]));const log=await runBattle({teams:{p1:packTeam(starters,p),p2:e.enemy},seed:e.seed,player:policy(),opponent:policy()});wins+=Number(log.winner==='Player');gimmickActivations+=activations(log);const t=byTrainer[e.trainer]??={wins:0,battles:0};t.wins+=Number(log.winner==='Player');t.battles++;}
 probe.push({floor,gimmickActivations,wins,battles:courses.length,byTrainer});}
 const climbs=[];
 for(const c of courses){const initial=stage.id==='collector'?['Garchomp','Gyarados','Gengar']:starters;const p=Object.fromEntries(initial.map(n=>[n,playerProfile(n,stage.iv,stage.points)]));if(stage.id==='collector'){p.Garchomp.moves=['Earthquake','Dragon Claw','Rock Slide','Swords Dance'];p.Gyarados.moves=['Waterfall','Ice Fang','Earthquake','Dragon Dance'];p.Gengar.moves=['Shadow Ball','Sludge Bomb','Thunderbolt','Dazzling Gleam'];}const items:Record<string,string>={};if(phase==='shop-mega-control')items[initial[0]]=initial[0]==='Garchomp'?'Garchompite':'Charizardite X';if(phase==='shop-dynamax-control')items[initial[0]]=DYNAMAX_ITEM;let coins=0,cleared=0,spent=0,boosts:UpgradeKind[]=[],bossGimmickActivations=0,playerGimmickActivations=0,shopVisits=0;const purchases:{floor:number;kind:string;name:string;price:number;target?:string}[]=[];let failedAt:Encounter|undefined;
 for(const e of c.encounters){if(isShopFloor(e.floor,50)){shopVisits++;boosts=[];const random=encounterRandom(e.seed);
 for(const kind of ['attack','speed'] as const)if(coins>=upgrades[kind].price){coins-=upgrades[kind].price;spent+=upgrades[kind].price;boosts.push(kind);purchases.push({floor:e.floor-1,kind:"upgrade",name:kind,price:upgrades[kind].price});}
 for(const item of rollItemOffers(e.floor-1,random)){if(Object.values(items).includes(item)||coins<heldItems[item].price)continue;const name=Object.keys(p).sort((a,b)=>itemScore(item,p[b],b)-itemScore(item,p[a],a)).find(n=>itemScore(item,p[n],n)>(items[n]?itemScore(items[n] as HeldItem,p[n],n):0));if(name){items[name]=item;coins-=heldItems[item].price;spent+=heldItems[item].price;purchases.push({floor:e.floor-1,kind:"item",name:item,price:heldItems[item].price,target:name});}}
 for(const {move} of rollMachineOffers(machineMoves.filter(m=>Object.keys(p).some(n=>moveLearnsets[n].legalMoves.includes(m))).map(move=>({move})),e.floor-1,random)){if(coins<machinePrice(move))continue;const name=Object.keys(p).find(n=>moveLearnsets[n].legalMoves.includes(move)&&!p[n].moves.includes(move)&&rank(move,n)>Math.min(...p[n].moves.map(m=>rank(m,n))));if(name){const slot=p[name].moves.map(m=>rank(m,name)).indexOf(Math.min(...p[name].moves.map(m=>rank(m,name))));p[name].moves[slot]=move;coins-=machinePrice(move);spent+=machinePrice(move);purchases.push({floor:e.floor-1,kind:"machine",name:move,price:machinePrice(move),target:name});}}
 }
 for(const n of Object.keys(items))if(!p[n])delete items[n];
 const log=await runBattle({teams:{p1:packTeam(chooseTeam(p),p,items),p2:e.enemy},seed:e.seed,player:policy(),opponent:policy(),upgrades:boosts});
 bossGimmickActivations+=activations(log);playerGimmickActivations+=log.publicProtocol.filter(l=>l.startsWith("|-mega|p1")||(l.startsWith("|-start|p1")&&l.includes("|Dynamax"))).length;for(const line of log.publicProtocol){const match=/^\|-enditem\|p1a: ([^|]+)\|([^|]+)/.exec(line);if(match&&heldItems[match[2] as HeldItem]?.consumable)delete items[match[1]];}
 if(log.winner!=='Player'){failedAt=e;break;}cleared=e.floor;coins+=e.reward;capture(e.enemy,p);}
 climbs.push({id:c.id,cleared,coins,spent,bossGimmickActivations,playerGimmickActivations,shopVisits,purchases,failedFloor:failedAt?.floor,failedTrainer:failedAt?.trainer,finalParty:chooseTeam(p),items});}
 const result={stage:stage.id,probe,climbs,averageCleared:climbs.reduce((s,c)=>s+c.cleared,0)/climbs.length,finished:climbs.filter(c=>c.cleared===50).length};report.stages.push(result);console.log(stage.id+': average '+result.averageCleared.toFixed(1)+', clears '+result.finished+'/'+climbs.length);
}
writeFileSync('artifacts/balance-50-'+phase+'.json',JSON.stringify(report,null,2));

