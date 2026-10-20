'use client';
import {PokemonGenderIcon} from './pokemon-gender-icon';
import {useId,useState} from 'react';
import {teraNames,teraColors,teraTypesForSpecies} from '../data/tera';
import {TeraTypeIcon} from './tera-type-icon';
import {statKeys,statNames,natures,type TrainingProfile,type FormOption,type StatBlock} from '../data/training';
import {typeColors,abilityNames,type PokedexEntry} from './pokedex-data';
import {PokemonImage} from './pokemon-image';
import {BaseStatRadar} from './base-stat-radar';
import {moves,species} from './catalog';
import abilityDescriptions from '../data/ability-descriptions.json' with {type:'json'};
import {baseFormName} from '../data/selectable-forms';
import {moveInfo} from '../data/move-info';
import {MoveCategoryBadge} from './move-category-badge';
import {TypeBadge} from './type-badge';
import comparisonStyles from './styles/recruit-comparison.module.css';
export function PokemonSummary({entry,profile,formOptions,showMoveDetails=false,comparison}:{entry:PokedexEntry;formOptions?:FormOption[];profile?:Pick<TrainingProfile,'ability'|'nature'|'moves'>&Partial<TrainingProfile>;showMoveDetails?:boolean;comparison?:{ivs?:StatBlock;previousIVs?:StatBlock;knownMoves:string[];owned:boolean}}){
 const [formName,setFormName]=useState(profile?.forme??'base');
 const form=entry.forms?.find(form=>form.species===formName),shown=form??{...entry,name:baseFormName(entry.species,entry.name)};
 const original=form?.species.replace(/-Gmax$/,'');
 const settingsSpecies=form?.kind==='selectable'?form.species:form?.kind==='gigantamax'&&formOptions?.some(option=>option.species===original)?original:form?profile?.forme??entry.species:entry.species;
 const settings=formOptions?.find(option=>option.species===settingsSpecies)?.settings;
 const ability=form && form.kind!=='gigantamax'?(form.kind==='selectable'?settings?.ability??form.ability:form.ability):settings?.ability??profile?.ability??entry.ability;
 const abilityTooltipId=useId(),abilityDescription=(abilityDescriptions as Record<string,string>)[ability];
 const natureName=natures.find(nature=>nature.id===(profile?.nature??'Serious'))?.name??'성실';
 const allowed=teraTypesForSpecies(settingsSpecies??entry.species),teraType=settings?.teraType??profile?.teraType??(allowed.length===1?allowed[0]:Object.keys(teraNames).find(type=>teraNames[type]===entry.types[0])??'Normal');
 const improvedIVs:Partial<StatBlock>=comparison?.owned&&comparison.ivs&&comparison.previousIVs?Object.fromEntries(statKeys.filter(stat=>comparison.ivs![stat]>comparison.previousIVs![stat]).map(stat=>[stat,comparison.ivs![stat]])):{};
 const stats=shown.baseStats,total=statKeys.reduce((sum,k)=>sum+stats[k],0),configured=settings?.moves??profile?.moves??entry.moves;
 return <section className={`pokemon-summary ${comparison?comparisonStyles.scope:''}`} data-testid="dex-detail" data-preview-form={shown.species} aria-label="포켓몬 상세" data-keyboard-tab-scope data-tab-scope>
  {!!entry.forms?.length && <div className="summary-form-preview"><div data-game-tabs aria-label="포켓몬 모습"><button data-keyboard-tab data-initial-focus aria-pressed={!form} onClick={()=>setFormName('base')}>{baseFormName(entry.species,entry.name)===entry.name?'기본 모습':baseFormName(entry.species,entry.name)}</button>{entry.forms.map(preview=><button key={preview.species} data-keyboard-tab aria-pressed={formName===preview.species} onClick={()=>setFormName(preview.species)}>{preview.name}</button>)}</div></div>}
  <header className="summary-hero"><div><span className="summary-number">No. {String(entry.nationalId??entry.id).padStart(3,'0')} · {entry.region&&<><span className="dex-region-label">{entry.region}</span> · </>}{entry.generation}세대</span><h2>{shown.name}<PokemonGenderIcon gender={profile?.gender}/>{comparison&&!comparison.owned&&<b className={comparisonStyles.newPokemon} data-new-pokemon>NEW!</b>}</h2><span className="summary-english">{shown.species}</span><div className={comparison?comparisonStyles.types:'summary-types'}>{shown.types.map(type=>comparison?<TypeBadge key={type} type={Object.keys(teraNames).find(key=>teraNames[key]===type)??type}/>:<span key={type} style={{background:typeColors[type]}}>{type}</span>)}</div><div className="summary-tera" aria-label="설정된 테라스탈 타입"><span>테라스탈 타입</span><strong data-testid="summary-tera-type" style={{borderColor:teraColors[teraType],color:teraColors[teraType]}}><TeraTypeIcon type={teraType} size={24}/> {teraNames[teraType]}</strong></div><div className="summary-badges">{entry.canPrimal&&<span className="summary-mega">원시회귀 가능</span>}{entry.canMega&&<span className="summary-mega"><i aria-hidden="true">◆</i> 메가진화 가능</span>}{entry.canGigantamax&&<span className="summary-max"><i aria-hidden="true">✦</i> 거다이맥스 가능</span>}</div></div><div className="summary-sprite"><PokemonImage shiny={profile?.shiny} key={formName} id={entry.id} spriteKey={form?.spriteKey ?? species[entry.species]?.spriteKey ?? entry.id} name={shown.name} animated={form?.kind!=='gigantamax'} maxPixelScale={2} width={150} height={150} fallback={<span aria-label={`${entry.name} 이미지 없음`}>◇</span>}/></div></header>
  {comparison?.ivs&&<section className={comparisonStyles.comparison} aria-label="후보 개체값 비교"><h3>개체값</h3><div className={comparisonStyles.stats}>{statKeys.map(stat=>{
   const incoming=comparison.ivs![stat],previous=comparison.owned?comparison.previousIVs?.[stat]:undefined,improved=improvedIVs[stat]!==undefined;
   return <div key={stat} data-iv-stat={stat} data-improved={improved||undefined}><span>{statNames[stat]}</span><strong>{improved&&<span>{previous} → </span>}<b data-improved-value={improved||undefined} className={improved?comparisonStyles.improved:undefined}>{incoming}{improved?' ↑':''}</b></strong></div>;
  })}</div></section>}
  <div className="summary-body"><section className="summary-stats" aria-label="종족값"><div className="summary-section-heading"><h3>종족값</h3><span>합계 <strong>{total}</strong></span></div><BaseStatRadar stats={stats}/><dl className="summary-stat-list">{statKeys.map(k=><div key={k}><dt>{statNames[k]}</dt><dd>{stats[k]}</dd></div>)}</dl></section>
  <div className="summary-right"><dl className="summary-traits"><div className="summary-ability" tabIndex={abilityDescription?0:undefined} aria-describedby={abilityDescription?abilityTooltipId:undefined}><dt>특성</dt><dd>{abilityNames[ability]??ability}</dd>{abilityDescription&&<span className="summary-ability-tooltip" id={abilityTooltipId} role="tooltip">{abilityDescription}</span>}</div><div><dt>성격</dt><dd>{natureName}</dd></div></dl><section className="summary-moves"><h3>기술배치</h3><ul>{configured.map((move,i)=>{
    const id=(name:string)=>name.toLowerCase().replace(/[^a-z0-9]/g,''),isNew=!!comparison&&!comparison.knownMoves.some(known=>id(known)===id(move));
    const info=moveInfo[move],heading=<><span className="summary-move-slot">{i+1}</span><strong>{moves[move]?.name??move}</strong>{isNew&&<b className={comparisonStyles.newMove} data-new-move={move}>NEW!</b>}<span className="summary-move-type" style={{background:typeColors[moves[move]?.type]??'#657083'}}>{moves[move]?.type??'—'}</span></>;
    return showMoveDetails?<li key={move} className="summary-move-expanded"><div className="summary-move-heading">{heading}{info&&<MoveCategoryBadge category={info.category}/>}</div>{info&&<div className="summary-move-metrics">위력 {info.power||'—'} · 명중 {info.accuracy===true?'필중':info.accuracy+'%'} · PP {info.pp}</div>}</li>:<li key={move}>{heading}</li>;
  })}</ul>{!configured.length&&<p>기술 정보 준비 중</p>}</section></div></div>

 </section>;
}
