'use client';
import {useState} from 'react';
import shinyStyles from './styles/shiny-sendout.module.css';
import {currentTypes} from './battle-types';
import {TypeBadge} from './type-badge';
import {teraColors} from '../data/tera';
import {TeraCrystal} from './tera-crystal';
import {health,pokemonName,battlePokemonName,species} from './catalog';
import {PokemonImage} from './pokemon-image';
import {pokemonBattleScale} from '../data/pokemon-size';
import {battleStatus,battleStatusNames} from './battle-status';
import type {BattleView,PokemonView} from '../shared/contracts';
import type {Motion} from './battle-presentation';

export function Ball({small = false}: {small?: boolean}) {
  return <span className={`pokeball ${small ? 'small' : ''}`} aria-hidden="true"><i /></span>;
}

export function SendOut() {
  return <span className="send-out" aria-hidden="true"><span className="release-ball"><i /><b /></span><span className="release-ring" /></span>;
}

export function PokemonFeedback({motion}: {motion:Motion | null}) {
  if(!motion || !['heal','stat-up','stat-down'].includes(motion.kind))return null;
  const glyph=motion.kind === 'heal' ? '+' : motion.kind === 'stat-down' ? '↓' : '↑';
  return <span className={`pokemon-feedback feedback-${motion.kind}`} role={motion.kind==='heal'?'status':undefined} aria-hidden={motion.kind!=='heal' || undefined}><span className="feedback-particles" aria-hidden="true"><i>{glyph}</i><i>{glyph}</i><i>{glyph}</i></span>{motion.kind==='heal'&&<strong>{motion.label}</strong>}</span>;
}

export function ShinySparkles(){return <span className={`shiny-sparkles shiny-sendout ${shinyStyles.scope}`} aria-label="이로치 등장"><b className={`shiny-light-ring ${shinyStyles.shinyLightRing}`}/><b className={`shiny-entry-flash ${shinyStyles.shinyEntryFlash}`}/>{Array.from({length:9},(_,i)=><i key={i}>✦</i>)}</span>;}

export function Sprite({shiny=false,name, back = false, animated=false,className = '',condition='',dynamax=false,terastallized}: {shiny?:boolean;name: string; back?: boolean;animated?:boolean; className?: string;condition?:string;dynamax?:boolean;terastallized?:string}) {
  const [crownTop,setCrownTop]=useState(32);
  const id=species[name]?.id,fallback=<span className="sprite-fallback"><Ball /><small>{pokemonName(name)}</small></span>;
  const status=battleStatus(condition),scale=pokemonBattleScale(name),growth=Math.min(1.85,(back ? .88 : .61)/(.88*(back ? .74 : .60)*scale));
  return <span className={`sprite ${className} ${dynamax ? 'dynamaxed' : ''} ${terastallized ? 'terastallized' : ''}`} style={{['--dynamax-scale' as string]:growth,['--tera-color' as string]:teraColors[terastallized ?? ''],['--tera-crown-top' as string]:crownTop+'%'}} data-tera={terastallized || undefined} data-dynamax={dynamax || undefined} data-status={status || undefined} title={status ? `${pokemonName(name)} · ${battleStatusNames[status]}` : undefined}>{id ? <PokemonImage shiny={shiny} id={id} spriteKey={species[name]?.spriteKey} name={pokemonName(name)} back={back} animated={animated} sizeScale={animated ? pokemonBattleScale(name) : 1} stableFrame={animated} onVisibleTop={terastallized ? setCrownTop : undefined} matchBaseHeight={animated && name.includes("-Mega")} fallback={fallback}/> : fallback}{terastallized && <span className="tera-crown"><TeraCrystal type={terastallized}/></span>}</span>;
}

export function HealthCard({pokemon, enemy = false, percentage = false,field,team,faintPending=false,raidReset=false}: {pokemon: Pick<PokemonView, 'species' | 'displaySpecies' | 'condition' | 'gender' | 'types' | 'terastallized'>; enemy?: boolean; percentage?:boolean;field?:BattleView['field'];team?:PokemonView[];faintPending?:boolean;raidReset?:boolean}) {
  const hp = health(pokemon.condition);
  const critical=hp.percent>0 && hp.percent<=30;
  return <div className={`health-card ${enemy ? 'enemy-health' : 'player-health'}`} data-raid-reset={raidReset||undefined} data-hp-state={hp.percent===0&&!faintPending?'fainted':critical||faintPending?'critical':hp.percent<50?'caution':'healthy'}>
    <div className="health-heading"><strong>{battlePokemonName(pokemon.displaySpecies ?? pokemon.species)}{pokemon.gender && pokemon.gender!=='N' && <i className="pokemon-gender" data-gender={pokemon.gender} aria-label={pokemon.gender==='M'?'수컷':'암컷'}>{pokemon.gender==='M'?'♂':'♀'}</i>}<span className="health-types" aria-label="현재 타입">{currentTypes(pokemon).map(type=><TypeBadge key={type} type={type}/>)}</span></strong><span>Lv. 50</span></div>
    {hp.status && <div className="health-status"><b data-status={battleStatus(pokemon.condition)}>{hp.status}</b></div>}
    <div className="hp-row"><span>HP</span><div className="hp-track" role="progressbar" aria-label={`${battlePokemonName(pokemon.displaySpecies ?? pokemon.species)} HP`} aria-valuenow={Math.round(hp.percent)} aria-valuemin={0} aria-valuemax={100}>
      <i key={raidReset?'raid-reset':'hp'} style={{width: `${hp.percent}%`, background: hp.percent <= 30 ? '#ef6661' : hp.percent < 50 ? '#e7ad47' : '#55bd98'}} /></div></div>
    <div className="hp-number"><span>{enemy || percentage ? `${Math.ceil(hp.percent)}%` : hp.text}</span></div>
    {(enemy || team) && <div className={enemy ? 'opponent-balls' : 'opponent-balls player-balls'} role="group" aria-label={enemy ? `상대 남은 포켓몬 ${(field?.opponentSize ?? 3)-(field?.faintedOpponents.length ?? 0)} / ${field?.opponentSize ?? 3}` : `내 남은 포켓몬 ${team!.filter(member=>health(member.condition).percent>0).length} / ${team!.length}`}>{Array.from({length:enemy ? field?.opponentSize ?? 3 : team!.length},(_,index)=>{const fainted=enemy ? index>=(field?.opponentSize ?? 3)-(field?.faintedOpponents.length ?? 0) : health(team![index].condition).percent===0;return <span key={index} className={fainted ? 'ball-fainted' : ''} aria-label={fainted ? '기절' : '생존'}><Ball small/></span>;})}</div>}
  </div>;
}

