import {DamageAwareSupportPlayerPolicy} from '../src/battle/damage-aware-support-player-policy';
import {AblationSupportPlayerPolicy,type SupportChange} from '../src/battle/ablation-support-player-policy';
import {SupportPlayerPolicy} from '../src/battle/support-player-policy';
import {MeasuredSupportPlayerPolicy} from '../src/battle/measured-support-player-policy';
import {CompositionPolicy} from '../src/battle/composition-policy';
import {evaluateTeam,selectCompositionTeam,selectCompositionMoves,recruitForComposition} from '../src/battle/team-composition';
import {isBattleRule,allowsGimmick,allowsRuleItem,type BattleRule} from '../src/data/run-rules';
import type {BattleItemBag} from '../src/data/battle-items';
import {createHash} from 'node:crypto';
import {SHOP_REROLL_LIMIT,rerollPrice,vitaminPrice,VITAMIN_BOOST} from '../src/data/shop';
import {machineRarity,machinePrices} from '../src/data/machine-rarities';
import {appendFileSync,existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {starters,packTeam} from '../src/data/teams';
import {defaultProfile} from '../src/server/training';
import {statKeys,trainedStat,type StatBlock,type TrainingProfile} from '../src/data/training';
import {runBattle,engineVersion,FORMAT,type Seed} from '../src/battle/run';
import {towerThemes,type TowerTheme} from '../src/data/tower-themes';
import {TERA_TICKET_PRICE} from '../src/data/tera';
import {SwitchingPolicy,CautiousSwitchingPolicy} from '../src/battle/switch-policy';
import {TeraPolicy} from '../src/battle/gimmick-policy';
import {canEquipGimmick,megaStones,DYNAMAX_ITEM} from '../src/data/gimmicks';
import {isShopFloor,upgrades,machineMoves,type UpgradeKind} from '../src/data/shop';
import {rollItemOffers} from '../src/data/held-item-shop';
import {heldItems,type HeldItem} from '../src/data/held-items';
import {rollMachineOffers,machinePrice} from '../src/data/machine-rarities';
import {moveLearnsets} from '../src/server/move-learnsets';
type Encounter={floor:number;seed:Seed;enemy:string;role:string;trainer:string;reward:number;villainRank?:string;enemyTeraTickets?:number};
type Course={id:string;theme:TowerTheme;organization:string;encounters:Encounter[]};
const ruleValue=process.env.BALANCE_RULE??'chaos';
if(!isBattleRule(ruleValue))throw Error('Invalid BALANCE_RULE');
const rule:BattleRule=ruleValue,hasTera=allowsGimmick(rule,'terastallize');
const totalFloors=Number(process.env.BALANCE_FLOORS??50);
if(![50,100].includes(totalFloors))throw Error('Expected 50 or 100 floors');
const phase=process.argv[2]??'regional-v6',perTheme=Number(process.env.BALANCE_PER_THEME??16);
if(!Number.isSafeInteger(perTheme)||perTheme<1)throw Error('Invalid per-theme sample count');
const path=process.env.BALANCE_COURSES??'artifacts/experiments/balance/regional-simulation-courses.json';mkdirSync('artifacts',{recursive:true});
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
 for(let floor=1;floor<=totalFloors;floor++){let battle=first;if(floor>1){store.db.prepare("UPDATE runs SET floor=?,state='select' WHERE id=?").run(floor,id);battle=store.enter(owner,id,floor,starters);}
 const row=store.battle(battle),trainer=JSON.parse(row.boss??row.trainer??'{}'),event=row.villain_event?JSON.parse(row.villain_event):null;
 encounters.push({floor,seed:JSON.parse(row.seed),enemy:row.opponent_team,role:trainer.role??'trainer',trainer:trainer.id??'unknown',reward:row.reward,villainRank:event?.rank,enemyTeraTickets:JSON.parse(row.tera_tickets).p2});
 // Every continued climb has won all earlier floors. A boss victory ends future organization events.
 if(event?.rank==='boss')store.db.prepare('UPDATE run_villain_campaigns SET defeated_battle_id=? WHERE run_id=?').run(battle,id);
 }
 courses.push({id,theme,organization,encounters});counts[theme]++;console.log('Recorded '+theme+' '+counts[theme]+'/'+perTheme);
 }}finally{store.close();}
 writeFileSync(path,JSON.stringify({schemaVersion:1,engineVersion,format:FORMAT,perTheme,totalFloors,courses},null,2));
}
const selected:Course[]=[];
for(const theme of Object.keys(towerThemes)){
 const rows=courses.filter(c=>c.theme===theme).slice(0,perTheme);
 if(rows.length!==perTheme)throw Error('Insufficient frozen courses for '+theme);
 selected.push(...rows);
}
courses=selected;
if(courses.some(c=>c.encounters.length!==totalFloors || c.encounters.some((e,i)=>e.floor!==i+1)))throw Error('Frozen course length does not match BALANCE_FLOORS');
if(phase==='record'){console.log('Recorded '+courses.length+' live regional courses');process.exit(0);}
type SimulationCase={id:string;iv:number;points:number;label?:string;category?:string;team?:string[];moves?:Record<string,string[]>;profiles?:Record<string,Partial<TrainingProfile>>;recruitment?:'fixed'|'adaptive'};
const composition=process.env.BALANCE_COMPOSITION??'legacy';if(!['legacy','synergy'].includes(composition))throw Error('Invalid composition strategy');
const playerMode=process.env.BALANCE_PLAYER??'v8';if(!['v9','observed'].includes(playerMode))throw Error('Unknown player');const supportPolicy=true;
const stages:SimulationCase[]=process.env.BALANCE_CASES?JSON.parse(readFileSync(process.env.BALANCE_CASES,'utf8')):[{id:'fresh',iv:0,points:0},{id:'mid',iv:15,points:33},{id:'trained',iv:31,points:66},{id:'collector',iv:31,points:66}];
function playerProfile(name:string,iv:number,points:number){
 const p=defaultProfile(name),base=Showdown.Dex.species.get(name).baseStats;
 p.ivs=Object.fromEntries(statKeys.map(k=>[k,iv])) as StatBlock;
 p.evs[base.atk>=base.spa?'atk':'spa']=Math.min(32,Math.ceil(points*.48));p.evs.spe=Math.min(32,Math.floor(points*.32));p.evs.hp=points-Object.values(p.evs).reduce((a,b)=>a+b,0);
 if(points===66)p.nature=base.atk>=base.spa?'Adamant':'Modest';return p;
}
function rank(move:string,name:string){const m=Showdown.Dex.moves.get(move),s=Showdown.Dex.species.get(name);return m.category==='Status'?15:(m.basePower||40)*(s.types.includes(m.type)?1.5:1)*(m.category==='Physical'?s.baseStats.atk:s.baseStats.spa)*(m.accuracy===true?1:m.accuracy/100)*(m.flags.charge?.55:1)*(m.self?.boosts?.spa&&m.self.boosts.spa<0?.8:1);}
function chooseTeam(profiles:Record<string,TrainingProfile>){if(composition==='synergy')return selectCompositionTeam(profiles);const chosen:string[]=[];while(chosen.length<3){const used=new Set(chosen.flatMap(n=>Showdown.Dex.species.get(n).types));chosen.push(Object.keys(profiles).filter(n=>!chosen.includes(n)).sort((a,b)=>score(b)-score(a))[0]);function score(n:string){const s=Showdown.Dex.species.get(n),p=profiles[n],stats=Object.fromEntries(statKeys.map(k=>[k,trainedStat(s.baseStats[k],p.ivs[k],p.evs[k]+(p.runBonuses?.[k]??0),k,p.nature)]));return stats.hp+stats.def+stats.spd+stats.spe+Math.max(stats.atk,stats.spa)*1.4+s.types.filter(t=>!used.has(t)).length*35;}}return chosen;}
function capture(enemy:string,profiles:Record<string,TrainingProfile>){const selected=Showdown.Teams.unpack(enemy)!.sort((a,b)=>Showdown.Dex.species.get(b.species).bst-Showdown.Dex.species.get(a.species).bst)[0];const p=profiles[selected.species]??playerProfile(selected.species,0,0);for(const k of statKeys)p.ivs[k]=Math.max(p.ivs[k],selected.ivs?.[k]??31);p.moves=[...new Set([...p.moves,...selected.moves])].sort((a,b)=>rank(b,selected.species)-rank(a,selected.species)).slice(0,4);profiles[selected.species]=p;if(Object.keys(profiles).length>6){const weak=Object.keys(profiles).filter(n=>n!==selected.species).sort((a,b)=>Showdown.Dex.species.get(a).bst-Showdown.Dex.species.get(b).bst)[0];delete profiles[weak];}}
function itemScore(item:HeldItem,p:TrainingProfile,n:string){if(!canEquipGimmick(n,item))return 0;if(item===DYNAMAX_ITEM)return 40;if(megaStones[item])return 45;const attacks=p.moves.map(m=>Showdown.Dex.moves.get(m)).filter(m=>m.category!=='Status');const hasStatus=attacks.length<p.moves.length;const d=heldItems[item].description;
 if(item==='Leftovers'||item==='Sitrus Berry')return 30;
 if(item==='Light Clay')return composition==='synergy'&&p.moves.some(m=>['reflect','lightscreen','auroraveil'].includes(Showdown.toID(m)))?35:0;
 if(item==='Focus Sash'||item==='Heavy-Duty Boots'||item==='Eviolite')return 0;
 if(item==='Assault Vest')return hasStatus?0:25;
 if(item.startsWith('Choice'))return hasStatus?0:(item==='Choice Band'?attacks.filter(m=>m.category==='Physical').length: item==='Choice Specs'?attacks.filter(m=>m.category==='Special').length:3)*10;
 if(item==='Life Orb')return 35;if(item==='Expert Belt'||item==='Rocky Helmet')return 20;
 if(item==='Muscle Band')return attacks.filter(m=>m.category==='Physical').length*5;if(item==='Wise Glasses')return attacks.filter(m=>m.category==='Special').length*5;
 const type=(Showdown.Dex.items.get(item) as {onBasePower?:unknown}).onBasePower ? attacks.some(m=>d.includes(({Fire:'불꽃',Water:'물',Grass:'풀',Electric:'전기',Ice:'얼음',Normal:'노말',Ground:'땅',Flying:'비행',Psychic:'에스퍼',Fighting:'격투',Dark:'악',Dragon:'드래곤',Steel:'강철',Poison:'독',Rock:'바위',Bug:'벌레',Ghost:'고스트',Fairy:'페어리'} as Record<string,string>)[m.type]+' 타입')):false;
 return type?20:item==='Wide Lens'?8:0;}
