import {equipBossGimmick} from '../data/boss-gimmicks';
import {npcGimmick,equipNpcGimmick,npcExtraCandidates,npcSpecies,stripNpcGimmicks} from '../data/npc-gimmicks';
import {normalNpcCategory,normalNpcGimmicksEnabled} from '../data/normal-mode-stages';
import {johtoOriginalBuild} from '../data/johto-builds';
import Showdown from 'pokemon-showdown';
import {pokemonSets,type PokemonSpecies} from '../data/teams';
import roster from '../data/battle-roster.json' with {type:'json'};
import {FORMAT} from '../data/battle-rules';
import {towerTrainerEncounter,type TrainerEncounter} from '../data/tower-trainers';
import {moveLearnsets} from './move-learnsets';
import type {Seed} from '../battle/run';
import {championMoves,championItemPreferences} from '../data/champion-builds';
import {normalTrainerSamples,eliteTrainerSamples,mixedTrainerSamples,type TrainerSample,type TrainerTactic} from '../data/trainer-catalog';
import {towerDifficulty,eliteChance,type TowerProgression} from '../data/tower-progression';
import {megaStones,DYNAMAX_ITEM,canEquipGimmick} from '../data/gimmicks';
import {allowedOpponentSpecies,evolvedOpponentSpecies} from '../data/opponent-species';
import {normalNpcTemplate,templateProfile} from './npc-templates';
import {orderSelectedTeam,satisfiesSelectionRules} from '../data/npc-selection-rules';
import {statKeys,type TrainingProfile} from '../data/training';
import {separateForms} from '../data/selectable-forms';
import {namedOpponentIVs} from './named-opponent-ivs';
import {opponentProfile} from './opponent-training';
import {npcSamples,npcTrainerSample} from '../data/npc-samples';
import {sampleRankWeights,drawNpcRank} from '../data/npc-ranks';

