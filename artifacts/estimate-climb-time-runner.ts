import {presentationFrames} from '../src/web/battle-presentation';
import type {BattleView} from '../src/web/contracts';
import {createHash} from 'node:crypto';
import {rerollPrice,vitaminPrice,VITAMIN_BOOST} from '../src/data/shop';
import {machineRarity,machinePrices} from '../src/data/machine-rarities';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {starters,packTeam} from '../src/data/teams';
import {defaultProfile} from '../src/server/training';
import {statKeys,trainedStat,type StatBlock,type TrainingProfile} from '../src/data/training';
import {runBattle as engineRunBattle,engineVersion,FORMAT,type Seed} from '../src/battle/run';
import {towerThemes,type TowerTheme} from '../src/data/tower-themes';
import {TERA_TICKET_PRICE} from '../src/data/tera';
import {SwitchingPolicy} from '../src/battle/switch-policy';
import {TeraPolicy} from '../src/battle/gimmick-policy';
import {canEquipGimmick,megaStones,DYNAMAX_ITEM} from '../src/data/gimmicks';
import {isShopFloor,upgrades,machineMoves,type UpgradeKind} from '../src/data/shop';
import {rollItemOffers} from '../src/data/held-item-shop';
import {heldItems,type HeldItem} from '../src/data/held-items';
import {rollMachineOffers,machinePrice} from '../src/data/machine-rarities';
import {moveLearnsets} from '../src/server/move-learnsets';

const timingRows:{turns:number;playerInputs:number;animationSeconds:number}[]=[];
async function runBattle(options:Parameters<typeof engineRunBattle>[0]){
 const log=await engineRunBattle(options);
 const names=Showdown.Teams.unpack(log.teams.p1)!.map(p=>p.species);
 const before:BattleView={id:'timing',requestId:1,status:'waiting',turn:0,team:names.map(species=>({species,condition:'100/100',active:false})),opponent:null,actions:[],messages:[],winner:null,error:null,teraTickets:options.teraTickets?.p1};
 const after={...before,messages:log.publicProtocol};
 timingRows.push({turns:log.turns,playerInputs:log.decisions.filter(d=>d.side==='p1').length,animationSeconds:presentationFrames(before,after).reduce((sum,f)=>sum+f.duration,0)/1000+.55});
 return log;
}

type Encounter={floor:number;seed:Seed;enemy:string;role:string;trainer:string;reward:number;villainRank?:string};
type Course={id:string;theme:TowerTheme;organization:string;encounters:Encounter[]};
const phase=process.argv[2]??'regional-v6',perTheme=Number(process.env.BALANCE_PER_THEME??16);
if(!Number.isSafeInteger(perTheme)||perTheme<1)throw Error('Invalid per-theme sample count');
const path=process.env.BALANCE_COURSES??'artifacts/regional-simulation-courses.json';mkdirSync('artifacts',{recursive:true});
let courses:Course[];
if(existsSync(path))courses=JSON.parse(readFileSync(path,'utf8')).courses;
else{
 courses=[];const store=new TowerStore(':memory:');
 const counts=Object.fromEntries(Object.keys(towerThemes).map(theme=>[theme,0]));
 try{for(let i=0;Object.values(counts).some(n=>n<perTheme);i++){
 const owner='regional-simulation-'+i;store.ensurePlayer(owner);const first=store.start(owner,starters),id=store.battle(first).run_id;
 const theme=(store.db.prepare('SELECT theme FROM run_themes WHERE run_id=?').get(id) as {theme:TowerTheme}).theme;
 if(counts[theme]>=perTheme)continue;
 const organization=(store.db.prepare('SELECT organization FROM run_villains WHERE run_id=?').get(id) as {organization:string}).organization;
 const encounters:Encounter[]=[];
 for(let floor=1;floor<=50;floor++){let battle=first;if(floor>1){store.db.prepare("UPDATE runs SET floor=?,state='select' WHERE id=?").run(floor,id);battle=store.enter(owner,id,floor,starters);}
 const row=store.battle(battle),trainer=JSON.parse(row.boss??row.trainer??'{}'),event=row.villain_event?JSON.parse(row.villain_event):null;
 encounters.push({floor,seed:JSON.parse(row.seed),enemy:row.opponent_team,role:trainer.role??'trainer',trainer:trainer.id??'unknown',reward:row.reward,villainRank:event?.rank});
 // Every continued climb has won all earlier floors. A boss victory ends future organization events.
 if(event?.rank==='boss')store.db.prepare('UPDATE run_villain_campaigns SET defeated_battle_id=? WHERE run_id=?').run(battle,id);
 }
 courses.push({id,theme,organization,encounters});counts[theme]++;console.log('Recorded '+theme+' '+counts[theme]+'/'+perTheme);
 }}finally{store.close();}
 writeFileSync(path,JSON.stringify({schemaVersion:1,engineVersion,format:FORMAT,perTheme,courses},null,2));
}
const selected:Course[]=[];
for(const theme of Object.keys(towerThemes)){
 const rows=courses.filter(c=>c.theme===theme).slice(0,perTheme);
 if(rows.length!==perTheme)throw Error('Insufficient frozen courses for '+theme);
 selected.push(...rows);
}
courses=selected;
const finishedIds=new Set(JSON.parse(readFileSync('artifacts/simulation-regional-v6-balanced.json','utf8')).stages.find((s:{stage:string})=>s.stage==='collector').climbs.filter((c:{cleared:number})=>c.cleared===50).map((c:{id:string})=>c.id));
courses=courses.filter(c=>finishedIds.has(c.id));
if(phase==='record'){console.log('Recorded '+courses.length+' live 50-floor regional courses');process.exit(0);}
const stages=[{id:'collector',iv:31,points:66}];
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
 const type=(Showdown.Dex.items.get(item) as {onBasePower?:unknown}).onBasePower ? attacks.some(m=>d.includes(({Fire:'불꽃',Water:'물',Grass:'풀',Electric:'전기',Ice:'얼음',Normal:'노말',Ground:'땅',Flying:'비행',Psychic:'에스퍼',Fighting:'격투',Dark:'악',Dragon:'드래곤',Steel:'강철',Poison:'독',Rock:'바위',Bug:'벌레',Ghost:'고스트',Fairy:'페어리'} as Record<string,string>)[m.type]+' 타입')):false;
 return type?20:item==='Wide Lens'?8:0;}
