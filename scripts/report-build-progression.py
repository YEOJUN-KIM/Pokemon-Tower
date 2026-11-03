"""Render the generated Before/After audit (optional matplotlib plots)."""
import json,pathlib,re
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
P=pathlib.Path('artifacts/build-progression-audit')
D=json.loads((P/'comparison-1000.json').read_text(encoding='utf-8'))
S=json.loads((P/'summary-1000.json').read_text(encoding='utf-8'))
Q=json.loads((P/'controlled-probes.json').read_text(encoding='utf-8'))
bands=['1-10','11-20','21-30','31-40','41-49','50','51-60','61-70','71-80','81-90','91-99','100']
def rate(g,k):return 100*g.get(k,0)/(g['slots'] if k in ['itemSlots','aligned','stab'] else g['n'])
def gimmick(g):return 100*(g['n']-g['gimmick'].get('none',0))/g['n']
def mean(g,k):return g[k]/g['n']
def pair(b,a):return f'{b:.1f} → {a:.1f}'
def top(o,n=8):return sorted(o.items(),key=lambda x:-x[1])[:n]
fig,axs=plt.subplots(2,2,figsize=(14,8),layout='constrained')
for version,color in [('before','#718096'),('after','#3182ce')]:
 G=[D[version]['bands'][k] for k in bands]
 for ax,values in zip(axs.flat,[[gimmick(g) for g in G],[rate(g,'roleDuplicate') for g in G],[rate(g,'itemSlots') for g in G],[mean(g,'ev') for g in G]]):
  ax.plot(bands,values,marker='o',color=color,label=version);ax.tick_params(axis='x',rotation=45);ax.grid(alpha=.2);ax.legend()
