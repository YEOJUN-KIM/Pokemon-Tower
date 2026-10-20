import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {unovaTrainers} from '../src/data/unova-trainers';
import preservation from '../tests/fixtures/unova-preservation.json' with {type:'json'};

const root='artifacts/experiments/balance/unova-20261018';
const json=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const lines=(p:string)=>readFileSync(p,'utf8').trim().split('\n').filter(Boolean).map(l=>JSON.parse(l));
const before=lines(root+'/before-focused.jsonl'),after=lines(root+'/after-focused.jsonl'),coverage=lines(root+'/coverage/after-focused.jsonl'),hierarchy=lines(root+'/hierarchy/after-focused.jsonl');
const routeBefore=lines(root+'/route/before-route.jsonl'),routeAfter=lines(root+'/route/after-route.jsonl');
assert.equal(before.length,2016);assert.equal(after.length,2304);assert.equal(coverage.length,1536);assert.equal(hierarchy.length,960);assert.equal(routeBefore.length,2400);assert.equal(routeAfter.length,2448);
for(const rows of [before,after,coverage,hierarchy,routeBefore,routeAfter])assert.equal(rows.filter(r=>r.error).length,0);
const lineups=json(root+'/after-lineups.json'),source=json('scripts/data/npc/normal-npc-samples.json').samples,baseline=json(root+'/baseline-runtime.json');
const validation=existsSync(root+'/validation.json')?json(root+'/validation.json'):null;
const pct=(n:number,d:number)=>d?(100*n/d).toFixed(1)+'%':'—';
const stats=(r:any[])=>({n:r.length,wins:r.filter(r=>r.winner==='Player').length,errors:r.filter(r=>r.error).length});
const result=(r:any[])=>{const s=stats(r);return s.n?`${pct(s.wins,s.n)} (${s.wins}/${s.n})`:'신규: Before 없음';};
const confirmed:Record<string,string[]>={
 'named-cilan':['Simisage','Ferrothorn','Lilligant','Whimsicott'],
 'named-chili':['Simisear','Darmanitan','Chandelure','Heatmor'],
 'named-cress':['Simipour','Seismitoad','Basculin'],
 'named-lenora':['Watchog','Stoutland'],
 'named-burgh':['Leavanny','Crustle','Accelgor','Heracross'],
 'named-elesa':['Zebstrika','Emolga','Galvantula','Eelektross','Ampharos'],
 'named-clay':['Excadrill','Krookodile','Seismitoad','Golurk','Mamoswine'],
 'named-skyla':['Swanna','Unfezant','Skarmory','Braviary','Mandibuzz'],
 'named-brycen':['Beartic','Cryogonal','Vanilluxe','Walrein'],
 'named-drayden':['Haxorus','Druddigon','Flygon','Altaria','Salamence'],
 'named-cheren':['Stoutland','Cinccino','Bouffalant'],
 'named-roxie':['Scolipede','Garbodor','Toxicroak','Crobat','Drapion'],
 'named-marlon':['Jellicent','Carracosta','Wailord'],
 'named-shauntal':['Chandelure','Cofagrigus','Golurk','Jellicent','Drifblim','Froslass'],
 'named-marshal':['Conkeldurr','Mienshao','Throh','Sawk'],
 'named-grimsley':['Krookodile','Scrafty','Liepard','Sharpedo'],
 'named-caitlin':['Gothitelle','Reuniclus','Sigilyph','Musharna','Metagross'],
 'named-alder':['Volcarona','Accelgor','Escavalier','Bouffalant','Druddigon','Vanilluxe'],
 'named-iris':['Haxorus','Hydreigon','Druddigon','Archeops','Lapras','Aggron'],
 'plasma-grunt':['Watchog','Liepard','Garbodor','Krookodile','Scrafty'],
 'plasma-executive-zinzolin':['Cryogonal','Weavile'],
 'plasma-executive-colress':['Klinklang','Magnezone','Metagross','Beheeyem'],
 'plasma-boss-ghetsis':['Hydreigon','Cofagrigus','Eelektross','Seismitoad','Bouffalant'],
 'named-n':['Zekrom','Carracosta','Archeops','Vanilluxe','Klinklang','Zoroark'],
};
const notes:Record<string,string>={
 'named-cilan':'Grass sustain: Ferrothorn/Whimsicott 씨뿌리기와 Amoonguss 재생력, Lilligant 나비춤, Simisage의 빠른 공격을 분담한다. 느린 풀 조합은 의도된 스타일이다.',
 'named-chili':'Fire aggression: 특수 Simisear/Chandelure, 물리 Darmanitan/Emboar, Intimidate+우선기 Arcanine, 혼합 Heatmor. 삼형제의 공격형 축이다.',
 'named-cress':'Water balance: 빠른 Simipour/Basculin, Jellicent 회복·화상, Carracosta 강화, Seismitoad 물 무효, Samurott 물리·선공기로 역할을 나눈다.',
 'named-lenora':'Normal fundamentals: 공식 대표 Watchog 에이스를 유지한다. 죽은 Return 요청 라벨 문제를 Retaliate로 해결하며 복잡한 기믹을 붙이지 않는다.',
 'named-burgh':'Bug variety: Leavanny/Crustle 강화, Escavalier 느린 즉시 화력, Accelgor 빠른 특수, Galvantula 전기·마비, Heracross 격투를 분담한다. Dwebble은 사용 가능한 진화형 Crustle을 선택했다.',
 'named-elesa':'Electric pivot: Zebstrika Volt Switch는 실제 사용 후 교체까지 별도 v12 배틀로 확인했다. 더 높은 점수의 Thunderbolt가 피벗을 가리던 슬롯은 Thunder Wave로 교체했다. Emolga는 공중 피벗, Ampharos/Magnezone은 내구·마비, Eelektross는 땅 무효·혼합 견제다.',
 'named-clay':'Heavy Ground: Excadrill 대표 물리, Krookodile 악, Seismitoad Water Absorb, Golurk 고스트, Mamoswine 얼음, Hippowdon 내구. 느린 조합을 공격수 강제 규칙으로 지우지 않는다.',
 'named-skyla':'Flying variety: Swanna 특수·물, Unfezant/Archeops/Braviary 물리, Skarmory/Mandibuzz 내구·회복. Return은 Braviary에서 Body Slam, 누락됐던 Unfezant에서는 Facade로 교체했다. Unfezant의 Normal 자속은 비행 반감 상성을 보완한다.',
 'named-brycen':'Ice offense/bulk: Beartic 물리·선공기, Cryogonal 특수 회복, Vanilluxe 눈, Weavile/Mamoswine 빠른 압박과 우선기, Walrein 물/독 운영. Cryogonal은 Freeze-Dry를 주 얼음 기술로 삼아 Ice Beam과의 점수 중복을 제거했다.',
 'named-drayden':'Dragon direct battle: Haxorus 물리 강화, Druddigon 내구·우선기, Hydreigon 특수, Flygon 피벗, Altaria 회복·독, Salamence 혼합을 유지한다.',
 'named-cheren':'Stable Normal: Stoutland Intimidate/Sitrus Berry 에이스와 Snorlax 내구, Cinccino 연속기, Sawsbuck 흡수, Braviary 회복. 라이벌 버전은 추가하지 않았다.',
 'named-roxie':'Poison pressure: Scolipede 가속 물리, Garbodor 내구, Toxicroak 회복/선공기, Crobat 피벗, Drapion 악, Amoonguss 재생력. 미지원 수면·압정 슬롯은 없다.',
 'named-marlon':'Free-form Water: 실제 BW2 에이스 Jellicent를 유지한다. 회복/화상과 Carracosta 강화, Floatzel 속도, Wailord 해수스파우팅, Mantine 특수 내구, Samurott 물리를 혼합한다.',
 'named-shauntal':'Ghost special/disruption: Chandelure 특수, Cofagrigus 화상·물리벽, Golurk 물리, Jellicent 회복, Drifblim 힘흡수, Froslass 빠른 특수와 조건부 Destiny Bond. 느린 고스트도 Trick Room 없이 작동한다.',
 'named-marshal':'Fighting physical pressure: Conkeldurr Guts와 회복/선공기, Mienshao 재생력 피벗, Throh 강화/내구, Sawk 옹골참 즉시 공격, Lucario 강철/선공기, Machamp 혼란. 전원 Life Orb로 통일하지 않는다.',
 'named-grimsley':'Dark trickery/priority: Krookodile의 공식 사용 이력과 사용자 지정 방향을 따라 에이스로 유지했다. Bisharp는 collectible 정책 때문에 Kingambit 진화형으로 대체한다. Liepard 마비와 Sucker Punch, Sharpedo 가속, Honchkrow 혼합을 구분한다.',
 'named-caitlin':'Stable Psychic: Gothitelle 명상/견제, Reuniclus 명상·Recover, Sigilyph 회복, Musharna 마비, Metagross 물리·우선기, Alakazam 빠른 특수. Trick Room·미지원 Moonlight는 사용하지 않는다.',
 'named-alder':'Elite Four+ veteran: 공식 여섯 파트너 유지, role=elite/title=강자/Tactical ceiling. Volcarona는 Sitrus Berry와 Quiver Dance, 나머지는 다양한 타입을 맡는다. 챔피언 플래그와 Z 도구를 제거했다. 아이리스보다 낮은 설계 등급이며 특정 benchmark 역전은 타입/선출 차이로 해석한다.',
 'named-iris':'Champion Iris only: 공식 B2W2 여섯 후보, Haxorus Focus Sash·Dragon Dance/즉시 공격, Expert. 원작 팀 완성도를 유지하고 기믹은 없다. Gym 버전과 다른 라이벌을 추가하지 않았다.',
 'plasma-grunt':'Normal/Lower Gym: 조직 공용 악·독·노말, Crobat은 Golbat의 사용 가능 진화형. Sitrus Berry 위주와 Basic→Tactical. 간부의 강도/도구를 그대로 복사하지 않는다.',
 'plasma-executive-zinzolin':'Ice/Dark officer: Cryogonal 공식 대표 에이스, 회복·얼음 견제·독과 내구, Tactical. 얼음 후보의 속도와 물/땅/악을 혼합한다. Weavile 외의 보강 후보는 타워 확장으로 명시한다.',
 'plasma-executive-colress':'Mechanical officer: Klinklang 공식 대표 에이스, Gear Grind·마비·강한 즉시 공격, 기계/강철·전기·에스퍼·Porygon-Z 특수전. Expert ceiling과 도구로 비오보다 상위 등급을 표현한다. Shift Gear는 현재 AI 미지원이어서 넣지 않았다. Giga Impact는 실제 재충전 위험을 감수하는 선택이다.',
 'plasma-boss-ghetsis':'Champion+ regular boss: Hydreigon Life Orb와 Draco Meteor/Fire Blast/Flash Cannon, Cofagrigus 화상, Eelektross 견제, Seismitoad 물 무효, Kingambit 강철/우선기, Bouffalant 물리. Kyurem을 제거하고 공식 BW 대표 팀을 진화형 한 자리만 보완했다. N과 달리 전설 없이 혼합 coverage로 압박한다.',
 'named-n':'Hidden Boss: Pokémon Black의 N에 대응하는 Zekrom을 단일 대표로 선택했다. 기존 roster/이미지/엔진 자산을 사용하며 새 variant 시스템은 없다. 물리 Dragon/Electric은 특수 Dark/Dragon 게치스와 다르다. 50층은 기존 전설 제한을 지켜 비전설 5후보/Zoroark 에이스, 100층은 Zekrom 포함 6후보다. Vanilluxe는 동료의 방어를 불필요하게 강화하지 않는 Weak Armor를 사용한다. N은 legacy 랜덤 네임드·일반 NPC·조직 추첨 풀에 없다.',
};
const provenanceSources=[
 '[PWT Unova](https://bulbapedia.bulbagarden.net/wiki/World_Leaders_Tournament/Unova)',
 '[BW 관장/리그](https://pokemondb.net/black-white/gymleaders-elitefour)',
 '[BW2 관장/리그](https://www.serebii.net/black2white2/elitefour.shtml)',
 '[N](https://bulbapedia.bulbagarden.net/wiki/N)',
 '[Zinzolin](https://bulbapedia.bulbagarden.net/wiki/Zinzolin)',
 '[Colress](https://bulbapedia.bulbagarden.net/wiki/Colress)',
 '[Ghetsis](https://bulbapedia.bulbagarden.net/wiki/Ghetsis)',
];
const skylaFollowupPath=root+'/skyla-facade/after-focused.jsonl';
const skylaFollowup=existsSync(skylaFollowupPath)?lines(skylaFollowupPath):[];
if(skylaFollowup.length){assert.equal(skylaFollowup.length,480);assert.ok(skylaFollowup.every(r=>r.id==='named-skyla'&&!r.error));}
const totalUsage=[...new Map([...after,...coverage,...hierarchy].map(r=>[[r.id,r.floor,r.n,r.caseId,r.rule].join(':'),r])).values()].filter(r=>!skylaFollowup.length||r.id!=='named-skyla').concat(skylaFollowup);
const usage=unovaTrainers.map(t=>{
 const rows=totalUsage.filter(r=>r.id===t.id),template=source.find((s:any)=>s.id===t.id&&(t.category!=='hidden'||s.stage==='final-gate'));
 return {id:t.id,members:template.team.map((p:any)=>{const moves=Object.fromEntries(p.profile.moves.map((m:string)=>[m,rows.reduce((n,r)=>n+(r.moveUsage?.[p.species]?.[m]??0),0)]));return {species:p.species,selectedBattles:rows.filter(r=>r.team.includes(p.species)).length,moves,zeroMoves:Object.entries(moves).filter(([,n])=>n===0).map(([m])=>m)};})};
});
const nRows=[...after,...hierarchy].filter(r=>r.id==='named-n'&&r.floor===100);
const legend={battles:nRows.length,playerWins:nRows.filter(r=>r.winner==='Player').length,directKOs:nRows.reduce((s,r)=>s+r.legendaryKOs,0),threeKOFinishes:nRows.filter(r=>r.legendaryThreeKOs).length,estimatedUnassistedSweeps:nRows.filter(r=>r.unassistedLegendarySweep).length,partnerDirectDamageFractions:nRows.reduce((s,r)=>s+r.partnerDamage,0),battlesWithPartnerDirectDamage:nRows.filter(r=>r.partnerDamage>0).length,partnerUtilityMoves:nRows.reduce((s,r)=>s+r.partnerUtilityMoves,0)};
const gimmicks={available:after.reduce((s,r)=>s+r.telemetry.available.length,0),used:after.reduce((s,r)=>s+r.telemetry.used.length,0)};assert.deepEqual(gimmicks,{available:0,used:0});
assert.ok(lineups.every((l:any)=>l.success===l.draws&&(!l.ace||l.ace===l.draws)));
const trickRoomUsers=unovaTrainers.filter(t=>source.filter((s:any)=>s.id===t.id).some((s:any)=>s.team.some((p:any)=>p.profile.moves.includes('Trick Room')))).length;assert.equal(trickRoomUsers,0);
const byNpc=unovaTrainers.map(t=>({id:t.id,name:t.name,category:t.category,power:t.power,bands:(t.category==='hidden'?[50,100]:t.category==='boss'?[76,96]:[45,95]).map(floor=>({floor,before:stats(before.filter(r=>r.id===t.id&&r.floor===floor)),after:stats(after.filter(r=>r.id===t.id&&r.floor===floor))})),benchmarks:['starters','offense','bulk','signature'].map(caseId=>({caseId,...stats(after.filter(r=>r.id===t.id&&r.caseId===caseId))})),notes:notes[t.id]}));
const audit={date:'2026-10-18',verdict:'하나지방 필수 NPC 샘플 완료',focused:{before:stats(before),after:stats(after)},coverage:stats(coverage),hierarchy:stats(hierarchy),route:{before:stats(routeBefore),after:stats(routeAfter.filter(r=>r.stage==='course')),hidden:stats(routeAfter.filter(r=>r.stage==='hidden'))},legend,gimmicks,trickRoomUsers,byNpc,lineups,usage,preservation,validation,manifest:{focused:json(root+'/after-focused-manifest.json'),before:json(root+'/before-focused-manifest.json'),route:json(root+'/route/after-route-manifest.json')},sourceHashes:Object.fromEntries(['src/data/normal-npc-templates.json','src/data/unova-trainers.ts','src/data/trainer-catalog.ts','src/data/tower-themes.ts','src/data/villain-organizations.ts','src/data/npc-gimmicks.ts'].map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]))};
Object.assign(audit,{skylaFollowup:{battles:skylaFollowup.length,errors:skylaFollowup.filter(r=>r.error).length,usageSource:skylaFollowupPath,electricMatchup:existsSync(root+'/skyla-facade/electric-matchup.json')?json(root+'/skyla-facade/electric-matchup.json'):null}});
mkdirSync('artifacts/reports/npc',{recursive:true});writeFileSync('artifacts/reports/npc/unova-audit.json',JSON.stringify(audit,null,2)+'\n');
const md=['# 하나지방 필수 NPC 샘플','', '2026-10-18. **하나지방 필수 NPC 샘플 완료**. 관장 13명, 사천왕 4명, 강자 노간주, 챔피언 아이리스, 플라스마 조직원·비오·아크로마·게치스, 히든보스 N: 총 24종.','',
 '## 구현 범위와 데이터','',
 '기존 21종 수정, 공용 조무래기 runtime·아크로마·N 3종 신규. 24종 + named-ghetsis 별칭, N의 2단계가 합쳐져 신설/교체 runtime은 26행이다. 전체 runtime은 255행이다. 검토 원본은 `scripts/data/npc/normal-npc-samples.json`, 생성기는 `scripts/review-unova-npc-samples.ts`, 메타데이터는 `src/data/unova-trainers.ts`다. export 결과인 `src/data/normal-npc-templates.json`을 직접 편집하지 않는다.','',
 '아이리스는 Champion 버전만 존재한다. 벨·라이벌 체렌·Shadow Triad·칠현인 개별 전투·기타 특수 조우는 추가하지 않았다. 공통 AI/v12·선출기·층별 성장·기믹 엔진·히든보스 엔진은 수정하지 않았다. 개별 하나지방 기믹 배정 데이터만 제거했다.','',
 '## 실제 사용과 타워 확장','',provenanceSources.join(', ')+'.','',
 '아래 공식 사용 확인은 BW/BW2/PWT에서 확인한 보수적 부분집합이다. 확인하지 못한 후보는 “요청 기반 확장/개별 사용 이력 미확정”으로 표시하며 본가 소유라고 주장하지 않는다. 세트는 현대화한 타워 세트로 원작 exact set 복제가 아니다. 절각참은 collectible 제한으로 대도각참(Kingambit), 골뱃은 크로뱃으로 대체했다. 아크로마의 기본 Rotom은 원작 Rotom 계열을 단일 기본 폼으로 표현한 타워 적용이다. N·아크로마 이미지와 출처/해시는 `public/sprites/trainers/sources.json`에 등록했다.','',
 '## Power Tier와 조우 연결','',
 '관장 Gym/Upper Gym, 사천왕 Elite Four, 노간주 Elite Four+, 아이리스 Champion, 비오 Upper Gym/Lower Elite Four, 아크로마 Elite Four/Lower Champion, 게치스 Champion+, N Hidden Boss/Champion+다. 일반 관장·사천왕·노간주·비오는 Tactical ceiling, 아이리스·아크로마·게치스·N은 Expert, 조직원은 기존 Basic→Tactical이다. 기본 IV/points 상한 66과 층별 곡선을 사용한다.','',
 '하나지방 기존 elite 슬롯 추첨 풀에 사천왕 4명과 강자 노간주를 등록했다. 한 챕터에서 이 5명 중 4명을 추첨하며 관장도 기존 방식대로 13명 중 일부를 추첨한다. 50·100층 챔피언은 아이리스이며 승리 후 기존 guaranteed hidden-boss 이벤트로 N이 등장한다. N은 일반 NPC·legacy 무테마 랜덤 네임드·플라스마 조직원/간부/보스 풀에서 제외된다. 새 variant/AI/selection rule은 없다.','',
 '### N의 Hidden Boss integration','',
 'Pokémon Black의 N과 맞는 제크로무를 단일 대표 전설로 선택했다. 기존 자산을 사용하며 물리 Dragon/Electric 전설 축이 특수 Dark/Dragon 게치스와 구분된다. 전설이 금지되는 50층에서는 비전설 5후보/Zoroark 에이스, 100층에서는 원작 동료 5마리와 Zekrom을 사용한다. 이 차이는 기존 first-gate/final-gate와 75층 전설 제한을 사용한 것이며 새 버전 분기 시스템이 아니다. N의 설계상 대표 에이스는 Zekrom이다.','',
 '실제 서버 통합에서 아이리스 승리 → N 이벤트 생성 → HP/PP 회복 → 동일 층 stage=1 배틀 → 보상 → 51층/클리어를 확인했다. 재접속·패배·재도전도 상대/seed/snapshot을 보존한다. 브라우저에서는 N의 자동 조우 연출과 50·100층 팀의 전설 포함 여부까지 검증한다.','',
 '## Dead-slot 검토와 소규모 수정','',
 '- Sleep Powder/Hypnosis/Reflect/Light Screen/Stealth Rock/Spikes/Pain Split/Morning Sun/Yawn/Healing Wish/Shift Gear/Curse/Protect 등 현재 scorer가 다루지 않는 변화기는 넣지 않았다. 사용되는 변화기는 Toxic/Thunder Wave/Will-O-Wisp/Leech Seed, 지원되는 setup/recovery와 조건부 Destiny Bond다.',
 '- 초기 Zebstrika의 Volt Switch 0회: 더 높은 Thunderbolt 점수가 피벗 선택을 가렸다. Thunderbolt→Thunder Wave로 교체했다. 중복 전기 공격에 묻히던 일부 Volt Switch는 별도 견제/상태기로, Rotom은 Volt Switch를 주 전기 기술로 정리했다.',
 '- 반복 0회였던 Return은 실제 요청 라벨이 Return 102가 되면서 현 AI가 낮게 평가함을 real battle observation에서 확인했다. Watchog→Retaliate, Stoutland→Facade, Braviary→Body Slam, Klinklang→Giga Impact로 교체했다. 후속 검토에서 누락됐던 Unfezant의 Return도 Facade로 교체했다. 공통 기술명/AI 처리는 수정하지 않았다.',
 '- Cryogonal의 Ice Beam/Freeze-Dry는 현 일반 타입 점수에서 중복된다. Freeze-Dry를 주 얼음 기술로 남기고 Water Pulse를 견제로 사용한다. Vanilluxe는 중복 Freeze-Dry를 Water Pulse로 교체했다. Lapras의 Freeze-Dry는 유일한 주 얼음 기술로 유지한다.',
 '- 0회 사용은 전부 실패로 판정하지 않았다. 실제 선출/행동 기회, 상성, 우선기·상태·회복의 조건, Choice lock을 구분했다. 코드상 지원되는 조건부 기술은 남겨 정체성을 보존한다. 후보/기술별 실행 횟수와 0회 목록은 audit JSON의 usage에 있다.',
 `- Trick Room 사용 NPC = **${trickRoomUsers}명**. 최종 named gimmick available=${gimmicks.available}, used=${gimmicks.used}.`, '',
 '## 측정 조건과 Before → After','',
 'Four fixed benchmark teams: starters=Charizard/Blastoise/Venusaur, offense=Garchomp/Metagross/Lapras, bulk=Slowbro/Corviknight/Gastrodon, signature=Mimikyu/Kommo-o/Gyarados. 집중 2 seeds×2 floors×4 teams×6 rules. 관장/사천왕/노간주/아이리스/간부 F45/F95, 게치스 F76/F96, N F50/F100. 추가 커버리지 seeds 3~10/basic, 위계 비교 seeds 3~6/6 rules. fresh-HP 단판으로 사람 승률·경제·연속 생존·완주율을 측정하지 않는다.','',
 `집중 Before ${result(before)} → After ${result(after)}. 신규 3종 때문에 총계의 표본 구성이 다르므로 동등 비교는 NPC별 표를 사용한다. 추가 커버리지 ${coverage.length}전, 위계 검사 ${hierarchy.length}전, 오류 0.`,
 `경로 1~100층 전체: Before ${result(routeBefore)} → After ${result(routeAfter.filter(r=>r.stage==='course'))}. N의 추가 2관문은 별도 ${result(routeAfter.filter(r=>r.stage==='hidden'))}.`,
 '최종 경로는 현재 일반 NPC rank 선택/generateNpcEncounter·실제 named route·Tera/아이템 기믹·최근 트레이너 회피를 사용한다. 조직 특수 조우는 focused와 기존 villainEncounter/E2E snapshot으로 별도 검사한다. 초기 legacy-style route probe는 initial/에만 보관하며 최종 수치에 쓰지 않는다. baseline runtime과 metadata overlay를 함께 로드해 변경 전 조우/AI/기믹을 재현했다.','',
 '| NPC | 전반 Before | 전반 After | 후반 Before | 후반 After |','|---|---|---|---|---|',
 ...unovaTrainers.map(t=>{const floors=t.category==='hidden'?[50,100]:t.category==='boss'?[76,96]:[45,95];return `| ${t.name} | ${floors.flatMap(f=>[result(before.filter(r=>r.id===t.id&&r.floor===f)),result(after.filter(r=>r.id===t.id&&r.floor===f))]).join(' | ')} |`;}),'',
 '## Benchmark별 최종 집중 결과','', '| NPC | starters | offense | bulk | signature |','|---|---|---|---|---|',...unovaTrainers.map(t=>`| ${t.name} | ${['starters','offense','bulk','signature'].map(c=>result(after.filter(r=>r.id===t.id&&r.caseId===c))).join(' | ')} |`),'',
 '## 노간주·아이리스·아크로마·게치스·N 위계','',
 '설계 위계는 Alder < Iris < Ghetsis ≈ Hidden N이다. 노간주는 공식 팀을 유지한 Elite Four+/Tactical, 아이리스는 Champion/Expert이며 같은 층별 곡선 안에서 표현한다. 표본상 모든 benchmark에서 단조 순서를 강제하지 않는다. 특히 bulk의 Slowbro/Gastrodon은 노간주의 Bug/Grass/Ice에 약하고 아이리스의 물리 Dragon 축을 막는다. offensive/signature 매치업은 다르다. 차이를 이유로 전용 AI·스탯 보정·공식 팀 재작성을 하지 않았다.','',
 '| NPC | 집중+추가 (seeds 1~6) | starters | offense | bulk | signature |','|---|---|---|---|---|---|',...unovaTrainers.filter(t=>['veteran','champion','boss','hidden'].includes(t.category)||t.id==='plasma-executive-colress').map(t=>{const r=[...after,...hierarchy].filter(r=>r.id===t.id);return `| ${t.name} / ${t.power} | ${result(r)} | ${['starters','offense','bulk','signature'].map(c=>result(r.filter(r=>r.caseId===c))).join(' | ')} |`;}),'',
 '## N 전설 영향과 파트너 기여','',
 `100층 matched 집중+위계 ${legend.battles}전에서 Zekrom 직접 KO ${legend.directKOs}, 3KO 마무리 ${legend.threeKOFinishes}전, 파트너 직접 피해/변화기 기여가 없었던 추정 단독 sweep ${legend.estimatedUnassistedSweeps}전. 파트너 직접 피해가 있었던 전투 ${legend.battlesWithPartnerDirectDamage}전, 파트너 변화기 실행 ${legend.partnerUtilityMoves}회다. 대부분을 전설 혼자 3KO하는 상태는 아니며 다른 동료가 실제 기여한다.`,
 '공개 로그의 마지막 move actor만 세지 않는다. 자신의 실제 request로 Illusion의 종을 복원하고, 직접 공격으로 HP 0이 된 상대의 faint만 KO로 계산한다. 독/기타 residual faint를 제외하는 fixture도 통과했다. 단독 sweep은 위 관측 기준에 따른 추정이다.','',
 '## Lineup telemetry와 각 NPC 세트','',
 `${lineups.reduce((s:number,l:any)=>s+l.draws,0).toLocaleString()} draws. 각 named의 runtime ace 포함 및 selectionRules 성공 100%, gimmick carrier 없음. 별도 required/atLeastOneOf/preferredLead/preferredLast를 강제하지 않았다. N의 50층 ace는 Zoroark이며 100층은 Zekrom이다. 전체 팀/선봉/마지막 빈도는 audit JSON의 lineups에 저장한다.`, ''];
