'use client';
import styles from './styles/battle-commands.module.css';
import {GimmickItemIcon} from './gimmick-item-icon';
import {isHeldItem} from '../data/held-items';
import {zCrystals} from '../data/z-crystals';
import {allowsGimmick,type BattleRule} from '../data/run-rules';
import {upgrades,type UpgradeKind} from '../data/shop';
import {battleItemDescription,type BattleItemBag} from '../data/battle-items';
import {GimmickEmblem} from './gimmick-emblem';
import {teraNames,teraColors} from '../data/tera';
import {useState,type CSSProperties} from 'react';
import {useTouchHold} from './use-touch-hold';
import {MoveCategoryBadge} from './move-category-badge';
import {megaStones,type Gimmick} from '../data/gimmicks';
import type {BattleView,PokemonView,MovePP} from './contracts';
import {health,battlePokemonName,species} from './catalog';
import {moveInfo} from '../data/move-info';
import {TypeBadge} from './type-badge';
import {PokemonImage} from './pokemon-image';
import {PokedexDialog} from './pokedex-dialog';
import {selectGameCursor} from './game-keyboard';
import {moveMatchup} from './move-matchup';

export type CommandMode='root'|'moves'|'switch'|'items';
function moveDetails(move:MovePP){const base=moveInfo[move.name];return {...base,name:move.displayName ?? base?.name ?? move.name,description:move.description ?? base?.description ?? '',...(move.power!==undefined?{power:move.power,category:move.category!,type:move.type!,accuracy:move.accuracy!}:{})};}
export function BattleCommands({equipment=[],rule='chaos',battle,mode,busy,forceSwitch,focused,gimmick,onGimmick,onMode,onFocus,onSend,itemBag={}}:{equipment?:readonly import('../data/trainer-equipment').TrainerEquipment[];rule?:BattleRule;itemBag?:BattleItemBag;battle:BattleView;mode:CommandMode;busy:boolean;forceSwitch:boolean;focused:string;gimmick:Gimmick|null;onGimmick:(kind:Gimmick|null)=>void;onMode:(mode:CommandMode)=>void;onFocus:(command:string)=>void;onSend:(command:string)=>void}){
  const active=battle.team.find(p=>p.active),slots:(MovePP|null)[]=(gimmick==='zmove' ? battle.zMovePP : gimmick==='dynamax' ? battle.maxMovePP : battle.movePP) ?? active?.moves?.map(name=>({name,pp:0,maxpp:0})) ?? [];
  const index=Math.max(0,Number(focused.split(' ')[1])-1),selected=slots[index] ?? slots[0],info=selected ? moveDetails(selected) : undefined;
  const [heldMove,setHeldMove]=useState<MovePP|null>(null);
  const hold=useTouchHold(target=>{const slot=Number(target.dataset.command?.split(' ')[1])-1;if(slots[slot])setHeldMove(slots[slot]);},()=>setHeldMove(null));
  const heldInfo=heldMove ? moveDetails(heldMove):undefined;
  const available=battle.actions.some(a=>a.command.endsWith(' mega')) ? 'mega' : battle.actions.some(a=>a.command.endsWith(' dynamax')) ? 'dynamax' : null;
  const teraType=active?.teraType ?? 'Normal',canTera=battle.actions.some(a=>a.command.endsWith(' terastallize'));
  const teraReason=active?.terastallized?'이미 테라스탈 중':active?.dynamax?'다이맥스 중에는 사용 불가':active?.displaySpecies?.includes('-Mega')?'메가진화 중에는 사용 불가':'이번 배틀에서 사용했거나 현재 사용할 수 없습니다.';
  return <>
    {mode==='moves' ? <div className="battle-move-menu has-gimmick gimmicks-in-dock" data-testid="battle-move-menu">
      <button className="secondary-button mobile-command-back" disabled={busy} onClick={()=>onMode('root')}>돌아가기</button>
      <div className="action-grid battle-move-grid" data-testid="action-grid">{Array.from({length:4},(_,slot)=>{
        const move=slots[slot],command=`move ${slot+1}`,legal=battle.actions.some(a=>a.command===command+(gimmick ? ' '+gimmick : '')),details=move ? moveDetails(move) : undefined;
        const matchup=move?moveMatchup(battle,move,gimmick==='terastallize'):null;
        const matchupLabel=matchup ? matchup.kind==='strong'?'효과 좋음':matchup.kind==='weak'?'효과 적음':matchup.kind==='immune'?'효과 없음':'보통 효과' : '';
        return <div key={slot} className="battle-move-row"><button className={`action-button battle-move-button ${gimmick==='zmove' && move && legal ? 'is-z-powered' : ''}`} {...hold} data-command={command} aria-describedby={matchup&&matchup.kind!=='neutral'?`move-matchup-${slot}`:undefined} disabled={busy || !move || !legal} onFocus={()=>onFocus(command)} onClick={()=>onSend(command)}><span className="battle-choice-arrow" aria-hidden="true">▶</span><span className="battle-move-content"><strong>{details?.name ?? (gimmick==='zmove' && battle.movePP?.[slot] ? moveInfo[battle.movePP[slot].name]?.name ?? battle.movePP[slot].name : '—')}</strong><small className="battle-move-meta">{details && <><TypeBadge type={details.type}/><MoveCategoryBadge category={details.category}/></>}{!move&&<span>{gimmick==='zmove' && battle.movePP?.[slot] ? '이 크리스탈로 강화할 수 없음' : '빈 기술 칸'}</span>}</small></span><span className="battle-move-matchup-slot">{matchup&&matchup.kind!=='neutral'&&<span id={`move-matchup-${slot}`} className={`move-matchup is-${matchup.kind}`} data-testid="move-matchup" data-matchup={matchup.kind} aria-label={`${matchupLabel}${matchup.value?` ×${matchup.value}`:''}`} title={`${matchupLabel}${matchup.value?` ×${matchup.value}`:''} · 현재 공개된 타입·특성 기준`}><i aria-hidden="true">{matchup.kind==='strong'?'✦':matchup.kind==='weak'?'↓':'⊘'}</i><span className="move-matchup-label">{matchupLabel}</span>{matchup.value>0&&<b>×{matchup.value}</b>}</span>}</span></button></div>;
      })}</div>
      <aside className="battle-move-details" aria-label="선택한 기술 정보" data-testid="battle-move-details">
        <div className="battle-move-badges">{info && <TypeBadge type={info.type}/>}{info && <MoveCategoryBadge category={info.category}/>}</div>
        <dl><div><dt>PP</dt><dd>{selected ? `${selected.pp} / ${selected.maxpp}` : '—'}</dd></div><div><dt>위력</dt><dd>{info?.power || '—'}</dd></div><div><dt>명중률</dt><dd>{info?.accuracy===true ? '필중' : info ? `${info.accuracy}%` : '—'}</dd></div></dl>
        {info?.description && <p>{info.description}</p>}<button className="secondary-button battle-command-back" disabled={busy} onClick={()=>onMode('root')}>돌아가기</button>
      </aside>
      <div className="gimmick-dock" role="group" aria-label="배틀 변신 선택" data-testid="gimmick-dock">
        {equipment.includes('Tera Orb')&&allowsGimmick(rule,'terastallize') && <button className={`gimmick-icon-button tera-toggle ${gimmick==='terastallize'?'is-selected':''}`} style={{'--gimmick-color':teraColors[teraType]} as CSSProperties} data-testid="tera-toggle" data-gimmick="terastallize" data-type={teraType} aria-label={`${teraNames[teraType]} 테라스탈 · A`} aria-pressed={gimmick==='terastallize'} title={canTera?`${teraNames[teraType]} 테라스탈 · A · 기술 결정 시 발동`:teraReason} disabled={busy||!canTera} onClick={()=>onGimmick(gimmick==='terastallize'?null:'terastallize')}><img className="tera-type-icon" data-tera-symbol={teraType} src={`/sprites/gimmicks/tera/Tera${teraType}.png`} width={60} height={60} alt="" aria-hidden="true"/><span>테라스탈</span>{gimmick!=='terastallize' && <i aria-hidden="true">A</i>}</button>}
        {(['ultra','zmove','dynamax','mega'] as const).filter(kind=>kind==='dynamax'?equipment.includes('Dynamax Band')&&allowsGimmick(rule,'dynamax'):kind==='mega'?allowsGimmick(rule,'mega')&&(!!megaStones[active?.item??'']||battle.actions.some(a=>a.command.endsWith(' mega'))):battle.actions.some(a=>a.command.endsWith(' '+kind))).map(kind=>{const usable=battle.actions.some(a=>a.command.endsWith(' '+kind)),name=kind==='ultra'?'울트라버스트':kind==='zmove'?'Z기술':kind==='mega'?'메가진화':'다이맥스';return <button key={kind} className={`gimmick-icon-button gimmick-toggle emblem-${kind} ${gimmick===kind?'is-selected':''}`} style={{'--gimmick-color':kind==='zmove'?teraColors[zCrystals[active?.item ?? '']?.type ?? 'Normal']:kind==='mega'?'#bdafff':'#ff428c'} as CSSProperties} data-gimmick={kind} data-testid={kind==='zmove'?'zmove-toggle':available===kind?'gimmick-toggle':`${kind}-toggle`} aria-label={`${name} · A`} aria-pressed={gimmick===kind} title={usable?`${name} · A · 기술 결정 시 발동`:`${name} · 현재 사용 불가`} disabled={busy||!usable} onClick={()=>onGimmick(gimmick===kind?null:kind)}>{(kind==='zmove'||kind==='mega')&&isHeldItem(active?.item)?<GimmickItemIcon item={active.item}/>:<GimmickEmblem kind={kind==='ultra'?'mega':kind}/>}<span>{name}</span>{gimmick!==kind && <i aria-hidden="true">A</i>}</button>;})}
      </div>
    </div> : <div className="action-grid battle-root-menu" data-testid="action-grid"><button className="action-button" data-mode="moves" disabled={busy || forceSwitch} onClick={()=>onMode('moves')}><span className="battle-choice-arrow" aria-hidden="true">▶</span><strong>싸운다</strong></button><button className="action-button" data-mode="switch" disabled={busy || !battle.actions.some(a=>a.command.startsWith('switch '))} onClick={()=>onMode('switch')}><span className="battle-choice-arrow" aria-hidden="true">▶</span><strong>교체</strong></button><button className="action-button" data-mode="items" disabled={busy||forceSwitch} onClick={()=>onMode('items')}><span className="battle-choice-arrow" aria-hidden="true">▶</span><strong>도구</strong></button><button type="button" className={`action-button ${styles.unavailable}`} data-mode="run" disabled tabIndex={-1}><span className="battle-choice-arrow" aria-hidden="true">▶</span><strong>도망친다!</strong></button></div>}
    {heldMove && <aside role="tooltip" className="mobile-move-tooltip"><h2>{heldInfo?.name ?? heldMove.name}</h2><div className="battle-move-badges">{heldInfo&&<><TypeBadge type={heldInfo.type}/><MoveCategoryBadge category={heldInfo.category}/></>}</div><p className="move-tooltip-values">PP {heldMove.pp} / {heldMove.maxpp} · 위력 {heldInfo?.power || '—'} · 명중률 {heldInfo?.accuracy===true?'필중':heldInfo?heldInfo.accuracy+'%':'—'}</p>{heldInfo?.description && <p>{heldInfo.description}</p>}</aside>}
    {mode==='items' && <PokedexDialog title="배틀 도구" onClose={()=>onMode('root')} returnFocus="[data-mode=items]"><p>현재 출전 포켓몬에게 사용 · 턴 소모 없음 · 사용 후 기술 선택</p><div className="held-item-options">{(Object.keys(upgrades) as UpgradeKind[]).filter(kind=>(itemBag[kind]??0)>0).map(kind=><button key={kind} data-battle-item={kind} disabled={busy||!battle.actions.some(a=>a.command==='item '+kind)} onClick={()=>onSend('item '+kind)}><strong>{upgrades[kind].name} · {itemBag[kind]}개</strong><small>{battleItemDescription(kind)}</small></button>)}</div>{!Object.values(itemBag).some(count=>count!>0)&&<p>보유한 배틀 아이템이 없습니다. 정비 상점에서 구매하세요.</p>}</PokedexDialog>}
    {mode==='switch' && <PokedexDialog title={forceSwitch ? '다음 포켓몬 선택' : '포켓몬 교체'} large returnFocus="[data-mode=switch]" onClose={()=>{if(!forceSwitch)onMode('root');}}>
      <div className="battle-party" data-testid="battle-party"><div className="battle-party-active">{active && <PartyCard pokemon={active} current/>}</div><div className="battle-party-candidates">{battle.team.map((pokemon,slot)=>pokemon.active ? null : <button key={pokemon.species} className="battle-party-option" data-command={`switch ${slot+1}`} data-initial-focus disabled={busy || !battle.actions.some(a=>a.command===`switch ${slot+1}`)} onClick={()=>onSend(`switch ${slot+1}`)}><PartyCard pokemon={pokemon}/></button>)}</div></div>
      <div className="battle-party-footer"><p>{forceSwitch ? '싸울 수 있는 다음 포켓몬을 선택하세요.' : '교체할 포켓몬을 선택하세요.'}</p><button className="secondary-button" disabled={busy || forceSwitch} onClick={()=>onMode('root')}>돌아가기</button></div>
    </PokedexDialog>}
  </>;
}

function PartyCard({pokemon,current=false}:{pokemon:PokemonView;current?:boolean}){
  const displaySpecies=pokemon.displaySpecies??pokemon.species;
  const hp=health(pokemon.condition),data=species[displaySpecies];
  return <div className={`battle-party-card ${current ? 'is-current' : ''} ${hp.percent===0 ? 'is-fainted' : ''}`}>
    <div className="battle-party-sprite">{data && <PokemonImage shiny={pokemon.shiny} id={data.id} spriteKey={data.spriteKey} name={battlePokemonName(displaySpecies)} animated width={current ? 140 : 90} height={current ? 140 : 90} fallback={<span>◇</span>}/>}</div>
    <div className="battle-party-identity"><strong>{battlePokemonName(displaySpecies)}</strong><small>Lv. 50 · {current ? '현재 출전 중' : hp.percent===0 ? '기절' : hp.status || '교체 가능'}</small></div>
    <div className="battle-party-health"><span>HP</span><div className="hp-track"><i style={{width:`${hp.percent}%`,background:hp.percent<25 ? '#e26553' : hp.percent<50 ? '#e7ad47' : '#54d5a1'}}/></div><strong>{hp.text}</strong></div>
  </div>;
}
