'use client';
import type {BattleView,FieldEffect} from './contracts';
import {emptyField,fieldDuration} from './battle-field';
import {pokemonName,species,statNames} from './catalog';
import {PokemonImage} from './pokemon-image';

const rankKeys=['atk','def','spa','spd','spe','accuracy','evasion'];
const weatherIcons:Record<string,string>={SunnyDay:'☀',DesolateLand:'☀',RainDance:'☂',PrimordialSea:'☂',Sandstorm:'≋',Snow:'❄',Hail:'❄',DeltaStream:'〰'};
export function FieldInspection({battle,onClose,held=false,open=true,touchHeld=false}:{battle:BattleView;onClose:()=>void;held?:boolean;open?:boolean;touchHeld?:boolean}){
  const field=battle.field ?? emptyField(),weather=field.effects.find(effect=>effect.scope==='weather');
  const active=battle.team.find(p=>p.active),enemy=battle.opponent;
  const effects=(scope:FieldEffect['scope'])=>field.effects.filter(effect=>effect.scope===scope);
  function effectRows(scope:FieldEffect['scope']){return effects(scope).length ? effects(scope).map(effect=><div className="field-effect-row" key={effect.id}><strong>{effect.name}</strong><span>{fieldDuration(effect,field.turn)}</span></div>) : <p className="field-empty">적용된 효과 없음</p>;}
  return <aside className="battle-field-overlay" data-open={open} data-touch-held={touchHeld} aria-hidden={!open} role="dialog" aria-modal="false" aria-label="현재 필드 상태" data-testid="battle-field-overlay">
    <header><div><small>BATTLE STATUS · {battle.turn}턴</small><h2>배틀 효과 상태</h2></div><div className="field-weather"><span aria-hidden="true">{weather ? weatherIcons[weather.id] ?? '◇' : '☁'}</span><strong>{weather?.name ?? '날씨 효과 없음'}</strong>{weather && <small>{fieldDuration(weather,field.turn)}</small>}</div><button tabIndex={open ? 0 : -1} onClick={onClose} aria-label="필드 상태 닫기">×</button></header>
    <div className="field-combined-sides">{(['p1','p2'] as const).map(side=>{
      const pokemon=side==='p1' ? active : enemy,name=pokemon?.species ?? '',appearance=pokemon?.displaySpecies ?? name,data=species[appearance] ?? species[name];
      return <section className={`field-side ${side}`} key={side}>
        <div className="field-side-heading">{data && <PokemonImage id={data.id} spriteKey={data.spriteKey} name={pokemonName(name)} width={62} height={62} fallback={<span>◇</span>}/>}<div><small>{side==='p1' ? '플레이어' : '상대'}</small><strong>{name ? pokemonName(name) : '공개된 포켓몬 없음'}</strong></div></div>
        <div className="field-rank-grid" aria-label={side==='p1' ? '아군 랭크 변화' : '상대 랭크 변화'}>{rankKeys.map(key=>{
          const stage=field.boosts?.[side]?.[key] ?? 0;
          return <div className={`field-rank-row ${stage>0 ? 'rank-up' : stage<0 ? 'rank-down' : 'rank-neutral'}`} key={key}><span>{statNames[key] ?? key}</span><div className="field-rank-track"><i style={{width:`${Math.abs(stage)/6*50}%`,left:stage<0 ? `${50-Math.abs(stage)/6*50}%` : '50%'}}/></div><strong key={stage}>{stage>0 ? `+${stage}` : stage===0 ? '—' : stage}</strong></div>;
        })}</div>
        <div className="field-side-effects"><h3>{side==='p1' ? '우리 편 효과' : '상대 편 효과'}</h3>{effectRows(side)}</div>
      </section>;
    })}</div>
    <section className="field-shared-effects"><h3>필드 · 공간</h3>{effectRows('field')}</section>
    <footer>{held ? 'C키를 놓으면 닫힙니다.' : 'C키로 확인 · 닫기 버튼으로 돌아가기'}{field.effects.some(effect=>effect.duration!==effect.maxDuration) && <span>연장 도구가 공개되지 않은 효과는 남은 턴을 범위로 표시해요.</span>}</footer>
  </aside>;
}