for ax,title in zip(axs.flat,['Assigned gimmick teams (%)','Teams with duplicate primary roles (%)','Pokemon with held items (%)','Mean stat-point budget / Pokemon']):ax.set_title(title)
fig.suptitle('Pokemon Tower: 1,000 seeded runs before / after\nRegular 100-floor encounters; extra events excluded; availability is not activation',fontsize=13)
fig.savefig(P/'before-after.png',dpi=140);plt.close(fig)
lines=[]
def add(s):lines.append(s.strip()+'\n')
def table(head,rows):add('|'+ '|'.join(head)+'|\n|'+'|'.join(['---']*len(head))+'|\n'+'\n'.join('|'+ '|'.join(str(v) for v in r)+'|' for r in rows))
add('''# Pokemon-Tower 1–100층 진행 구조 v2 구현 및 측정

**신규 Run은 hundred-floor-v2, 기존 v1/legacy Run과 저장된 상대는 보존한다. 커밋하지 않았다.** 가격·상점 가중치·보상 금액·재화 공식은 변경하지 않았다. 이번 결과는 상대 생성과 통제된 전투 측정이며, 인간 플레이어나 실제 성장·구매 정책을 포함한 1,000회 클리어율이 아니다.

## 1. 기존 문제

층 prior에 클래스 가중치를 곱하던 규칙 때문에 초반 에이스는 Elite로 확정될 수 있었다. Rank 기믹에는 50층 제한이 없었고, 일부 지역 챔피언에는 기믹이 없었다. 공통 Normal은 후반에도 완화 기술·berry 중심, 낮은 AI ceiling을 유지했다. 30층 이후 종 풀 증가는 적었고 조합보다 IV/포인트의 증가가 두드러졌다. 원래 50층은 IV24/포인트46으로 일반전과 큰 단차를 만들었다.

이전 보고의 Paradox 설명은 정정한다. Iron Crown/Iron Boulder/Raging Bolt/Gouging Fire는 이 Dex에서 tags가 비어 있고 로스터의 legendary/mythical이 false여서 실제 공통 필터를 통과한다. 이 네 종을 새로 금지하지 않았다.

## 2. 수정 시스템과 파일

- `src/data/opponent-progression.ts`: 층 stage, 부드러운 Rank prior, 슬롯·육성 예산·기믹 확률.
- `src/server/npc-progression-builds.ts`: 합법 기술, 공격 능력치, 역할, coverage, 도구 호환.
- `src/server/npc-progression-team.ts`: 네임드의 초반 적응과 기믹 없는 실전 도구 대체.
- `src/server/npc-encounters.ts`, `npc-training.ts`, `opponent-team.ts`: 기존 후보/조합/학습 생성기에 v2 정책 연결.
- `src/server/npc-templates.ts`: 정체성을 유지하는 챔피언 Tera 대안, 준비 구간과 50층의 육성 단차 완화.
- `src/data/npc-ai.ts`, `src/battle/build-support-policy.ts`, `npc-policy.ts`: 저장 descriptor로 선택하는 지원 기술 운영과 후기 교체 AI.
- `src/server/tower-store.ts`, `schema.ts`, `storage/migrations.ts`: 새 Run 버전·schema48, 전투 유효 룰 저장, 저장/재도전 호환.
- `src/server/run-events.ts`, `challenger-events.ts`, `mirror-challenger.ts`, `trainer-event-battle.ts`: 이벤트 경로에 동일 gate 적용.
- `src/shared/contracts.ts`, `src/web/tower-shop.tsx`: 조기 구매한 장비도 50층까지 발동하지 않는다는 안내.
- `tests/build-progression.test.ts`, 기존 참조/저장/재생 테스트: 새 정책과 v1 보존을 함께 검증.
- `scripts/audit-build-progression.ts`, `compare-build-progression.ts`, `probe-build-progression.ts`: 재현 가능한 상대·Rank별·통제 전투 비교.

상세 설계는 `docs/engineering/opponent-progression.md`에 기록했다. 기존 지역별 고정 JSON과 에이스·필수 멤버·선봉/마지막 배치·3대3 구조를 유지했다.

## 3. 층별 정책
''')
table(['구간','기술/역할','장비/AI/기믹'],[
 ['1–10','자속 중심, 비자속 coverage 타입 최대1, 간단한 보조기. setup·복잡한 specialist 제외','일반·Elite 무도구, basic AI, Master 추첨0, 기믹0'],
 ['11–20','자속/기본 coverage/간단한 상태이상. setup/회복/실전 장비 동시 완성 금지','타입 강화 도구·berry, tactical, 기믹0'],
 ['21–30','역할에 맞는 setup/status, 일치하는 공격기 최소2','기본 강화 도구, Rank별 coverage 평가 차이, 기믹0'],
 ['31–40','회복·pivot·screen을 적합한 종에 허용','2–3도구, 역할 장비, tactical/일부 expert'],
 ['41–49','기믹 없는 완성형 일반전; 네임드 원래 후기 기술','3도구, Life Orb/Sash/Choice/Leftovers/Light Clay 등'],
 ['50','지역 에이스·후기 원래 기술·높은 조합 완성도','3도구·expert·대표 기믹 지정 보장'],
 ['51–70','Normal 포함 모든 Rank 실전형, 기술과 장비 호환','3도구, Elite 기믹 점증, Master95%, Normal0%'],
 ['71–80','후보 선택과 3마리 역할 배정을 함께 평가','가능한 최대 역할 다양성; 새로운 공통전 모두 실전 장비'],
 ['81–90','공통 약점·물리/특수 화력 보완','공통 Normal도 expert; 공개 정보 기반 교체'],
 ['91–99','전 Rank 완성형, Master는 더 좋은 coverage/후보 품질','Elite 기믹 최대55%, Master100%, Normal0%'],
 ['100','기존 Champion 정체성·에이스·원래 기술, 실제 역할 조합 평가','3도구·expert·대표 기믹, 추가 히든 기존 구조 유지']])