export function encounterRandom(seed:Seed) {
  let state=seed.reduce((value,part)=>(Math.imul(value,31)+part)>>>0,2166136261);
  return ()=>{state=(state+0x6d2b79f5)>>>0;let value=state;value=Math.imul(value^(value>>>15),value|1);value^=value+Math.imul(value^(value>>>7),value|61);return ((value^(value>>>14))>>>0)/4294967296;};
}
const specialistMoves:Record<string,string[]>={Ditto:['Transform'],Unown:['Hidden Power'],Wobbuffet:['Counter','Mirror Coat','Destiny Bond','Encore'],Pyukumuku:['Toxic','Counter','Recover','Soak']};
const support=['Dragon Dance','Swords Dance','Nasty Plot','Calm Mind','Bulk Up','Quiver Dance','Shell Smash','Recover','Roost','Soft-Boiled','Slack Off','Strength Sap','Leech Seed','Will-O-Wisp','Thunder Wave','Toxic'];
const validator=new Showdown.TeamValidator(FORMAT);
const movePools=new Map<string,{core:string[];subs:string[];fallback:string[]}>();
function compatible(name:string,moves:string[]) {return !validator.validateSet({...structuredClone(pokemonSets[name]),moves},{});}
function poolFor(name:string) {
  const cached=movePools.get(name);if(cached)return cached;
  const species=Showdown.Dex.species.get(name),base=pokemonSets[name],legal=moveLearnsets[name].legalMoves;
  const score=(name:string)=>{const move=Showdown.Dex.moves.get(name),power=move.basePower || (move.multihit ? 75 : move.damage || move.basePowerCallback ? 70 : 0);
    return power*(species.types.includes(move.type) ? 1.5 : 1)*(move.category==='Physical' ? species.baseStats.atk : species.baseStats.spa)*(move.accuracy===true ? 1 : move.accuracy/100)*(move.recoil ? .9 : 1);};
  const attacks=legal.filter(name=>{const move=Showdown.Dex.moves.get(name);return move.category!=='Status' && !move.ohko && !move.selfdestruct && !move.flags.charge && !move.flags.recharge && !['Tackle','Swift','Thunder Shock','Struggle','Dream Eater','Snore','Last Resort','Belch'].includes(name) && (move.basePower>=60 || !!move.multihit || !!move.damage || !!move.basePowerCallback || (move.priority>0 && move.basePower>=40));}).sort((a,b)=>score(b)-score(a) || a.localeCompare(b));
  const ordered=[...new Set([...base.moves.filter(move=>attacks.includes(move)),...attacks])],core:string[]=[];
  for(const move of ordered){if(compatible(name,[...core,move]))core.push(move);if(core.length===2)break;}
  const usefulSupport=support.filter(move=>legal.includes(move) && (['Swords Dance','Bulk Up'].includes(move) ? species.baseStats.atk>=species.baseStats.spa : ['Nasty Plot','Calm Mind','Quiver Dance'].includes(move) ? species.baseStats.spa>=species.baseStats.atk : true));
  const subs=[...new Set([...attacks.filter(move=>!core.includes(move)).slice(0,10),...usefulSupport.slice(0,3)])];
  const pool={core,subs,fallback:ordered};movePools.set(name,pool);return pool;
}
export function opponentMoves(name:PokemonSpecies,random:()=>number,tactic?:TrainerTactic):string[] {
  if(specialistMoves[name])return [...specialistMoves[name]];
  const pool=poolFor(name),moves=[...pool.core],subs=[...pool.subs];
  for(let i=subs.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[subs[i],subs[j]]=[subs[j],subs[i]];}
  const preferred=tactic==='setup' ? ['Dragon Dance','Swords Dance','Nasty Plot','Calm Mind','Quiver Dance','Bulk Up','Shell Smash'] : tactic==='status' ? ['Will-O-Wisp','Thunder Wave','Toxic','Leech Seed'] : tactic==='bulk' ? ['Recover','Roost','Soft-Boiled','Slack Off','Strength Sap'] : [];
  for(const move of preferred){if(moveLearnsets[name].legalMoves.includes(move) && compatible(name,[...moves,move])){moves.push(move);break;}}
  const priority=(name:string)=>{const move=Showdown.Dex.moves.get(name);return tactic==='physical' ? Number(move.category==='Physical') : tactic==='special' ? Number(move.category==='Special') : tactic==='speed' ? Number(move.priority>0) : 0;};
  subs.sort((a,b)=>priority(b)-priority(a));
  for(const move of [...subs,...pool.fallback]) {
    if(moves.includes(move) || (Showdown.Dex.moves.get(move).category==='Status' && moves.some(name=>Showdown.Dex.moves.get(name).category==='Status')))continue;
    if(compatible(name,[...moves,move]))moves.push(move);
    if(moves.length===4)break;
  }
  return moves;
}
type RosterEntry={bst:number;specialist:boolean;legendary?:boolean;mythical?:boolean};
const data:Record<string,RosterEntry>={...roster,...Object.fromEntries(Object.entries(separateForms).map(([name,form])=>[name,{...form,specialist:false}]))};
export function normalOpponentSpecies(name:string){return !data[name].legendary && !data[name].mythical && !Showdown.Dex.species.get(name).tags.some(tag=>['Paradox','Ultra Beast','Sub-Legendary','Restricted Legendary','Mythical'].includes(tag));}
export function encounterPool(floor:number,progression:TowerProgression='legacy') {
  const difficulty=progression==='legacy'?null:towerDifficulty(floor);
  const ceiling=difficulty?.bstCeiling ?? Math.min(780,470+Math.max(0,floor-1)*15);
  return Object.keys(pokemonSets).filter(name=>data[name].bst<=ceiling
    && (progression==='legacy' || allowedOpponentSpecies(name))
    && (!data[name].legendary || (difficulty?difficulty.legendary:floor>=20)) && (!data[name].mythical || (difficulty?difficulty.mythical:floor>=30))
    && (!data[name].specialist || floor>=(name==='Ditto' ? 4 : 8)));
}
export function selectTrainerSample(floor:number,seed:Seed,previous:{id:string;specialty:string|null}[]=[],progression:TowerProgression='legacy',options:{common?:boolean}={}):TrainerSample {
  const random=encounterRandom(seed),pool=encounterPool(floor,progression);
  if(options.common){
    let candidates=npcSamples.filter(s=>s.pools.includes('normal')&&s.minFloor<=floor&&s.weight>0);
    const fresh=candidates.filter(s=>!previous.slice(0,3).some(p=>p.id===s.id)&&(!s.specialty||!previous.slice(0,2).some(p=>p.specialty===s.specialty)));
    if(fresh.length)candidates=fresh;
    if(!candidates.length)throw Error('No eligible common NPC sample');
    let ticket=random()*candidates.reduce((sum,s)=>sum+s.weight,0);
    const chosen=candidates.find(s=>(ticket-=s.weight)<0)??candidates.at(-1)!;
    return npcTrainerSample(chosen,drawNpcRank(sampleRankWeights(chosen,floor),random));
  }
  const eligible=(sample:TrainerSample)=>sample.role!=='villain' && sample.minFloor<=floor && (!sample.specialty || pool.filter(name=>(progression==='legacy'||sample.kind==='elite'||normalOpponentSpecies(name)) && Showdown.Dex.species.get(name).types.includes(sample.specialty!)).length>=3);
  const elite=floor>=(progression==='legacy'?4:11) && random()<(progression==='legacy'?.25:eliteChance(floor)),mixed=random()<.2;
  let candidates=(mixed ? mixedTrainerSamples.filter(s=>(s.kind==='elite')===elite) : elite ? eliteTrainerSamples : normalTrainerSamples).filter(eligible);
  if(!candidates.length)candidates=normalTrainerSamples.filter(eligible);
  const unseen=(s:TrainerSample)=>!previous.slice(0,3).some(p=>p.id===s.id) && (!s.specialty || !previous.slice(0,2).some(p=>p.specialty===s.specialty));
  let fresh=candidates.filter(unseen);
  if(!fresh.length)fresh=[...normalTrainerSamples,...eliteTrainerSamples,...mixedTrainerSamples].filter(s=>eligible(s) && (s.kind==='elite')===elite && unseen(s));
  if(fresh.length)candidates=fresh;
  return candidates[Math.floor(random()*candidates.length)];
}
// Enumerate the small candidate pool, keeping the ace and favouring complementary partners.
export function selectNamedEntries(entries:readonly string[],random:()=>number,ace?:string,carrier?:string,options:{accept?:(names:string[])=>boolean;quality?:'elite'|'master';tactic?:TrainerTactic}={}):string[] {
  if(entries.length<3 || new Set(entries).size!==entries.length || entries.some(name=>!pokemonSets[name]))throw Error('Invalid named trainer entries');
  if(ace && !entries.includes(ace))throw Error('Trainer ace is missing from entries');
  const combinations:{names:string[];weight:number;sharedWeaknesses:number}[]=[];
  for(let a=0;a<entries.length-2;a++)for(let b=a+1;b<entries.length-1;b++)for(let c=b+1;c<entries.length;c++){
    const names=[entries[a],entries[b],entries[c]],species=names.map(name=>Showdown.Dex.species.get(name));
    if(ace && !names.includes(ace) || carrier && !names.includes(carrier))continue;
    if(options.accept&&!options.accept(names))continue;
    const coverage=new Set(species.flatMap(s=>s.types)).size;
    const physical=species.some(s=>s.baseStats.atk>s.baseStats.spa),special=species.some(s=>s.baseStats.spa>s.baseStats.atk);
    const speed=species.some(s=>s.baseStats.spe>=90),bulk=species.some(s=>s.baseStats.hp+s.baseStats.def+s.baseStats.spd>=270);
    const sharedWeaknesses=Showdown.Dex.types.all().filter(type=>species.every(s=>Showdown.Dex.getImmunity(type.name,s) && Showdown.Dex.getEffectiveness(type.name,s)>0)).length;
    let weight=(1+coverage*.2)*(physical && special ? 1.5 : 1)*(speed && bulk ? 1.3 : 1)*Math.pow(.45,sharedWeaknesses);
    if(options.quality){
      const bst=species.reduce((sum,s)=>sum+statKeys.reduce((total,key)=>total+s.baseStats[key],0),0)/3;
      weight*=Math.pow(bst/500,options.quality==='master'?8:4);
      weight*=Math.pow(coverage/4,options.quality==='master'?4:2);
      const setup=names.some(name=>poolFor(name).subs.some(move=>['Dragon Dance','Swords Dance','Nasty Plot','Calm Mind','Quiver Dance','Bulk Up','Shell Smash'].includes(move)));
      if(options.tactic==='setup'&&setup)weight*=1.5;
      if(options.quality==='master')weight*=weight;
    }
    combinations.push({names,weight,sharedWeaknesses});
  }
  if(!combinations.length)throw Error('No team satisfies NPC composition constraints');
  const minimumWeakness=Math.min(...combinations.map(c=>c.sharedWeaknesses));
  const eligible=options.quality==='master'?combinations.filter(c=>c.sharedWeaknesses===minimumWeakness):combinations;
  let ticket=random()*eligible.reduce((sum,c)=>sum+c.weight,0);
  const selected=[...(eligible.find(c=>(ticket-=c.weight)<0) ?? eligible.at(-1)!).names];
  // The first entry should not always become the lead, either.
  for(let i=selected.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[selected[i],selected[j]]=[selected[j],selected[i]];}
  return selected;
}
export type OpponentEntry={name:string;moves:string[];item?:string;ability?:string;gigantamax?:boolean;special?:'hidden';profile?:TrainingProfile};
function withNamedIVs(team:OpponentEntry[],floor:number,seed:Seed,progression:TowerProgression,named:boolean){
 if(!named||progression==='legacy')return team;
 return team.map(entry=>{
  const profile=entry.profile??opponentProfile(entry.name,entry.moves,floor,{hp:0,atk:0,def:0,spa:0,spd:0,spe:0},progression);
  return {...entry,profile:{...profile,ivs:namedOpponentIVs(entry.name,entry.moves,floor,seed,profile)}};
 });
}
const typeItems:Record<string,string>={Normal:'Silk Scarf',Fire:'Charcoal',Water:'Mystic Water',Electric:'Magnet',Grass:'Miracle Seed',Ice:'Never-Melt Ice',Fighting:'Black Belt',Poison:'Poison Barb',Ground:'Soft Sand',Flying:'Sharp Beak',Psychic:'Twisted Spoon',Bug:'Silver Powder',Rock:'Hard Stone',Ghost:'Spell Tag',Dragon:'Dragon Fang',Dark:'Black Glasses',Steel:'Metal Coat',Fairy:'Fairy Feather'};
function equipNamedTeam(team:OpponentEntry[],ace:string|undefined,champion:boolean,original=false){
  const used=new Set<string>();
  for(const entry of [...team].sort((a,b)=>Number(b.name===ace)-Number(a.name===ace))){
    if(entry.item && !used.has(entry.item)){used.add(entry.item);continue;}
    if(original && !champion && !entry.item)continue;
    const moves=entry.moves.map(move=>Showdown.Dex.moves.get(move)),attacks=moves.filter(move=>move.category!=='Status');
    const hasStatus=moves.some(move=>move.category==='Status'),physical=attacks.filter(move=>move.category==='Physical').length>attacks.filter(move=>move.category==='Special').length;
    const heal=moves.some(move=>['recover','roost','synthesis','gigadrain','leechseed','slackoff'].includes(move.id));
    const stab=attacks.find(move=>Showdown.Dex.species.get(entry.name).types.includes(move.type))?.type;
    const preferences=champion ? [...(championItemPreferences[entry.name] ?? []),...(heal ? ['Leftovers'] : []),'Expert Belt',physical ? 'Muscle Band' : 'Wise Glasses','Sitrus Berry']
      : [...(stab ? [typeItems[stab]] : []),'Sitrus Berry',physical ? 'Muscle Band' : 'Wise Glasses','Expert Belt'];
    entry.item=preferences.find(item=>!used.has(item) && !(hasStatus && ['Assault Vest','Choice Band','Choice Specs','Choice Scarf'].includes(item)))!;
    if(!entry.item)throw Error(`No distinct item for ${entry.name}`);
    used.add(entry.item);
  }
  return team;
}
export function generateOpponentTeam(floor:number,seed:Seed,previous:string[]=[],trainer=towerTrainerEncounter(floor,seed.join(':')) as TrainerEncounter|null,sample?:TrainerSample,progression:TowerProgression='legacy',options:{templates?:boolean}={}):OpponentEntry[] {
  if(!Number.isSafeInteger(floor) || floor<1)throw Error('Invalid encounter floor');
  const random=encounterRandom(seed);
  if(options.templates!==false && progression!=='legacy' && (trainer || sample)){
    const template=normalNpcTemplate(sample?.id ?? trainer!.boss.id,floor,sample?.role ?? trainer?.boss.role);
    if(template){
      const named=!!trainer||sample?.kind==='named';
      const selected=template.select?selectNamedEntries(template.team.map(p=>p.species),random,template.ace||undefined,template.signature?.species,{accept:names=>(template.required??[]).every(name=>names.includes(name))&&satisfiesSelectionRules(names,template.selectionRules)}):template.team.map(p=>p.species);
      if(!satisfiesSelectionRules(selected,template.selectionRules))throw Error('NPC team does not satisfy selection rules');
      const enabled=normalNpcGimmicksEnabled(floor,normalNpcCategory(sample?.role ?? trainer?.boss.role,sample?.id ?? trainer?.boss.id,sample?.kind ?? 'named'));
      let team=selected.map(name=>template.team.find(p=>p.species===name)!).map(p=>{const profile=templateProfile(p.profile,floor,template.gate50);return {name:p.species,moves:profile.moves,item:p.item,ability:profile.ability,gigantamax:p.gigantamax,...(p.special?{special:p.special}:{}),profile};});
      if((template.allFloors||template.gate50)&&enabled)team=equipNpcGimmick(team,template.signature) as typeof team;
      // Builds stay fixed; candidate membership and lead order use the saved seed.
      for(let i=team.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[team[i],team[j]]=[team[j],team[i]];}
      team=orderSelectedTeam(team,p=>p.name,template.selectionRules);
      return withNamedIVs(enabled?team:stripNpcGimmicks(team),floor,seed,progression,named&&!template.gate50);
    }
  }
  let entries=sample?.entries ?? trainer?.entries;
  if(entries){
    const named=!!trainer || sample?.kind==='named',champion=sample?.role==='champion' || !!trainer?.champion;
    let ace=sample?.ace ?? trainer?.ace;
    if(progression!=='legacy'){
      if(named)entries=[...new Set([...entries,...(npcExtraCandidates[sample?.id ?? trainer?.boss.id ?? ''] ?? [])])];
      const red=['named-red','named-red-kanto'].includes(sample?.id ?? trainer?.boss.id ?? '');
      const id=sample?.id ?? trainer?.boss.id ?? '',generation=sample?.generation ?? trainer?.boss.generation ?? null;
      entries=[...new Set(entries.map(name=>named?npcSpecies(name,id,generation):evolvedOpponentSpecies(name,red)))];
      if(ace)ace=named?npcSpecies(ace,id,generation):evolvedOpponentSpecies(ace,red);
      if(entries.length<3){const types=new Set(entries.flatMap(name=>Showdown.Dex.species.get(name).types));
        const fillers=Object.keys(pokemonSets).filter(name=>allowedOpponentSpecies(name,red)&&!entries!.includes(name)&&Showdown.Dex.species.get(name).types.some(type=>types.has(type))&&!data[name].legendary&&!data[name].mythical);
        entries=[...entries,...fillers.slice(0,3-entries.length)];}
    }
    const signature=progression!=='legacy' && named?npcGimmick(sample?.id ?? trainer!.boss.id,sample?.generation ?? trainer?.boss.generation ?? null,entries,ace):null;
    const team:OpponentEntry[]=selectNamedEntries(entries,random,ace,signature?.species).map(name=>({name,...(johtoOriginalBuild(sample?.id ?? trainer?.boss.id ?? '',name) ?? {moves:champion && championMoves[name] ? [...championMoves[name]] : opponentMoves(name,random,sample?.tactic ?? trainer?.tactic)})}));
    const equipped=named ? equipNamedTeam(equipBossGimmick(team,trainer?.boss.id ?? sample?.id ?? '',floor),ace,champion,!!team[0].ability) : team;
    const result=progression!=='legacy' && floor<=60?gentleMoves(equipped):equipped;
    if(progression!=='legacy' && !normalNpcGimmicksEnabled(floor,normalNpcCategory(sample?.role ?? trainer?.boss.role,sample?.id ?? trainer?.boss.id,sample?.kind ?? 'named')))return stripNpcGimmicks(result);
    return withNamedIVs(signature?equipNpcGimmick(result,signature):result,floor,seed,progression,named);
  }
  let pool=encounterPool(floor,progression);
  if(progression!=='legacy' && sample?.kind!=='elite')pool=pool.filter(normalOpponentSpecies);
  let fresh=pool.filter(name=>!previous.includes(name));
  if(sample?.specialty && (sample.kind!=='elite'||progression==='legacy')){pool=pool.filter(name=>Showdown.Dex.species.get(name).types.includes(sample.specialty!));fresh=pool.filter(name=>!previous.includes(name));}
  if(fresh.length>=3)pool=fresh;
  const selected:string[]=[];
  while(selected.length<3) {
    const elite=sample?.kind==='elite' && progression!=='legacy';
    const specialty=sample?.specialty;
    const core=elite && specialty && selected.length===0?pool.filter(name=>Showdown.Dex.species.get(name).types.includes(specialty)):[];
    const partners=elite && specialty && selected.length>0?pool.filter(name=>!Showdown.Dex.species.get(name).types.includes(specialty)):[];
    const candidates=core.length?core:partners.length?partners:pool;
    const lastTypes=selected.flatMap(name=>Showdown.Dex.species.get(name).types);
    const weighted=candidates.map(name=>({name,weight:(Showdown.Dex.species.get(name).types.some(type=>lastTypes.includes(type)) ? .4 : 1)
      *(floor<10 ? 1 : Math.max(.15,data[name].bst/600))
      *(sample?.tactic==='speed' ? Math.max(.3,Showdown.Dex.species.get(name).baseStats.spe/70) : sample?.tactic==='bulk' ? Math.max(.3,(Showdown.Dex.species.get(name).baseStats.hp+Showdown.Dex.species.get(name).baseStats.def+Showdown.Dex.species.get(name).baseStats.spd)/200) : 1)}));
    let ticket=random()*weighted.reduce((sum,entry)=>sum+entry.weight,0);
    const chosen=weighted.find(entry=>(ticket-=entry.weight)<0)?.name ?? pool[pool.length-1];
    if(!chosen)throw Error('Encounter pool exhausted');
    selected.push(chosen);pool=pool.filter(name=>name!==chosen);
  }
  const team:OpponentEntry[]=selected.map(name=>({name,moves:opponentMoves(name,random,sample?.tactic)}));
  if(progression!=='legacy' && sample?.kind==='elite' && normalNpcGimmicksEnabled(floor,'elite') && !(floor>=51&&floor<=60)){
    const mode=random(),mega=team.flatMap(entry=>Object.keys(megaStones).filter(item=>canEquipGimmick(entry.name,item)).map(item=>({entry,item})))[0];
    if(mega && mode<.5)mega.entry.item=mega.item;
    else if(floor>=35 && mode<.75){const entry=team.find(p=>!!Showdown.Dex.species.get(p.name).canGigantamax && canEquipGimmick(p.name,DYNAMAX_ITEM));if(entry){entry.item=DYNAMAX_ITEM;entry.gigantamax=true;}}
  }
  return progression!=='legacy' && floor<=60?gentleMoves(team):team;
}

// Early random/adapted opponents use reliable smaller attacks. HGSS reference builds stay intact.
export function gentleMoves(team:OpponentEntry[]){
  return team.map(entry=>{
    if(entry.ability)return entry;
    const moves=[...entry.moves];
    for(let slot=0;slot<moves.length;slot++){
      const original=Showdown.Dex.moves.get(moves[slot]);if(original.category==='Status'||original.basePower<=90)continue;
      const alternatives=moveLearnsets[entry.name].legalMoves.filter(name=>{
        const move=Showdown.Dex.moves.get(name);
        return move.type===original.type && move.category===original.category && move.basePower>=40 && move.basePower<=80 && !move.flags.charge && !move.flags.recharge && !move.selfdestruct && !moves.includes(name);
      }).sort((a,b)=>Showdown.Dex.moves.get(b).basePower-Showdown.Dex.moves.get(a).basePower);
      const replacement=alternatives.find(name=>compatible(entry.name,moves.map((move,index)=>index===slot?name:move)));
      if(replacement)moves[slot]=replacement;
    }
    return {...entry,moves};
  });
}
