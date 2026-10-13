'use client';
import type {TrainingView,TrainingProfile} from '../data/training';
import {PokemonImage} from './pokemon-image';
import {moves} from './catalog';
import {abilityNames} from './pokedex-data';
import {baseFormName} from '../data/selectable-forms';
export function FormEditor({entry,onChange,disabled=false}:{entry:TrainingView;onChange:(profile:TrainingProfile)=>void;disabled?:boolean}){
 const chosen=entry.profile.forme??entry.species,options=(entry.formOptions??[]).map(form=>({...form,name:baseFormName(form.species,form.name)})),current=options.find(form=>form.species===chosen)!;
 function choose(species:string){if(chosen===species)return;const form=options.find(form=>form.species===species)!;const profile:TrainingProfile={...entry.profile,moves:[...form.moves],ability:form.ability,teraType:form.teraType as TrainingProfile['teraType']};delete profile.forme;if(species!==entry.species)profile.forme=species;onChange(profile);}
 return <section className="form-editor"><p>이 포켓몬을 얻으면 아래 모습을 모두 사용할 수 있어요. 개체값·능력 포인트·성격·이로치는 공유합니다. 저장한 모습은 다음 도전부터 적용됩니다.</p><div className="dex-action-options" aria-label="모습 선택">{options.map(form=><button key={form.species} aria-pressed={chosen===form.species} disabled={disabled} onClick={()=>choose(form.species)}><PokemonImage shiny={entry.profile.shiny} animated id={Number(form.spriteKey)} name={form.name} width={64} height={64} fallback={<span>◇</span>}/><span><strong>{chosen===form.species?"✓ ":""}{form.name}</strong><small>{abilityNames[form.ability]??form.ability}</small></span></button>)}</div>{current&&<p>기술배치: {entry.profile.moves.map(move=>moves[move]?.name??move).join(' / ')}{current.requiredItem&&' · 모습 유지에 필요한 전용 도구가 자동 적용됩니다.'}</p>}<p>모습을 고르면 해당 모습의 기본 특성·기술배치·테라스탈 타입으로 바뀝니다. 아래 설정 저장 버튼으로 능력치와 함께 저장하세요.</p></section>;
}