add('''## 4. Rank별 변경

클래스의 0 가중치가 층별 정책을 무효화하지 않도록 soft preference를 사용한다. 초반 에이스도 Normal이 될 수 있고 Master는 10층까지 실제 추첨되지 않는다. 종의 BST bias는 Elite 4→1.5, Master 8→3으로 낮추고, 기존 조합 점수에 역할/약점/물리·특수 보완을 추가했다. 공급된 specialty 풀을 넓히지는 않는다.

Normal도 현재 층의 완성형 기준을 지킨다. Elite/Master는 더 넓은 후보, 유효한 추가 coverage에 더 높은 가중치, 좋은 도구 선호 확률과 AI로 차이를 만든다. IV/포인트의 Rank 간격은 좁혔다. 후반 Normal의 투자 포인트 자체도 증가하므로 ‘수치 변화 없음’이라고 주장하지 않는다. 아래 동일 투자 실험으로 빌드 변화의 효과를 별도로 확인한다.

## 5. 특수기믹 정책

정규/도전자/네임드의 1–49층 기믹을 막았다. 상대 기믹은 플레이어의 룰에 독립적이며 Normal은 계속 사용하지 않는다. 50층 챔피언은 원래 대표 기믹을 유지하고, 없던 Cynthia/Garchomp·Iris/Haxorus·N/Zekrom은 기존 에이스의 테라스탈로 전환 경험을 만든다. 메가 폼이나 새로운 종을 억지로 추가하지 않았다. 무기믹 정체성이 있는 일반 네임드 officer에 일괄 테라를 주지는 않았다.

레이드와 미러 도전자는 50층 이후에 제시한다. 기존 pending 이벤트는 재생성하지 않는다. 상점의 경제 규칙은 그대로 두고 플레이어 장비의 전투 발동을 50층까지 잠근다. 유효한 전투 룰을 상대/시드와 같이 저장하므로 완료 검증·재시작·재도전·리플레이가 일치한다. Run의 선택 룰/장비 소유는 보존한다.

## 6. 후반 Normal 개선

berry 고정에서 벗어나 공격/내구/랭크업/pivot/상태이상/screen/마무리 역할별 장비를 사용한다. Choice/Assault Vest와 Status 기술의 충돌을 막고, screen+Light Clay, pivot+Boots/Leftovers, 약한 내구 setup+Sash 등을 우선한다. mixed 공격은 자기 공격 능력치를 깎는 성격을 피한다. 51층부터 자신의 실제 기술과 충돌하지 않는 네이티브 Surge 특성을 합법성 검사 후 선택해 일부 필드 전개도 제공한다. 모든 특성을 전면 최적화한 것은 아니며 네임드 특성은 유지한다. 일반 빌드에서는 현재 AI가 턴 예약을 운용하지 못하는 Future Sight 계열을 피하고, setup 호환성은 최종 네 기술에서도 재확인한다.

71층부터는 역할을 순서대로 탐욕적으로 뽑지 않고 전체 3마리의 가능한 역할 배정을 비교한다. 네임드는 실제 고정 기술에서 역할을 판별한다. 후보가 제한된 specialty/고정 네임드에는 중복이 남을 수 있으며 통계에서 숨기지 않는다. 지원 AI는 무조건 setup/설치기를 누르지 않고 공개된 위협, HP, KO 가능성, 이미 전개된 필드를 확인한다.

## 7. 테스트 결과
''')
for filename in ['validation-tests.log','final-rule-tests.log','final-verification-tests.log']:
 p=P/filename
 if p.exists():
  t=p.read_text(encoding='utf-8',errors='replace');totals={k:re.findall(r'ℹ '+k+r' (\d+)',t) for k in ['tests','pass','fail']}
  add(f"`{filename}`: "+', '.join(k+'='+v[-1] for k,v in totals.items() if v)+'.')
add('''일반 회귀의 4실패는 유효 전투 rule 변경에 따른 기존 fixture/기대값 문제였고, 수정 후 해당 4파일 24/24가 통과했다. 최신 통합 집중 검사 43/43도 통과했다. 따라서 최초 일반 회귀 로그를 전체 통과로 표기하지 않는다. 일반 회귀에서는 Windows symlink EPERM/런처 timeout이 확인된 compact-standalone, mixed-assets, player-launcher 세 파일을 제외했다.

새 전 층/Rank 검사, 9지역 50/100층, v47→48 migration, early 장비 잠금, 레이드 해금, 실제 screen 사용, 실제 전투 완료/저장/리플레이를 검사한다. v1 고정 참조 검사는 v1을 명시해 계속 보존한다. 타입 검사는 로컬 TypeScript 실행기로 수행했다. 실제 TowerStore의 basic/chaos × 100층, 총 200개 상대에서 종·기술·도구·IV·포인트가 분석 생성기와 정확히 일치했다. 통제 전투 3,400개는 오류 없이 완료했다.

프로덕션 Next.js 빌드도 성공했다(`production-build.log`). 최초 sandbox 실행에서는 Windows junction 생성이 거부됐고, 권한 검토를 거친 재실행에서 컴파일·TypeScript·정적 페이지 생성이 모두 통과했다. 검증 DB 경로를 별도로 지정했다.

## 8. Before / After 시뮬레이션

같은 Run ID/층 seed 규칙으로 각 1,000 Run × 정규 100층을 비교했다. 추가 히든은 분리했다. 각 층 1,000개이며 모든 Run이 해당 층에 도달했다고 가정하는 조건부 생성 분포다. 사망·구매·영입·텔레포트 선택을 모델링한 생존 확률은 아니다. 기믹률은 ‘지정/사용 가능’이며 실제 발동은 통제 전투 로그로 별도 확인한다.

![구간별 변화](before-after.png)
''')
rows=[]
for k in bands:
 b=D['before']['bands'][k];a=D['after']['bands'][k]
 rows.append([k,' / '.join(f'{100*a["rank"].get(r,0)/a["n"]:.1f}' for r in ['normal','elite','master','named']),pair(mean(b,'bst'),mean(a,'bst')),pair(mean(b,'iv'),mean(a,'iv')),pair(mean(b,'ev'),mean(a,'ev')),pair(rate(b,'itemSlots'),rate(a,'itemSlots')),pair(gimmick(b),gimmick(a))])