const playerPolicy=()=>new SwitchingPolicy();
const opponentPolicy=()=>process.env.BALANCE_OPPONENT==='v5'?new TeraPolicy():new SwitchingPolicy();
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
const report={phase,behavior,prices:config,engineVersion,format:FORMAT,courses:courses.length,opponentAI:process.env.BALANCE_OPPONENT??'v6',playerAI:'v6',perTheme,notes:'Stratified equal samples of actual randomized regional runs; frozen live enemy teams, IVs, seeds, trainers, rewards and organization assignments. Every continued run assumes earlier wins, so recording ends villain events after the first boss. Both sides use public-information policies; player v6, opponent selected v6/v5. Initial player tera ticket 1, opponent 1 per battle; consumes actual tera protocol, buys 900-coin ticket when empty after useful gear/TMs and before consumables, preserving 400 reserve. Own-stat/type team selection, best-BST capture, six-member collection approximation, full recovery per floor, primary-type tera defaults. Current price and shop hash conventions, exact stock sizes, at most 2 vitamins and 4 rerolls/category. No future enemy knowledge. Simulated strategies, not human win rates; regional sampling intentionally differs from random population weighting.', stages:[] as unknown[]};
for(const stage of stages.filter(stage=>!process.env.BALANCE_STAGES||process.env.BALANCE_STAGES.split(',').includes(stage.id))){
 let timingStart=0;
 const climbs:{timing:{turns:number;playerInputs:number;animationSeconds:number};id:string;theme:TowerTheme;organization:string;battles:number;playerTera:number;enemyTera:number;playerSwitches:number;enemySwitches:number;teraTickets:number;villainBossWins:number;failedRole?:string;failedVillainRank?:string;cleared:number;coins:number;earned:number;spent:number;bossGimmickActivations:number;playerGimmickActivations:number;shops:unknown[];purchases:Purchase[];failedFloor?:number;failedTrainer?:string;finalParty:string[];items:Record<string,string>;bonus:Record<string,Partial<StatBlock>>}[]=[];
 for(const course of courses){
 timingStart=timingRows.length;
 const initial=stage.id==='collector'?['Garchomp','Gyarados','Gengar']:starters;
 const profiles=Object.fromEntries(initial.map(n=>[n,playerProfile(n,stage.iv,stage.points)]));
 if(stage.id==='collector'){profiles.Garchomp.moves=['Earthquake','Dragon Claw','Rock Slide','Swords Dance'];profiles.Gyarados.moves=['Waterfall','Ice Fang','Earthquake','Dragon Dance'];profiles.Gengar.moves=['Shadow Ball','Sludge Bomb','Thunderbolt','Dazzling Gleam'];}
 const known:Record<string,Set<string>>=Object.fromEntries(initial.map(n=>[n,new Set(profiles[n].moves)])),bonus:Record<string,Partial<StatBlock>>={},items:Record<string,string>={},bag=new Set<HeldItem>();
 let teraTickets=1,playerTera=0,enemyTera=0,playerSwitches=0,enemySwitches=0,battles=0,villainBossWins=0;
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
 if(teraTickets===0 && afford(TERA_TICKET_PRICE)){buy('tera','tera-ticket',TERA_TICKET_PRICE);teraTickets++;}
 for(const kind of stock){if(kind==='specialAttack'&&!chooseTeam(profiles).some(n=>profiles[n].moves.some(m=>Showdown.Dex.moves.get(m).category==='Special')))continue;if(kind==='accuracy'&&!chooseTeam(profiles).some(n=>profiles[n].moves.some(m=>typeof Showdown.Dex.moves.get(m).accuracy==='number'&&Number(Showdown.Dex.moves.get(m).accuracy)<100)))continue;if(afford(config.consumable)){boosts.push(kind);buy('consumable',kind,config.consumable);}else blocked++;}
 let vitaminsBought=0;
 const target=(stat:typeof statKeys[number])=>chooseTeam(profiles).filter(n=>!(stat==='hp'&&Showdown.Dex.species.get(n).baseStats.hp===1)&&(!(stat==='atk'||stat==='spa')||profiles[n].moves.some(m=>Showdown.Dex.moves.get(m).category===(stat==='atk'?'Physical':'Special')))).sort((a,b)=>{const utility=(n:string)=>{const base=Showdown.Dex.species.get(n).baseStats;const same=bonus[n]?.[stat]??0;return (stat==='atk'||stat==='spa'?base[stat]:Math.max(base.atk,base.spa))-(same*.8);};return utility(b)-utility(a);})[0];
 for(const stat of [...vit].sort((a,b)=>((a==='atk'||a==='spa'||a==='spe')?0:1)-((b==='atk'||b==='spa'||b==='spe')?0:1))){if(vitaminsBought>=maxVitamins)break;const n=target(stat);if(!n)continue;if(afford(vitPrice)){(bonus[n]??={})[stat]=(bonus[n]?.[stat]??0)+(behavior==='vitamin-placebo'?0:VITAMIN_BOOST);attachBonuses();buy('vitamin',stat,vitPrice,n);vitaminsBought++;}else blocked++;}
 const gearWeak=()=>behavior==='fishing'&&!chooseTeam(profiles).some(n=>items[n]&&(items[n]===DYNAMAX_ITEM||!!megaStones[items[n]]))||chooseTeam(profiles).some(n=>!items[n]||itemScore(items[n] as HeldItem,profiles[n],n)<25);
 const movesWeak=()=>chooseTeam(profiles).some(n=>profiles[n].moves.filter(m=>{const d=Showdown.Dex.moves.get(m);return d.category!=='Status'&&d.basePower>=80;}).length<3);
 for(const kind of ['items','machines'] as const){for(let revision=1;revision<=maxRolls;revision++){const useful=kind==='items'?gearWeak():movesWeak()&&machineCandidates().length>0;if(!useful)break;const index=revision-1,price=config.rerollBase+config.rerollStep*index+(config.rerollCurve??0)*index*(index-1)/2;if(!afford(price+500)){blocked++;break;}buy('reroll',kind,price);if(kind==='items')itemRound(revision);else machineRound(revision);}}
 shops.push({floor:floor-1,startCoins,endCoins:coins,blocked,stock,vitaminOffers:vit,vitaminPrice:vitPrice,purchases:purchases.slice(before)});
 }
 attachBonuses();const log=await runBattle({teams:{p1:packTeam(chooseTeam(profiles),profiles,items),p2:encounter.enemy},seed:encounter.seed,player:playerPolicy(),opponent:opponentPolicy(),upgrades:boosts,teraTickets:{p1:teraTickets,p2:1}});
 battles++;
 const usedTera=log.publicProtocol.filter(l=>l.startsWith('|-terastallize|p1')).length;
 teraTickets-=usedTera;playerTera+=usedTera;enemyTera+=log.publicProtocol.filter(l=>l.startsWith('|-terastallize|p2')).length;
 for(const d of log.decisions){if(d.action.startsWith('switch ') && d.observation.legalActions.some(a=>a.command.startsWith('move '))){if(d.side==='p1')playerSwitches++;else enemySwitches++;}}
 if(teraTickets<0)throw Error('Negative tera balance');
 bossGimmickActivations+=activations(log);playerGimmickActivations+=log.publicProtocol.filter(l=>l.startsWith('|-mega|p1')||(l.startsWith('|-start|p1')&&l.includes('|Dynamax'))).length;
 for(const line of log.publicProtocol){const match=/^\|-enditem\|p1a: ([^|]+)\|([^|]+)/.exec(line);if(match&&heldItems[match[2] as HeldItem]?.consumable)delete items[match[1]];}
 if(log.winner!=='Player'){failedAt=encounter;break;}if(encounter.villainRank==='boss')villainBossWins++;cleared=encounter.floor;coins+=encounter.reward;earned+=encounter.reward;
 const captured=Showdown.Teams.unpack(encounter.enemy)!.sort((a,b)=>Showdown.Dex.species.get(b.species).bst-Showdown.Dex.species.get(a.species).bst)[0];for(const m of captured.moves)(known[captured.species]??=new Set()).add(m);capture(encounter.enemy,profiles);
 }
 attachBonuses();climbs.push({timing:{turns:timingRows.slice(timingStart).reduce((sum,r)=>sum+r.turns,0),playerInputs:timingRows.slice(timingStart).reduce((sum,r)=>sum+r.playerInputs,0),animationSeconds:timingRows.slice(timingStart).reduce((sum,r)=>sum+r.animationSeconds,0)},id:course.id,theme:course.theme,organization:course.organization,battles,playerTera,enemyTera,playerSwitches,enemySwitches,teraTickets,villainBossWins,failedRole:failedAt?.role,failedVillainRank:failedAt?.villainRank,cleared,coins,earned,spent:purchases.reduce((s,p)=>s+p.price,0),bossGimmickActivations,playerGimmickActivations,shops,purchases,failedFloor:failedAt?.floor,failedTrainer:failedAt?.trainer,finalParty:chooseTeam(profiles),items,bonus});
 }
 const purchased=climbs.flatMap(c=>c.purchases),visits=climbs.flatMap(c=>c.shops) as {floor:number;startCoins:number;endCoins:number;blocked:number}[];
 const categories=Object.fromEntries(['item','machine','consumable','vitamin','reroll','tera'].map(kind=>[kind,{count:purchased.filter(p=>p.kind===kind).length,spent:purchased.filter(p=>p.kind===kind).reduce((s,p)=>s+p.price,0),perVisit:purchased.filter(p=>p.kind===kind).length/Math.max(1,visits.length)}]));
 const byTheme=Object.fromEntries(Object.keys(towerThemes).map(theme=>{const rows=climbs.filter(c=>c.theme===theme);return [theme,{samples:rows.length,averageCleared:avg(rows.map(c=>c.cleared)),finished:rows.filter(c=>c.cleared===50).length,failures:Object.fromEntries([...new Set(rows.map(c=>c.failedFloor).filter(f=>f!==undefined))].sort((a,b)=>a!-b!).map(f=>[f,rows.filter(c=>c.failedFloor===f).length]))}];}));
 const result={stage:stage.id,byTheme,battles:climbs.reduce((sum,c)=>sum+c.battles,0),playerTera:climbs.reduce((sum,c)=>sum+c.playerTera,0),enemyTera:climbs.reduce((sum,c)=>sum+c.enemyTera,0),playerSwitches:climbs.reduce((sum,c)=>sum+c.playerSwitches,0),enemySwitches:climbs.reduce((sum,c)=>sum+c.enemySwitches,0),villainBossWins:climbs.reduce((sum,c)=>sum+c.villainBossWins,0),climbs,averageCleared:avg(climbs.map(c=>c.cleared)),finished:climbs.filter(c=>c.cleared===50).length,averageEarned:avg(climbs.map(c=>c.earned)),averageSpent:avg(climbs.map(c=>c.spent)),averageRemaining:avg(climbs.map(c=>c.coins)),shopVisits:visits.length,categories,checkpointWallets:Object.fromEntries([5,10,15,20,25,30,35,40,45].map(floor=>{const rows=visits.filter(v=>v.floor===floor);return[floor,{visits:rows.length,before:avg(rows.map(v=>v.startCoins)),after:avg(rows.map(v=>v.endCoins)),blocked:avg(rows.map(v=>v.blocked))}];}))};
 report.stages.push(result);console.log(JSON.stringify({...result,climbs:undefined}));
}
writeFileSync('artifacts/climb-time-samples.json',JSON.stringify(report,null,2));
