import {applyPublicTypes} from './battle-types';
import {dynamaxDisplaySpecies} from '../data/selectable-forms';
import {genderFromDetails} from '../data/gender';
import {teraNames} from '../data/tera';
import type {BattleView} from './contracts';
import {describeLine, health, moves, pokemonName, statNames} from './catalog';
import {effectNotice, type EffectNotice} from './battle-effects';
import {advanceField,emptyField} from './battle-field';
import {itemName} from '../data/held-items';
import {moveAnimationPlan} from './move-animation-plan';
import {importantBattleLine,dialogueTextForLine} from './battle-message-data';

export type Motion = {kind: 'z-charge' | 'z-release' | 'move' | 'hit' | 'heal' | 'switch' | 'faint' | 'stat-up' | 'stat-down' | 'mega-charge' | 'mega-shell' | 'mega-burst' | 'mega-flash' | 'mega-reveal' | 'raid-aura-charge' | 'raid-aura-burst' | 'raid-aura-reveal' | 'dynamax-recall' | 'dynamax-ball' | 'dynamax-release' | 'dynamax-grow' | 'dynamax-end' | 'tera-charge' | 'tera-shell' | 'tera-burst' | 'tera-reveal'; raidPhase?:'mega'|'aura';hpReset?:boolean;category?:string;targetSide?:'player'|'enemy';missed?:boolean;blocked?:boolean;sendOut?:boolean;side: 'player' | 'enemy'; color: string; move?: string; label?:string;impact?:'weak'|'strong'|'critical'};
export type Frame = {view: BattleView; motion: Motion | null; duration: number; minimumDuration?:number; notice?:EffectNotice; announcement?:string; important?:boolean};

// Presentation only: the saved protocol already owns the two transition messages.
// A different public form is a Mega transition; the same form is the final aura.
function raidTransitionFrames(before:BattleView,line:string,first:string,resultLine?:string):Frame[]{
 const [, , ,details,condition]=line.split('|'),name=details.split(',')[0];
 const raidPhase=before.opponent?.displaySpecies??before.opponent?.species;
 const kind=raidPhase===name?'aura':'mega';
 const sequence:readonly [Motion['kind'],number][] = kind==='mega'
  ? [['mega-charge',950],['mega-shell',650],['mega-burst',400],['mega-flash',250]]
  : [['raid-aura-charge',700],['raid-aura-burst',450]];
 const frames:Frame[]=sequence.map(([motion,duration])=>({view:structuredClone(before),motion:{kind:motion,side:'enemy',color:'psychic',raidPhase:kind},announcement:first,duration,minimumDuration:duration/2}));
 const view=structuredClone(before);
 view.field=advanceField(view.field??emptyField(),line);
 view.opponent={species:name,shiny:details.split(', ').includes('shiny'),gender:genderFromDetails(details),condition};
 view.pendingFaints=view.pendingFaints?.filter(side=>side!=='enemy');
 view.messages=[...view.messages,line,...(resultLine?[resultLine]:[])].slice(-300);
 const result=resultLine?.split('|')[2]??first;
 frames.push({view,motion:{kind:kind==='mega'?'mega-reveal':'raid-aura-reveal',side:'enemy',color:'psychic',raidPhase:kind,hpReset:true},announcement:result,duration:850,minimumDuration:700});
 frames.push({view:structuredClone(view),motion:null,announcement:result,duration:550,minimumDuration:350});
 return frames;
}

// Protocol windows can be truncated at 300 lines. Match the largest overlap,
// including repeated events, instead of assuming that message counts increase.
export function newLines(before: string[], after: string[]) {
  for (let n = Math.min(before.length, after.length); n > 0; n--) {
    if (before.slice(-n).every((line, i) => line === after[i])) return after.slice(n);
  }
  return after;
}