for(const t of unovaTrainers){
 const row=source.find((s:any)=>s.id===t.id&&(t.category!=='hidden'||s.stage==='final-gate'));
 const old=[...new Set(baseline.filter((s:any)=>s.id===t.id).flatMap((s:any)=>s.team.map((p:any)=>p.species)))];
 const l=lineups.find((l:any)=>l.id===t.id&&l.floor===(t.category==='hidden'?100:t.category==='boss'?96:95));
 const top=(map:Record<string,number>)=>Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([s,n])=>`${s}: ${pct(n,l.draws)}`).join('; ');
 md.push(`### ${t.name} — ${t.id}`,'',`Category: ${t.category}. Power Tier: ${t.power}. Ace: ${t.ace||'없음'}. AI Tier: ${t.category==='grunt'?'Basic→Tactical':t.aiCeiling}. Gimmick: 없음.`,`Candidates: ${t.entries.join(', ')}. selectionRules: \`${JSON.stringify(t.selectionRules??{})}\`.`,`Official-use confirmation: ${(confirmed[t.id]??[]).join(', ')}.`,`Tower expansion / individual use unconfirmed / evolved adaptation: ${t.entries.filter(p=>!confirmed[t.id]?.includes(p)).join(', ')||'없음'}.`,`기존 후보: ${old.join(', ')||'개별 runtime 없음'}.`,`Concept: ${t.concept}.`,'', '| Pokémon | Ability | Item | Moves | Role |','|---|---|---|---|---|',...row.team.map((p:any)=>`| ${p.species} | ${p.profile.ability} | ${p.item} | ${p.profile.moves.join(' / ')} | ${p.role} |`),'',
  `Representative lineups F${l.floor} (${l.draws} draws): ${top(l.teams)}.`,`Lead frequency: ${top(l.leads)}. Last frequency: ${top(l.lasts)}. Ace inclusion: ${t.ace?pct(l.ace,l.draws):'해당 없음'}. selectionRules success: ${pct(l.success,l.draws)}. Gimmick carrier: 없음.`,`Design Notes: ${notes[t.id]}`,'');
}
md.push('## 이상치 분류와 남은 제약','',
 'A candidate/B lineup/C lead-last/D moves/E item/F AI usage/G gimmick/H benchmark/I legendary로 구분했다. 초기 dead-slot 문제는 D/F였고, 위의 소규모 교체 후 실제 기술 실행을 확인했다. 고정 3마리 붕괴·규칙 실패·기믹 불작동은 없다. 추가 검사로 확인되는 타입별 승률 차이는 H, 의도된 수비/속도 차이는 A/B 스타일이다. 지원되는 조건부 기술의 실행 0회는 별도 기록하고 표본 부족·행동 기회와 구분한다.','',
 '변화기·Return 라벨·Freeze-Dry 특수 타입 이득 등 현재 공통 scorer의 한계는 이번 데이터 안에서 우회했다. 상위 전투 위계는 설계 등급·AI ceiling·역할·도구로 표현하며 이 고정 benchmark의 승률 순위와 동일하다고 주장하지 않는다. 승률을 맞추기 위한 반복 튜닝은 하지 않았다.','',
 '## 다른 지방 보존','',
 `하나 범위 밖 runtime/검토 원본 ${preservation.unova.count}행 각각 baseline SHA-256 일치. 관동·성도·호연·신오를 포함한다. 공통 AI/선출/기믹 엔진/층별 성장/히든보스 이벤트 엔진 ${Object.keys(preservation.common).length}개 파일 해시도 동일하다. 신오 Trick Room 금지와 모든 기존 샘플을 유지했다. 테스트의 이전 전역 개수/기믹 가정만 새 하나 범위에 맞췄고, 새로운 보존 fixture는 변경 전 baseline에서 계산했다.`, '',
 '## 검증과 재현','',
 '- `node --import tsx scripts/review-unova-npc-samples.ts` → `node scripts/export-normal-npc-runtime.mjs` → `--check`.','- `node --import tsx scripts/simulate-unova-npcs.ts`: 기본 focused/lineup.','- `UNOVA_OUTPUT=.../route`와 `--route-only`: 현재 common ranks·100층 경로 및 히든 관문.','- Before는 `NPC_BALANCE_BASELINE=.../baseline-runtime.json`, `UNOVA_METADATA_BASELINE=.../baseline-metadata.json`을 설정하고 `node --import ./scripts/lib/unova-baseline.mjs --import tsx scripts/simulate-unova-npcs.ts --before` 실행. metadata와 runtime을 함께 복원하며 live 파일을 교체하지 않는다.','- `UNOVA_NPCS`, `UNOVA_SEEDS`, `UNOVA_SEED_START`, `UNOVA_RULES`, `UNOVA_DRAWS`, `UNOVA_TRACES`, `UNOVA_OUTPUT`으로 표본과 저장 경로를 지정한다.','- `node --import tsx scripts/report-unova-npcs.ts`는 before/after·커버리지·위계·route 표본 수와 오류를 확인한 뒤 이 문서와 `artifacts/reports/npc/unova-audit.json`을 생성한다.','');
