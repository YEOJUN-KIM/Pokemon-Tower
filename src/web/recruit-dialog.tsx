'use client';

import {pokemonName,species} from './catalog';
import {PokemonImage} from './pokemon-image';
import styles from './styles/post-battle.module.css';
import {PokedexDialog} from './pokedex-dialog';

function partnerWithParticle(name:string,subject=false) {
  const text=pokemonName(name);
  const last=text.charCodeAt(text.length-1)-0xac00;
  const hasFinal=last >= 0 && last <= 11171 && last % 28 !== 0;
  return `${text}${subject ? hasFinal ? '이' : '가' : hasFinal ? '을' : '를'}`;
}

function PartnerImage({name}: {name:string}) {
 const catalog=species[name];
 return <PokemonImage id={catalog?.id??0} spriteKey={catalog?.spriteKey} name={pokemonName(name)} animated width={120} height={120} fallback={<span>◇</span>}/>;
}

export function RecruitReplacementPicker({chosen,roster,busy,onCancel,onChoose,returnFocus}:{chosen:string;roster:string[];busy:boolean;onCancel:()=>void;onChoose:(name:string)=>void;returnFocus?:string}){
  return <PokedexDialog title="교체할 포켓몬 선택" context="recruit-replace" className={`${styles.scope} ${styles.panel}`} large returnFocus={returnFocus} onClose={onCancel}>
    <div className="recruit-replacement" data-testid="recruit-replacement-picker">
      <p>{partnerWithParticle(chosen)} 맞이할 자리를 골라주세요.</p>
      <div className="recruit-replacement-grid">{roster.map((name,index)=><button className="pokemon-choice" key={name} data-initial-focus={index===0 ? true : undefined} data-replace-species={name} aria-label={`${pokemonName(name)} 교체 선택`} disabled={busy} onClick={()=>onChoose(name)}><PartnerImage name={name}/><strong>{pokemonName(name)}</strong></button>)}</div>
      <p className="selection-note">교체된 포켓몬의 영구 도감 해금은 유지됩니다.</p>
      <button className="secondary-button" onClick={onCancel}>돌아가기</button>
    </div>
  </PokedexDialog>;
}

export function recruitResultMessage(name:string,archiveOnly:boolean){
 return archiveOnly?`${partnerWithParticle(name)} 도감에 등록했다.`:`${partnerWithParticle(name,true)} 동료로 합류했다!`;
}