const playerPolicy=()=>playerMode==='v9'?new SupportPlayerPolicy():new DamageAwareSupportPlayerPolicy();
const opponentPolicy=()=>process.env.BALANCE_OPPONENT==='v5'?new TeraPolicy():totalFloors===100?new CautiousSwitchingPolicy():new SwitchingPolicy();
const activations=(log:{publicProtocol:string[]})=>log.publicProtocol.filter(l=>l.startsWith('|-mega|p2') || (l.startsWith('|-start|p2') && l.includes('|Dynamax'))).length;

type Purchase={floor:number;kind:string;name:string;price:number;target?:string};
type Prices={rerollBase:number;rerollStep:number;rerollCurve?:number;vitaminBase:number;vitaminStep:number;consumable:number;machine:typeof machinePrices;itemMultiplier:number;itemPrices?:Record<string,number>};
const config:Prices=process.env.BALANCE_PRICE_FILE?JSON.parse(readFileSync(process.env.BALANCE_PRICE_FILE,'utf8')):{rerollBase:rerollPrice(0),rerollStep:rerollPrice(1)-rerollPrice(0),rerollCurve:rerollPrice(2)-2*rerollPrice(1)+rerollPrice(0),vitaminBase:vitaminPrice(1),vitaminStep:vitaminPrice(2)-vitaminPrice(1),consumable:upgrades.attack.price,machine:{...machinePrices},itemMultiplier:1,itemPrices:Object.fromEntries(Object.entries(heldItems).map(([name,item])=>[name,item.price]))};
const behavior=process.env.BALANCE_BEHAVIOR??'balanced';
const preferredRolls=(behavior==='reroll-heavy'||behavior==='fishing')?10:behavior==='frugal'?1:4;
const maxVitamins=(behavior==='no-vitamins'||behavior==='fishing')?0:behavior==='vitamin-heavy'?4:2;
const priceOfItem=(item:HeldItem)=>config.itemPrices?.[item]??Math.round(heldItems[item].price*config.itemMultiplier);
const hashRandom=(prefix:string,little:boolean=false)=>{let counter=0;return()=>{const digest=createHash('sha256').update(prefix+counter++).digest();return(little?digest.readUInt32LE(0):digest.readUInt32BE(0))/4294967296;};};
function consumables(id:string,floor:number){const pool=Object.keys(upgrades) as UpgradeKind[];for(let i=pool.length-1;i>0;i--){const n=createHash('sha256').update(id+':consumables:'+floor+':'+i).digest().readUInt32BE(0),j=Math.floor(n/4294967296*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}return pool.slice(0,3);}
function vitaminStock(id:string,floor:number){const pool=[...statKeys],random=hashRandom(id+':vitamins:'+floor+':',true);for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}return pool.slice(0,4);}
const avg=(xs:number[])=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;
const maxRolls=Math.min(preferredRolls,SHOP_REROLL_LIMIT);
const report={phase,rule,composition,caseDefinitions:stages,caseFile:process.env.BALANCE_CASES??null,sourceCourseFile:path,sourceCourseHash:createHash('sha256').update(readFileSync(path)).digest('hex'),behavior,prices:config,engineVersion,format:FORMAT,courses:courses.length,opponentAI:process.env.BALANCE_OPPONENT??(totalFloors===100?'v7':'v6'),playerAI:playerMode+'-experimental',perTheme,totalFloors,notes:'Stratified equal samples of actual randomized regional runs; frozen live enemy teams, IVs, seeds, trainers, rewards and organization assignments. Every continued run assumes earlier wins, so recording ends villain events after the first boss. Both sides use public-information policies; versions are specified by playerAI/opponentAI. Mode comparison: same frozen courses and seeds, forbidden enemy gimmick tools removed exactly as in the live store, forbidden shop tools excluded before the rarity draw. Only tera-enabled rules start with one player tera ticket and frozen opponent tickets; consumes actual tera protocol, buys current-price ticket when empty after useful gear/TMs and before consumables, preserving 400 reserve. Selection and recruitment strategy specified by composition: legacy stat/type selection and BST capture, or synergy team utility with resistance, coverage and supported roles. Six-member collection approximation, full recovery per floor, primary-type tera defaults. Current price and shop hash conventions, exact stock sizes, at most 2 vitamins and 1 free reroll/category; consumables carried in a bag and used before attacks, with native rank effects rather than old five-floor buffs; shops every ten floors for 100-floor runs, owned/incompatible tools excluded with unfilled sold-out rarity draws. No future enemy knowledge. Simulated strategies, not human win rates; regional sampling intentionally differs from random population weighting.', stages:[] as unknown[]};
const dataset=process.env.BALANCE_DATASET;if(dataset)writeFileSync(dataset,'');
for(const stage of stages.filter(stage=>!process.env.BALANCE_STAGES||process.env.BALANCE_STAGES.split(',').includes(stage.id))){
 const climbs:{id:string;theme:TowerTheme;organization:string;battles:number;playerTera:number;enemyTera:number;playerSwitches:number;enemySwitches:number;teraTickets:number;villainBossWins:number;failedRole?:string;failedVillainRank?:string;cleared:number;coins:number;earned:number;spent:number;bossGimmickActivations:number;playerGimmickActivations:number;shops:unknown[];purchases:Purchase[];failedFloor?:number;failedTrainer?:string;finalParty:string[];items:Record<string,string>;bonus:Record<string,Partial<StatBlock>>}[]=[];
 for(const course of courses){
 const initial=stage.team??(stage.id==='collector'?['Garchomp','Gyarados','Gengar']:starters);
 if(initial.length!==3||new Set(initial).size!==3)throw Error('Expected distinct triple '+stage.id);
 const profiles=Object.fromEntries(initial.map(n=>[n,playerProfile(n,stage.iv,stage.points)]));
 if(stage.id==='collector'){profiles.Garchomp.moves=['Earthquake','Dragon Claw','Rock Slide','Swords Dance'];profiles.Gyarados.moves=['Waterfall','Ice Fang','Earthquake','Dragon Dance'];profiles.Gengar.moves=['Shadow Ball','Sludge Bomb','Thunderbolt','Dazzling Gleam'];}
 if(stage.profiles)for(const [name,overrides] of Object.entries(stage.profiles)){if(!profiles[name])throw Error('Unknown profile override');Object.assign(profiles[name],structuredClone(overrides));}
 if(stage.moves)for(const [name,moves] of Object.entries(stage.moves)){if(!profiles[name]||moves.length!==4||moves.some(move=>!moveLearnsets[name].legalMoves.includes(move)))throw Error('Invalid prepared moves '+stage.id+' '+name);profiles[name].moves=[...moves];}
 const recruitments:unknown[]=[];
 const known:Record<string,Set<string>>=Object.fromEntries(initial.map(n=>[n,new Set(profiles[n].moves)])),bonus:Record<string,Partial<StatBlock>>={},items:Record<string,string>={},bag=new Set<HeldItem>();
 let teraTickets=hasTera?1:0,playerTera=0,enemyTera=0,playerSwitches=0,enemySwitches=0,battles=0,villainBossWins=0;
 const supportMoves:Record<string,number>={};
 let coins=0,cleared=0,earned=0,bossGimmickActivations=0,playerGimmickActivations=0;const purchases:Purchase[]=[],shops:unknown[]=[];const battleItems:BattleItemBag={};let failedAt:Encounter|undefined;
 const attachBonuses=()=>{for(const n of Object.keys(profiles))profiles[n].runBonuses=bonus[n];};
 for(const encounter of course.encounters){
 attachBonuses();
 for(const n of Object.keys(items))if(!profiles[n]){bag.add(items[n] as HeldItem);delete items[n];}
 if(isShopFloor(encounter.floor,totalFloors)){
 const floor=encounter.floor,startCoins=coins,vitPrice=config.vitaminBase+config.vitaminStep*(floor-1),stock=consumables(course.id,floor),vit=vitaminStock(course.id,floor),reserve=400;let blocked=0;const before=purchases.length;
 const afford=(cost:number)=>coins>=cost+reserve;
 const buy=(kind:string,name:string,price:number,target?:string)=>{coins-=price;purchases.push({floor:floor-1,kind,name,price,target});};
 const equip=(item:HeldItem,n:string)=>{if(items[n])bag.add(items[n] as HeldItem);bag.delete(item);items[n]=item;};
 const itemTarget=(item:HeldItem)=>chooseTeam(profiles).sort((a,b)=>(itemScore(item,profiles[b],b)-(items[b]?itemScore(items[b] as HeldItem,profiles[b],b):0))-(itemScore(item,profiles[a],a)-(items[a]?itemScore(items[a] as HeldItem,profiles[a],a):0))).find(n=>itemScore(item,profiles[n],n)>(items[n]?itemScore(items[n] as HeldItem,profiles[n],n):0));
 for(const item of [...bag]){const n=itemTarget(item);if(n&&!Object.values(items).includes(item))equip(item,n);}
 const itemRound=(revision:number)=>{const offers=rollItemOffers(floor-1,hashRandom(course.id+':item-shop:'+floor+':'+(revision?'roll'+revision+':':''),true),item=>allowsRuleItem(rule,item)&&!bag.has(item)&&!Object.values(items).includes(item)&&Object.keys(profiles).some(n=>canEquipGimmick(n,item)));let bought=0;for(const item of offers){if(bag.has(item)||Object.values(items).includes(item))continue;const n=itemTarget(item);if(!n)continue;const price=priceOfItem(item);if(afford(price)){equip(item,n);buy('item',item,price,n);bought++;}else blocked++;}return bought;};
 const machineCandidates=()=>machineMoves.filter(m=>Object.keys(profiles).some(n=>moveLearnsets[n].legalMoves.includes(m)&&!known[n]?.has(m)&&!profiles[n].moves.includes(m))).map(move=>({move}));
 const machineRound=(revision:number)=>{const offers=rollMachineOffers(machineCandidates(),floor-1,hashRandom(course.id+':machine-shop:'+floor+':'+(revision?'roll'+revision+':':'')));let bought=0;for(const {move} of offers){const n=chooseTeam(profiles).find(n=>{if(!moveLearnsets[n].legalMoves.includes(move)||known[n]?.has(move)||profiles[n].moves.includes(move))return false;if(composition==='legacy')return rank(move,n)>Math.min(...profiles[n].moves.map(m=>rank(m,n)))*1.1;const next={...profiles,[n]:{...profiles[n],moves:selectCompositionMoves(n,profiles[n],[...profiles[n].moves,move],profiles)}};return next[n].moves.includes(move)&&evaluateTeam(chooseTeam(next),next)>evaluateTeam(chooseTeam(profiles),profiles)+.1;});if(!n)continue;const price=config.machine[machineRarity(move)];if(afford(price)){if(composition==='synergy')profiles[n].moves=selectCompositionMoves(n,profiles[n],[...profiles[n].moves,move],profiles);else{const slots=profiles[n].moves.map(m=>rank(m,n));profiles[n].moves[slots.indexOf(Math.min(...slots))]=move;}(known[n]??=new Set()).add(move);buy('machine',move,price,n);bought++;}else blocked++;}return bought;};
 itemRound(0);machineRound(0);
 if(hasTera && teraTickets===0 && afford(TERA_TICKET_PRICE)){buy('tera','tera-ticket',TERA_TICKET_PRICE);teraTickets++;}
 for(const kind of stock){if(kind==='specialAttack'&&!chooseTeam(profiles).some(n=>profiles[n].moves.some(m=>Showdown.Dex.moves.get(m).category==='Special')))continue;if(kind==='accuracy'&&!chooseTeam(profiles).some(n=>profiles[n].moves.some(m=>typeof Showdown.Dex.moves.get(m).accuracy==='number'&&Number(Showdown.Dex.moves.get(m).accuracy)<100)))continue;if(afford(config.consumable)){battleItems[kind]=(battleItems[kind]??0)+1;buy('consumable',kind,config.consumable);}else blocked++;}
 let vitaminsBought=0;
 const target=(stat:typeof statKeys[number])=>chooseTeam(profiles).filter(n=>!(stat==='hp'&&Showdown.Dex.species.get(n).baseStats.hp===1)&&(!(stat==='atk'||stat==='spa')||profiles[n].moves.some(m=>Showdown.Dex.moves.get(m).category===(stat==='atk'?'Physical':'Special')))).sort((a,b)=>{const utility=(n:string)=>{const base=Showdown.Dex.species.get(n).baseStats;const same=bonus[n]?.[stat]??0;return (stat==='atk'||stat==='spa'?base[stat]:Math.max(base.atk,base.spa))-(same*.8);};return utility(b)-utility(a);})[0];
 for(const stat of [...vit].sort((a,b)=>((a==='atk'||a==='spa'||a==='spe')?0:1)-((b==='atk'||b==='spa'||b==='spe')?0:1))){if(vitaminsBought>=maxVitamins)break;const n=target(stat);if(!n)continue;if(afford(vitPrice)){(bonus[n]??={})[stat]=(bonus[n]?.[stat]??0)+(behavior==='vitamin-placebo'?0:VITAMIN_BOOST);attachBonuses();buy('vitamin',stat,vitPrice,n);vitaminsBought++;}else blocked++;}
 const gearWeak=()=>behavior==='fishing'&&!chooseTeam(profiles).some(n=>items[n]&&(items[n]===DYNAMAX_ITEM||!!megaStones[items[n]]))||chooseTeam(profiles).some(n=>!items[n]||itemScore(items[n] as HeldItem,profiles[n],n)<25);
 const movesWeak=()=>chooseTeam(profiles).some(n=>profiles[n].moves.filter(m=>{const d=Showdown.Dex.moves.get(m);return d.category!=='Status'&&d.basePower>=80;}).length<3);
 for(const kind of ['items','machines'] as const){for(let revision=1;revision<=maxRolls;revision++){const useful=kind==='items'?gearWeak():movesWeak()&&machineCandidates().length>0;if(!useful)break;const index=revision-1,price=config.rerollBase+config.rerollStep*index+(config.rerollCurve??0)*index*(index-1)/2;if(price>0&&!afford(price+500)){blocked++;break;}buy('reroll',kind,price);if(kind==='items')itemRound(revision);else machineRound(revision);}}
 shops.push({floor:floor-1,startCoins,endCoins:coins,blocked,stock,vitaminOffers:vit,vitaminPrice:vitPrice,purchases:purchases.slice(before)});
 }
 const policy=playerPolicy();
 const useItems={switchingInformation:policy.switchingInformation,uncertainSwitchingInformation:policy instanceof CautiousSwitchingPolicy,choose:(o:Parameters<typeof policy.choose>[0])=>{const action=policy.choose(o);if(!action.startsWith('move '))return action;const own=o.ownTeam.find(p=>p.active),name=own?.details.split(',')[0]??'',physical=profiles[name]?.moves.some(m=>Showdown.Dex.moves.get(m).category==='Physical'),special=profiles[name]?.moves.some(m=>Showdown.Dex.moves.get(m).category==='Special');const item=o.legalActions.find(a=>a.command.startsWith('item ')&&((a.command==='item attack'&&physical)||(a.command==='item specialAttack'&&special)||!['item attack','item specialAttack'].includes(a.command)));return item?.command??action;}};
 const enemySets=Showdown.Teams.unpack(encounter.enemy)!;for(const set of enemySets)if(!allowsRuleItem(rule,set.item))set.item='';
 const playerPacked=packTeam(chooseTeam(profiles),profiles,items),opponentPacked=Showdown.Teams.pack(enemySets),preBattleCoins=coins;
 attachBonuses();const log=await runBattle({rule,teams:{p1:playerPacked,p2:opponentPacked},seed:encounter.seed,player:useItems,opponent:opponentPolicy(),onPlayerLine:line=>{if(policy instanceof CompositionPolicy||policy instanceof SupportPlayerPolicy||policy instanceof DamageAwareSupportPlayerPolicy)policy.consumePublicLine(line);},battleItems,teraTickets:{p1:teraTickets,p2:hasTera?(encounter.enemyTeraTickets??1):0}});
 const usedSupport:Record<string,number>={};for(const line of log.publicProtocol){const parts=line.split('|');if(parts[1]==='move'&&parts[2]?.startsWith('p1a:')&&['Reflect','Light Screen','Aurora Veil','Trick Room'].includes(parts[3])){usedSupport[parts[3]]=(usedSupport[parts[3]]??0)+1;supportMoves[parts[3]]=(supportMoves[parts[3]]??0)+1;}}
 if(dataset)appendFileSync(dataset,JSON.stringify({schemaVersion:1,engineVersion,format:FORMAT,phase,rule,composition,caseId:stage.id,category:stage.category,courseId:course.id,theme:course.theme,floor:encounter.floor,seed:encounter.seed,trainer:encounter.trainer,role:encounter.role,playerAI:report.playerAI,opponentAI:report.opponentAI,recruitment:stage.recruitment??'adaptive',playerTeam:Showdown.Teams.unpack(playerPacked),opponentTeam:Showdown.Teams.unpack(opponentPacked),coinsBefore:preBattleCoins,teraTicketsBefore:teraTickets,battleItemsBefore:{...battleItems},supportMoves:usedSupport,winner:log.winner,turns:log.turns,decisions:log.decisions.map(d=>({side:d.side,turn:d.observation.turn,action:d.action})),playerTera:log.publicProtocol.filter(l=>l.startsWith('|-terastallize|p1')).length,enemyTera:log.publicProtocol.filter(l=>l.startsWith('|-terastallize|p2')).length})+'\n');
 for(const d of log.decisions)if(d.side==='p1'&&d.action.startsWith('item '))battleItems[d.action.slice(5) as UpgradeKind]!--;
 for(const line of log.publicProtocol){const kind=line.startsWith('|-mega|')?'mega':line.startsWith('|-terastallize|')?'terastallize':line.startsWith('|-start|')&&line.includes('|Dynamax')?'dynamax':null;if(kind&&!allowsGimmick(rule,kind))throw Error('Forbidden activation '+rule+' '+line);}
 battles++;
 const usedTera=log.publicProtocol.filter(l=>l.startsWith('|-terastallize|p1')).length;
 teraTickets-=usedTera;playerTera+=usedTera;enemyTera+=log.publicProtocol.filter(l=>l.startsWith('|-terastallize|p2')).length;
 for(const d of log.decisions){if(d.action.startsWith('switch ') && d.observation.legalActions.some(a=>a.command.startsWith('move '))){if(d.side==='p1')playerSwitches++;else enemySwitches++;}}
 if(teraTickets<0)throw Error('Negative tera balance');
 bossGimmickActivations+=activations(log);playerGimmickActivations+=log.publicProtocol.filter(l=>l.startsWith('|-mega|p1')||(l.startsWith('|-start|p1')&&l.includes('|Dynamax'))).length;
 for(const line of log.publicProtocol){const match=/^\|-enditem\|p1a: ([^|]+)\|([^|]+)/.exec(line);if(match&&heldItems[match[2] as HeldItem]?.consumable)delete items[match[1]];}
 if(log.winner!=='Player'){failedAt=encounter;break;}if(encounter.villainRank==='boss')villainBossWins++;cleared=encounter.floor;coins+=encounter.reward;earned+=encounter.reward;
 if(composition==='synergy'){const options=Showdown.Teams.unpack(encounter.enemy)!.filter(c=>stage.recruitment!=='fixed'||profiles[c.species]);const decision=recruitForComposition(profiles,options,name=>playerProfile(name,0,0));recruitments.push({floor:encounter.floor,...decision});if(decision.selected){const captured=options.find(c=>c.species===decision.selected)!;for(const m of captured.moves)(known[captured.species]??=new Set()).add(m);}}else{const captured=Showdown.Teams.unpack(encounter.enemy)!.sort((a,b)=>Showdown.Dex.species.get(b.species).bst-Showdown.Dex.species.get(a.species).bst)[0];for(const m of captured.moves)(known[captured.species]??=new Set()).add(m);if(stage.recruitment!=='fixed'||profiles[captured.species])capture(encounter.enemy,profiles);}
 }
 attachBonuses();climbs.push({...((composition==='synergy')?{recruitments}:{}),...(supportPolicy?{supportMoves}:{}),id:course.id,theme:course.theme,organization:course.organization,battles,playerTera,enemyTera,playerSwitches,enemySwitches,teraTickets,villainBossWins,failedRole:failedAt?.role,failedVillainRank:failedAt?.villainRank,cleared,coins,earned,spent:purchases.reduce((s,p)=>s+p.price,0),bossGimmickActivations,playerGimmickActivations,shops,purchases,failedFloor:failedAt?.floor,failedTrainer:failedAt?.trainer,finalParty:chooseTeam(profiles),items,bonus});
 }
 const purchased=climbs.flatMap(c=>c.purchases),visits=climbs.flatMap(c=>c.shops) as {floor:number;startCoins:number;endCoins:number;blocked:number}[];
 const categories=Object.fromEntries(['item','machine','consumable','vitamin','reroll','tera'].map(kind=>[kind,{count:purchased.filter(p=>p.kind===kind).length,spent:purchased.filter(p=>p.kind===kind).reduce((s,p)=>s+p.price,0),perVisit:purchased.filter(p=>p.kind===kind).length/Math.max(1,visits.length)}]));
 const byTheme=Object.fromEntries(Object.keys(towerThemes).map(theme=>{const rows=climbs.filter(c=>c.theme===theme);return [theme,{samples:rows.length,passed50:rows.filter(c=>c.cleared>=50).length,averageCleared:avg(rows.map(c=>c.cleared)),finished:rows.filter(c=>c.cleared===totalFloors).length,failures:Object.fromEntries([...new Set(rows.map(c=>c.failedFloor).filter(f=>f!==undefined))].sort((a,b)=>a!-b!).map(f=>[f,rows.filter(c=>c.failedFloor===f).length]))}];}));
 const result={stage:stage.id,label:stage.label,category:stage.category,initialTeam:stage.team,recruitment:stage.recruitment??'adaptive',passed10:climbs.filter(c=>c.cleared>=10).length,battleWinRate:climbs.reduce((sum,c)=>sum+c.cleared,0)/Math.max(1,climbs.reduce((sum,c)=>sum+c.battles,0)),passed50:climbs.filter(c=>c.cleared>=50).length,byTheme,battles:climbs.reduce((sum,c)=>sum+c.battles,0),playerTera:climbs.reduce((sum,c)=>sum+c.playerTera,0),enemyTera:climbs.reduce((sum,c)=>sum+c.enemyTera,0),playerSwitches:climbs.reduce((sum,c)=>sum+c.playerSwitches,0),enemySwitches:climbs.reduce((sum,c)=>sum+c.enemySwitches,0),villainBossWins:climbs.reduce((sum,c)=>sum+c.villainBossWins,0),climbs,averageCleared:avg(climbs.map(c=>c.cleared)),finished:climbs.filter(c=>c.cleared===totalFloors).length,averageEarned:avg(climbs.map(c=>c.earned)),averageSpent:avg(climbs.map(c=>c.spent)),averageRemaining:avg(climbs.map(c=>c.coins)),shopVisits:visits.length,categories,checkpointWallets:Object.fromEntries(Array.from({length:totalFloors/5-1},(_,i)=>(i+1)*5).map(floor=>{const rows=visits.filter(v=>v.floor===floor);return[floor,{visits:rows.length,before:avg(rows.map(v=>v.startCoins)),after:avg(rows.map(v=>v.endCoins)),blocked:avg(rows.map(v=>v.blocked))}];}))};
 report.stages.push(result);writeFileSync('artifacts/experiments/balance/simulation-'+phase+'-'+behavior+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...result,climbs:undefined}));
}
writeFileSync('artifacts/experiments/balance/simulation-'+phase+'-'+behavior+'.json',JSON.stringify(report,null,2));