table(['구간','After N/E/M/Named %','BST B→A','IV B→A','포인트 B→A','도구 개체% B→A','기믹 팀% B→A'],rows)
table(['구간','Setup% B→A','Pivot% B→A','회복% B→A','설치% B→A','Screen% B→A','역할중복% B→A','공격 정합성 개체% B→A'],[[k,*[pair(rate(D['before']['bands'][k],m),rate(D['after']['bands'][k],m)) for m in ['setup','pivot','recovery','hazard','screen','roleDuplicate','aligned']]] for k in bands])
add('''역할 중복은 실제 기술의 주역할 분류에서 같은 역할이 둘 이상인 팀 비율이다. 공격 정합성은 종의 공격 성향과 공격기 카테고리의 일치 지표이며 mixed·방어 능력치 공격은 별도로 인정한다. specialist나 네임드의 의도된 혼합/고정 역할은 기계적 분류의 한계가 있다. 역할 중복만으로 전략적 무가치를 뜻하지 않는다.
''')
add('After 첫 정규 기믹 지정 층 분포: `'+str(D['after']['first'])+'`.')
table(['구간','상태이상 기술% B→A','날씨% B→A','필드% B→A','최근3전 종 중복 개체% B→A','최근3전 동일팀% B→A','After 상위 종 / 타입'],[[k,pair(rate(D['before']['bands'][k],'status'),rate(D['after']['bands'][k],'status')),pair(rate(D['before']['bands'][k],'weather'),rate(D['after']['bands'][k],'weather')),pair(rate(D['before']['bands'][k],'terrain'),rate(D['after']['bands'][k],'terrain')),pair(100*D['before']['bands'][k]['repeatSpecies']/D['before']['bands'][k]['slots'],100*D['after']['bands'][k]['repeatSpecies']/D['after']['bands'][k]['slots']),pair(rate(D['before']['bands'][k],'repeatTeam'),rate(D['after']['bands'][k],'repeatTeam')),str(top(D['after']['bands'][k]['species'],3))+' / '+str(top(D['after']['bands'][k]['types'],3))] for k in bands])
add('상태이상은 직접 상태이상을 거는 Status 기술만 센다. 공격기의 부가효과는 별도다. 종 중복은 같은 Run의 최근 3전 상대에 포함된 종의 개체 비율이며, 고정 네임드도 포함한다. 모든 정규전의 파티 크기는 3이다. After 전체 100,000팀에서 부적합 Choice/Assault Vest+Status 및 지원 공격기 2개 미만인 setup은 모두 0건이다.')
table(['후기 Normal 구간','표본수','도구 개체율','주역할 분포','상위 도구'],[[k,g['n'],f'{rate(g,"itemSlots"):.1f}%',str(top(g['roles'],8)),str(top(g['items'],8))] for k in ['71-80:normal','81-90:normal','91-99:normal'] for g in [D['after']['byRank'][k]]])
add('''### 투자 수치를 고정한 보조 전투

동일 스타팅 3마리·IV15·포인트33·무도구·기믹 없음·TowerPolicy를 기준팀으로 썼다. 각 층 50개 표본이다. Equal-training은 Before/After 상대 모두 IV15, 중립 성격, 동일 33포인트(HP8/나머지5)로 고정하고 종·기술·도구·AI·기믹만 남긴 비교다. 이는 인간 승률이나 클리어율이 아니며 표본 오차가 크다. 종과 Rank 선택 자체도 개선 대상이므로 같은 종을 강제로 맞춘 실험은 아니다.
''')
table(['층','실제투자 기준팀 승리 B→A /50','동일투자 승리 B→A /50','After 기믹 지정/발동','오류 B/A'],[[f,f"{Q['groups'][f'before:actual:{f}']['wins']} → {Q['groups'][f'after:actual:{f}']['wins']}",f"{Q['groups'][f'before:equal-training:{f}']['wins']} → {Q['groups'][f'after:equal-training:{f}']['wins']}",f"{Q['groups'][f'after:actual:{f}']['equipped']} / {Q['groups'][f'after:actual:{f}']['activated']}",f"{Q['groups'][f'before:actual:{f}']['errors']} / {Q['groups'][f'after:actual:{f}']['errors']}"] for f in [1,10,20,30,40,49,50,51,70,90,99,100]])
add('''상세 수치: `comparison-1000.csv`(구간·Rank), `comparison-1000.json`(각 층 포함), `summary-1000.json`, `controlled-probes.json`, `encounters-1000.jsonl.gz`. 동일 투자 결과로도 차이가 남으면 IV/포인트 증가만으로 설명할 수 없는 빌드 변화가 있다는 근거다. 승리 수의 작은 차이는 과도하게 해석하지 않는다.

## 9. 남은 문제

- 51층 기믹 구매/보유 코인/70층 6마리 도구 완성은 보장하지 않는다. 경제 조정은 요청대로 별도다.
- 아직 모든 특성·날씨·필드·item counterplay까지 최적화하지 않았다. 실제 운용은 공개 정보 기반 heuristic이다.
- 전문 타입/고정 네임드는 역할·공통 약점 중복을 완전히 제거할 수 없다. 원래 정체성과 필수 멤버를 우선했다.
- 50층의 Mega/Dynamax/Tera/Z는 원래 효과가 다르므로 수치 예산을 맞춰도 지역별 실제 체감 편차가 남는다.
- **P1: 49→50층의 전투 단차는 아직 크다.** 고정 기준팀 승리 수가 34/50→7/50, 동일 투자에서도 37/50→12/50이다. 준비 구간 장비와 육성 단차는 개선했지만, ‘자연스러운 난이도’가 검증됐다고 결론낼 수 없다. 챔피언의 종/기술/기믹 복합 효과를 지역별로 더 측정해야 한다.
- **P1: 후기 빌드 개선 효과는 층별로 균일하지 않다.** 동일 투자 51층 38→33, 99층 35→30은 기준팀 승리가 감소했지만 70층 18→18, 90층 23→24다. 후기 난이도가 수치 의존에서 완전히 벗어났다고 주장할 수 없다. 각 층 50전의 표본과 단일 기준팀이라는 제한이 있다.
- **P2: 역할/전략 다양성은 아직 제한적이다.** 후기 역할 중복은 약15%로 감소했지만 설치/날씨/필드가 모든 팀에 고르게 존재하지는 않는다. 원래 종의 적합성과 네임드 정체성을 우선한 결과다.
- 정규 1,000 Run 통계는 추가 이벤트와 플레이어 성장 정책을 섞지 않았다. 이벤트 포함 경제·영입 후 생존곡선은 후속 과제다.

## 10. 추가 조정 제안

다음 단계는 공격력 배수 조정 대신, 동일 투자 전투와 실제 플레이 로그에서 특정 역할/도구의 과소·과대 성능을 확인하는 것이다. 특히 41–49층의 전원 장비 도입, 50층의 지역별 기믹 효용, 후기 역할 중복 fallback, status/screen AI의 실제 기여도를 검토하면 좋다. 코인 경제는 별도 측정 후 진행한다.
''')
table(['구간','목표','변경 후 실제 상태','판정'],[
 ['1–10','기초 적응','Normal 중심, Master 추첨0, setup/기믹0, 제한 coverage','구현'],
 ['11–20','초기 빌드','타입 강화 도구·기본 역할, setup/기믹0','구현'],
 ['21–40','중반 조합전','정합한 coverage/setup에서 회복/pivot/screen으로 발전','구현·실효성 후속 관찰'],
 ['41–49','챔피언 준비','전원 실전 도구, 완성형 일반전, 기믹0','부분 충족: 49→50 단차 큼'],
 ['50','첫 기믹 전환점','모든 지역 대표 기믹 지정, expert, 에이스 보존','구현'],
 ['51–70','완성형 도입','Normal도 실전형, 전원 도구, Elite/Master 기믹 점증','구현'],
 ['71–99','완성형 후반','전체 역할 배정/약점 보완/후기 Normal expert','구현·제한 풀 fallback 존재'],
 ['100','최종전','Champion 정체성·대표 기믹·전원 도구·expert','구현·지역 편차 후속 관찰']])
(P/'report.md').write_text('\n'.join(lines),encoding='utf-8')
print('Wrote report.md and before-after.png')