export function presentationFrames(before: BattleView, after: BattleView): Frame[] {
  if (before.id !== after.id) return [];
  let view: BattleView = structuredClone(before);
  const frames: Frame[] = [];
  let lastNotice = '';
  let impact:Motion['impact'];
  const consumed=new Set<number>();
  const lines=[...newLines(before.messages,after.messages)];
  // Presentation only: critical feedback precedes effectiveness; stored logs stay intact.
  for(let index=0;index<lines.length-1;index++){
    const first=lines[index].split('|'),next=lines[index+1].split('|');
    if(['-supereffective','-resisted'].includes(first[1])&&next[1]==='-crit'&&first[2]===next[2])[lines[index],lines[index+1]]=[lines[index+1],lines[index]];
  }
  // Show pre-attack activation before the attack animation, even though the
  // engine announces the move first. Battle mechanics and saved logs stay intact.
  for(let index=0;index<lines.length;index++){
    const [,event,actor]=lines[index].split('|');
    if(event!=='move')continue;
    const change=lines[index+1];
    if(change?.startsWith(`|-start|${actor}|typechange|`) && /\[from\] ability: (Protean|Libero)(\||$)/.test(change)){
      [lines[index],lines[index+1]]=[change,lines[index]];
      index++;
    }
  }
  for (const [index,line] of lines.entries()) {
    if(consumed.has(index))continue;
    view = structuredClone(view);
    const [, event, actor, value, condition] = line.split('|');
    if(event==='faint'&&line.split('|').includes('[raid]')){view.messages=[...view.messages,line].slice(-300);continue;}
    if(event==='message'){
      if(lines[index+1]?.startsWith('|switch|p2')&&lines[index+1].split('|').includes('[raid]')){
        frames.push({view:structuredClone(view),motion:null,duration:300,minimumDuration:200});
      }
      view.messages=[...view.messages,line].slice(-300);
      const raidMessage=lines[index+1]?.includes('[raid]');
      frames.push({view:structuredClone(view),motion:null,announcement:actor,duration:raidMessage?1000:1300,minimumDuration:raidMessage?700:undefined});continue;
    }
    if(event==='switch'&&line.split('|').includes('[raid]')&&!line.split('|').includes('[raid-adapter]')){
      const premonition=lines[index-1]?.split('|')[2];
      const resultLine=lines[index+1]?.startsWith('|message|')?lines[index+1]:undefined;
      const transition=raidTransitionFrames(view,line,premonition??'',resultLine);
      frames.push(...transition);view=structuredClone(transition.at(-1)!.view);
      if(resultLine)consumed.add(index+1);
      continue;
    }
    if(['move','switch','drag','turn'].includes(event))lastNotice='';
    const candidate=effectNotice(line);
    const noticeKey=candidate ? `${candidate.actor}:${candidate.kind}:${candidate.name}` : '';
    const notice=candidate && noticeKey !== lastNotice ? candidate : undefined;
    if(candidate)lastNotice=noticeKey;
    const side = actor?.startsWith('p1') ? 'player' : actor?.startsWith('p2') ? 'enemy' : null;
    let motion: Motion | null = null;
    if(side && event==='-zpower'){
      const subject=(side==='enemy'?'상대 ':'')+pokemonName(actor.split(': ')[1]);
      const attack=lines.slice(index+1).find(next=>next.startsWith('|move|'+actor+'|'));
      const name=attack?.split('|')[3] ?? '';
      const info=before.zMovePP?.find(move=>move?.name===name);
      const color=(info?.type ?? moves[name]?.color ?? 'Normal').toLowerCase();
      const label=info?.displayName ?? moves[name]?.name ?? name;
      frames.push({view:structuredClone(view),motion:{kind:'z-charge',side,color,label},announcement:subject+'가 온몸에 Z파워를 두른다!',duration:700});
      frames.push({view:structuredClone(view),motion:{kind:'z-release',side,color,label},announcement:label+'!',duration:450});
      view.messages=[...view.messages,line].slice(-300);
      continue;
    }
    const own = side === 'player' ? (view.team.find(p=>p.active)?.species==='Zoroark' ? view.team.find(p=>p.active) : view.team.find(p => p.species === actor.split(': ')[1])) : undefined;
    const pokemon = side === 'enemy' ? view.opponent : own;
    const absorbs = event === '-heal' && candidate && ['Water Absorb','Volt Absorb'].includes(candidate.name);
    const changesState=['-damage','-heal','-boost','-unboost','-setboost','-status','-curestatus','-cureteam','-start','-end','-weather','-fieldstart','-fieldend'].includes(event);
    const activationFirst=!!notice && (changesState||['-immune','-fail','-block'].includes(event)) && !absorbs;
    if(activationFirst)frames.push({view:structuredClone(view),motion:null,notice,duration:1200});
    if(absorbs && notice) {
      frames.push({view:structuredClone(view),motion:null,notice,duration:1200});
    }
    view.messages = [...view.messages, line].slice(-300);
    view.field=advanceField(view.field ?? emptyField(),line);
    if(event==='move')impact=undefined;
    if(event==='-supereffective'&&impact!=='critical')impact='strong';
    if(event==='-resisted'&&impact!=='critical')impact='weak';
    if(event==='-crit')impact='critical';
    if (side && event === 'move') {
      const nextMove=lines.findIndex((next,i)=>i>index&&next.startsWith('|move|'));
      const following=lines.slice(index+1,nextMove<0?lines.length:nextMove);
      const zDetails=before.zMovePP?.find(move=>move?.name===value);
      const color=value==='Tera Blast' && pokemon?.terastallized ? pokemon.terastallized.toLowerCase() : moves[value]?.color ?? 'normal';
      const defaultTarget=moveAnimationPlan(value,color).style==='support'?side:side==='player'?'enemy':'player';
      motion = {kind:'move', side, category:zDetails?.category, targetSide:condition?.startsWith('p1')?'player':condition?.startsWith('p2')?'enemy':defaultTarget, missed:following.some(next=>next.startsWith('|-miss|')), blocked:following.some(next=>/^\|-(immune|fail)\|/.test(next)||next.includes('[from] ability: Water Absorb')||next.includes('[from] ability: Volt Absorb')||next.includes('[from] ability: Dry Skin')), color, move:value};
    }
    if (side && ['switch','drag','replace'].includes(event)) {
      view.pendingFaints=view.pendingFaints?.filter(pending=>pending!==side);
      const name = value.split(',')[0];
      if (side === 'enemy') view.opponent = {...(line.includes('[raid-threshold]')?{...view.opponent,displaySpecies:view.opponent?.dynamax?dynamaxDisplaySpecies(name,true):name}:{}),gender:genderFromDetails(value),shiny:value.split(', ').includes('shiny'),species:name,terastallized:value.match(/tera:([A-Za-z]+)/)?.[1]??(line.includes('[raid-threshold]')?view.opponent?.terastallized:undefined),condition:condition ?? view.opponent?.condition ?? '100/100'};
      else {
        const actual=after.team.find(p=>p.active)?.species==='Zoroark' ? 'Zoroark' : actor.split(': ')[1];
        view.team=view.team.map(p=>p.species===actual ? {...p,active:true,gender:genderFromDetails(value),displaySpecies:name,condition:condition ?? p.condition} : {...p,active:false});
      }
      motion = {kind:'switch',side,color:'normal',sendOut:event!=='replace'};
      if(side==='enemy'&&line.split('|').includes('[raid-adapter]'))motion={kind:'raid-aura-reveal',side,color:'psychic',hpReset:!line.includes('[raid-threshold]')};
    }
    if(pokemon && ['detailschange','-formechange'].includes(event)){
      const form=value.split(',')[0];
      if(form.includes('-Mega')){
        const megaLine=lines.slice(index).find(l=>l.startsWith('|-mega|'+actor+'|')),stone=megaLine?.split('|')[4];
        const reaction=form==='Rayquaza-Mega'?`${side==='enemy'?'상대 ':''}${pokemonName(pokemon.species)}의 화룡점정이 메가진화의 힘을 이끌어 낸다!`:`${side==='enemy' ? '상대 ' : ''}${pokemonName(pokemon.species)}의 ${itemName(stone)}이 키스톤에 반응하고 있다!`;
        frames.push({view:structuredClone(view),motion:null,announcement:reaction,duration:1000});
        frames.push({view:structuredClone(view),motion:{kind:'mega-charge',side:side!,color:'psychic'},announcement:reaction,duration:950});
        frames.push({view:structuredClone(view),motion:{kind:'mega-shell',side:side!,color:'psychic'},announcement:reaction,duration:650});
        pokemon.displaySpecies=form;
        frames.push({view:structuredClone(view),motion:{kind:'mega-burst',side:side!,color:'psychic'},announcement:reaction,duration:400});
        frames.push({view:structuredClone(view),motion:{kind:'mega-flash',side:side!,color:'psychic'},announcement:reaction,duration:250});
        frames.push({view:structuredClone(view),motion:{kind:'mega-reveal',side:side!,color:'psychic'},announcement:`${pokemonName(form)}로 메가진화했다!`,duration:850});
      }else pokemon.displaySpecies=form;
    }
    if(pokemon && ['-start','-end'].includes(event) && value==='Dynamax'){
      const start=event==='-start';
      if(start){
        const subject=(side==='enemy' ? '상대 ' : '')+pokemonName(pokemon.species);
        frames.push({view:structuredClone(view),motion:{kind:'dynamax-recall',side:side!,color:'fairy'},announcement:subject+'의 다이맥스밴드가 빛나기 시작했다!',duration:800});
        frames.push({view:structuredClone(view),motion:{kind:'dynamax-ball',side:side!,color:'fairy'},announcement:subject+'에게 다이맥스 에너지가 모이고 있다!',duration:850});
        frames.push({view:structuredClone(view),motion:{kind:'dynamax-release',side:side!,color:'fairy'},announcement:subject+'에게 다이맥스 에너지가 모이고 있다!',duration:450});
      }
      pokemon.dynamax=start;
      if(start && condition==='Gmax')pokemon.displaySpecies=dynamaxDisplaySpecies(pokemon.displaySpecies??pokemon.species,true);
      else if(!start && pokemon.displaySpecies?.endsWith('-Gmax'))pokemon.displaySpecies=dynamaxDisplaySpecies(pokemon.displaySpecies,false);
      motion={kind:start ? 'dynamax-grow' : 'dynamax-end',side:side!,color:'fairy'};
    }
    if(pokemon && event==='-terastallize'){
      const subject=(side==='enemy'?'상대 ':'')+pokemonName(pokemon.species),color=value.toLowerCase();
      frames.push({view:structuredClone(view),motion:{kind:'tera-charge',side:side!,color},announcement:subject+'에게 테라 에너지가 모이고 있다!',duration:700});
      frames.push({view:structuredClone(view),motion:{kind:'tera-shell',side:side!,color},announcement:subject+'의 몸이 결정으로 감싸였다!',duration:650});
      pokemon.terastallized=value;
      if(side==='player')view.teraTickets=Math.max(0,(view.teraTickets ?? 0)-1);
      frames.push({view:structuredClone(view),motion:{kind:'tera-burst',side:side!,color},announcement:subject+'의 결정이 빛나기 시작했다!',duration:400});
      frames.push({view:structuredClone(view),motion:{kind:'tera-reveal',side:side!,color},announcement:subject+'가 '+(teraNames[value] ?? value)+' 타입으로 테라스탈했다!',duration:850});
    }
    if(pokemon && event==='-transform') {
      const target=side==='player' ? view.opponent : view.team.find(p=>p.active);
      if(target)pokemon.displaySpecies=target.displaySpecies ?? target.species;
    }
    // The spectator protocol exposes percentages. Keep these as percentages
    // during playback; replace with the server's exact own HP at the end.
    if (pokemon && ['-damage','-heal'].includes(event)) {
      pokemon.condition = value;
      if(side){
        const pending=(view.pendingFaints ?? []).filter(pending=>pending!==side);
        view.pendingFaints=event==='-damage'&&health(value).percent===0?[...pending,side]:pending;
      }
      if(!line.split('|').includes('[silent]'))motion = {kind:event === '-damage' ? 'hit' : 'heal',side:side!,color:'normal',label:event === '-heal' ? 'HP 회복' : undefined,impact:event==='-damage' ? impact : undefined};
      if(event==='-damage')impact=undefined;
    }
    if(side && ['-boost','-unboost'].includes(event) && Number(condition) > 0) {
      const increase=event === '-boost';
      motion={kind:increase ? 'stat-up' : 'stat-down',side,color:'normal',label:`${statNames[value] ?? value} ${increase ? '상승' : '하락'}`};
    }
    if (pokemon && event === 'faint') {view.pendingFaints=view.pendingFaints?.filter(pending=>pending!==side);pokemon.condition = '0 fnt'; motion = {kind:'faint',side:side!,color:'normal'};}
    if (pokemon && event === '-status') pokemon.condition = `${pokemon.condition.split(' ')[0]} ${value}`;
    if (pokemon && event === '-curestatus') pokemon.condition = pokemon.condition.split(' ')[0];
    applyPublicTypes(view,line);
    const typeAnnouncement=pokemon && event==='-start' && value==='typechange'
      ? `${side==='enemy'?'상대 ':''}${pokemonName(pokemon.displaySpecies ?? pokemon.species)}의 타입이 ${condition.split('/').map(type=>teraNames[type] ?? type).join('·')}(으)로 바뀌었다!` : undefined;
    if (event === 'turn') view.turn = Number(actor);
    const motionDuration = motion?.kind === 'dynamax-grow' ? 1150 : motion?.kind === 'dynamax-end' ? 600 : motion?.kind === 'switch' ? (motion.sendOut && (view.opponent?.shiny || view.team.find(p=>p.active)?.shiny) ? 1400 : 800) : motion?.kind === 'move' ? moveAnimationPlan(motion.move ?? '',motion.color).duration : motion?.kind === 'hit' ? 360 : motion ? 220 : 0;
    const dialogue=dialogueTextForLine(line,describeLine(line)??'');
    const messageDuration=candidate ? dialogue?750:0 : describeLine(line)||dialogue?750:0;
    frames.push({view, motion, notice:absorbs || activationFirst ? undefined : notice, announcement:typeAnnouncement,important:importantBattleLine(line), duration:Math.max(motionDuration, typeAnnouncement ? 750 : notice && !absorbs && !activationFirst ? 1200 : messageDuration)});
  }
  return frames;
}
