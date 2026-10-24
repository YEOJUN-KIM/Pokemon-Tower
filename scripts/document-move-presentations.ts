import {writeFileSync,readFileSync} from 'node:fs';
import {moveInfo} from '../src/data/move-info';
import {movePresentation,movePresentations,movePresentationPresets,movePresentationReview} from '../src/web/move-presentation';
import {sharedVfxCatalog,rankVfxCatalog} from '../src/web/shared-vfx';

const names=Object.keys(moveInfo).sort();
if(names.some(name=>!movePresentations[name]||!Object.hasOwn(movePresentationPresets,movePresentations[name])))throw Error('Unmapped move');
if(Object.keys(movePresentations).some(name=>!moveInfo[name]))throw Error('Stale move');
const usage=Object.entries(sharedVfxCatalog).map(([id,support])=>({id,...support,moves:names.filter(name=>{const p=movePresentation(name);return p.mainVfx===id||p.impactVfx===id;})})).filter(row=>row.moves.length);
const manifest={registered:names.length,mapped:names.length,presets:Object.keys(movePresentationPresets).length,review:movePresentationReview,vfx:usage,rankVfx:rankVfxCatalog};
writeFileSync('docs/assets/manifests/move-presentation-requirements.json',JSON.stringify(manifest,null,2)+'\n');
const rows=names.map(name=>{
 const p=movePresentation(name),review=movePresentationReview[name];
 return `| ${moveInfo[name].name} (${name}) | ${movePresentations[name]} | ${p.pokemonMotion} | ${p.screenEffect} | ${p.mainVfx} / ${p.impactVfx} | ${p.targetEffect} | ${p.sound} | ${p.specialSequence} / ${p.stateExpression} | ${p.duration} / ${p.impactAt} | ${review?'검토: '+review:p.rationale} |`;
});
const generated=`<!-- GENERATED: pnpm exec tsx scripts/document-move-presentations.ts -->

## 전체 기술 연출 매핑

등록 **${names.length}개**, 명시적 매핑 **${names.length}개**, 공용 프리셋 **${manifest.presets}개**. 일반 기술·전용 Z기술·범용 Z기술·맥스·거다이맥스를 모두 포함한다. 전용 VFX를 새로 추가하지 않는다. 타입은 색·재질의 참고값이며 프리셋 선택 기준이 아니다. 표의 설정은 목표 설계이며 현재 rendererStyle 공용 adapter는 일부 형태를 근사한다.

시간은 1배속 ms의 전체 / 대표 타격 시점이다. 실제 HP·랭크·상태 효과는 항상 공개 프로토콜 결과가 결정한다. Protocol은 결과 표시를 기존 전투/필드 시스템에 위임한다는 뜻이다. None은 별도 VFX 파일이 필요하지 않다는 뜻이다.

| 기술 | 프리셋 | PokemonMotion | ScreenEffect | MainVFX / ImpactVFX | TargetEffect | Sound | SpecialSequence / 상태 | 시간 | 판단·검토 |
|---|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}

## 역산한 공용 VFX 요구 목록

existing: 기존 자산으로 제공. procedural: 코드로 표현하므로 파일 불필요. approximation: 현재 공용 대체가 있으며 후속 품질 보강 후보. 기술 이름으로 파일을 요구하지 않는다. 괄호의 기술 수는 같은 기술이 main/impact에 사용해도 한 번만 센다.

| VFX | 상태 | 사용 기술 수 | 현재 표현 | 후속 보강 |
|---|---|---|---|---|
${usage.map(v=>`| ${v.id} | ${v.status} | ${v.moves.length} | ${v.implementation} | ${v.next??'추가 파일 불필요'} |`).join('\n')}
| AuraUp | procedural | 실제 상승 결과 전체 | 공용 CSS | 추가 파일 불필요 |
| AuraDown | procedural | 실제 하락 결과 전체 | 공용 CSS | 추가 파일 불필요 |

기술별 사용처와 별도 검토 ${Object.keys(movePresentationReview).length}개의 사유는 [기계 판독용 요구 목록](../assets/manifests/move-presentation-requirements.json)에도 기록한다. 모든 기술에 공용 설계가 있으며 검토 목록은 미매핑 목록이 아니다.
`;
const path='docs/gameplay/MOVE_EFFECTS_PLAN.md';
const marker='<!-- BEGIN GENERATED MOVE PRESENTATIONS -->';
let current=readFileSync(path,'utf8').split(marker)[0].trimEnd();
writeFileSync(path,current+'\n\n'+marker+'\n'+generated+'\n<!-- END GENERATED MOVE PRESENTATIONS -->\n');
console.log(`${names.length}/${names.length} mapped; ${manifest.presets} presets; ${usage.length} shared move VFX + 2 rank effects; ${Object.keys(movePresentationReview).length} review items`);
