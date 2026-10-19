import test from 'node:test';
import assert from 'node:assert/strict';
import {readPrePaldeaFile as readFileSync} from './pre-paldea-preservation';
import {createHash} from 'node:crypto';
import {PivotPolicy,pivotEntryCosts} from '../src/battle/pivot-policy';
import {GalarAcePolicy} from '../src/battle/galar-ace-policy';
import {DamagePolicy,type Observation,type OwnPokemon,type Policy} from '../src/battle/policy';
import {createNpcPolicy} from '../src/battle/npc-policy';
import {npcAi} from '../src/data/npc-ai';
import {galarSample,galarTrainers} from '../src/data/galar-trainers';
import preserved from './fixtures/galar-ai-preservation.json' with {type:'json'};
import Showdown from 'pokemon-showdown';
import {packTeam} from '../src/data/teams';
import {runBattle,replayBattle,battleEvents,FORMAT} from '../src/battle/run';

const mon=(name:string,active:boolean,moves:string[],spe=180):OwnPokemon=>({ident:`p2: ${name}`,details:name+', L50',active,condition:'200/200',stats:{atk:100,def:90,spa:100,spd:90,spe},moves,ability:'',item:''});
function pivotObservation(kind:'dragon'|'ice'|'volt'|'ground'='dragon'):Observation{
 const volt=kind==='volt'||kind==='ground',ice=kind==='ice';
 const own=mon(volt?'Pawmot':ice?'Flygon':'Dragapult',true,volt?['Close Combat','Volt Switch']:['Dragon Darts','U-turn']);
 const bench=mon(volt?'Corviknight':ice?'Duraludon':'Aegislash',false,volt?['Brave Bird']:['Flash Cannon','Shadow Ball'],70);bench.stats.def=150;bench.stats.spd=150;
 return {turn:3,ownTeam:[own,bench],opponent:{species:kind==='ground'?'Garchomp':volt?'Gardevoir':ice?'Lapras':'Dragonite',condition:'100/100'},lastOpponentMove:kind==='ground'?'Earthquake':volt?'Moonblast':ice?'Ice Beam':'Dragon Claw',legalActions:[{command:'move 1',label:own.moves![0],estimatedDamage:50},{command:'move 2',label:own.moves![1],estimatedDamage:20},{command:'switch 2',label:'Switch',estimatedDamage:-1}],switching:{hazards:{spikes:0,toxicSpikes:0,stealthRock:false,stickyWeb:false},boosts:{},dynamax:false,opponentTypes:[]}};
}
test('all NPC data, floors, training and historical policy sources remain byte-equivalent',()=>{
 for(const [path,hash]of Object.entries(preserved.hashes)){const raw=readFileSync(path,'utf8'),text=preserved.json.includes(path)?JSON.stringify(JSON.parse(raw)):raw.replaceAll('\r\n','\n');assert.equal(createHash('sha256').update(text).digest('hex'),hash,path);}
});
for(const kind of ['dragon','ice','volt'] as const)test(`${kind}: pivot over raw damage and explicitly connect the safer receiver`,()=>{
 const o=pivotObservation(kind),p=new PivotPolicy(new DamagePolicy());assert.equal(p.choose(o),'move 2');
 const forced={...o,legalActions:o.legalActions.filter(a=>a.command.startsWith('switch '))};assert.equal(p.choose(forced),'switch 2');
});
test('Volt Switch into a Ground opponent is filtered and a safe hard switch wins',()=>{
 const o=pivotObservation('ground');o.ownTeam[1].ability='';assert.equal(new PivotPolicy(new DamagePolicy()).choose(o),'switch 2');
});
test('a publicly revealed Volt Absorb also prevents Volt Switch',()=>{
 const o=pivotObservation('volt');o.opponent={species:'Lanturn',condition:'100/100'};o.lastOpponentMove='Surf';o.ownTeam[0].stats.spd=30;o.ownTeam[1]=mon('Gastrodon',false,['Earth Power'],50);o.ownTeam[1].ability='Storm Drain';
 const p=new PivotPolicy(new DamagePolicy());p.observePublicLine('|-ability|p1a: Lanturn|Volt Absorb');assert.equal(p.choose(o),'switch 2');
});
test('a reliable Dragon Darts KO beats pivot and hard switching',()=>{
 const o=pivotObservation();o.opponent!.condition='1/100';assert.equal(new PivotPolicy(new DamagePolicy()).choose(o),'move 1');
});
test('a favorable matchup stays in and attacks',()=>{
 const o=pivotObservation();o.opponent={species:'Blissey',condition:'100/100'};o.lastOpponentMove='Seismic Toss';assert.equal(new PivotPolicy(new DamagePolicy()).choose(o),'move 1');
});
test('a slower, dying pivot carrier switches immediately instead of losing its action',()=>{
 const o=pivotObservation('ice');o.ownTeam[0].stats.spe=10;o.ownTeam[0].condition='20/200';assert.equal(new PivotPolicy(new DamagePolicy()).choose(o),'switch 2');
});
test('entry hazards must not make the chosen receiver faint on entry',()=>{
 const o=pivotObservation('ice');o.ownTeam[1].condition='10/200';o.switching!.hazards.stealthRock=true;assert.notEqual(new PivotPolicy(new DamagePolicy()).choose(o),'move 2');
});

