// Observational audit only: writes reports, never changes game data or production saves.
import {existsSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {pokemonSets,packTeam} from '../src/data/teams';
import {selectableForms,selectedForm} from '../src/data/selectable-forms';
import {species as catalog} from '../src/data/pokemon-catalog';
import {pokedexEntries} from '../src/server/pokedex-entries';
import {defaultProfile,validateProfile,trainingOptions} from '../src/server/training';
import {moveLearnsets} from '../src/server/move-learnsets';
import {heldItems,itemIcon,itemIconExtension,normalizeHeldItem} from '../src/data/held-items';
import {itemShopRule,rollItemOffers} from '../src/data/held-item-shop';
import {megaStones} from '../src/data/gimmicks';
import {FORMAT} from '../src/data/battle-rules';
import {installTowerGimmicks} from '../src/battle/gimmicks';
import {installGolisopodMega} from '../src/battle/golisopod-mega';
import {installRaid} from '../src/battle/raid';
import {legalActions} from '../src/battle/policy';
import {BattleSession} from '../src/server/battle-session';
import {pokemonImageSources} from '../src/web/pokemon-image';
import {megaAbilityCorrections} from '../src/data/mega-abilities';
import {runBattle} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
import {rareEggSpeciesCategory} from '../src/server/egg-pool';

const out='artifacts/audits/forms-items-2026-10-19';mkdirSync(out,{recursive:true});
const json=(name:string)=>JSON.parse(readFileSync(`src/data/${name}.json`,'utf8'));
const dex=pokedexEntries(),validator=new Showdown.TeamValidator(FORMAT);
const megaPreview=json('mega-preview-forms'),megaBattle=json('mega-forms'),battleForms=json('battle-forms'),learnsets=json('move-learnsets');
const native=Showdown.Dex.species.all().filter(s=>s.num>0&&s.num<=1025&&s.gen<=9&&!['CAP','Custom','LGPE'].includes(s.isNonstandard??''));
const tags=['Restricted Legendary','Sub-Legendary','Mythical','Ultra Beast','Paradox'];
const errors=(fn:()=>unknown)=>{try{return {ok:true,value:fn()};}catch(e){return {ok:false,error:String(e)};}};
const hash=(path:string)=>existsSync(path)?createHash('sha256').update(readFileSync(path)).digest('hex'):null;
function sprites(name:string,keyOverride?:string){
 const c=catalog[name];if(!c&&!keyOverride)return {mapped:false};
 const base=Showdown.Dex.species.get(name).num,id=c?.id??base,key=keyOverride??c?.spriteKey??String(id);
 const sources=Object.fromEntries([['front',false,false],['back',true,false],['shinyFront',false,true],['shinyBack',true,true]].map(([label,back,shiny])=>{
  const paths=pokemonImageSources(id,back as boolean,true,key,shiny as boolean);
  const existing=paths.filter(p=>existsSync('public'+p));
  const baseSource=pokemonImageSources(base,back as boolean,true,String(base),shiny as boolean).find(p=>existsSync('public'+p));
  return [label,{paths,existing,baseFallback:name!==Showdown.Dex.species.get(name).baseSpecies&&!!existing[0]&&!!baseSource&&hash('public'+existing[0])===hash('public'+baseSource)}];
 }));
 return {mapped:!!c,key,sources};
}
function formRow(s:ReturnType<typeof Showdown.Dex.species.get>){
 const f=selectableForms[s.name],base=s.baseSpecies;
 const entry=dex.find(d=>d.species===s.name),preview=dex.flatMap(d=>d.forms??[]).find(p=>p.species===s.name);
 const initial=errors(()=>{const name=f?.collection==='family'?f.baseSpecies:s.name;const p=defaultProfile(name,f?.collection==='family'?s.name:undefined);validateProfile(name,p);return Showdown.Teams.unpack(packTeam([name,'Blastoise','Venusaur'],{[name]:p}))![0];});
 const data=f??jsonRoster[s.name];
 const statMismatch=data?.baseStats&&JSON.stringify(data.baseStats)!==JSON.stringify(s.baseStats);
 const typeMismatch=data?.types&&JSON.stringify(data.types)!==JSON.stringify(s.types);
 const c=catalog[s.name];
 const heldForm=s.name.startsWith('Arceus-')||s.name.startsWith('Silvally-')||s.name.startsWith('Genesect-')||s.name.startsWith('Ogerpon-')&&!s.name.endsWith('-Tera')||['Zacian-Crowned','Zamazenta-Crowned','Giratina-Origin','Dialga-Origin','Palkia-Origin'].includes(s.name);
 const type=heldForm?'B':s.isMega||s.isPrimal||s.battleOnly?'C':'A';
 const moves=f?.legalMoves??moveLearnsets[s.name]?.legalMoves;
 return {species:s.name,baseSpecies:base,nationalId:s.num,forme:s.forme,type,tags:s.tags,engine:true,cosmetic:false,appCatalog:!!c,roster:!!pokemonSets[s.name],dex:entry?'entry':preview?preview.kind:'missing',dexName:entry?.name??preview?.name??null,initial,requiredItem:s.requiredItem??s.requiredItems??null,requiredMove:s.requiredMove??null,battleOnly:s.battleOnly??false,types:s.types,stats:s.baseStats,abilities:s.abilities,previewAbility:preview?.ability??null,statMismatch:!!statMismatch,typeMismatch:!!typeMismatch,catalogTypeMismatch:!!c&&JSON.stringify(c.types)!==JSON.stringify(s.types.map(t=>typeNames[t]??t)),moves:moves??[],missingMoveMetadata:(moves??[]).filter(m=>!moveCatalog[m]),sprites:sprites(s.name,preview?.spriteKey),raid:'generic setSpecies hook; runtime probe or adapter required'};
}
const jsonRoster=json('battle-roster'),moveCatalog=json('move-catalog'),typeNames:Record<string,string>={Normal:'노말',Fire:'불꽃',Water:'물',Electric:'전기',Grass:'풀',Ice:'얼음',Fighting:'격투',Poison:'독',Ground:'땅',Flying:'비행',Psychic:'에스퍼',Bug:'벌레',Rock:'바위',Ghost:'고스트',Dragon:'드래곤',Dark:'악',Steel:'강철',Fairy:'페어리'};
const multiple=new Set(native.filter(s=>s.forme||s.cosmeticFormes?.length).map(s=>s.baseSpecies));
const forms=native.filter(s=>multiple.has(s.baseSpecies)).map(formRow);
// Explicitly inventory cosmetic names too; they have identical combat data by design.
for(const s of native)for(const name of s.cosmeticFormes??[]){if(forms.some(f=>f.species===name))continue;const row=formRow(Showdown.Dex.species.get(name));row.cosmetic=true;forms.push(row);}
const missingParadoxTags=new Set(['Gouging Fire','Raging Bolt','Iron Boulder','Iron Crown']);
const rare=native.filter(s=>!s.forme&&(s.tags.some(t=>tags.includes(t))||missingParadoxTags.has(s.name))).map(s=>({...formRow(s),auditCategory:missingParadoxTags.has(s.name)?'Paradox':s.tags.find(t=>tags.includes(t)),appEggCategory:rareEggSpeciesCategory(s.name),officialForms:forms.filter(f=>f.baseSpecies===s.name&&f.species!==s.name).map(f=>f.species),policyExcluded:s.nfe&&!pokemonSets[s.name]}));

// Raw engine probes are explicitly separate from validated application entry paths.
function setup(name:string,item='',opts:{side?:'p1'|'p2';ability?:string;moves?:string[];hooks?:boolean;raid?:any;rule?:any}={}){
 const s=Showdown.Dex.species.get(name),set={name:s.baseSpecies,species:name,ability:opts.ability??s.abilities[0],moves:opts.moves??['Protect'],item,level:50,nature:'Serious',gender:s.gender??'',teraType:name.startsWith('Terapagos')?'Stellar':s.types[0],evs:{hp:1,atk:0,def:0,spa:0,spd:0,spe:0}};
 const plain=Showdown.Teams.unpack(packTeam(['Blastoise','Venusaur','Snorlax']))!;for(const p of plain)p.moves=['Protect'];
 const own=[set,...plain.slice(0,2)],teams={p1:opts.side==='p2'?plain:own,p2:opts.side==='p2'?own:plain};
 const b=new Showdown.Battle({formatid:FORMAT,seed:'1,2,3,4'});
 if(opts.hooks!==false){installTowerGimmicks(b,teams as any,{p1:1,p2:1},opts.rule??'chaos',opts.rule??'chaos',undefined,['Tera Orb']);installGolisopodMega(b);}
 if(opts.raid)installRaid(b,opts.raid);
 b.setPlayer('p1',{name:'Player',team:teams.p1 as any});b.setPlayer('p2',{name:'NPC',team:teams.p2 as any});b.makeChoices('team 123','team 123');
 return {b,p:(opts.side==='p2'?b.p2:b.p1).active[0]};
}
function state(p:any){return {species:p.species.name,types:p.getTypes(),baseStats:{...p.species.baseStats},stats:{...p.storedStats},ability:p.ability,hp:p.hp,maxhp:p.maxhp,item:p.item,terastallized:p.terastallized,canMegaEvo:p.canMegaEvo,canUltraBurst:p.canUltraBurst,canTerastallize:p.canTerastallize};}
const probes:any[]=[];
function probe(id:string,fn:()=>unknown){const result=errors(fn);probes.push({id,...result});return result;}
for(const side of ['p1','p2'] as const){
 probe(`Palafin-${side}`,()=>{const {b,p}=setup('Palafin','',{side});try{const before=state(p);b.makeChoices(side==='p1'?'switch 2':'move 1',side==='p2'?'switch 2':'move 1');const bench=state(p),back='switch '+(p.side.pokemon.indexOf(p)+1);b.makeChoices(side==='p1'?back:'move 1',side==='p2'?back:'move 1');return {before,bench,after:state(p),log:b.log.filter(l=>l.includes('Palafin')||l.includes('Zero to Hero'))};}finally{b.destroy();}});
 probe(`Terapagos-${side}`,()=>{const {b,p}=setup('Terapagos','',{side});try{const before=state(p);b.makeChoices('move 1','move 1');const withoutTera=state(p);b.makeChoices(side==='p1'?'move 1 terastallize':'move 1',side==='p2'?'move 1 terastallize':'move 1');return {before,withoutTera,after:state(p),log:b.log.filter(l=>l.includes('Terapagos')||l.includes('terastallize'))};}finally{b.destroy();}});
 for(const name of ['Zygarde','Zygarde-10%'])probe(`${name}-PowerConstruct-${side}`,()=>{const {b,p}=setup(name,'',{side,ability:'Power Construct'});try{const before=state(p);p.hp=Math.floor(p.maxhp/2);b.makeChoices('move 1','move 1');return {before,after:state(p),log:b.log.filter(l=>l.includes('Zygarde')||l.includes('Power Construct'))};}finally{b.destroy();}});
}
const heldTargets:Record<string,string>={'Rusted Sword':'Zacian','Rusted Shield':'Zamazenta','Wellspring Mask':'Ogerpon','Hearthflame Mask':'Ogerpon','Cornerstone Mask':'Ogerpon','Griseous Core':'Giratina','Griseous Orb':'Giratina','Adamant Crystal':'Dialga','Lustrous Globe':'Palkia','Red Orb':'Groudon','Blue Orb':'Kyogre','Ultranecrozium Z':'Necrozma-Dusk-Mane'};
for(const i of Showdown.Dex.items.all()){
 if(i.onPlate&&i.name.endsWith('Plate'))heldTargets[i.name]='Arceus';
 if(i.onMemory)heldTargets[i.name]='Silvally';
 if(i.onDrive)heldTargets[i.name]='Genesect';
}
for(const [item,target] of Object.entries(heldTargets))probe(`held:${item}`,()=>{const {b,p}=setup(target,item);try{const current=state(p);let moveType:any;if(target==='Genesect'){const move=b.dex.getActiveMove('Techno Blast');b.singleEvent('ModifyType',move,null,p,b.p2.active[0],move,move);moveType=move.type;}
 const fresh=setup(target);try{return {target,item,current,withoutItem:state(fresh.p),moveType,log:b.log.filter(l=>l.includes('forme')||l.includes('details')||l.includes('primal'))};}finally{fresh.b.destroy();}}finally{b.destroy();}});
for(const name of ['Necrozma-Dusk-Mane','Necrozma-Dawn-Wings','Necrozma'])probe(`Ultra:${name}`,()=>{const {b,p}=setup(name,'Ultranecrozium Z',{moves:['Photon Geyser','Protect']});try{const request=p.getMoveRequestData(),before=state(p);const actions=legalActions({side:b.p1.getRequestData(),active:[request]} as any);if(request.canUltraBurst)b.makeChoices('move 2 ultra','move 1');return {before,nativeRequest:request,appCommands:actions.map(a=>a.command),after:state(p)};}finally{b.destroy();}});
const mega=native.filter(s=>s.isMega).map(s=>{
 const registered=Object.entries(megaStones).find(([,m])=>m.forme===s.name),item=registered?.[0]??s.requiredItem??null;
 const itemExists=!!item&&Object.hasOwn(heldItems,item),source=megaPreview[s.name];
 const result=probe(`mega:${s.name}`,()=>{const {b,p}=setup(typeof s.battleOnly==='string'?s.battleOnly:s.baseSpecies,item??'',{moves:s.requiredMove?[s.requiredMove,'Protect']:['Protect']});try{const before=state(p),request=p.getMoveRequestData();if(request.canMegaEvo)b.makeChoices('move 1 mega','move 1');return {before,request,after:state(p),transformed:p.species.name===s.name};}finally{b.destroy();}});
 return {species:s.baseSpecies,form:s.name,generation:s.gen,engine:true,baseRoster:!!pokemonSets[s.baseSpecies],dex:dex.some(d=>d.forms?.some(f=>f.species===s.name)),appBattleMapping:!!megaBattle[s.name],item,itemExists,registered:!!registered,itemTarget:registered?.[1].species??null,price:itemExists?(heldItems as any)[item!].price:null,shop:itemExists?itemShopRule(item as any):null,stats:s.baseStats,types:s.types,ability:s.abilities,previewAbility:megaAbilityCorrections[s.name]??s.abilities[0],sprites:sprites(s.name,source?.spriteKey),gameplay:result.ok&&(result.value as any).transformed,grade:s.name==='Golisopod-Mega'?'D':registered&&result.ok&&(result.value as any).transformed?'A':'C'};
});
// Probe actual phase application for every mapped form, keeping snapshots in memory.
const raidRows=forms.filter(f=>f.appCatalog||f.dex!=='missing').map(f=>{
 const s=Showdown.Dex.species.get(f.species);
 const result=errors(()=>{const raid={category:'legendary',phases:[{species:f.species,ability:megaAbilityCorrections[f.species]??s.abilities[0],moves:['Protect'],transformation:'none'}]};const {b}=setup(s.baseSpecies,'',{side:'p2',raid});try{return state(b.p2.active[0]);}finally{b.destroy();}});
  const phaseAbility=megaAbilityCorrections[f.species]??s.abilities[0];
  return {species:f.species,...result,exact:result.ok&&(result.value as any).species===f.species,runBattleAbilityAdmitted:Object.values(s.abilities).includes(phaseAbility),appDisplayMapped:!!catalog[f.species],mechanicStateRequired:f.species==='Terapagos-Stellar'||f.species.endsWith('-Tera')||f.species.endsWith('-Gmax')};
});
const shop=Object.entries({...heldTargets,...Object.fromEntries(mega.map(m=>m.item?[m.item,m.species]:[]).filter(p=>p.length)), 'Tera Orb':'trainer','Teal Mask':'Ogerpon'}).map(([item,target])=>{
 const data=(heldItems as any)[item],nativeItem=Showdown.Dex.items.get(item),icon=`public/sprites/items/${itemIcon(item as any)}.${itemIconExtension(item)}`;
 let rollReachable=false;if(data){const offers=rollItemOffers(5,()=>0,choice=>choice===item);rollReachable=offers.includes(item as any);}
 return {item,id:Showdown.toID(item),name:data?.name??null,target,native:nativeItem.exists,exists:!!data,icon,iconExists:existsSync(icon),price:data?.price??null,description:data?.description??null,shop:!!data&&rollReachable,rule:data?itemShopRule(item as any):null,normalized:normalizeHeldItem(item),fixedFormGrant:Object.values(selectableForms).some(f=>f.requiredItem===item),nativeEffect:{forcedForme:nativeItem.forcedForme,onPlate:nativeItem.onPlate,onMemory:nativeItem.onMemory,onDrive:nativeItem.onDrive,megaStone:nativeItem.megaStone}};
});
// Actual application session snapshots cover UI data, transformation commands and fresh-battle reset.
const sessions:any[]=[];
for(const name of ['Palafin','Terapagos','Zygarde','Metagross','Diancie','Groudon','Kyogre','Rayquaza']){
 const profile=defaultProfile(name);profile.moves=['Protect'];if(name==='Zygarde')profile.ability='Power Construct';if(name==='Rayquaza')profile.moves=['Dragon Ascent','Protect'];
 const item:Record<string,string>={Metagross:'Metagrossite',Diancie:'Diancite',Groudon:'Red Orb',Kyogre:'Blue Orb'};
 const enemy=Showdown.Teams.unpack(packTeam(['Blastoise','Venusaur','Snorlax']))!;for(const p of enemy)p.moves=['Protect'];
 const make=()=>new BattleSession(async()=>{},[1,2,3,4],{rule:'chaos',trainerEquipment:['Tera Orb'],teams:{p1:packTeam([name,'Blastoise','Venusaur'],{[name]:profile},item[name]?{[name]:item[name]}:{}),p2:Showdown.Teams.pack(enemy)}});
 let session:BattleSession|undefined;
 try{session=make();const before=await session.ready();let after=before;const commands=before.actions.map(a=>a.command);
  if(name==='Palafin'){after=await session.submit(before.id,before.requestId,'switch 2');const back=after.actions.find(a=>a.label.includes('Palafin'))!;after=await session.submit(after.id,after.requestId,back.command);}
  if(name==='Terapagos')after=await session.submit(before.id,before.requestId,'move 1 terastallize');
  if(['Metagross','Diancie'].includes(name))after=await session.submit(before.id,before.requestId,'move 1 mega');
  sessions.push({species:name,ok:true,before:before.team[0],commands,after:after.team.find(p=>p.species===name),messages:after.messages});
 }catch(e){sessions.push({species:name,ok:false,error:String(e)});}finally{if(session)await session.dispose();}
 let fresh:BattleSession|undefined;try{fresh=make();const view=await fresh.ready();sessions[sessions.length-1].freshBattle=view.team[0];}finally{if(fresh)await fresh.dispose();}
}
const duplicates={normalizedItems:Object.entries(heldItems).filter(([name])=>Object.keys(heldItems).filter(n=>Showdown.toID(n)===Showdown.toID(name)).length>1).map(([name])=>name),dexSpecies:dex.filter((d,i)=>dex.findIndex(e=>e.species===d.species)!==i).map(d=>d.species),selectableIds:Object.entries(selectableForms).filter(([n,f])=>Object.entries(selectableForms).some(([m,g])=>m!==n&&f.id===g.id)).map(([n])=>n)};
const raidSessions:any[]=[];
for(const form of ['Palafin-Hero','Terapagos-Stellar','Necrozma-Ultra','Necrozma-Dusk-Mane','Necrozma-Dawn-Wings','Kyurem-Black','Kyurem-White','Hoopa-Unbound','Zygarde-Complete','Zygarde-Mega','Zacian-Crowned','Zamazenta-Crowned','Ogerpon-Wellspring','Groudon-Primal','Kyogre-Primal','Rayquaza-Mega','Metagross-Mega','Diancie-Mega','Golisopod-Mega']){
 const s=Showdown.Dex.species.get(form),base=s.baseSpecies,team=Showdown.Teams.unpack(packTeam([base,'Blastoise','Venusaur']))![0];
 if(selectableForms[form])team.moves=[...selectableForms[form].moves];
 const phases=[0,1].map(()=>({species:form,ability:megaAbilityCorrections[form]??s.abilities[0],moves:team.moves,transformation:'none',messages:['audit','audit']}));
 const opponentTeam=Showdown.Teams.pack([team,structuredClone(team)]),snapshot={version:1,bossId:'audit-only',species:base,category:'legendary',routeId:'audit-only',phases,opponentTeam} as any;
 let session:BattleSession|undefined;try{session=new BattleSession(async()=>{},[1,2,3,4],{rule:'chaos',trainerEquipment:['Tera Orb'],raid:snapshot,teams:{p1:packTeam(['Blastoise','Venusaur','Charizard']),p2:opponentTeam}});const view=await session.ready();if(view.status==='error')throw Error(view.error??'Battle session error');raidSessions.push({form,ok:true,opponent:view.opponent,playerCommands:view.actions.map(a=>a.command),catalogMapped:!!catalog[form]});}catch(e){raidSessions.push({form,ok:false,error:String(e)});}finally{if(session)await session.dispose();}
}
const signatures:Record<string,string[]>={Rayquaza:['Dragon Ascent'],Groudon:['Precipice Blades'],Kyogre:['Origin Pulse'],Arceus:['Judgment'],Silvally:['Multi-Attack'],Genesect:['Techno Blast'],Palafin:['Jet Punch'],Terapagos:['Tera Starstorm'],Zygarde:['Thousand Arrows','Thousand Waves','Core Enforcer'],Necrozma:['Photon Geyser'],'Necrozma-Dusk-Mane':['Sunsteel Strike'],'Necrozma-Dawn-Wings':['Moongeist Beam'],'Kyurem-Black':['Fusion Bolt','Freeze Shock'],'Kyurem-White':['Fusion Flare','Ice Burn'],'Hoopa-Unbound':['Hyperspace Fury'],'Shaymin-Sky':['Seed Flare'],Ogerpon:['Ivy Cudgel'],Giratina:['Shadow Force'],'Gouging Fire':['Burning Bulwark'],'Raging Bolt':['Thunderclap'],'Iron Boulder':['Mighty Cleave'],'Iron Crown':['Tachyon Cutter']};
const signatureRows=Object.entries(signatures).flatMap(([name,moves])=>moves.map(move=>({species:name,move,engine:Showdown.Dex.moves.get(move).exists,metadata:!!moveCatalog[move],learnable:(selectableForms[name]?.legalMoves??moveLearnsets[name]?.legalMoves??[]).includes(move)})));
const raidRuleProbes:any[]=[];
for(const count of [2,3]){
 const own=packTeam(['Metagross','Blastoise','Venusaur']),base=Showdown.Teams.unpack(packTeam(['Garchomp','Blastoise','Venusaur']))![0];
 const opponentTeam=Showdown.Teams.pack(Array.from({length:count},()=>structuredClone(base)));
 const snapshot={version:1,species:'Garchomp',category:'normal',phases:Array.from({length:count},()=>({species:'Garchomp',ability:'Rough Skin',moves:base.moves,transformation:'none',messages:['audit','audit']})),opponentTeam} as any;
 let session:BattleSession|undefined;try{session=new BattleSession(async()=>{},[1,2,3,4],{rule:'basic',trainerEquipment:[],raid:snapshot,teams:{p1:own,p2:opponentTeam}});const v=await session.ready();raidRuleProbes.push({count,rule:'basic',equipment:[],status:v.status,commands:v.actions.map(a=>a.command),illegalTeraExposed:v.actions.some(a=>a.command.endsWith(' terastallize'))});}finally{if(session)await session.dispose();}
}
probe('Terapagos-Stellar-attack-calculation',()=>{const {b,p}=setup('Terapagos','',{moves:['Protect','Tera Starstorm']});try{const type=()=>{const move=b.dex.getActiveMove('Tera Starstorm');b.singleEvent('ModifyType',move,null,p,b.p2.active[0],move,move);return move;};const before=type();b.makeChoices('move 1 terastallize','move 1');const after=type(),target=b.p2.active[0];const normalDamage=b.actions.getDamage(p,target,after);target.terastallized='Water';const teraTargetDamage=b.actions.getDamage(p,target,type());return {beforeType:before.type,afterType:after.type,defensiveTypes:p.getTypes(),state:p.terastallized,normalDamage,teraTargetDamage};}finally{b.destroy();}});
const rareBattles:any[]=[];
for(const row of rare){
 if(!row.initial.ok)continue;
 const partners=['Blastoise','Venusaur','Charizard'].filter(n=>n!==row.species).slice(0,2);
 const team=packTeam([row.species,...partners]);
 const results:any[]=[];
 for(const side of ['p1','p2'] as const){try{const battle=await runBattle({teams:side==='p1'?{p1:team,p2:packTeam(['Luvdisc','Unown','Delibird'])}:{p1:packTeam(['Luvdisc','Unown','Delibird']),p2:team},rule:'chaos',player:new DamagePolicy(),opponent:new DamagePolicy(),seed:[1,2,3,4]});results.push({side,ok:true,winner:battle.winner,turns:battle.turns,seen:battle.publicProtocol.some(l=>l.startsWith('|switch|'+side)&&l.includes(row.species))});}catch(e){results.push({side,ok:false,error:String(e)});}}
 rareBattles.push({species:row.species,results});
}
// These compare the native held-item behavior to the public session boundary.
const heldSessions:any[]=[];
for(const [name,item] of Object.entries({'Zacian':'Rusted Sword','Zamazenta':'Rusted Shield','Arceus':'Flame Plate','Silvally':'Fire Memory','Genesect':'Burn Drive','Giratina':'Griseous Core'})){
 let session:BattleSession|undefined;try{session=new BattleSession(async()=>{},[1,2,3,4],{rule:'chaos',teams:{p1:packTeam([name,'Blastoise','Venusaur'],{},{[name]:item}),p2:packTeam(['Luvdisc','Unown','Delibird'])}});const view=await session.ready();if(view.status==='error')throw Error(view.error??'Battle session error');heldSessions.push({species:name,item,ok:true,view:view.team[0],mapped:!!catalog[view.team[0].displaySpecies??name]});}catch(e){heldSessions.push({species:name,item,ok:false,error:String(e)});}finally{if(session)await session.dispose();}
}
const summary={date:'2026-10-19',format:FORMAT,showdown:'0.11.11',nationalDex:json('pokedex').length,roster:Object.keys(pokemonSets).length,dexEntries:dex.length,selectableForms:Object.keys(selectableForms).length,familyForms:Object.values(selectableForms).filter(f=>f.collection==='family').length,multipleFamilies:multiple.size,formRows:forms.length,rareBases:rare.length,rarePlayable:rare.filter(r=>r.initial.ok).length,megas:mega.length,oldMegas:mega.filter(m=>m.generation<9).length,newMegas:mega.filter(m=>m.generation===9).length,registeredMegas:mega.filter(m=>m.registered).length,workingMegas:mega.filter(m=>m.gameplay).length,shopRows:shop.length,missingShop:shop.filter(i=>!i.shop).length,missingIcons:shop.filter(i=>i.exists&&!i.iconExists).length,raidExact:raidRows.filter(r=>r.exact).length,raidProbed:raidRows.length,duplicates};
for(const [name,value] of Object.entries({summary,forms,rare,mega,shop,probes,raid:raidRows,sessions,rareBattles,heldSessions,raidSessions,raidRuleProbes,signatures:signatureRows}))writeFileSync(`${out}/${name}.json`,JSON.stringify(value,null,2)+'\n');
function csv(name:string,rows:any[],columns:string[]){const q=(x:any)=>'"'+String(typeof x==='object'?JSON.stringify(x):x??'').replaceAll('"','""')+'"';writeFileSync(`${out}/${name}.csv`,'\ufeff'+[columns.join(','),...rows.map(r=>columns.map(c=>q(r[c])).join(','))].join('\n')+'\n');}
csv('forms',forms,['species','baseSpecies','nationalId','forme','type','cosmetic','engine','appCatalog','roster','dex','dexName','initial','requiredItem','requiredMove','battleOnly','types','stats','abilities','previewAbility','statMismatch','typeMismatch','catalogTypeMismatch','moves','missingMoveMetadata','sprites']);
csv('rare',rare,['species','nationalId','tags','auditCategory','appEggCategory','roster','dex','initial','policyExcluded','officialForms','types','stats','abilities','moves','sprites']);
csv('mega',mega,['species','form','generation','baseRoster','dex','appBattleMapping','item','itemExists','registered','itemTarget','shop','price','types','stats','ability','previewAbility','sprites','gameplay','grade']);
csv('shop',shop,['item','id','name','target','native','exists','icon','iconExists','price','shop','fixedFormGrant','description','nativeEffect']);
const yn=(b:unknown)=>b?'Y':'N',cell=(v:unknown)=>String(v??'—').replaceAll('|','/').replaceAll('\n',' ');
const table=(headers:string[],rows:unknown[][])=>'| '+headers.join(' | ')+' |\n| '+headers.map(()=>'---').join(' | ')+' |\n'+rows.map(row=>'| '+row.map(cell).join(' | ')+' |').join('\n')+'\n';
const appendix=[
 '# Form / Mega / Item Audit — 전수 목록',
 '2026-10-19 · 판정과 제한은 [REPORT.md](REPORT.md) 참조. Y는 해당 열만 통과한 것이며 전체 구현 완료를 의미하지 않습니다. 모든 수치·기술·특성·이미지 경로는 JSON/CSV에 포함됩니다.',
 '## Mega Audit',
 '엔진 공식 포켓몬 번호 1–1025의 Mega 폼ID 97개. Z-A 신규는 gen=9인 49개 폼ID이며 성별·색상별 세부 폼도 각각 셉니다. CAP 메가는 제외합니다. Raid의 표시 Adapter는 전투 스탯 주입은 가능하나 런타임 catalog 연결이 없는 상태입니다.',
 table(['Pokémon','Mega Form','Mega Item','Shop','Gameplay','Raid','Grade'],mega.map(m=>[m.species,m.form,m.item??'화룡점정 (스톤 불필요)',m.shop?`Y / ${m.price}`:'N',m.gameplay?'Y':'N',m.form==='Golisopod-Mega'?'특성 검증 Adapter 필요':m.appBattleMapping?'기존 Phase 재사용':'표시 Adapter 필요',m.form==='Golisopod-Mega'?'D':m.grade])),
 '## Mega data / sprite details',
 table(['Form','Gen','Dex','Runtime catalog','Type','HP/Atk/Def/SpA/SpD/Spe','Native ability → preview','Front / Back'],mega.map(m=>[m.form,m.generation,yn(m.dex),yn(m.appBattleMapping),m.types.join('/'),Object.values(m.stats).join('/'),Object.values(m.ability).join('/')+' → '+m.previewAbility,`${yn((m.sprites as any).sources?.front?.existing.length)} / ${yn((m.sprites as any).sources?.back?.existing.length)}`])),
 '## Shop Audit',
 '144행은 필수 게임 아이템 142종과 비교용 Griseous Orb, 비지닌도구 Teal Mask 2행입니다. Teal Mask는 기본형 자체의 가면이므로 상점 지닌도구 필수 대상이 아닙니다. 가면 3종과 Origin 도구 3종은 폼 선택 때 자동 제공되지만 상점 상품으로는 없습니다.',
 table(['Item','Target','Exists','Functional','Shop','Price','Problem'],shop.map(i=>[i.item,i.target,yn(i.exists),i.fixedFormGrant?'고정폼 패킹':i.exists?'등록 / 전투 검사':i.native?'엔진만':'지닌도구 아님',yn(i.shop),i.price,!i.native?'기본형 가면 / N/A':!i.exists?(i.fixedFormGrant?'상점 미등록, 고정 해제 불가':'게임 아이템 미등록'):!i.iconExists?'아이콘 누락':'검사 통과'])),
 '## Item IDs / labels / icons',
 table(['Item','ID','표시명','Icon exists','Icon path','Fixed form grant'],shop.map(i=>[i.item,i.id,i.name,yn(i.iconExists),i.icon,yn(i.fixedFormGrant)])),
 '## 전설·준전설·환상·UB·패러독스 전체',
 '태그 누락 패러독스 4종을 독립적으로 포함한 125종. base 형태 121종에 대해 플레이어/NPC 양쪽 실제 배틀 총 242회 통과. Type: Null은 내부 세트가 있어도 도감 정책상 제외됩니다.',
 table(['Pokémon','Category','Data','Dex','Initial / NPC set','Official alternate IDs','Grade'],rare.map(r=>[r.species,r.auditCategory,'engine / '+(r.roster?'app':'engine only'),r.dex,yn(r.initial.ok),r.officialForms.join(', ')||'—',!r.initial.ok?'D':r.dex==='missing'?'D':r.officialForms.some(f=>!forms.find(row=>row.species===f)?.appCatalog)?'부분 / 개별폼 참조':'기본형 통과 / 변신 별도'])),
 '## TYPE A / B / C 전수 분류',
 '분류는 폼별입니다. 같은 종이 A/B/C에 함께 나타날 수 있습니다. 기본폼은 A로 표시합니다. C의 battleOnly는 엔진 구현 표현이며, Genesect처럼 ID에 battleOnly가 없어도 B인 사례는 별도 규칙으로 분류합니다. Cosmetic은 전투 데이터가 같은 것이 정상입니다. 진화 전/토템/의상은 별도 누락으로 표시하되 지원 정책 차이도 함께 해석해야 합니다.',
 table(['Species / Form ID','Base','TYPE','Cosmetic','Dex','Initial select','Runtime catalog','Raid entry'],forms.map(f=>{const r=raidRows.find(r=>r.species===f.species);return [f.species,f.baseSpecies,f.type,yn(f.cosmetic),f.dex,yn(f.initial.ok),yn(f.appCatalog),r?(!r.exact?'등장 특성으로 변경':!r.runBattleAbilityAdmitted?'상위 검증 거절':r.mechanicStateRequired?'상태 Adapter 필수':!r.appDisplayMapped?'표시 Adapter 필요':'엔진 진입 확인'):'미연결'];})),
 '## Raw runtime probe IDs',
 table(['ID','Executed without probe error'],probes.map(p=>[p.id,yn(p.ok)])),
 '## 전용기 표본',
 table(['Species','Move','Engine','Metadata','Player learnable'],signatureRows.map(r=>[r.species,r.move,yn(r.engine),yn(r.metadata),yn(r.learnable)])),
 ];
writeFileSync(`${out}/INVENTORY.md`,appendix.join('\n\n')+'\n');
console.log(JSON.stringify(summary,null,2));console.log('Probe failures',probes.filter(p=>!p.ok).map(p=>({id:p.id,error:p.error})));console.log('Session failures',sessions.filter(p=>!p.ok));
console.log('Rare battle failures',rareBattles.filter(r=>r.results.some((r:any)=>!r.ok)));console.log('Held sessions',heldSessions);
