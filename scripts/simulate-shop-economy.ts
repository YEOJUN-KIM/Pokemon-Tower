import {createHash} from 'node:crypto';
import {rerollPrice,vitaminPrice,VITAMIN_BOOST} from '../src/data/shop';
import {machineRarity,machinePrices} from '../src/data/machine-rarities';
import {itemShopRule} from '../src/data/held-item-shop';
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
const phase=process.argv[2]??'economy-current',count=Number(process.env.BALANCE_SAMPLES??32);
const path=process.env.BALANCE_COURSES??'artifacts/balance-50-courses.json';mkdirSync('artifacts',{recursive:true});
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
const gimmickRun=true;
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
function chooseTeam(profiles:Record<string,TrainingProfile>){const chosen:string[]=[];while(chosen.length<3){const used=new Set(chosen.flatMap(n=>Showdown.Dex.species.get(n).types));chosen.push(Object.keys(profiles).filter(n=>!chosen.includes(n)).sort((a,b)=>score(b)-score(a))[0]);function score(n:string){const s=Showdown.Dex.species.get(n),p=profiles[n],stats=Object.fromEntries(statKeys.map(k=>[k,trainedStat(s.baseStats[k],p.ivs[k],p.evs[k]+(p.runBonuses?.[k]??0),k,p.nature)]));return stats.hp+stats.def+stats.spd+stats.spe+Math.max(stats.atk,stats.spa)*1.4+s.types.filter(t=>!used.has(t)).length*35;}}return chosen;}
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