test('entry costs can outweigh a type advantage even when the receiver survives',()=>{
 const o=pivotObservation(),p=o.ownTeam[1];o.ownTeam[0].stats.def=130;p.stats.def=75;p.details='Scizor, L50';
 assert.equal(new PivotPolicy(new DamagePolicy()).choose(o),'move 2');
 Object.assign(o.switching!.hazards,{stealthRock:true,spikes:3,toxicSpikes:2,stickyWeb:true});
 assert.ok(pivotEntryCosts(p,o).damage<1);assert.notEqual(new PivotPolicy(new DamagePolicy()).choose(o),'move 2');
 p.item='Heavy-Duty Boots';assert.equal(new PivotPolicy(new DamagePolicy()).choose(o),'move 2');
});
test('Stealth Rock and all three Spikes layer costs are combined correctly',()=>{
 const o=pivotObservation('ice'),p=o.ownTeam[1];o.switching!.hazards.stealthRock=true;
 for(const spikes of [0,1,2,3]){o.switching!.hazards.spikes=spikes;assert.ok(Math.abs(pivotEntryCosts(p,o).damage-(1/16+[0,1/8,1/6,1/4][spikes]))<1e-9);}
});
test('Flying, Levitate and Air Balloon avoid grounded hazards but still take Stealth Rock',()=>{
 const o=pivotObservation('ice');Object.assign(o.switching!.hazards,{stealthRock:true,spikes:3,toxicSpikes:2,stickyWeb:true});
 for(const [name,ability,item,rock]of [['Charizard','','',.5],['Flygon','Levitate','',1/16],['Duraludon','','Air Balloon',1/16]] as const){const p=mon(name,false,['Shadow Ball']);p.ability=ability;p.item=item;const e=pivotEntryCosts(p,o);assert.equal(e.grounded,false);assert.equal(e.damage,rock);assert.equal(e.statusCost,0);assert.equal(e.speedCost,0);}
});
test('Boots prevent damage, poison and Web, while Magic Guard does not prevent Web',()=>{
 const o=pivotObservation();Object.assign(o.switching!.hazards,{stealthRock:true,spikes:3,toxicSpikes:2,stickyWeb:true});
 const p=mon('Clefable',false,['Moonblast']);p.item='Heavy-Duty Boots';assert.equal(pivotEntryCosts(p,o).total,0);
 p.item='';p.ability='Magic Guard';const e=pivotEntryCosts(p,o);assert.equal(e.damage,0);assert.equal(e.statusCost,0);assert.ok(e.speedCost>0);
});
test('poison versus toxic, existing status and immunity are scored separately from HP loss',()=>{
 const o=pivotObservation(),p=mon('Snorlax',false,['Body Slam']);o.switching!.hazards.toxicSpikes=1;
 assert.equal(pivotEntryCosts(p,o).statusCost,.08);o.switching!.hazards.toxicSpikes=2;assert.equal(pivotEntryCosts(p,o).statusCost,.16);assert.equal(pivotEntryCosts(p,o).damage,0);
 p.condition='200/200 par';assert.equal(pivotEntryCosts(p,o).statusCost,0);p.condition='200/200';p.ability='Immunity';assert.equal(pivotEntryCosts(p,o).statusCost,0);
});
test('Web costs more when the speed drop loses initiative; Clear Body prevents this cost',()=>{
 const o=pivotObservation('ground'),p=o.ownTeam[1];p.details='Metagross';p.stats.spe=140;o.switching!.hazards.stickyWeb=true;
 assert.equal(pivotEntryCosts(p,o).speedCost,.14);p.stats.spe=250;assert.equal(pivotEntryCosts(p,o).speedCost,.05);p.ability='Clear Body';assert.equal(pivotEntryCosts(p,o).speedCost,0);
});
test('a grounded Poison receiver gets an absorption bonus even with Boots',()=>{
 const o=pivotObservation(),p=mon('Gengar',false,['Sludge Bomb']);p.item='Heavy-Duty Boots';p.ability='Cursed Body';o.switching!.hazards.toxicSpikes=2;
 assert.equal(pivotEntryCosts(p,o).absorbBenefit,.12);assert.equal(pivotEntryCosts(p,o).total,-.12);
 p.ability='Levitate';assert.equal(pivotEntryCosts(p,o).absorbBenefit,0);
});
test('Poison absorption breaks a close tie between safe follow-ups',()=>{
 const o=pivotObservation('ice'),poison=mon('Weezing',false,['Sludge Bomb'],70);poison.stats.spd=150;poison.ability='Neutralizing Gas';o.ownTeam.push(poison);o.legalActions.push({command:'switch 3',label:'Poison receiver',estimatedDamage:-1});o.switching!.hazards.toxicSpikes=2;
 const p=new PivotPolicy(new DamagePolicy());assert.equal(p.choose(o),'move 2');assert.equal(p.lastEvaluation?.receiver,poison.ident);assert.equal(p.lastEvaluation?.absorbBenefit,.12);
});
test('real engine confirms stacked hazards, Web and Poison + Boots absorption',()=>{
 for(const [species,item]of [['Duraludon',''],['Gengar','Heavy-Duty Boots']] as const){
  const own=Showdown.Teams.unpack(packTeam(['Snorlax',species,'Blastoise']))!,foe=Showdown.Teams.unpack(packTeam(['Blissey','Charizard','Venusaur']))!;own[1].item=item;foe[0].moves=['Protect'];
  const battle=new Showdown.Battle({formatid:FORMAT,seed:'1,2,3,4'});
  try{
   battle.setPlayer('p1',{name:'Player',team:foe});battle.setPlayer('p2',{name:'Tower AI',team:own});battle.makeChoices('team 123','team 123');
   for(const h of ['stealthrock','spikes','spikes','spikes','toxicspikes','toxicspikes','stickyweb'])battle.p2.addSideCondition(h,battle.p1.active[0]);
   battle.makeChoices('move 1','switch 2');const p=battle.p2.active[0];
   if(item){assert.equal(p.hp,p.maxhp);assert.equal(p.boosts.spe,0);assert.ok(!battle.p2.sideConditions.toxicspikes);}else{assert.ok(Math.abs((p.maxhp-p.hp)/p.maxhp-5/16)<2/p.maxhp);assert.equal(p.boosts.spe,-1);assert.equal(p.status,'');}
  }finally{battle.destroy();}
 }
});
test('pivoting does not loop across consecutive turns, and a forced replacement keeps its target',()=>{
 const o=pivotObservation(),p=new PivotPolicy(new DamagePolicy());assert.equal(p.choose(o),'move 2');
 assert.equal(p.choose({...o,legalActions:[{command:'switch 2',label:'Switch',estimatedDamage:-1}]}),'switch 2');
 assert.equal(p.choose({...o,turn:4}),'move 1');assert.equal(p.choose({...o,turn:6}),'move 2');
});
test('a request warning about an unknown trap suppresses voluntary pivots',()=>{
 const o=pivotObservation();o.switching!.maybeTrapped=true;assert.equal(new PivotPolicy(new DamagePolicy()).choose(o),'move 1');
});
const shieldObservation=():Observation=>({turn:2,ownTeam:[mon('Aegislash',true,["King's Shield",'Shadow Ball'],60)],opponent:{species:'Garchomp',condition:'100/100'},lastOpponentMove:'Dragon Claw',legalActions:[{command:'move 1',label:"King's Shield",estimatedDamage:0},{command:'move 2',label:'Shadow Ball',estimatedDamage:50}]});
const attack=(p:Policy)=>{p.observePublicLine?.('|switch|p2a: Aegislash|Aegislash, L50|100/100');p.observePublicLine?.('|-formechange|p2a: Aegislash|Aegislash-Blade');p.observePublicLine?.('|move|p2a: Aegislash|Shadow Ball|p1a: Garchomp');};
test('King\'s Shield tracks the actual public Blade form despite base-form request details',()=>{
 const p=new GalarAcePolicy(new DamagePolicy());attack(p);assert.equal(p.choose(shieldObservation()),'move 1');
});
test('an attack event is also a Blade fallback when a formechange event is absent',()=>{
 const p=new GalarAcePolicy(new DamagePolicy());p.observePublicLine('|switch|p2a: Aegislash|Aegislash, L50|100/100');p.observePublicLine('|move|p2a: Aegislash|Shadow Ball|p1a: Garchomp');assert.equal(p.choose(shieldObservation()),'move 1');
});
test('King\'s Shield yields to a KO and is not used immediately in Shield form',()=>{
 const p=new GalarAcePolicy(new DamagePolicy());assert.equal(p.choose(shieldObservation()),'move 2');attack(p);const o=shieldObservation();o.opponent!.condition='1/100';assert.equal(p.choose(o),'move 2');
});
test('King\'s Shield cannot be spammed consecutively or on an every-other-turn cycle',()=>{
 const p=new GalarAcePolicy(new DamagePolicy()),o=shieldObservation();attack(p);assert.equal(p.choose(o),'move 1');
 p.observePublicLine('|move|p2a: Aegislash|King\'s Shield|p2a: Aegislash');assert.equal(p.choose({...o,turn:3}),'move 2');attack(p);assert.equal(p.choose({...o,turn:4}),'move 2');assert.equal(p.choose({...o,turn:5}),'move 1');
});
test('an opponent exploiting Shield with a status move postpones its next use',()=>{
 const p=new GalarAcePolicy(new DamagePolicy()),o=shieldObservation();attack(p);p.observePublicLine('|turn|2');assert.equal(p.choose(o),'move 1');p.observePublicLine('|move|p1a: Garchomp|Swords Dance|p1a: Garchomp');attack(p);assert.equal(p.choose({...o,turn:5}),'move 2');
});
const charizardObservation=():Observation=>({turn:5,ownTeam:[mon('Charizard',true,['Fire Blast','Air Slash','Solar Beam','Ancient Power'])],opponent:{species:'Blastoise',condition:'16/100'},lastOpponentMove:'Ice Beam',legalActions:[{command:'move 1',label:'Fire Blast',estimatedDamage:20},{command:'move 3',label:'Solar Beam',estimatedDamage:100},{command:'move 1 dynamax',label:'G-Max Wildfire',estimatedDamage:20},{command:'move 3 dynamax',label:'Max Overgrowth',estimatedDamage:100}]});
test('normal Solar Beam is excluded and Dynamax + Max Overgrowth is chosen in the former failure case',()=>{
 const o=charizardObservation();assert.equal(new GalarAcePolicy(new DamagePolicy()).choose(o),'move 3 dynamax');
});
test('without a Max resource Charizard still chooses an ordinary non-charge move',()=>{
 const o=charizardObservation();o.legalActions=o.legalActions.filter(a=>!a.command.endsWith(' dynamax'));assert.equal(new GalarAcePolicy(new DamagePolicy()).choose(o),'move 1');
});
test('Max Overgrowth remains legal during Dynamax and other species keep their ordinary Solar Beam',()=>{
 const o=charizardObservation();o.legalActions=[{command:'move 1',label:'G-Max Wildfire',estimatedDamage:20},{command:'move 3',label:'Max Overgrowth',estimatedDamage:100}];assert.equal(new GalarAcePolicy(new DamagePolicy()).choose(o),'move 3');
 const other=charizardObservation();other.ownTeam[0].details='Coalossal, L50';other.legalActions=other.legalActions.filter(a=>!a.command.endsWith(' dynamax'));assert.equal(new GalarAcePolicy(new DamagePolicy()).choose(other),'move 3');
});
test('new explicit flags opt in only Raihan and Leon; old saved configurations retain old decisions',()=>{
 for(const t of galarTrainers){const ai=npcAi(95,galarSample(t));assert.equal(ai.pivot, ['named-raihan','named-leon'].includes(t.id)?'v1':undefined);assert.equal(ai.galarAce,t.id==='named-leon'?'v2':undefined);}
 const o=charizardObservation();assert.equal(createNpcPolicy({tier:'expert',tactic:'balanced',galar:'champion'}).choose(o),'move 3');assert.notEqual(createNpcPolicy({tier:'expert',tactic:'balanced',galar:'champion',galarAce:'v2',pivot:'v1'}).choose(o),'move 3');
});
for(const scenario of ['ice','dragon','ground','volt'] as const)test(`${scenario}: real engine performs the selected pivot/direct switch and replays`,async()=>{
 const electric=scenario==='ground'||scenario==='volt',ice=scenario==='ice';
 const names=electric?['Pawmot','Corviknight','Snorlax']:ice?['Flygon','Gigalith','Duraludon']:['Dragapult','Aegislash','Charizard'];
 const enemy=scenario==='ground'?'Garchomp':scenario==='volt'?'Gardevoir':ice?'Lapras':'Dragonite';
 const own=Showdown.Teams.unpack(packTeam(names))!;
 own[0].moves=electric?['Close Combat','Volt Switch','Protect','Thunder Punch']:ice?['Earthquake','U-turn','Dragon Claw','Fire Punch']:['Protect','U-turn','Dragon Darts','Phantom Force'];
 const foes=Showdown.Teams.unpack(packTeam([enemy,'Blastoise','Venusaur']))!;foes[0].moves=[scenario==='ground'?'Earthquake':scenario==='volt'?'Moonblast':ice?'Ice Beam':'Dragon Claw'];
 const inner=new PivotPolicy(new DamagePolicy());let protectedOnce=false;
 const log=await runBattle({rule:'basic',opponentRule:'basic',teams:{p1:Showdown.Teams.pack(foes),p2:Showdown.Teams.pack(own)},player:new DamagePolicy(),opponent:{switchingInformation:true,uncertainSwitchingInformation:true,observePublicLine:l=>inner.observePublicLine(l),choose:o=>{
  if(scenario==='dragon'&&!protectedOnce){const protect=o.legalActions.find(a=>a.label==='Protect');if(protect){protectedOnce=true;return protect.command;}}
  return inner.choose(o);
 }}});
 if(scenario==='ground')assert.ok(!log.publicProtocol.some(l=>l.startsWith('|move|p2a: Pawmot|Volt Switch|p1a: Garchomp')));
 else assert.ok(log.publicProtocol.some(l=>l.startsWith(`|move|p2a: ${names[0]}|${electric?'Volt Switch':'U-turn'}|`)));
 const firstExit=log.publicProtocol.find(l=>l.startsWith('|switch|p2a:')&&!l.includes(`|p2a: ${names[0]}|`));
 assert.ok(firstExit?.includes(scenario==='dragon'?'Aegislash':ice?'Duraludon':'Corviknight'),firstExit??'missing receiver');
 assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
});