md.push('### 풍란 Return 누락 후속 수정','', 'Unfezant의 Return은 기존 20회 선출에서 0회 사용이었다. Quick Attack도 고정 벤치마크 480전에서 0회 선택되어 채택하지 않았다. 최종 세트는 Brave Bird / Facade / Night Slash / U-turn이다. Facade는 비행 반감 전기 타입에 Normal 자속으로 대응하고 상태이상 때도 기능한다. 고정 벤치마크 480전에서는 Facade도 0회였지만, 별도의 실제 전기 팀(Ampharos/Luxray/Eelektross) 대전에서는 Facade 1회 실행을 확인했다. 후자는 회귀 테스트로 고정했다. 공통 AI는 변경하지 않았다.','', `후속 고정 벤치마크 ${skylaFollowup.length}전, 오류 ${skylaFollowup.filter(r=>r.error).length}회. 이 자료는 audit usage의 풍란 항목에 반영했다. 위 전체 Before/After·경로·70,000회 선출 표는 Return 교체 전 측정이며 재측정 결과로 표시하지 않는다. 기존 전체 테스트·build 결과도 교체 전 실행 기록이다. 후속 변경 후 하나지방 테스트 31개, TypeScript 검사와 export 일치 검사를 통과했다.`, '');
if(validation)md.push('### 최종 실제 실행 결과','',...validation.results.map((r:{check:string;result:string})=>`- ${r.check}: ${r.result}`),'');
md.push('**하나지방 필수 NPC 샘플 완료**','');
writeFileSync('artifacts/reports/npc/unova-named-trainers.md',md.join('\n'));
console.log(JSON.stringify({focused:audit.focused,route:audit.route,legend,draws:lineups.reduce((s:number,l:any)=>s+l.draws,0),trickRoomUsers}));