type Purchase={floor:number;kind:string;name:string;price:number;target?:string};
type Prices={rerollBase:number;rerollStep:number;rerollCurve?:number;vitaminBase:number;vitaminStep:number;consumable:number;machine:typeof machinePrices;itemMultiplier:number;itemPrices?:Record<string,number>};
const config:Prices=process.env.BALANCE_PRICE_FILE?JSON.parse(readFileSync(process.env.BALANCE_PRICE_FILE,'utf8')):{rerollBase:rerollPrice(0),rerollStep:rerollPrice(1)-rerollPrice(0),rerollCurve:rerollPrice(2)-2*rerollPrice(1)+rerollPrice(0),vitaminBase:vitaminPrice(1),vitaminStep:vitaminPrice(2)-vitaminPrice(1),consumable:upgrades.attack.price,machine:{...machinePrices},itemMultiplier:1,itemPrices:Object.fromEntries(Object.entries(heldItems).map(([name,item])=>[name,item.price]))};
const behavior=process.env.BALANCE_BEHAVIOR??'balanced';
const maxRolls=(behavior==='reroll-heavy'||behavior==='fishing')?10:behavior==='frugal'?1:4;
const maxVitamins=(behavior==='no-vitamins'||behavior==='fishing')?0:behavior==='vitamin-heavy'?4:2;
const priceOfItem=(item:HeldItem)=>config.itemPrices?.[item]??Math.round(heldItems[item].price*config.itemMultiplier);
const hashRandom=(prefix:string,little:boolean=false)=>{let counter=0;return()=>{const digest=createHash('sha256').update(prefix+counter++).digest();return(little?digest.readUInt32LE(0):digest.readUInt32BE(0))/4294967296;};};
function consumables(id:string,floor:number){const pool=Object.keys(upgrades) as UpgradeKind[];for(let i=pool.length-1;i>0;i--){const n=createHash('sha256').update(id+':consumables:'+floor+':'+i).digest().readUInt32BE(0),j=Math.floor(n/4294967296*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}return pool.slice(0,3);}
function vitaminStock(id:string,floor:number){const pool=[...statKeys],random=hashRandom(id+':vitamins:'+floor+':',true);for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}return pool.slice(0,4);}
const avg=(xs:number[])=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;
const report={phase,behavior,prices:config,engineVersion,format:FORMAT,courses:courses.length,notes:'32 frozen Johto courses; current named boss builds, same encounter and shop hash seeds across price variants. Public-information v4 battle policies. Zero start money; capture best BST, own-stat/type team selection; full recovery per floor. All 8 consumables, exact 3/4/4/4 stock sizes, category rerolls, compatible unique held items, learned moves and additive run-only vitamin points. Shops reproduce live hash seed convention, but roster/unlock selection follows this simulator capture policy. Balanced reserves 400 coins, prioritizes useful held items/TMs, then 3 consumables, up to 2 useful vitamins and at most 4 rerolls/category when gear/moves still weak. Other behaviors are sensitivity controls, not human win-rate predictions. No voluntary switching, no hidden-shop change, no next-enemy knowledge. Price overrides only apply in simulation.',stages:[] as unknown[]};
for(const stage of stages.filter(stage=>!process.env.BALANCE_STAGES||process.env.BALANCE_STAGES.split(',').includes(stage.id))){
 const climbs=[];
 for(const course of courses){
 const initial=stage.id==='collector'?['Garchomp','Gyarados','Gengar']:starters;
 const profiles=Object.fromEntries(initial.map(n=>[n,playerProfile(n,stage.iv,stage.points)]));
 if(stage.id==='collector'){profiles.Garchomp.moves=['Earthquake','Dragon Claw','Rock Slide','Swords Dance'];profiles.Gyarados.moves=['Waterfall','Ice Fang','Earthquake','Dragon Dance'];profiles.Gengar.moves=['Shadow Ball','Sludge Bomb','Thunderbolt','Dazzling Gleam'];}
 const known:Record<string,Set<string>>=Object.fromEntries(initial.map(n=>[n,new Set(profiles[n].moves)])),bonus:Record<string,Partial<StatBlock>>={},items:Record<string,string>={},bag=new Set<HeldItem>();
 let coins=0,cleared=0,earned=0,bossGimmickActivations=0,playerGimmickActivations=0;const purchases:Purchase[]=[],shops:unknown[]=[];let boosts:UpgradeKind[]=[],failedAt:Encounter|undefined;
 const attachBonuses=()=>{for(const n of Object.keys(profiles))profiles[n].runBonuses=bonus[n];};
 for(const encounter of course.encounters){
 attachBonuses();
 for(const n of Object.keys(items))if(!profiles[n]){bag.add(items[n] as HeldItem);delete items[n];}
 if(isShopFloor(encounter.floor,50)){
 const floor=encounter.floor,startCoins=coins,vitPrice=config.vitaminBase+config.vitaminStep*(floor-1),stock=consumables(course.id,floor),vit=vitaminStock(course.id,floor),reserve=400;let blocked=0;const before=purchases.length;boosts=[];
 const afford=(cost:number)=>coins>=cost+reserve;
 const buy=(kind:string,name:string,price:number,target?:string)=>{coins-=price;purchases.push({floor:floor-1,kind,name,price,target});};
 const equip=(item:HeldItem,n:string)=>{if(items[n])bag.add(items[n] as HeldItem);bag.delete(item);items[n]=item;};
 const itemTarget=(item:HeldItem)=>chooseTeam(profiles).sort((a,b)=>(itemScore(item,profiles[b],b)-(items[b]?itemScore(items[b] as HeldItem,profiles[b],b):0))-(itemScore(item,profiles[a],a)-(items[a]?itemScore(items[a] as HeldItem,profiles[a],a):0))).find(n=>itemScore(item,profiles[n],n)>(items[n]?itemScore(items[n] as HeldItem,profiles[n],n):0));
 for(const item of [...bag]){const n=itemTarget(item);if(n&&!Object.values(items).includes(item))equip(item,n);}
 const itemRound=(revision:number)=>{const offers=rollItemOffers(floor-1,hashRandom(course.id+':item-shop:'+floor+':'+(revision?'roll'+revision+':':''),true));let bought=0;for(const item of offers){if(bag.has(item)||Object.values(items).includes(item))continue;const n=itemTarget(item);if(!n)continue;const price=priceOfItem(item);if(afford(price)){equip(item,n);buy('item',item,price,n);bought++;}else blocked++;}return bought;};
 const machineCandidates=()=>machineMoves.filter(m=>Object.keys(profiles).some(n=>moveLearnsets[n].legalMoves.includes(m)&&!known[n]?.has(m)&&!profiles[n].moves.includes(m))).map(move=>({move}));
 const machineRound=(revision:number)=>{const offers=rollMachineOffers(machineCandidates(),floor-1,hashRandom(course.id+':machine-shop:'+floor+':'+(revision?'roll'+revision+':':'')));let bought=0;for(const {move} of offers){const n=chooseTeam(profiles).find(n=>moveLearnsets[n].legalMoves.includes(move)&&!known[n]?.has(move)&&!profiles[n].moves.includes(move)&&rank(move,n)>Math.min(...profiles[n].moves.map(m=>rank(m,n)))*1.1);if(!n)continue;const price=config.machine[machineRarity(move)];if(afford(price)){const slots=profiles[n].moves.map(m=>rank(m,n));profiles[n].moves[slots.indexOf(Math.min(...slots))]=move;(known[n]??=new Set()).add(move);buy('machine',move,price,n);bought++;}else blocked++;}return bought;};
 itemRound(0);machineRound(0);
 for(const kind of stock){if(kind==='specialAttack'&&!chooseTeam(profiles).some(n=>profiles[n].moves.some(m=>Showdown.Dex.moves.get(m).category==='Special')))continue;if(kind==='accuracy'&&!chooseTeam(profiles).some(n=>profiles[n].moves.some(m=>typeof Showdown.Dex.moves.get(m).accuracy==='number'&&Number(Showdown.Dex.moves.get(m).accuracy)<100)))continue;if(afford(config.consumable)){boosts.push(kind);buy('consumable',kind,config.consumable);}else blocked++;}
 let vitaminsBought=0;
 const target=(stat:typeof statKeys[number])=>chooseTeam(profiles).filter(n=>!(stat==='hp'&&Showdown.Dex.species.get(n).baseStats.hp===1)&&(!(stat==='atk'||stat==='spa')||profiles[n].moves.some(m=>Showdown.Dex.moves.get(m).category===(stat==='atk'?'Physical':'Special')))).sort((a,b)=>{const utility=(n:string)=>{const base=Showdown.Dex.species.get(n).baseStats;const same=bonus[n]?.[stat]??0;return (stat==='atk'||stat==='spa'?base[stat]:Math.max(base.atk,base.spa))-(same*.8);};return utility(b)-utility(a);})[0];
 for(const stat of [...vit].sort((a,b)=>((a==='atk'||a==='spa'||a==='spe')?0:1)-((b==='atk'||b==='spa'||b==='spe')?0:1))){if(vitaminsBought>=maxVitamins)break;const n=target(stat);if(!n)continue;if(afford(vitPrice)){(bonus[n]??={})[stat]=(bonus[n]?.[stat]??0)+(behavior==='vitamin-placebo'?0:VITAMIN_BOOST);attachBonuses();buy('vitamin',stat,vitPrice,n);vitaminsBought++;}else blocked++;}
 const gearWeak=()=>behavior==='fishing'&&!chooseTeam(profiles).some(n=>items[n]&&(items[n]===DYNAMAX_ITEM||!!megaStones[items[n]]))||chooseTeam(profiles).some(n=>!items[n]||itemScore(items[n] as HeldItem,profiles[n],n)<25);
 const movesWeak=()=>chooseTeam(profiles).some(n=>profiles[n].moves.filter(m=>{const d=Showdown.Dex.moves.get(m);return d.category!=='Status'&&d.basePower>=80;}).length<3);
 for(const kind of ['items','machines'] as const){for(let revision=1;revision<=maxRolls;revision++){const useful=kind==='items'?gearWeak():movesWeak()&&machineCandidates().length>0;if(!useful)break;const index=revision-1,price=config.rerollBase+config.rerollStep*index+(config.rerollCurve??0)*index*(index-1)/2;if(!afford(price+500)){blocked++;break;}buy('reroll',kind,price);if(kind==='items')itemRound(revision);else machineRound(revision);}}
 shops.push({floor:floor-1,startCoins,endCoins:coins,blocked,stock,vitaminOffers:vit,vitaminPrice:vitPrice,purchases:purchases.slice(before)});
 }
 attachBonuses();const log=await runBattle({teams:{p1:packTeam(chooseTeam(profiles),profiles,items),p2:encounter.enemy},seed:encounter.seed,player:policy(),opponent:policy(),upgrades:boosts});
 bossGimmickActivations+=activations(log);playerGimmickActivations+=log.publicProtocol.filter(l=>l.startsWith('|-mega|p1')||(l.startsWith('|-start|p1')&&l.includes('|Dynamax'))).length;
 for(const line of log.publicProtocol){const match=/^\|-enditem\|p1a: ([^|]+)\|([^|]+)/.exec(line);if(match&&heldItems[match[2] as HeldItem]?.consumable)delete items[match[1]];}
 if(log.winner!=='Player'){failedAt=encounter;break;}cleared=encounter.floor;coins+=encounter.reward;earned+=encounter.reward;
 const captured=Showdown.Teams.unpack(encounter.enemy)!.sort((a,b)=>Showdown.Dex.species.get(b.species).bst-Showdown.Dex.species.get(a.species).bst)[0];for(const m of captured.moves)(known[captured.species]??=new Set()).add(m);capture(encounter.enemy,profiles);
 }
 attachBonuses();climbs.push({id:course.id,cleared,coins,earned,spent:purchases.reduce((s,p)=>s+p.price,0),bossGimmickActivations,playerGimmickActivations,shops,purchases,failedFloor:failedAt?.floor,failedTrainer:failedAt?.trainer,finalParty:chooseTeam(profiles),items,bonus});
 }
 const purchased=climbs.flatMap(c=>c.purchases),visits=climbs.flatMap(c=>c.shops) as {floor:number;startCoins:number;endCoins:number;blocked:number}[];
 const categories=Object.fromEntries(['item','machine','consumable','vitamin','reroll'].map(kind=>[kind,{count:purchased.filter(p=>p.kind===kind).length,spent:purchased.filter(p=>p.kind===kind).reduce((s,p)=>s+p.price,0),perVisit:purchased.filter(p=>p.kind===kind).length/Math.max(1,visits.length)}]));
 const result={stage:stage.id,climbs,averageCleared:avg(climbs.map(c=>c.cleared)),finished:climbs.filter(c=>c.cleared===50).length,averageEarned:avg(climbs.map(c=>c.earned)),averageSpent:avg(climbs.map(c=>c.spent)),averageRemaining:avg(climbs.map(c=>c.coins)),shopVisits:visits.length,categories,checkpointWallets:Object.fromEntries([5,10,15,20,25,30,35,40,45].map(floor=>{const rows=visits.filter(v=>v.floor===floor);return[floor,{visits:rows.length,before:avg(rows.map(v=>v.startCoins)),after:avg(rows.map(v=>v.endCoins)),blocked:avg(rows.map(v=>v.blocked))}];}))};
 report.stages.push(result);console.log(JSON.stringify({...result,climbs:undefined}));
}
writeFileSync('artifacts/balance-50-'+phase+'-'+behavior+'.json',JSON.stringify(report,null,2));
